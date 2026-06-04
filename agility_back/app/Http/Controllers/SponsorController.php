<?php

namespace App\Http\Controllers;

use App\Models\Sponsor;
use Illuminate\Http\Request;

class SponsorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Under HasClub trait, this automatically gets scoped to the active club
        return Sponsor::orderBy('created_at', 'desc')->get();
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
            'nombre' => 'required|string|max:255',
            'enlace' => 'nullable|string|max:2048',
            'descripcion' => 'nullable|string',
            'imagen' => 'nullable|string|max:2800000', // Base64 image
        ]);

        $sponsor = Sponsor::create($validated);

        return response()->json($sponsor, 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $sponsor = Sponsor::findOrFail($id);

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'enlace' => 'nullable|string|max:2048',
            'descripcion' => 'nullable|string',
            'imagen' => 'nullable|string|max:2800000', // Base64 image
        ]);

        $sponsor->update($validated);

        return response()->json($sponsor);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $sponsor = Sponsor::findOrFail($id);
        $sponsor->delete();

        return response()->noContent();
    }
}
