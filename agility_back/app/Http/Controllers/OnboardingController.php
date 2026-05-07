<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    public function getProgress(Request $request)
    {
        return response()->json([
            'onboarding_progress' => $request->user()->onboarding_progress
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
