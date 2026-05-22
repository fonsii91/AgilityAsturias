<?php

namespace App\Http\Controllers;

use App\Models\Suggestion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SuggestionController extends Controller
{
    /**
     * Get all suggestions (Only for Admin)
     */
    public function index()
    {
        try {
            $suggestions = Suggestion::withoutGlobalScope(\App\Models\Scopes\TenantScope::class)
                ->with([
                    'user' => function ($q) {
                        $q->withoutGlobalScope(\App\Models\Scopes\TenantScope::class);
                    },
                    'club:id,name'
                ])
                ->orderByRaw("CASE WHEN status = 'pending' THEN 1 WHEN status = 'unresolved' THEN 2 WHEN status = 'resolved' THEN 3 ELSE 4 END")
                ->orderBy('created_at', 'desc')
                ->get();

            // Hide emails of suggestion senders from other clubs
            $activeClubId = app()->bound('active_club_id') ? app('active_club_id') : (auth()->check() ? auth()->user()->club_id : null);

            if ($activeClubId) {
                $suggestions->each(function ($suggestion) use ($activeClubId) {
                    if ($suggestion->user && $suggestion->user->club_id !== $activeClubId) {
                        $suggestion->user->makeHidden(['email']);
                        $suggestion->user->email = null;
                    }
                });
            }

            return response()->json($suggestions, 200);
        } catch (\Exception $e) {
            Log::error('Error fetching suggestions: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener las sugerencias'], 500);
        }
    }

    /**
     * Store a new suggestion/bug report
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:bug,suggestion,landing_page',
            'content' => 'required|string|max:10000',
        ]);

        try {
            $suggestion = Suggestion::create([
                'user_id' => $request->user()->id,
                'type' => $validated['type'],
                'content' => $validated['content'],
                'status' => 'pending',
            ]);

            // Notify all admin users across all clubs
            $admins = \App\Models\User::withoutGlobalScope(\App\Models\Scopes\TenantScope::class)->where('role', 'admin')->get();
            \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\NewSuggestionNotification($suggestion));

            return response()->json(['message' => 'Reporte enviado con éxito', 'data' => $suggestion], 201);
        } catch (\Exception $e) {
            Log::error('Error creating suggestion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al enviar el reporte'], 500);
        }
    }

    /**
     * Mark a suggestion as resolved (Only for Admin)
     */
    public function resolve($id)
    {
        try {
            $suggestion = Suggestion::withoutGlobalScope(\App\Models\Scopes\TenantScope::class)->findOrFail($id);
            $suggestion->status = 'resolved';
            $suggestion->save();

            // Notify the user who created it
            if ($suggestion->user) {
                $suggestion->user->notify(new \App\Notifications\SuggestionResolvedNotification($suggestion));
            }

            return response()->json(['message' => 'Marcado como resuelto', 'data' => $suggestion], 200);
        } catch (\Exception $e) {
            Log::error('Error resolving suggestion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el estado'], 500);
        }
    }

    /**
     * Mark a suggestion as unresolved (Only for Admin)
     */
    public function unresolve($id)
    {
        try {
            $suggestion = Suggestion::withoutGlobalScope(\App\Models\Scopes\TenantScope::class)->findOrFail($id);
            $suggestion->status = 'unresolved';
            $suggestion->save();

            // Do not send notification here

            return response()->json(['message' => 'Marcado como no resuelto', 'data' => $suggestion], 200);
        } catch (\Exception $e) {
            Log::error('Error unresolving suggestion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al revertir el estado'], 500);
        }
    }
}
