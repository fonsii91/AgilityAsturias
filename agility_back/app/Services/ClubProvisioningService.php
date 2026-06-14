<?php

namespace App\Services;

use App\Mail\ClubLeadReceived;
use App\Mail\NewClubLeadAdmin;
use App\Models\Announcement;
use App\Models\Club;
use App\Models\ClubLead;
use App\Models\Competition;
use App\Models\Dog;
use App\Models\DogSeasonPoint;
use App\Models\DogWorkload;
use App\Models\GamificationSeason;
use App\Models\Plan;
use App\Models\PointHistory;
use App\Models\Reservation;
use App\Models\RfecTrack;
use App\Models\RsceTrack;
use App\Models\TimeSlot;
use App\Models\Track;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

/**
 * Aprovisiona un club a partir de un ClubLead: club + usuario manager + settings,
 * email de activación, avisos a administración y certificado SSL.
 *
 * Se invoca desde dos puntos:
 *  - ClubLeadController@store cuando el bypass de suscripciones está activo (sin pago).
 *  - StripeEventListener al confirmarse el pago (checkout.session.completed).
 */
class ClubProvisioningService
{
    /**
     * @param ClubLead $lead Lead con la contraseña ya hasheada en `password`.
     * @param string|null $stripeCustomerId Cliente de Stripe a asociar al club (flujo con pago).
     */
    public function provision(ClubLead $lead, ?string $stripeCustomerId = null): Club
    {
        $result = DB::transaction(function () use ($lead, $stripeCustomerId) {
            $planSlug = $this->resolvePlanSlug($lead->plan_selected);
            $plan = Plan::where('slug', $planSlug)->first() ?: Plan::first();

            // Política de arranque de módulos (decisión UX):
            //  - Gamificación: ON si el plan la incluye. Es el núcleo de engagement y
            //    da vida al club desde el primer día (clasificación, etc.).
            //  - Provisión de Fondos, Patrocinadores y Liga Norte: OFF por defecto
            //    aunque el plan los incluya. Manejan dinero/cara pública/nicho y en
            //    vacío dan mala imagen; el gestor los activa cuando esté listo desde
            //    Configuración del club (siguen visibles y gobernados por el plan).
            $planHasFeature = fn (string $slug) => $plan
                ? $plan->features()->where('slug', $slug)->exists()
                : false;

            $settings = [
                'slogan' => 'Gestiona tu club de Agility con profesionalidad',
                // Tema por defecto "Slate & Amber" (mismo preset que el selector de
                // temas del club en /admin/club-form).
                'colors' => [
                    'primary' => '#334155',
                    'accent' => '#F59E0B',
                ],
                'homeConfig' => [
                    'heroImage' => '/Images/Salud/collie-cansancio-1.png',
                    'ctaImage' => '/Images/Salud/collie-salto-alto.png',
                ],
                'customizationRequest' => '',
                'landing_page_requested' => false,
                'gamification_enabled' => $planHasFeature('gamificacion'),
                'provision_fondos_enabled' => false,
                'sponsors_enabled' => false,
                'liga_norte_enabled' => false,
                'contact' => [
                    'phone' => $lead->phone ?? '',
                    'email' => $lead->email ?? '',
                    'addressLine1' => '',
                    'addressLine2' => '',
                    'mapUrl' => '',
                ],
                'social' => [
                    'instagram' => '',
                    'facebook' => '',
                ]
            ];

            $club = Club::create([
                'name' => $lead->name,
                'slug' => $lead->slug,
                'plan_id' => $plan ? $plan->id : null,
                'settings' => $settings,
            ]);

            if ($stripeCustomerId) {
                $club->stripe_id = $stripeCustomerId;
                $club->save();
            }

            // El token de activación se guarda hasheado; 7 días para completar la activación
            $resetToken = Str::random(60);
            $manager = User::create([
                'name' => $lead->name . ' Admin',
                'email' => $lead->email,
                // El cast 'hashed' del modelo detecta el hash existente y no lo re-hashea
                'password' => $lead->password,
                'role' => 'manager',
                'club_id' => $club->id,
                'reset_token' => hash('sha256', $resetToken),
                'reset_token_expires_at' => now()->addDays(7),
            ]);

            $lead->update([
                'status' => 'approved',
                'club_id' => $club->id,
                'provisioned_at' => now(),
            ]);

            return ['club' => $club, 'activation_token' => $resetToken, 'manager' => $manager];
        });

        $club = $result['club'];

        // Datos de bienvenida (perro demo, horario, anuncio, eventos, bitácora canina
        // y cargas de salud) para que el gestor no se encuentre el club vacío al entrar.
        // No es crítico: si algo falla se loguea pero NUNCA aborta el aprovisionamiento
        // del pago, que ya está confirmado en este punto.
        try {
            $this->seedWelcomeData($club, $result['manager']);
        } catch (\Exception $seedEx) {
            \Log::warning('No se pudieron sembrar los datos de bienvenida del club ' . $club->id . ': ' . $seedEx->getMessage());
        }
        $activationLink = $this->buildActivationLink($lead->slug, $result['activation_token']);

        // Send emails (wrapped in try-catch to prevent crash if mail server is not configured)
        try {
            Mail::to($lead->email)->send(new ClubLeadReceived($lead, $activationLink));
            Mail::to(config('mail.admin_address'))->send(new NewClubLeadAdmin($lead));
        } catch (\Exception $mailEx) {
            \Log::warning('Could not send SaaS subscription notification emails: ' . $mailEx->getMessage());
        }

        // Send database notification to admin users
        try {
            $admins = User::where('role', 'admin')->get();
            Notification::send($admins, new \App\Notifications\NewClubLeadNotification($lead));
        } catch (\Exception $notifEx) {
            \Log::warning('Could not send database notifications: ' . $notifEx->getMessage());
        }

        // Trigger SSL generation asynchronously in production (detached to prevent 504 timeouts)
        if (config('app.env') === 'production') {
            shell_exec('nohup sudo /root/auto_ssl.sh < /dev/null > /dev/null 2>&1 &');
        }

        return $club;
    }

