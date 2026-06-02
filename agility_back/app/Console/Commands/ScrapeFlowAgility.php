<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Competition;
use App\Models\Club;
use App\Models\Dog;
use App\Models\User;
use App\Models\RsceTrack;
use App\Models\RfecTrack;
use App\Models\DogWorkload;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class ScrapeFlowAgility extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'flowagility:scrape {--force : Forzar el scrapeo de competiciones ya marcadas como completadas} {--competition_id= : ID de la competición a scrapear específicamente}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scrape results from FlowAgility for registered clubs and sync with database';

    /**
     * Normaliza una URL de FlowAgility para poder comparar enlaces de forma uniforme.
     */
    private function normalizeUrl($url)
    {
        $url = str_replace('events/info', 'event', $url);
        if (!str_ends_with($url, '/group_runs')) {
            $url = rtrim($url, '/') . '/group_runs';
        }
        return $url;
    }

    /**
     * Marca un grupo de competiciones como fallidas con su respectivo mensaje de error.
     */
    private function markAsFailed($competitions, $seenUrls, $error)
    {
        foreach ($competitions as $comp) {
            $compUrl = $this->normalizeUrl($comp->enlace);
            if (in_array($compUrl, $seenUrls)) {
                $comp->scrape_status = 'failed';
                $comp->scrape_error = substr($error, 0, 1000); // Limitar tamaño de error
                $comp->scraped_at = now();
                $comp->save();
            }
        }
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Buscando competiciones de FlowAgility en la base de datos...");
        
        if ($this->option('competition_id')) {
            $target = Competition::find($this->option('competition_id'));
            if (!$target) {
                $this->error("No se encontró la competición con ID: " . $this->option('competition_id'));
                return 1;
            }
            
            $startDate = $target->fecha_evento;
            if (now()->toDateString() < $startDate && !$this->option('force')) {
                $this->warn("La competición con ID: {$target->id} aún no ha comenzado. Usa --force para forzar.");
                return 0;
            }

            $competitions = Competition::where('enlace', $target->enlace)->get();
        } else {
            $query = Competition::where('enlace', 'like', '%flowagility.com%');
            if (!$this->option('force')) {
                $query->where('results_scraped', false);
                $query->where('fecha_evento', '<=', now()->toDateString());
            }
            $competitions = $query->get();
        }

        if ($competitions->isEmpty()) {
            $this->warn("No se encontraron competiciones pendientes de FlowAgility.");
            return 0;
        }

        $this->info("Obteniendo la lista de clubs registrados...");
        $clubs = Club::pluck('name')->toArray();
        if (empty($clubs)) {
            $this->warn("No hay clubs registrados en el sistema. Se detiene el proceso.");
            return 0;
        }

        // Agrupar por URL única normalizada para no duplicar el trabajo del scraper
        $eventsConfig = [];
        $seenUrls = [];
        foreach ($competitions as $comp) {
            $url = $this->normalizeUrl($comp->enlace);
            if (!in_array($url, $seenUrls)) {
                $seenUrls[] = $url;
                $eventsConfig[] = [
                    'id' => $comp->id,
                    'url' => $url,
                    'date' => $comp->fecha_evento
                ];
            }
        }

        $config = [
            'clubs' => $clubs,
            'events' => $eventsConfig
        ];

        $this->info("Ejecutando scraper de Playwright en Node...");
        $scraperResult = $this->runScraper($config);
        $output = $scraperResult['output'];

        if (!$scraperResult['isSuccessful']) {
            $err = "El scraper de Node falló con error: " . ($scraperResult['errorOutput'] ?: "Error de ejecución");
            $this->error("\n" . $err);
            $this->markAsFailed($competitions, $seenUrls, $err);
            return 1;
        }

        $this->info("\nScraper finalizado. Procesando salida...");

        $jsonStr = '';
        foreach (explode("\n", $output) as $line) {
            if (str_starts_with(trim($line), 'RESULT_JSON:')) {
                $jsonStr = substr(trim($line), 12);
                break;
            }
        }

        if (empty($jsonStr)) {
            $err = "No se encontró el JSON de resultados en la salida del scraper.";
            $this->error($err);
            $this->markAsFailed($competitions, $seenUrls, $err);
            return 1;
        }

        $results = json_decode($jsonStr, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $err = "Error al decodificar JSON de salida: " . json_last_error_msg();
            $this->error($err);
            $this->markAsFailed($competitions, $seenUrls, $err);
            return 1;
        }

        $this->info("Se obtuvieron " . count($results) . " registros de competidores. Sincronizando con BD...");

        $allUsers = User::with('dogs')->get();

        $syncedCount = 0;
        foreach ($results as $item) {
            $scrapedComp = $competitions->firstWhere('id', $item['eventId']);
            if (!$scrapedComp) {
                continue;
            }

            // Buscar perro y usuario usando coincidencia difusa en memoria (para manejar campos encriptados)
            $match = $this->findMatch($item['dogName'], $item['handlerName'], $item['license'], $allUsers);
            if ($match) {
                $dog = $match[0];
                $user = $match[1];
            } else {
                $dog = null;
                $user = null;
            }

            if (!$dog || !$user) {
                $this->warn("No se pudo asociar en BD: Perro '{$item['dogName']}' / Guía '{$item['handlerName']}' / Licencia '{$item['license']}'");
                continue;
            }

            // Encontrar la competición correspondiente para el club de este perro con el mismo enlace normalizado
            $scrapedNormalizedUrl = $this->normalizeUrl($scrapedComp->enlace);
            $competition = $competitions->first(function ($c) use ($scrapedNormalizedUrl, $dog) {
                return $this->normalizeUrl($c->enlace) === $scrapedNormalizedUrl && $c->club_id === $dog->club_id;
            });

            // Metadatos de la competición fallback (para tracks/workloads si el club del perro no registró la competición)
            $fallbackComp = $competition ?: $scrapedComp;

            if ($competition) {
                // Comprobamos si el perro ya estaba registrado (apuntado) en la competición
                $isRegistered = $competition->attendingDogs()->where('dogs.id', $dog->id)->exists();

                if ($isRegistered) {
                    // Vincular perro en competition_dog si ya está apuntado
                    $competition->attendingDogs()->syncWithoutDetaching([
                        $dog->id => [
                            'user_id' => $user->id,
                            'position' => $item['position'] ?? '-',
                            'dorsal' => $item['dorsal'] ?? ''
                        ]
                    ]);

                    // Vincular también al usuario en competition_user si no está
                    if (!$competition->attendees()->where('users.id', $user->id)->exists()) {
                        $competition->attendees()->attach($user->id);
                    }
                }
            }

            // --- Auto-completar y Enriquecer Ficha del Perro ---
            if ($fallbackComp->federacion === 'RFEC') {
                if (empty($user->rfec_license) && !empty($item['license'])) {
                    $user->rfec_license = $item['license'];
                    $user->save();
                }
            } else {
                $pivot = DB::table('dog_user')->where('dog_id', $dog->id)->where('user_id', $user->id)->first();
                if ($pivot && empty($pivot->rsce_license) && !empty($item['license'])) {
                    $dog->users()->updateExistingPivot($user->id, ['rsce_license' => $item['license']]);
                }
            }

            // --- Guardar Tracks / Mangas ---
            foreach ($item['runs'] as $run) {
                $mangaType = $run['mangaType'];

                // Parsear velocidad
                $speed = null;
                if (!empty($run['speed']) && preg_match('/([\d\.]+)/', $run['speed'], $speedMatch)) {
                    $speed = (float)$speedMatch[1];
                }

                // Parsear tiempo
                $time = null;
                if (!empty($run['time']) && preg_match('/([\d\.]+)/', $run['time'], $timeMatch)) {
                    $time = (float)$timeMatch[1];
                }

                // Penalizaciones
                $faults = isset($run['faults']) && is_numeric($run['faults']) ? (int)$run['faults'] : 0;
                $refusals = isset($run['refusals']) && is_numeric($run['refusals']) ? (int)$run['refusals'] : 0;
                $timePenalty = isset($run['timePenalty']) && is_numeric($run['timePenalty']) ? (float)$run['timePenalty'] : 0.00;
                $totalPenalty = isset($run['totalPenalty']) && is_numeric($run['totalPenalty']) ? (float)$run['totalPenalty'] : 0.00;

                // Calificación limpia
                $isClean = ($faults === 0 && $refusals === 0 && $timePenalty == 0.00 && stripos($run['qualification'], 'elim') === false);

                // Mapear calificación para base de datos
                $qualification = $this->mapQualification($run['qualification'], $fallbackComp->federacion, !empty($time), $faults, $refusals, $timePenalty, $totalPenalty);

                $runDate = $item['runDate'] ?? $fallbackComp->fecha_evento ?: Carbon::now()->toDateString();

                $trackData = [
                    'dog_id' => $dog->id,
                    'date' => $runDate,
                    'manga_type' => $mangaType,
                    'qualification' => $qualification,
                    'speed' => $speed,
                    'time' => $time,
                    'faults' => $faults,
                    'refusals' => $refusals,
                    'time_penalty' => $timePenalty,
                    'total_penalty' => $totalPenalty,
                    'is_clean' => $isClean,
                    'judge_name' => $fallbackComp->judge_name ?: null,
                    'location' => !empty($fallbackComp->nombre)
                        ? (!empty($fallbackComp->lugar) ? $fallbackComp->nombre . ' - ' . $fallbackComp->lugar : $fallbackComp->nombre)
                        : $fallbackComp->lugar,
                    'club_id' => $dog->club_id,
                    'notes' => "Importado automáticamente de FlowAgility. Manga original: {$run['mangaType']}"
                ];

                if ($fallbackComp->federacion === 'RFEC') {
                    $trackData['grade'] = $dog->rfec_grade;
                    RfecTrack::updateOrCreate(
                        [
                            'dog_id' => $dog->id,
                            'date' => $trackData['date'],
                            'manga_type' => $mangaType
                        ],
                        $trackData
                    );
                } else {
                    RsceTrack::updateOrCreate(
                        [
                            'dog_id' => $dog->id,
                            'date' => $trackData['date'],
                            'manga_type' => $mangaType
                        ],
                        $trackData
                    );
                }
            }

            // --- Registrar Carga de Trabajo Automática de Competición ---
            if ($fallbackComp->tipo === 'competicion' && !empty($item['runs'])) {
                $runDate = $item['runDate'] ?? $fallbackComp->fecha_evento ?: Carbon::now()->toDateString();
                $workload = DogWorkload::firstOrCreate(
                    [
                        'dog_id' => $dog->id,
                        'source_type' => 'auto_competition',
                        'source_id' => $fallbackComp->id,
                        'date' => Carbon::parse($runDate)
                    ],
                    [
                        'club_id' => $dog->club_id,
                        'duration_min' => count($item['runs']),
                        'number_of_runs' => count($item['runs']),
                        'intensity_rpe' => 8,
                        'status' => 'pending_review'
                    ]
                );
                if ($workload->status === 'pending_review') {
                    $workload->club_id = $dog->club_id;
                    $workload->duration_min = count($item['runs']);
                    $workload->number_of_runs = count($item['runs']);
                }
                $workload->is_staff_verified = true;
                $workload->save();
            }

            // Re-calcular ACWR del perro (actualiza fatiga)
            $dog->calculateAcwrData();

            $syncedCount++;
        }

        // Marcar todas las competiciones procesadas exitosamente como "scraped" y "success"
        foreach ($competitions as $comp) {
            $compUrl = $this->normalizeUrl($comp->enlace);
            if (in_array($compUrl, $seenUrls)) {
                $startDate = $comp->fecha_evento;
                $endDate = $comp->fecha_fin_evento ?: $comp->fecha_evento;
                
                if (!$endDate || !$startDate) {
                    $isFinished = true;
                } else {
                    $today = now()->toDateString();
                    if ($today > $endDate) {
                        // Generar todas las fechas del evento (inclusive)
                        $startCarbon = Carbon::parse($startDate);
                        $endCarbon = Carbon::parse($endDate);
                        $eventDates = [];
                        $tempDate = $startCarbon->copy();
                        while ($tempDate->lte($endCarbon)) {
                            $eventDates[] = $tempDate->toDateString();
                            $tempDate->addDay();
                        }

                        // Comprobar si tenemos resultados para todos los días del evento
                        $hasResultsForAllDays = true;
                        foreach ($eventDates as $date) {
                            $hasResultsForDate = false;
                            foreach ($results as $item) {
                                if ($item['eventId'] == $comp->id && isset($item['runDate']) && $item['runDate'] === $date) {
                                    $hasResultsForDate = true;
                                    break;
                                }
                            }
                            if (!$hasResultsForDate) {
                                $hasResultsForAllDays = false;
                                break;
                            }
                        }

                        if ($hasResultsForAllDays) {
                            $isFinished = true;
                        } else {
                            // Dar un margen de gracia de 5 días tras el fin del evento antes de darlo por cerrado definitivamente
                            $limitDate = Carbon::parse($endDate)->addDays(5)->toDateString();
                            $isFinished = $today > $limitDate;
                        }
                    } else {
                        // El evento aún no ha finalizado
                        $isFinished = false;
                    }
                }

                $comp->results_scraped = $isFinished;
                $comp->scrape_status = 'success';
                $comp->scrape_error = null;
                $comp->scraped_at = now();
                $comp->save();

                // Automate attendance verification and points scoring if scraping is complete
                // and attendance has not been verified yet.
                if ($isFinished && !$comp->attendance_verified) {
                    $this->info("Asignando puntos de asistencia automáticamente para la competición: {$comp->nombre}...");
                    
                    DB::transaction(function () use ($comp) {
                        // Reload attending dogs with position
                        $attendingDogs = $comp->attendingDogs()->withPivot('position')->get();
                        
                        foreach ($attendingDogs as $dog) {
                            $position = $dog->pivot->position;
                            $pointsToAdd = 0;
                            $categoryName = 'Asistencia a competición ' . $comp->nombre;
                            
                            switch ($position) {
                                case '1':
                                    $pointsToAdd = 4;
                                    $categoryName = 'Primero en ' . $comp->nombre;
                                    break;
                                case '2':
                                    $pointsToAdd = 3;
                                    $categoryName = 'Segundo en ' . $comp->nombre;
                                    break;
                                case '3':
                                    $pointsToAdd = 2;
                                    $categoryName = 'Tercero en ' . $comp->nombre;
                                    break;
                                default:
                                    // 4, 5, 10, ELIM, etc. or null position get 1 attendance point
                                    $pointsToAdd = 1;
                                    break;
                            }
                            
                            if ($pointsToAdd > 0) {
                                $activeSeason = \App\Models\GamificationSeason::withoutGlobalScopes()
                                    ->where('club_id', $dog->club_id)
                                    ->where('status', 'active')
                                    ->where('gamification_type', 'ranking')
                                    ->first();

                                $seasonId = $activeSeason ? $activeSeason->id : null;

                                if ($activeSeason) {
                                    $seasonPoint = \App\Models\DogSeasonPoint::firstOrCreate([
                                        'dog_id' => $dog->id,
                                        'season_id' => $seasonId,
                                    ]);
                                    $seasonPoint->increment('points', $pointsToAdd);
                                }

                                $dog->increment('points', $pointsToAdd);
                                \App\Models\PointHistory::create([
                                    'dog_id' => $dog->id,
                                    'club_id' => $dog->club_id,
                                    'points' => $pointsToAdd,
                                    'category' => $categoryName,
                                    'season_id' => $seasonId,
                                ]);
                                
                                // Notify owners
                                $dog->load('users');
                                if ($dog->users) {
                                    foreach ($dog->users as $owner) {
                                        \Illuminate\Support\Facades\Notification::send($owner, new \App\Notifications\DogPointNotification($dog));
                                    }
                                }
                            }
                        }
                        
                        $comp->attendance_verified = true;
                        $comp->save();
                    });
                    
                    $this->info("Asistencia automatizada completada para la competición ID: {$comp->id}");
                }
            }
        }

        $this->info("Proceso completado. Se sincronizaron {$syncedCount} binomios con éxito.");
        return 0;
    }

    /**
     * Mapea la calificación de texto a los formatos estandarizados de RSCE y RFEC.
     */
    protected function mapQualification($raw, $federacion, $hasTime = false, $faults = 0, $refusals = 0, $timePenalty = 0.00, $totalPenalty = 0.00)
    {
        $text = strtolower(trim($raw));

        if ($text === '' || $text === '-' || $text === 'no calificado') {
            if (!$hasTime) {
                return $federacion === 'RFEC' ? 'Eliminado' : 'ELIM';
            }
            if ($totalPenalty == 0 && $faults == 0 && $refusals == 0) {
                return $federacion === 'RFEC' ? 'Excelente' : 'EXC_0';
            }
            if ($totalPenalty <= 5.00) {
                return $federacion === 'RFEC' ? 'Excelente' : 'EXC';
            }
            if ($totalPenalty <= 15.00) {
                return $federacion === 'RFEC' ? 'Muy Bueno' : 'MB';
            }
            if ($totalPenalty <= 25.00) {
                return $federacion === 'RFEC' ? 'Bueno' : 'B';
            }
            return $federacion === 'RFEC' ? 'Suficiente' : 'SUF';
        }

        if ($federacion === 'RFEC') {
            if (strpos($text, 'excelente a cero') !== false || strpos($text, 'excellent clean') !== false || $text === 'exc_0' || $text === 'excelente a 0') {
                return 'Excelente'; // RFEC no distingue exc a cero en los tests de backend
            }
            if (strpos($text, 'excelente') !== false || strpos($text, 'excellent') !== false || $text === 'exc') {
                return 'Excelente';
            }
            if (strpos($text, 'muy bueno') !== false || strpos($text, 'very good') !== false || $text === 'mb') {
                return 'Muy Bueno';
            }
            if (strpos($text, 'bueno') !== false || strpos($text, 'good') !== false || $text === 'b') {
                return 'Bueno';
            }
            if (strpos($text, 'suficiente') !== false || strpos($text, 'sufficient') !== false || $text === 'suf') {
                return 'Suficiente';
            }
            if (strpos($text, 'eliminado') !== false || strpos($text, 'eliminated') !== false || $text === 'el' || $text === 'elim') {
                return 'Eliminado';
            }
            if (strpos($text, 'no presentado') !== false || strpos($text, 'dns') !== false || $text === 'np') {
                return 'No Presentado';
            }
            return 'Eliminado';
        } else {
            // RSCE
            if (strpos($text, 'excelente a cero') !== false || strpos($text, 'excellent clean') !== false || $text === 'exc_0' || $text === 'excelente a 0') {
                return 'EXC_0';
            }
            if (strpos($text, 'excelente') !== false || strpos($text, 'excellent') !== false || $text === 'exc') {
                return 'EXC';
            }
            if (strpos($text, 'muy bueno') !== false || strpos($text, 'very good') !== false || $text === 'mb') {
                return 'MB';
            }
            if (strpos($text, 'bueno') !== false || strpos($text, 'good') !== false || $text === 'b') {
                return 'B';
            }
            if (strpos($text, 'suficiente') !== false || strpos($text, 'sufficient') !== false || $text === 'suf') {
                return 'SUF';
            }
            if (strpos($text, 'eliminado') !== false || strpos($text, 'eliminated') !== false || $text === 'el' || $text === 'elim') {
                return 'ELIM';
            }
            if (strpos($text, 'no presentado') !== false || strpos($text, 'dns') !== false || $text === 'np') {
                return 'NP';
            }
            return 'ELIM';
        }
    }

    /**
     * Busca la coincidencia de un perro y usuario basándose en licencias (RSCE y RFEC) y coincidencia difusa de nombres.
     */
    private function findMatch($scrapedDogName, $scrapedHandlerName, $scrapedLicense, $users)
    {
        $scrapedLicense = trim(strtolower($scrapedLicense));
        $scrapedDogNameClean = trim(strtolower($scrapedDogName));
        $scrapedHandlerNameClean = trim(strtolower($scrapedHandlerName));

        $normalize = function($str) {
            $str = strtolower(trim($str));
            $unwanted_array = array(
                'á'=>'a', 'é'=>'e', 'í'=>'i', 'ó'=>'o', 'ú'=>'u', 'ü'=>'u',
                'ñ'=>'n', 'ç'=>'c', 'à'=>'a', 'è'=>'e', 'ì'=>'i', 'ò'=>'o', 'ù'=>'u'
            );
            $str = strtr($str, $unwanted_array);
            return preg_replace('/[^a-z0-9]/', '', $str);
        };

        $scrapedDogNorm = $normalize($scrapedDogNameClean);
        $scrapedHandlerNorm = $normalize($scrapedHandlerNameClean);

        $bestMatch = null;
        $bestScore = 0;

        foreach ($users as $user) {
            $userRfec = trim(strtolower($user->rfec_license ?? ''));
            $userNameNorm = $normalize($user->name);

            // Dividir nombres en palabras para coincidencias por palabras individuales
            $userWords = array_filter(explode(' ', strtolower(preg_replace('/[^a-z ]/', '', strtr($user->name, array('á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ñ'=>'n'))))), function($w) {
                return strlen($w) >= 3;
            });
            $handlerWords = array_filter(explode(' ', strtolower(preg_replace('/[^a-z ]/', '', strtr($scrapedHandlerName, array('á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ñ'=>'n'))))), function($w) {
                return strlen($w) >= 3;
            });

            $hasWordMatch = false;
            foreach ($userWords as $uw) {
                foreach ($handlerWords as $hw) {
                    if ($uw === $hw || stripos($uw, $hw) !== false || stripos($hw, $uw) !== false) {
                        $hasWordMatch = true;
                        break 2;
                    }
                }
            }
            
            if (!$hasWordMatch) {
                if (stripos($scrapedHandlerName, $user->name) !== false || stripos($user->name, $scrapedHandlerName) !== false) {
                    $hasWordMatch = true;
                }
            }
            
            if (!$hasWordMatch) {
                if ($userNameNorm === 'mada' && stripos($scrapedHandlerNorm, 'magdalena') !== false) {
                    $hasWordMatch = true;
                }
            }

            foreach ($user->dogs as $dog) {
                $dogNameNorm = $normalize($dog->name);
                
                $dogRsce = '';
                if ($dog->pivot && !empty($dog->pivot->rsce_license)) {
                    $dogRsce = trim(strtolower($dog->pivot->rsce_license));
                }

                $score = 0;

                // 1. Verificar licencias
                $licenseMatch = false;
                if (!empty($scrapedLicense) && $scrapedLicense !== '000009999999' && $scrapedLicense !== 'no calificado') {
                    if ($scrapedLicense === $dogRsce) {
                        $licenseMatch = true;
                        $score += 100;
                    }
                    if ($scrapedLicense === $userRfec) {
                        $licenseMatch = true;
                        $score += 80;
                    }
                }

                // 2. Verificar nombre de perro
                $dogNameMatch = false;
                $lev = levenshtein($scrapedDogNorm, $dogNameNorm);
                if ($scrapedDogNorm === $dogNameNorm) {
                    $dogNameMatch = true;
                    $score += 50;
                } elseif (str_starts_with($dogNameNorm, $scrapedDogNorm) || str_starts_with($scrapedDogNorm, $dogNameNorm)) {
                    $dogNameMatch = true;
                    $score += 40;
                } elseif (stripos($dogNameNorm, $scrapedDogNorm) !== false || stripos($scrapedDogNorm, $dogNameNorm) !== false) {
                    $dogNameMatch = true;
                    $score += 30;
                } elseif ($lev <= 3) {
                    $dogNameMatch = true;
                    $score += 20;
                }

                // 3. Verificar nombre del guía
                $handlerMatch = false;
                if ($scrapedHandlerNorm === $userNameNorm) {
                    $handlerMatch = true;
                    $score += 50;
                } elseif ($hasWordMatch) {
                    $handlerMatch = true;
                    $score += 30;
                }

                $isCandidate = false;
                if ($licenseMatch && $dogNameMatch) {
                    $isCandidate = true;
                } elseif ($licenseMatch && count($user->dogs) === 1) {
                    $isCandidate = true;
                    $score += 10;
                } elseif ($dogNameMatch && $handlerMatch) {
                    $isCandidate = true;
                }

                if ($isCandidate && $score > $bestScore) {
                    $bestScore = $score;
                    $bestMatch = [$dog, $user];
                }
            }
        }

        return $bestMatch;
    }

    /**
     * Ejecuta el proceso del scraper de Playwright en Node.
     */
    public function runScraper(array $config): array
    {
        if (app()->environment('testing') && config('app.fake_scraper_output')) {
            return [
                'isSuccessful' => true,
                'output' => config('app.fake_scraper_output'),
                'errorOutput' => ''
            ];
        }

        $process = new Process(['node', base_path('flowagility_scraper.cjs'), json_encode($config)]);
        
        // Configurar la ruta de los navegadores de Playwright para que sea compartida
        // y accesible tanto por consola (root) como por la web (www-data).
        $process->setEnv([
            'PLAYWRIGHT_BROWSERS_PATH' => env('PLAYWRIGHT_BROWSERS_PATH', '/opt/playwright-browsers'),
        ]);

        $process->setTimeout(1800); // 30 minutos
        
        $output = '';
        $process->run(function ($type, $buffer) use (&$output) {
            $output .= $buffer;
        });

        return [
            'isSuccessful' => $process->isSuccessful(),
            'output' => $output,
            'errorOutput' => $process->getErrorOutput(),
        ];
    }
}
