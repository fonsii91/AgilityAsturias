<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Dog;
use App\Models\DogWorkload;

class DogWorkloadController extends Controller
{
    public function getAcwrData(Dog $dog)
    {
        // Security check
        if (auth()->user()->role !== 'admin' && !$dog->users()->where('users.id', auth()->id())->exists()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        return response()->json($dog->calculateAcwrData());
    }

    public function getPendingReviews(Dog $dog)
    {
        if (auth()->user()->role !== 'admin' && !$dog->users()->where('users.id', auth()->id())->exists()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $pending = $dog->workloads()
            ->where('status', 'pending_review')
            ->orderBy('date', 'desc')
            ->get();
            
        return response()->json($pending);
    }

    public function confirmWorkload(Request $request, DogWorkload $workload)
    {
        // Auth check happens based on owner of the dog
        $dog = $workload->dog;
        if (auth()->user()->role !== 'admin' && !$dog->users()->where('users.id', auth()->id())->exists()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'duration_min' => 'required|integer|min:1',
            'intensity_rpe' => 'required|integer|min:1|max:10',
            'jumped_max_height' => 'nullable|boolean',
            'number_of_runs' => 'nullable|integer'
        ]);

        $workload->update([
            'duration_min' => $data['duration_min'],
            'intensity_rpe' => $data['intensity_rpe'],
            'jumped_max_height' => $data['jumped_max_height'] ?? false,
            'number_of_runs' => $data['number_of_runs'] ?? null,
            'status' => 'confirmed'
        ]);

        return response()->json($workload);
    }
    
    public function store(Request $request, Dog $dog)
    {
        if (auth()->user()->role !== 'admin' && !$dog->users()->where('users.id', auth()->id())->exists()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }
        
        $data = $request->validate([
            'duration_min' => 'required|integer|min:1',
            'intensity_rpe' => 'required|integer|min:1|max:10',
            'date' => 'required|date',
            'activity_type' => 'nullable|string',
            'jumped_max_height' => 'nullable|boolean',
            'number_of_runs' => 'nullable|integer'
        ]);
        
        $sourceType = 'manual';

        $workload = $dog->workloads()->create([
            'user_id' => auth()->id(),
            'source_type' => $sourceType,
            'date' => $data['date'],
            'duration_min' => $data['duration_min'],
            'intensity_rpe' => $data['intensity_rpe'],
            'jumped_max_height' => $data['jumped_max_height'] ?? false,
            'number_of_runs' => $data['number_of_runs'] ?? null,
            'status' => 'confirmed' // manual is always confirmed
        ]);
        
        
        return response()->json($workload);
    }

    public function update(Request $request, DogWorkload $workload)
    {
        $dog = $workload->dog;
        if (auth()->user()->role !== 'admin' && !$dog->users()->where('users.id', auth()->id())->exists()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'duration_min' => 'required|integer|min:1',
            'intensity_rpe' => 'required|integer|min:1|max:10',
            'date' => 'required|date',
            'jumped_max_height' => 'nullable|boolean',
            'number_of_runs' => 'nullable|integer'
        ]);

        $workload->update([
            'date' => $data['date'],
            'duration_min' => $data['duration_min'],
            'intensity_rpe' => $data['intensity_rpe'],
            'jumped_max_height' => $data['jumped_max_height'] ?? false,
            'number_of_runs' => $data['number_of_runs'] ?? null,
        ]);

        return response()->json($workload);
    }

    public function destroy(DogWorkload $workload)
    {
        $dog = $workload->dog;
        if (auth()->user()->role !== 'admin' && !$dog->users()->where('users.id', auth()->id())->exists()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $workload->delete();

        return response()->json(['success' => true]);
    }
}