    /**
     * Siembra datos de muestra (borrables) en un club recién aprovisionado para
     * que el gestor no aterrice en pantallas vacías. Cada modelo lleva club_id
     * explícito porque el aprovisionamiento corre fuera del contexto de tenant
     * (lo dispara el webhook de Stripe) y el trait HasClub no lo autoasigna.
     */
    public function seedWelcomeData(Club $club, User $manager): void
    {
        DB::transaction(function () use ($club, $manager) {
            $now = Carbon::now();

            // Acumuladores de IDs sembrados: se guardan en settings['_demo_seed']
            // para poder borrar EXACTAMENTE estos datos de ejemplo después, sin tocar
            // datos reales (ver ClubController::clearDemoData). Los hijos (reservas,
            // cargas, mangas, puntos) se borran por dog_id, así que basta con los IDs
            // de perros + usuarios socio + horario + anuncio + eventos + temporada.
            $demoDogIds = [];
            $demoUserIds = [];
            $demoCompetitionIds = [];
            $demoAnnouncementIds = [];

            // --- 1. Perro de muestra, propiedad del gestor ---
            // Datos sanos para que el velocímetro de salud no penalice: sin lesiones
            // previas y ratio altura/peso >= 2.5 (umbrales normales de ACWR).
            $dog = Dog::create([
                'name' => 'Rex (ejemplo)',
                'breed' => 'Border Collie',
                'birth_date' => $now->copy()->subYears(3)->toDateString(),
                'rsce_category' => 'M',
                'rfec_grade' => 'Competición',
                'rfec_category' => 'Medium',
                'photo_url' => '/Images/Salud/collie-salto-alto.png',
                'has_previous_injuries' => false,
                'weight_kg' => 18,
                'height_cm' => 53,
                'club_entry_year' => (int) $now->format('Y'),
                'club_id' => $club->id,
            ]);
            $demoDogIds[] = $dog->id;
            // La propiedad del perro se modela solo en el pivot dog_user. La licencia
            // RSCE y el grado van en el pivot: sin rsce_license el módulo Canina sale
            // bloqueado, y con rsce_grade '0' no se muestra el historial de mangas.
            $dog->users()->attach($manager->id, [
                'is_primary_owner' => true,
                'rsce_license' => 'RSCE-EJEMPLO-0001',
                'rsce_grade' => '1',
            ]);

            // El módulo Caza (RFEC) se desbloquea con la licencia federativa del
            // usuario (no del perro): se rellena de ejemplo para que el gestor vea
            // sus mangas. Es un dato borrable desde su perfil.
            $manager->rfec_license = 'RFEC-EJEMPLO-0001';
            $manager->save();

            // --- 2. Horario base: 3 clases recurrentes (date null = semanal) ---
            $classes = [
                ['day' => 'Lunes',     'name' => 'Iniciación',   'start_time' => '18:00', 'end_time' => '19:30', 'color' => '#0ea5e9'],
                ['day' => 'Miércoles', 'name' => 'Intermedio',   'start_time' => '18:00', 'end_time' => '19:30', 'color' => '#f59e0b'],
                ['day' => 'Viernes',   'name' => 'Competición',  'start_time' => '19:00', 'end_time' => '20:30', 'color' => '#10b981'],
            ];
            $createdSlots = [];
            foreach ($classes as $c) {
                // club_id no está en el $fillable de TimeSlot: se asigna como atributo.
                $slot = new TimeSlot([
                    'day' => $c['day'],
                    'name' => $c['name'],
                    'start_time' => $c['start_time'],
                    'end_time' => $c['end_time'],
                    'max_bookings' => 6,
                    'color' => $c['color'],
                    'date' => null,
                ]);
                $slot->club_id = $club->id;
                $slot->save();
                $createdSlots[] = $slot;
            }

            // --- 3. Anuncio de bienvenida (fijado) ---
            $welcomeAnnouncement = Announcement::create([
                'user_id' => $manager->id,
                'title' => '¡Bienvenido a ' . $club->name . '! 🐾',
                'content' => "Este es el tablón de anuncios de tu club. Aquí podrás avisar a tus socios de novedades, eventos y cambios de horario.\n\nTodos los datos que ves ahora mismo (este anuncio, el perro \"Rex\", las clases del horario y los eventos del calendario) son ejemplos para que veas cómo funciona la plataforma. Puedes editarlos o borrarlos cuando quieras.",
                'is_pinned' => true,
                'category' => 'Importante',
                'club_id' => $club->id,
            ]);
            $demoAnnouncementIds[] = $welcomeAnnouncement->id;

            // --- 4. Dos eventos en el calendario (club-wide, tipo 'otros') ---
            // club_id no está en el $fillable de Competition: se asigna como atributo.
            $events = [
                ['nombre' => 'Día de creación de la web del club', 'fecha_evento' => $now->toDateString()],
                ['nombre' => 'Límite para conseguir la recompensa por completar el tutorial', 'fecha_evento' => $now->copy()->addDays(14)->toDateString()],
            ];
            foreach ($events as $e) {
                $event = new Competition([
                    'nombre' => $e['nombre'],
                    'fecha_evento' => $e['fecha_evento'],
                    'tipo' => 'otros',
                    'lugar' => $club->name,
                ]);
                $event->club_id = $club->id;
                $event->save();
                $demoCompetitionIds[] = $event->id;
            }

            // --- 5. Cargas de salud: 8 clases asistidas repartidas en 28 días ---
            // La primera a ~26 días garantiza salir de "calibrando" (>=14 días). El
            // grueso son clases por defecto (5 min en pista, RPE 6); las 2 sesiones de
            // la última semana son algo más exigentes para que la carga aguda supere a
            // la crónica y el ACWR quede en ~1,1 (verde, ligeramente por encima de la
            // media), en vez del 1,0 que daría un reparto perfectamente uniforme.
            $workloads = [
                ['days' => 26, 'duration_min' => 5, 'intensity_rpe' => 6],
                ['days' => 23, 'duration_min' => 5, 'intensity_rpe' => 6],
                ['days' => 19, 'duration_min' => 5, 'intensity_rpe' => 6],
                ['days' => 16, 'duration_min' => 5, 'intensity_rpe' => 6],
                ['days' => 12, 'duration_min' => 5, 'intensity_rpe' => 6],
                ['days' => 9,  'duration_min' => 5, 'intensity_rpe' => 6],
                ['days' => 5,  'duration_min' => 6, 'intensity_rpe' => 6],
                ['days' => 2,  'duration_min' => 8, 'intensity_rpe' => 4],
            ];
            foreach ($workloads as $w) {
                DogWorkload::create([
                    'dog_id' => $dog->id,
                    'user_id' => $manager->id,
                    'source_type' => 'auto_attendance',
                    'source_id' => null,
                    'date' => $now->copy()->subDays($w['days'])->toDateString(),
                    'duration_min' => $w['duration_min'],
                    'intensity_rpe' => $w['intensity_rpe'],
                    'status' => 'confirmed',
                    'is_staff_verified' => true,
                    'club_id' => $club->id,
                ]);
            }

            // --- 6. Bitácora: 3 mangas RSCE (canina) + 3 RFEC (caza) ---
            $rsceMangas = [
                ['days' => 20, 'manga_type' => 'Agility 1', 'qualification' => 'Excelente a 0', 'speed' => 4.20, 'time' => 32.50, 'faults' => 0, 'refusals' => 0, 'total_penalty' => 0.00,  'is_clean' => true,  'course_length' => 180, 'standard_time' => 42.00],
                ['days' => 13, 'manga_type' => 'Jumping 1', 'qualification' => 'Excelente a 0', 'speed' => 4.50, 'time' => 28.10, 'faults' => 0, 'refusals' => 0, 'total_penalty' => 0.00,  'is_clean' => true,  'course_length' => 160, 'standard_time' => 38.00],
                ['days' => 6,  'manga_type' => 'Agility 1', 'qualification' => 'Muy Bueno',     'speed' => 3.80, 'time' => 38.00, 'faults' => 1, 'refusals' => 0, 'total_penalty' => 5.00,  'is_clean' => false, 'course_length' => 175, 'standard_time' => 41.00],
            ];
            foreach ($rsceMangas as $m) {
                RsceTrack::create([
                    'dog_id' => $dog->id,
                    'club_id' => $club->id,
                    'date' => $now->copy()->subDays($m['days'])->toDateString(),
                    'manga_type' => $m['manga_type'],
                    'qualification' => $m['qualification'],
                    'speed' => $m['speed'],
                    'time' => $m['time'],
                    'faults' => $m['faults'],
                    'refusals' => $m['refusals'],
                    'total_penalty' => $m['total_penalty'],
                    'is_clean' => $m['is_clean'],
                    'course_length' => $m['course_length'],
                    'standard_time' => $m['standard_time'],
                    'judge_name' => 'Juez de ejemplo',
                    'location' => $club->name,
                    'notes' => 'Manga de ejemplo. Puedes borrarla cuando quieras.',
                ]);
            }

            $rfecMangas = [
                ['days' => 18, 'manga_type' => 'Agility 1', 'qualification' => 'Excelente a 0', 'grade' => 'Competición', 'speed' => 4.10, 'time' => 34.20, 'faults' => 0, 'refusals' => 0, 'total_penalty' => 0.00, 'is_clean' => true,  'course_length' => 178, 'standard_time' => 43.00],
                ['days' => 11, 'manga_type' => 'Jumping 1', 'qualification' => 'Excelente a 0', 'grade' => 'Competición', 'speed' => 4.40, 'time' => 29.80, 'faults' => 0, 'refusals' => 0, 'total_penalty' => 0.00, 'is_clean' => true,  'course_length' => 162, 'standard_time' => 39.00],
                ['days' => 4,  'manga_type' => 'Agility 1', 'qualification' => 'Muy Bueno',     'grade' => 'Competición', 'speed' => 3.90, 'time' => 37.10, 'faults' => 0, 'refusals' => 1, 'total_penalty' => 5.00, 'is_clean' => false, 'course_length' => 176, 'standard_time' => 41.50],
            ];
            foreach ($rfecMangas as $m) {
                RfecTrack::create([
                    'dog_id' => $dog->id,
                    'club_id' => $club->id,
                    'date' => $now->copy()->subDays($m['days'])->toDateString(),
                    'manga_type' => $m['manga_type'],
                    'qualification' => $m['qualification'],
                    'grade' => $m['grade'],
                    'speed' => $m['speed'],
                    'time' => $m['time'],
                    'faults' => $m['faults'],
                    'refusals' => $m['refusals'],
                    'total_penalty' => $m['total_penalty'],
                    'is_clean' => $m['is_clean'],
                    'course_length' => $m['course_length'],
                    'standard_time' => $m['standard_time'],
                    'judge_name' => 'Juez de ejemplo',
                    'location' => $club->name,
                    'notes' => 'Manga de ejemplo. Puedes borrarla cuando quieras.',
                ]);
            }

            // --- 7. Temporada de ranking activa + comunidad de ejemplo ---
            // El ranking necesita una temporada 'ranking' activa y filas en
            // dog_season_points con puntos > 0. Tras aprovisionar no existe ninguna,
            // así que se crea aquí junto con 5 socios de ejemplo (cada uno con su
            // perro, asistencias verificadas que otorgan puntos y una reserva para una
            // clase de esta semana) para que la clasificación no salga vacía.
            $season = new GamificationSeason([
                'name' => 'Temporada de ejemplo',
                'gamification_type' => 'ranking',
                'start_date' => $now->copy()->subDays(30)->toDateString(),
                'status' => 'active',
            ]);
            $season->club_id = $club->id;
            $season->save();

            // Próxima fecha (>= hoy) en la que cae el día del TimeSlot. Sumándole una
            // semana se obtiene la ocurrencia de la semana siguiente.
            $dayIso = ['Lunes' => 1, 'Martes' => 2, 'Miércoles' => 3, 'Jueves' => 4, 'Viernes' => 5, 'Sábado' => 6, 'Domingo' => 7];
            $nextDateFor = function (TimeSlot $slot) use ($now, $dayIso) {
                $d = $now->copy();
                $target = $dayIso[$slot->day] ?? 1;
                while ($d->dayOfWeekIso !== $target) {
                    $d->addDay();
                }
                return $d;
            };

            // Una manga de puntos para el propio perro del gestor, para que también
            // aparezca en la clasificación.
            DogSeasonPoint::create(['dog_id' => $dog->id, 'season_id' => $season->id, 'points' => 21]);
            $dog->update(['points' => 21]);
            for ($k = 0; $k < 7; $k++) {
                $ph = new PointHistory(['dog_id' => $dog->id, 'points' => 3, 'category' => 'Asistencia a entrenamiento', 'season_id' => $season->id]);
                $ph->club_id = $club->id;
                $ph->save();
            }

            // 5 socios de ejemplo: distinto nº de asistencias verificadas -> distinta
            // puntuación, para que la clasificación tenga orden (15, 12, 9, 6, 3 pts).
            // Nombres marcados como "(ejemplo)" para que se vea que son datos de prueba.
            $members = [
                ['name' => 'Lucía Fernández (ejemplo)', 'dog' => 'Luna (ejemplo)', 'breed' => 'Border Collie',     'attendances' => 5],
                ['name' => 'Carlos Gómez (ejemplo)',    'dog' => 'Toby (ejemplo)', 'breed' => 'Pastor Australiano', 'attendances' => 4],
                ['name' => 'Marta Ruiz (ejemplo)',      'dog' => 'Nala (ejemplo)', 'breed' => 'Mestizo',            'attendances' => 3],
                ['name' => 'Javier López (ejemplo)',    'dog' => 'Max (ejemplo)',  'breed' => 'Border Collie',      'attendances' => 2],
                ['name' => 'Ana Martín (ejemplo)',      'dog' => 'Kira (ejemplo)', 'breed' => 'Sheltie',            'attendances' => 1],
            ];

            foreach ($members as $i => $m) {
                $memberUser = User::create([
                    'name' => $m['name'],
                    'email' => 'socio' . ($i + 1) . '.' . $club->slug . '@ejemplo.com',
                    'password' => Hash::make(Str::random(24)),
                    'role' => 'member',
                    'club_id' => $club->id,
                ]);

                $memberDog = Dog::create([
                    'name' => $m['dog'],
                    'breed' => $m['breed'],
                    'birth_date' => $now->copy()->subYears(3)->toDateString(),
                    'rsce_category' => 'M',
                    'has_previous_injuries' => false,
                    'weight_kg' => 17,
                    'height_cm' => 50,
                    'club_entry_year' => (int) $now->format('Y'),
                    'club_id' => $club->id,
                ]);
                $memberDog->users()->attach($memberUser->id, ['is_primary_owner' => true]);
                $demoUserIds[] = $memberUser->id;
                $demoDogIds[] = $memberDog->id;

                $points = $m['attendances'] * 3;
                DogSeasonPoint::create(['dog_id' => $memberDog->id, 'season_id' => $season->id, 'points' => $points]);
                $memberDog->update(['points' => $points]);

                // Asistencias verificadas pasadas: reserva 'completed' + carga + puntos.
                // club_id y attendance_verified no están en el $fillable de Reservation.
                for ($k = 0; $k < $m['attendances']; $k++) {
                    $slot = $createdSlots[$k % count($createdSlots)];
                    $date = $now->copy()->subDays(7 + $k * 2)->toDateString();

                    $res = new Reservation([
                        'slot_id' => $slot->id,
                        'user_id' => $memberUser->id,
                        'dog_id' => $memberDog->id,
                        'date' => $date,
                        'status' => 'completed',
                    ]);
                    $res->club_id = $club->id;
                    $res->attendance_verified = true;
                    $res->save();

                    DogWorkload::create([
                        'dog_id' => $memberDog->id,
                        'user_id' => $memberUser->id,
                        'source_type' => 'auto_attendance',
                        'source_id' => $res->id,
                        'date' => $date,
                        'duration_min' => 5,
                        'intensity_rpe' => 6,
                        'status' => 'confirmed',
                        'is_staff_verified' => true,
                        'club_id' => $club->id,
                    ]);

                    $ph = new PointHistory(['dog_id' => $memberDog->id, 'points' => 3, 'category' => 'Asistencia a entrenamiento', 'season_id' => $season->id]);
                    $ph->club_id = $club->id;
                    $ph->save();
                }

                // Reservas activas de clase: la de la SEMANA PASADA queda sin verificar
                // (aparece en "Verificación de Asistencia" como sesión pendiente), más
                // las de ESTA semana y la SIGUIENTE.
                $upcomingSlot = $createdSlots[$i % count($createdSlots)];
                $thisWeek = $nextDateFor($upcomingSlot);
                $resDates = [
                    $thisWeek->copy()->subWeek()->toDateString(),
                    $thisWeek->toDateString(),
                    $thisWeek->copy()->addWeek()->toDateString(),
                ];
                foreach ($resDates as $resDate) {
                    $upcoming = new Reservation([
                        'slot_id' => $upcomingSlot->id,
                        'user_id' => $memberUser->id,
                        'dog_id' => $memberDog->id,
                        'date' => $resDate,
                        'status' => 'active',
                    ]);
                    $upcoming->club_id = $club->id;
                    $upcoming->attendance_verified = false;
                    $upcoming->save();
                }
            }

            // Registrar los IDs sembrados en settings['_demo_seed'] para el borrado
            // en bloque posterior. No está en CLIENT_EDITABLE_SETTINGS_KEYS, así que
            // las ediciones del gestor en Configurar club no lo pisan.
            $settings = $club->settings ?? [];
            $settings['_demo_seed'] = [
                'dog_ids' => array_values($demoDogIds),
                'user_ids' => array_values($demoUserIds),
                'time_slot_ids' => array_map(fn ($s) => $s->id, $createdSlots),
                'announcement_ids' => array_values($demoAnnouncementIds),
                'competition_ids' => array_values($demoCompetitionIds),
                'season_ids' => [$season->id],
                'manager_id' => $manager->id,
                'seeded_at' => $now->toDateTimeString(),
            ];
            $club->settings = $settings;
            $club->save();
        });
    }

