<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\TimeSlot;
use App\Models\Competition;
use App\Models\Announcement;
use App\Models\GalleryImage;
use App\Models\User;

class OnboardingController extends Controller
{
    public function getProgress(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'onboarding_progress' => $user->onboarding_progress,
            // Estado del club. Sirve para dos cosas en el OnboardingService:
            //  - Pasos "dependientes" (apuntarse a una clase/evento): si el club no
            //    tiene el dato, el paso se atenúa y no bloquea el 100%.
            //  - Pasos "satisfiedBy" (Staff/Gestor: crear horario, evento, anuncio,
            //    galería, equipo): si el club YA tiene el dato (lo creara quien lo
            //    creara), el paso cuenta como hecho. Resuelve el "ya lo hizo otro".
            // Los modelos usan el trait HasClub, así que exists() ya queda acotado al
            // club del usuario autenticado por el TenantScope global.
            'club_state' => [
                'has_bookable_classes' => TimeSlot::exists(),
                'has_events' => Competition::exists(),
                'has_announcements' => Announcement::exists(),
                'has_gallery' => GalleryImage::exists(),
                // Hay equipo si en el club hay más de un usuario (el gestor + alguien).
                'has_team' => User::where('club_id', $user->club_id)->count() > 1,
            ],
        ]);
    }

    public function updateStep(Request $request)
    {
        $request->validate([
            'tutorial' => 'required|string',
            'step' => 'required|string',
            'completed' => 'required|boolean',
        ]);

        $userId = $request->user()->id;

        // Una misma acción puede marcar dos pasos a la vez (p.ej. añadir un perro
        // marca staff_perros y miembro_perros). Esos POST llegan concurrentes y
        // hacen read-modify-write sobre el MISMO JSON: sin bloqueo, el último pisa
        // al otro y se pierde una marca. El lock serializa las escrituras.
        $progress = DB::transaction(function () use ($request, $userId) {
            $user = User::whereKey($userId)->lockForUpdate()->first();
            $progress = $user->onboarding_progress ?? [];

            if (!isset($progress[$request->tutorial])) {
                $progress[$request->tutorial] = [];
            }
            $progress[$request->tutorial][$request->step] = $request->completed;

            $user->update(['onboarding_progress' => $progress]);
            return $progress;
        });

        return response()->json(['success' => true, 'onboarding_progress' => $progress]);
    }

    public function finishTutorial(Request $request)
    {
        $request->validate([
            'tutorial' => 'required|string',
        ]);

        $userId = $request->user()->id;

        $progress = DB::transaction(function () use ($request, $userId) {
            $user = User::whereKey($userId)->lockForUpdate()->first();
            $progress = $user->onboarding_progress ?? [];

            $progress[$request->tutorial . '_finished'] = true;

            $user->update(['onboarding_progress' => $progress]);
            return $progress;
        });

        return response()->json(['success' => true, 'onboarding_progress' => $progress]);
    }

    /**
     * Estado del "Reto de Activación" del club: progreso de onboarding de cada
     * miembro y cuánto falta para el objetivo (7 miembros completos = 700%).
     *
     * Un miembro que ha TERMINADO el tutorial cuenta como 100% (aunque algunos
     * pasos le salieran ya completos por el estado del club); el resto suma su
     * porcentaje en curso. El objetivo es la suma de porcentajes >= 700.
     */
    public function challenge(Request $request)
    {
        $clubId = $request->user()->club_id;

        // Evento "reto" del club (su fecha es la fecha límite del desafío).
        $event = Competition::where('tipo', 'reto')
            ->orderBy('fecha_evento')
            ->first();

        // Pasos del tutorial de Miembro (denominador para el % en curso).
        $miembroSteps = [
            'miembro_perros', 'miembro_clase', 'miembro_evento',
            'miembro_anuncios', 'miembro_clasificacion', 'miembro_perfil',
        ];
        $totalSteps = count($miembroSteps);

        // Miembros que cuentan para el reto (todos menos el admin global).
        $members = User::where('club_id', $clubId)
            ->whereIn('role', ['member', 'staff', 'manager'])
            ->get(['id', 'name', 'photo_url', 'role', 'onboarding_progress'])
            ->map(function ($u) use ($miembroSteps, $totalSteps) {
                $progress = $u->onboarding_progress ?? [];
                $finished = !empty($progress['miembro_finished']);

                if ($finished) {
                    $percent = 100;
                } else {
                    $m = $progress['miembro'] ?? [];
                    $done = 0;
                    foreach ($miembroSteps as $s) {
                        if (!empty($m[$s])) $done++;
                    }
                    $percent = $totalSteps ? (int) round($done / $totalSteps * 100) : 0;
                }

                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'photo_url' => $u->photo_url,
                    'role' => $u->role,
                    'finished' => $finished,
                    'percent' => $percent,
                ];
            })
            ->sortByDesc('percent')
            ->values();

        $total = (int) $members->sum('percent');
        $target = 700; // 7 miembros al 100%

        return response()->json([
            'deadline' => $event?->fecha_evento,
            'target' => $target,
            'total' => $total,
            'achieved' => $total >= $target,
            'finished_count' => $members->where('finished', true)->count(),
            'members' => $members,
        ]);
    }
}
