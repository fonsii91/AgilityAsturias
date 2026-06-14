<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\TimeSlot;
use App\Models\Competition;
use App\Models\Announcement;

class OnboardingController extends Controller
{
    public function getProgress(Request $request)
    {
        return response()->json([
            'onboarding_progress' => $request->user()->onboarding_progress,
            // Estado del club: permite que los pasos "dependientes" del onboarding
            // (apuntarse a una clase/evento) sepan si ya hay algo a lo que apuntarse.
            // Si no lo hay, el paso no debe bloquear el 100% (ver OnboardingService).
            // Los modelos usan el trait HasClub, así que exists() ya queda acotado al
            // club del usuario autenticado por el TenantScope global.
            'club_state' => [
                'has_bookable_classes' => TimeSlot::exists(),
                'has_events' => Competition::exists(),
                'has_announcements' => Announcement::exists(),
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

        $user = $request->user();
        $progress = $user->onboarding_progress ?? [];

        if (!isset($progress[$request->tutorial])) {
            $progress[$request->tutorial] = [];
        }

        $progress[$request->tutorial][$request->step] = $request->completed;

        $user->update(['onboarding_progress' => $progress]);

        return response()->json(['success' => true, 'onboarding_progress' => $progress]);
    }

    public function finishTutorial(Request $request)
    {
        $request->validate([
            'tutorial' => 'required|string',
        ]);

        $user = $request->user();
        $progress = $user->onboarding_progress ?? [];

        $progress[$request->tutorial . '_finished'] = true;

        $user->update(['onboarding_progress' => $progress]);

        return response()->json(['success' => true, 'onboarding_progress' => $progress]);
    }
}
