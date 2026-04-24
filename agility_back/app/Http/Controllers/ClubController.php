<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Club;

class ClubController extends Controller
{
    public function current()
    {
        if (app()->bound('active_club_id')) {
            $club = Club::find(app('active_club_id'));
            if ($club) {
                return response()->json([
                    'id' => $club->id,
                    'name' => $club->name,
                    'slug' => $club->slug,
                    'domain' => $club->domain,
                    'logo_url' => $club->logo_url,
                    'settings' => $club->settings,
                ]);
            }
        }
        
        return response()->json(null, 404);
    }

    public function index()
    {
        return response()->json(Club::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:clubs,slug',
            'domain' => 'nullable|string|max:255|unique:clubs,domain',
            'logo_url' => 'nullable|string|max:255',
            'settings' => 'nullable|array',
        ]);

        $club = Club::create($validated);
        return response()->json($club, 201);
    }

    public function update(Request $request, Club $club)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:clubs,slug,' . $club->id,
            'domain' => 'nullable|string|max:255|unique:clubs,domain,' . $club->id,
            'logo_url' => 'nullable|string|max:255',
            'settings' => 'nullable|array',
        ]);

        $club->update($validated);
        return response()->json($club);
    }

    public function destroy(Club $club)
    {
        // Don't delete the default club
        if ($club->id === 1) {
            return response()->json(['message' => 'No se puede eliminar el club principal.'], 403);
        }
        
        $club->delete();
        return response()->json(['message' => 'Club eliminado correctamente']);
    }
}
