<?php

namespace App\Http\Controllers;

use App\Models\Competition;
use Illuminate\Http\Request;

class CompetitionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Competition::all();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'lugar' => 'nullable|string',
            'fecha_evento' => 'required|date',
            'fecha_fin_evento' => 'nullable|date',
            'fecha_limite' => 'nullable|date',
            'forma_pago' => 'nullable|string',
            'cartel' => 'nullable|string',
            'enlace' => 'nullable|string',
            'tipo' => 'required|in:competicion,otros',
            'nombre' => 'nullable|string',
        ]);

        $competition = Competition::create($validated);

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
        if (!in_array($request->user()->role, ['admin', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $competition = Competition::findOrFail($id);

        $validated = $request->validate([
            'lugar' => 'nullable|string',
            'fecha_evento' => 'required|date',
            'fecha_fin_evento' => 'nullable|date',
            'fecha_limite' => 'nullable|date',
            'forma_pago' => 'nullable|string',
            'cartel' => 'nullable|string',
            'enlace' => 'nullable|string',
            'tipo' => 'required|in:competicion,otros',
            'nombre' => 'nullable|string',
        ]);

        $competition->update($validated);

        return response()->json($competition);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        if (!in_array($request->user()->role, ['admin', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        Competition::destroy($id);

        return response()->noContent();
    }
}
