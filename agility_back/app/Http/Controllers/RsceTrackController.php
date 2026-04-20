<?php

namespace App\Http\Controllers;

use App\Models\RsceTrack;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RsceTrackController extends Controller
{
    public function index()
    {
        // Get all tracks for dogs owned by the authenticated user
        $user = Auth::user();
        return RsceTrack::whereHas('dog.users', function ($query) use ($user) {
            $query->where('users.id', $user->id);
        })->orderBy('date', 'desc')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'dog_id' => 'required|exists:dogs,id',
            'date' => 'required|date',
            'manga_type' => 'required|string|max:50',
            'qualification' => 'required|string|max:100', // Increased to 100 to support longer texts like NO CLASIFICADO
            'speed' => 'nullable|numeric|between:0,99.99',
            'judge_name' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        // Security check: ensure the user owns the dog
        $user = Auth::user();
        $isOwner = $user->dogs()->where('dogs.id', $validated['dog_id'])->exists();
        
        if (!$isOwner) {
            return response()->json(['message' => 'No tienes permiso para gestionar este perro'], 403);
        }

        $track = RsceTrack::create($validated);
        return response()->json($track, 201);
    }

    public function update(Request $request, RsceTrack $rsceTrack)
    {
        // Check ownership
        $user = Auth::user();
        $isOwner = $user->dogs()->where('dogs.id', $rsceTrack->dog_id)->exists();
        
        if (!$isOwner) {
            return response()->json(['message' => 'No tienes permiso para modificar esta pista'], 403);
        }

        $validated = $request->validate([
            'date' => 'required|date',
            'manga_type' => 'required|string|max:50',
            'qualification' => 'required|string|max:100', // Increased to 100
            'speed' => 'nullable|numeric|between:0,99.99',
            'judge_name' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $rsceTrack->update($validated);
        return response()->json($rsceTrack);
    }

    public function destroy(RsceTrack $rsceTrack)
    {
        // Check ownership
        $user = Auth::user();
        $isOwner = $user->dogs()->where('dogs.id', $rsceTrack->dog_id)->exists();
        
        if (!$isOwner) {
            return response()->json(['message' => 'No tienes permiso para eliminar esta pista'], 403);
        }

        $rsceTrack->delete();
        return response()->noContent();
    }

    public function adminMonitorData()
    {
        // Solo admin
        if (auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tracks = \App\Models\RsceTrack::with('dog.users')->get();

        $statsByUser = [];

        foreach ($tracks as $t) {
            $user = null;
            if ($t->dog && $t->dog->users->count() > 0) {
                // Atribuir al dueño primario
                $user = $t->dog->users->first();
            }

            if ($user) {
                $id = $user->id;
                if (!isset($statsByUser[$id])) {
                    $statsByUser[$id] = [
                        'user_id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'total_tracks' => 0,
                        'dogs' => []
                    ];
                }

                $statsByUser[$id]['total_tracks']++;

                if ($t->dog) {
                    $statsByUser[$id]['dogs'][$t->dog->id] = $t->dog->name;
                }
            }
        }

        // Format dogs map into string lists and sort
        $result = array_values($statsByUser);
        foreach ($result as &$stat) {
            $stat['dogs_list'] = array_values($stat['dogs']);
            unset($stat['dogs']);
        }

        // Sort by total tracks descending
        usort($result, function($a, $b) {
            return $b['total_tracks'] <=> $a['total_tracks'];
        });

        return response()->json($result);
    }
}
