<?php

namespace App\Http\Controllers;

use App\Models\Competition;
use App\Models\User;
use App\Notifications\NewEventNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Http\Request;

class CompetitionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $competitions = Competition::all();
        $user = $request->user('sanctum');

        if ($user) {
            $competitions->transform(function ($comp) use ($user) {
                $userAttendance = $comp->attendees()->where('competition_user.user_id', $user->id)->first();
                $comp->is_attending = $userAttendance ? true : false;
                $comp->dias_asistencia = $userAttendance && $userAttendance->pivot->dias_asistencia ? json_decode($userAttendance->pivot->dias_asistencia, true) : [];

                $attendingDogsPivot = $comp->attendingDogs()->wherePivot('user_id', $user->id)->get();
                $comp->attending_dog_ids = $attendingDogsPivot->pluck('id');
                $comp->attending_dogs_details = $attendingDogsPivot->map(function ($dog) {
                    return [
                        'id' => $dog->id,
                        'dias_asistencia' => $dog->pivot->dias_asistencia ? json_decode($dog->pivot->dias_asistencia, true) : []
                    ];
                });
                
                $comp->all_attending_dog_ids = $comp->attendingDogs()->pluck('dogs.id')->unique()->values();

                return $comp;
            });
        }

        return $competitions;
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'lugar' => 'nullable|string',
            'fecha_evento' => 'required|date',
            'fecha_fin_evento' => 'nullable|date',
            'fecha_limite' => 'nullable|date',
            'forma_pago' => 'nullable|string',
            'cartel' => 'nullable|string|max:2800000',
            'enlace' => 'nullable|string',
            'tipo' => 'required|in:competicion,exhibicion,otros',
            'federacion' => 'required_if:tipo,competicion|in:RSCE,RFEC,Otro|nullable',
            'nombre' => 'nullable|string',
            'judge_name' => 'nullable|string',
        ]);

        $competition = Competition::create($validated);

        Notification::send(User::all(), new NewEventNotification($competition));

        return response()->json($competition, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return Competition::findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $competition = Competition::findOrFail($id);

        $validated = $request->validate([
            'lugar' => 'nullable|string',
            'fecha_evento' => 'required|date',
            'fecha_fin_evento' => 'nullable|date',
            'fecha_limite' => 'nullable|date',
            'forma_pago' => 'nullable|string',
            'cartel' => 'nullable|string|max:2800000',
            'enlace' => 'nullable|string',
            'tipo' => 'required|in:competicion,exhibicion,otros',
            'federacion' => 'required_if:tipo,competicion|in:RSCE,RFEC,Otro|nullable',
            'nombre' => 'nullable|string',
            'judge_name' => 'nullable|string',
        ]);

        $competition->update($validated);

        return response()->json($competition);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $competition = Competition::findOrFail($id);

        $dateToCompare = $competition->fecha_fin_evento ?: $competition->fecha_evento;
        if ($dateToCompare && $dateToCompare < now()->format('Y-m-d')) {
            abort(403, 'Cannot delete historical events.');
        }

        $competition->delete();

        return response()->noContent();
    }

    public function attend(Request $request, string $id)
    {
        $request->validate([
            'dog_ids' => 'nullable|array',
            'dog_ids.*' => 'exists:dogs,id',
            'dias_asistencia' => 'nullable|array',
            'dias_asistencia.*' => 'string',
            'dogs_attendance' => 'nullable|array',
            'dogs_attendance.*.dog_id' => 'required_with:dogs_attendance|exists:dogs,id',
            'dogs_attendance.*.dias_asistencia' => 'nullable|array',
            'dogs_attendance.*.dias_asistencia.*' => 'string'
        ]);

        $competition = Competition::findOrFail($id);
        $user = $request->user();

        // Attach user
        $pivotData = [];
        if ($request->has('dias_asistencia')) {
            $pivotData = ['dias_asistencia' => json_encode($request->dias_asistencia)];
        }
        
        $competition->attendees()->syncWithoutDetaching([$user->id => $pivotData]);

        // Attach dogs (verify they belong to user)
        $userDogs = $user->dogs()->pluck('dogs.id')->toArray();
        
        \Illuminate\Support\Facades\DB::table('competition_dog')
            ->where('competition_id', $competition->id)
            ->where('user_id', $user->id)
            ->delete();

        if ($request->has('dogs_attendance')) {
            $dogsAttendance = collect($request->dogs_attendance)->filter(function ($item) use ($userDogs) {
                return in_array($item['dog_id'], $userDogs);
            });

            foreach ($dogsAttendance as $att) {
                $dogPivotData = ['user_id' => $user->id];
                if (isset($att['dias_asistencia'])) {
                    $dogPivotData['dias_asistencia'] = json_encode($att['dias_asistencia']);
                }
                $competition->attendingDogs()->attach($att['dog_id'], $dogPivotData);
            }
        } elseif ($request->has('dog_ids')) {
            // Fallback for legacy format
            $validDogIds = collect($request->dog_ids)->intersect($userDogs)->toArray();
            foreach ($validDogIds as $dogId) {
                $dogPivotData = ['user_id' => $user->id];
                if ($request->has('dias_asistencia')) {
                    $dogPivotData['dias_asistencia'] = json_encode($request->dias_asistencia);
                }
                $competition->attendingDogs()->attach($dogId, $dogPivotData);
            }
        }

        return response()->json(['message' => 'Attendance recorded successfully']);
    }

    public function unattend(Request $request, string $id)
    {
        $competition = Competition::findOrFail($id);
        $user = $request->user();

        $competition->attendees()->detach($user->id);

        \Illuminate\Support\Facades\DB::table('competition_dog')
            ->where('competition_id', $competition->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json(['message' => 'Attendance removed successfully']);
    }

    public function getAttendees(string $id)
    {
        $competition = Competition::findOrFail($id);

        $attendees = $competition->attendees()->select('users.id', 'users.name', 'users.photo_url')->get();

        $attendees->transform(function ($user) use ($competition) {
            $user->attending_dogs = $competition->attendingDogs()
                ->wherePivot('user_id', $user->id)
                ->select('dogs.id', 'dogs.name', 'dogs.photo_url')
                ->get()
                ->map(function ($dog) {
                    $dog->dias_asistencia = $dog->pivot->dias_asistencia ? json_decode($dog->pivot->dias_asistencia, true) : [];
                    return $dog;
                });
            $user->dias_asistencia = $user->pivot->dias_asistencia ? json_decode($user->pivot->dias_asistencia, true) : [];
            return $user;
        });

        return response()->json($attendees);
    }

    public function adminScraperStatus(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized action.');
        }

        $today = now()->toDateString();
        $competitions = Competition::where('tipo', 'competicion')
            ->where(function($query) use ($today) {
                $query->where(function ($q) use ($today) {
                    $q->whereNotNull('fecha_fin_evento')
                      ->where('fecha_fin_evento', '<', $today);
                })->orWhere(function ($q) use ($today) {
                    $q->whereNull('fecha_fin_evento')
                      ->where('fecha_evento', '<', $today);
                });
            })
            ->orderBy('fecha_evento', 'desc')
            ->get();

        return response()->json($competitions);
    }

    public function adminScraperRun(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'competition_id' => 'required|exists:competitions,id'
        ]);

        $competition = Competition::findOrFail($request->competition_id);
        
        if (empty($competition->enlace) || strpos($competition->enlace, 'flowagility.com') === false) {
            return response()->json([
                'message' => 'Esta competición no tiene un enlace válido de FlowAgility.'
            ], 422);
        }

        $startDate = $competition->fecha_evento;
        if (now()->toDateString() < $startDate) {
            return response()->json([
                'message' => 'No se puede realizar el scraping de una competición que aún no ha comenzado.'
            ], 422);
        }

        try {
            $competition->scrape_status = 'processing';
            $competition->scrape_error = null;
            $competition->save();

            \App\Jobs\ScrapeCompetitionJob::dispatch($competition->id);

            return response()->json([
                'message' => 'Scraping iniciado en segundo plano.',
                'status' => 'processing',
                'competition' => $competition
            ]);
        } catch (\Exception $e) {
            $competition->scrape_status = 'failed';
            $competition->scrape_error = $e->getMessage();
            $competition->save();

            return response()->json([
                'message' => 'Error al iniciar el scraping: ' . $e->getMessage()
            ], 500);
        }
    }

    public function adminScraperRunCalendar(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized action.');
        }

        try {
            // Queue the Artisan command flowagility:scrape-calendar
            \Illuminate\Support\Facades\Artisan::queue('flowagility:scrape-calendar');

            return response()->json([
                'message' => 'Scraping del calendario de FlowAgility encolado en segundo plano con éxito.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al encolar el scraping del calendario: ' . $e->getMessage()
            ], 500);
        }
    }

    public function adminScraperLastTracks(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized action.');
        }

        $rsce = \App\Models\RsceTrack::with(['dog.users', 'club'])
            ->where('notes', 'like', '%FlowAgility%')
            ->orderBy('id', 'desc')
            ->limit(100)
            ->get()
            ->map(function ($track) {
                $track->federation = 'RSCE';
                return $track;
            });

        $rfec = \App\Models\RfecTrack::with(['dog.users', 'club'])
            ->where('notes', 'like', '%FlowAgility%')
            ->orderBy('id', 'desc')
            ->limit(100)
            ->get()
            ->map(function ($track) {
                $track->federation = 'RFEC';
                return $track;
            });

        $merged = $rsce->concat($rfec)
            ->sortByDesc('created_at')
            ->take(100)
            ->values();

        $formatted = $merged->map(function ($track) {
            $primaryUser = $track->dog && $track->dog->users ? $track->dog->users->first() : null;
            return [
                'id' => $track->id,
                'federation' => $track->federation,
                'club_name' => $track->club ? $track->club->name : 'N/A',
                'dog_name' => $track->dog ? $track->dog->name : 'N/A',
                'owner_name' => $primaryUser ? $primaryUser->name : 'N/A',
                'manga_type' => $track->manga_type,
                'qualification' => $track->qualification,
                'speed' => $track->speed,
                'time' => $track->time,
                'faults' => $track->faults,
                'refusals' => $track->refusals,
                'total_penalty' => $track->total_penalty,
                'is_clean' => $track->is_clean,
                'location' => $track->location,
                'date' => $track->date,
                'created_at' => $track->created_at ? $track->created_at->toDateTimeString() : null,
                'is_my_dog' => ($track->dog && $track->dog->users ? $track->dog->users->contains('id', auth()->id()) : false),
            ];
        });

        return response()->json($formatted);
    }

    public function memberScraperLastTracks(Request $request)
    {
        $rsce = \App\Models\RsceTrack::with(['dog.users', 'club'])
            ->where('notes', 'like', '%FlowAgility%')
            ->orderBy('id', 'desc')
            ->limit(100)
            ->get()
            ->map(function ($track) {
                $track->federation = 'RSCE';
                return $track;
            });

        $rfec = \App\Models\RfecTrack::with(['dog.users', 'club'])
            ->where('notes', 'like', '%FlowAgility%')
            ->orderBy('id', 'desc')
            ->limit(100)
            ->get()
            ->map(function ($track) {
                $track->federation = 'RFEC';
                return $track;
            });

        $merged = $rsce->concat($rfec)
            ->sortByDesc('created_at')
            ->take(100)
            ->values();

        $formatted = $merged->map(function ($track) {
            $primaryUser = $track->dog && $track->dog->users ? $track->dog->users->first() : null;
            return [
                'id' => $track->id,
                'federation' => $track->federation,
                'club_name' => $track->club ? $track->club->name : 'N/A',
                'dog_name' => $track->dog ? $track->dog->name : 'N/A',
                'owner_name' => $primaryUser ? $primaryUser->name : 'N/A',
                'manga_type' => $track->manga_type,
                'qualification' => $track->qualification,
                'speed' => $track->speed,
                'time' => $track->time,
                'faults' => $track->faults,
                'refusals' => $track->refusals,
                'total_penalty' => $track->total_penalty,
                'is_clean' => $track->is_clean,
                'location' => $track->location,
                'date' => $track->date,
                'created_at' => $track->created_at ? $track->created_at->toDateTimeString() : null,
                'is_my_dog' => ($track->dog && $track->dog->users ? $track->dog->users->contains('id', auth()->id()) : false),
            ];
        });

        return response()->json($formatted);
    }

    public function globalEvents(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $query = \App\Models\GlobalFlowagilityEvent::query();

        if ($request->has('q')) {
            $q = $request->query('q');
            $query->where(function($sub) use ($q) {
                $sub->where('nombre', 'like', "%{$q}%")
                    ->orWhere('lugar', 'like', "%{$q}%")
                    ->orWhere('organizador', 'like', "%{$q}%");
            });
        }

        // Return future events or events from the last 30 days
        $query->where('fecha_evento', '>=', now()->subDays(30)->toDateString());

        $events = $query->orderBy('fecha_evento', 'asc')->get();

        return response()->json($events);
    }

    public function detectEvent(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $url = $request->query('url');
        if (empty($url)) {
            return response()->json(['error' => 'URL is required'], 400);
        }

        // Extract UUID if present in URL
        $uuid = null;
        if (preg_match('/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i', $url, $matches)) {
            $uuid = $matches[0];
        }

        // 1. Check if another club has created this event
        $existingCompQuery = Competition::withoutGlobalScopes();
        if ($uuid) {
            $existingCompQuery->where(function($q) use ($url, $uuid) {
                $q->where('enlace', 'like', "%{$url}%")
                  ->orWhere('enlace', 'like', "%{$uuid}%");
            });
        } else {
            $existingCompQuery->where('enlace', 'like', "%{$url}%");
        }
        
        $existingComp = $existingCompQuery->first();

        if ($existingComp) {
            return response()->json([
                'source' => 'other_club_competition',
                'nombre' => $existingComp->nombre,
                'lugar' => $existingComp->lugar,
                'fecha_evento' => $existingComp->fecha_evento,
                'fecha_fin_evento' => $existingComp->fecha_fin_evento,
                'fecha_limite' => $existingComp->fecha_limite,
                'forma_pago' => $existingComp->forma_pago,
                'enlace' => $existingComp->enlace,
                'tipo' => $existingComp->tipo,
                'federacion' => $existingComp->federacion,
                'judge_name' => $existingComp->judge_name,
                'cartel' => $existingComp->cartel,
            ]);
        }

        // 2. Check if it's in our global events table
        $globalEvent = null;
        if ($uuid) {
            $globalEvent = \App\Models\GlobalFlowagilityEvent::where('uuid', $uuid)->first();
        } else {
            $globalEvent = \App\Models\GlobalFlowagilityEvent::where('enlace', 'like', "%{$url}%")->first();
        }

        if ($globalEvent) {
            // Enrich with judge name and precise location/limits dynamically if not set
            if (empty($globalEvent->judge_name) && stripos($globalEvent->enlace, 'flowagility.com') !== false) {
                try {
                    $process = new \Symfony\Component\Process\Process(['node', base_path('flowagility_single_event_scraper.cjs'), $globalEvent->enlace]);
                    $process->setEnv([
                        'PLAYWRIGHT_BROWSERS_PATH' => env('PLAYWRIGHT_BROWSERS_PATH', '/opt/playwright-browsers'),
                    ]);
                    $process->setTimeout(35);
                    $process->run();

                    if ($process->isSuccessful()) {
                        $output = $process->getOutput();
                        $jsonStr = '';
                        foreach (explode("\n", $output) as $line) {
                            if (str_starts_with(trim($line), 'RESULT_JSON:')) {
                                $jsonStr = substr(trim($line), 12);
                                break;
                            }
                        }

                        if (!empty($jsonStr)) {
                            $scraped = json_decode($jsonStr, true);
                            if ($scraped && is_array($scraped)) {
                                $globalEvent->update([
                                    'judge_name' => $scraped['judge_name'] ?? null,
                                    'lugar' => $scraped['lugar'] ?? $globalEvent->lugar,
                                    'fecha_limite' => $scraped['fecha_limite'] ?? $globalEvent->fecha_limite,
                                ]);
                                // Refresh globalEvent instance
                                $globalEvent->refresh();
                            }
                        }
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Failed dynamic enrich for {$globalEvent->enlace}: " . $e->getMessage());
                }
            }

            $mappedFed = 'Otro';
            if ($globalEvent->federacion) {
                if (stripos($globalEvent->federacion, 'RSCE') !== false) {
                    $mappedFed = 'RSCE';
                } elseif (stripos($globalEvent->federacion, 'RFEC') !== false) {
                    $mappedFed = 'RFEC';
                }
            }

            return response()->json([
                'source' => 'global_flowagility_events',
                'nombre' => $globalEvent->nombre,
                'lugar' => $globalEvent->lugar,
                'fecha_evento' => $globalEvent->fecha_evento,
                'fecha_fin_evento' => $globalEvent->fecha_fin_evento,
                'fecha_limite' => $globalEvent->fecha_limite,
                'forma_pago' => null,
                'enlace' => $globalEvent->enlace,
                'tipo' => 'competicion',
                'federacion' => $mappedFed,
                'judge_name' => $globalEvent->judge_name,
                'cartel' => null,
            ]);
        }

        // 3. Fallback: If it's a FlowAgility URL, try to scrape it dynamically
        if (stripos($url, 'flowagility.com') !== false) {
            try {
                $process = new \Symfony\Component\Process\Process(['node', base_path('flowagility_single_event_scraper.cjs'), $url]);
                $process->setEnv([
                    'PLAYWRIGHT_BROWSERS_PATH' => env('PLAYWRIGHT_BROWSERS_PATH', '/opt/playwright-browsers'),
                ]);
                $process->setTimeout(35);
                $process->run();

                if ($process->isSuccessful()) {
                    $output = $process->getOutput();
                    $jsonStr = '';
                    foreach (explode("\n", $output) as $line) {
                        if (str_starts_with(trim($line), 'RESULT_JSON:')) {
                            $jsonStr = substr(trim($line), 12);
                            break;
                        }
                    }

                    if (!empty($jsonStr)) {
                        $scraped = json_decode($jsonStr, true);
                        if ($scraped && is_array($scraped)) {
                            // Upsert scraped event to global table for future requests
                            if ($uuid && !empty($scraped['fecha_evento'])) {
                                \App\Models\GlobalFlowagilityEvent::updateOrCreate(
                                    ['uuid' => $uuid],
                                    [
                                        'nombre' => $scraped['nombre'],
                                        'lugar' => $scraped['lugar'] ?? null,
                                        'fecha_evento' => $scraped['fecha_evento'],
                                        'fecha_fin_evento' => $scraped['fecha_fin_evento'] ?? null,
                                        'fecha_limite' => $scraped['fecha_limite'] ?? null,
                                        'enlace' => $scraped['enlace'],
                                        'federacion' => $scraped['federacion_str'] ?? null,
                                        'organizador' => $scraped['organizador'] ?? null,
                                    ]
                                );
                            }

                            $mappedFed = 'Otro';
                            if (!empty($scraped['federacion_str'])) {
                                if (stripos($scraped['federacion_str'], 'RSCE') !== false) {
                                    $mappedFed = 'RSCE';
                                } elseif (stripos($scraped['federacion_str'], 'RFEC') !== false) {
                                    $mappedFed = 'RFEC';
                                }
                            }

                            return response()->json([
                                'source' => 'dynamic_scraper',
                                'nombre' => $scraped['nombre'],
                                'lugar' => $scraped['lugar'] ?? null,
                                'fecha_evento' => $scraped['fecha_evento'],
                                'fecha_fin_evento' => $scraped['fecha_fin_evento'] ?? null,
                                'fecha_limite' => $scraped['fecha_limite'] ?? null,
                                'forma_pago' => null,
                                'enlace' => $scraped['enlace'],
                                'tipo' => 'competicion',
                                'federacion' => $mappedFed,
                                'judge_name' => $scraped['judge_name'] ?? null,
                                'cartel' => null,
                            ]);
                        }
                    }
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Failed dynamic scrape for $url: " . $e->getMessage());
            }
        }

        return response()->json([
            'source' => 'not_found',
            'message' => 'No event detected for this URL.'
        ]);
    }
}