    /**
     * Borra EXACTAMENTE los datos de ejemplo sembrados (los IDs registrados en
     * settings['_demo_seed']), sin tocar datos reales. Idempotente: si no hay
     * marcador, no hace nada. Los hijos (reservas, cargas, mangas, puntos) se
     * borran por dog_id.
     */
    public function clearDemoData(Club $club): void
    {
        $seed = $club->settings['_demo_seed'] ?? null;
        if (!$seed) {
            return;
        }

        DB::transaction(function () use ($club, $seed) {
            $dogIds = $seed['dog_ids'] ?? [];

            if ($dogIds) {
                Reservation::whereIn('dog_id', $dogIds)->delete();
                DogWorkload::whereIn('dog_id', $dogIds)->delete();
                Track::whereIn('dog_id', $dogIds)->delete();
                PointHistory::whereIn('dog_id', $dogIds)->delete();
                DogSeasonPoint::whereIn('dog_id', $dogIds)->delete();
                DB::table('dog_user')->whereIn('dog_id', $dogIds)->delete();
                DB::table('dogs')->whereIn('id', $dogIds)->delete();
            }

            // Solo socios de ejemplo (role member); nunca el gestor ni admins.
            if (!empty($seed['user_ids'])) {
                User::whereIn('id', $seed['user_ids'])->where('role', 'member')->delete();
            }
            if (!empty($seed['time_slot_ids'])) {
                TimeSlot::whereIn('id', $seed['time_slot_ids'])->delete();
            }
            if (!empty($seed['announcement_ids'])) {
                Announcement::whereIn('id', $seed['announcement_ids'])->delete();
            }
            if (!empty($seed['competition_ids'])) {
                Competition::whereIn('id', $seed['competition_ids'])->delete();
            }
            if (!empty($seed['season_ids'])) {
                GamificationSeason::whereIn('id', $seed['season_ids'])->delete();
            }

            // Quitar la licencia RFEC de ejemplo del gestor solo si no la ha cambiado.
            // rfec_license está encriptado (cast GracefulEncryption), así que hay que
            // comparar/guardar vía modelo, no con un where sobre el texto plano.
            if (!empty($seed['manager_id'])) {
                $mgr = User::find($seed['manager_id']);
                if ($mgr && $mgr->rfec_license === 'RFEC-EJEMPLO-0001') {
                    $mgr->rfec_license = null;
                    $mgr->save();
                }
            }

            // Quitar el marcador.
            $settings = $club->settings ?? [];
            unset($settings['_demo_seed']);
            $club->settings = $settings;
            $club->save();
        });
    }

    public function resolvePlanSlug(string $planSelected): string
    {
        $planName = strtolower($planSelected);
        if (str_contains($planName, 'pro')) {
            return 'profesional';
        }
        if (str_contains($planName, 'elit') || str_contains($planName, 'élite')) {
            return 'elite';
        }
        return 'basico';
    }

    private function buildActivationLink(string $slug, string $token): string
    {
        if (config('app.env') === 'production') {
            return "https://{$slug}.clubagility.com/reset-password?token={$token}";
        }

        $frontendUrl = config('services.frontend_url');
        $parsedUrl = parse_url($frontendUrl);
        $scheme = $parsedUrl['scheme'] ?? 'http';
        $hostOnly = $parsedUrl['host'] ?? 'localhost';
        $portOnly = isset($parsedUrl['port']) ? ':' . $parsedUrl['port'] : '';

        return "{$scheme}://{$slug}.{$hostOnly}{$portOnly}/reset-password?token={$token}";
    }
}
