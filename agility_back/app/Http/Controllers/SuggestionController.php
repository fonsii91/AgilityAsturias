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
            // Get all suggestions, order by pending first, then by date desc
            $suggestions = Suggestion::with('user:id,name,email')
                ->orderByRaw("FIELD(status, 'pending', 'resolved')")
                ->orderBy('created_at', 'desc')
                ->get();

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
            'type' => 'required|in:bug,suggestion',
            'content' => 'required|string|max:1000',
        ]);

        try {
            $suggestion = Suggestion::create([
                'user_id' => $request->user()->id,
                'type' => $validated['type'],
                'content' => $validated['content'],
                'status' => 'pending',
            ]);

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
            $suggestion = Suggestion::findOrFail($id);
            $suggestion->status = 'resolved';
            $suggestion->save();

            return response()->json(['message' => 'Marcado como resuelto', 'data' => $suggestion], 200);
        } catch (\Exception $e) {
            Log::error('Error resolving suggestion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el estado'], 500);
        }
    }
}
