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

        $today = now()->toDateString();
        
        // Auto-generate pending workloads for unverified active reservations
        $unverifiedReservations = \App\Models\Reservation::where('dog_id', $dog->id)
            ->where('status', 'active')
            ->where('attendance_verified', false)
            ->where('date', '<=', $today)
            ->get();
            
        foreach ($unverifiedReservations as $res) {
            \App\Models\DogWorkload::firstOrCreate(
                [
                    'dog_id' => $dog->id,
                    'source_type' => 'auto_attendance',
                    'source_id' => $res->id
                ],
                [
                    'date' => $res->date,
                    'duration_min' => 10, // Se recalculará sobre la marcha abajo
                    'intensity_rpe' => 6,
                    'status' => 'pending_review',
                    'is_staff_verified' => false
                ]
            );
        }
        
        // Auto-generate pending workloads for unverified competitions
        $unverifiedCompetitions = \App\Models\Competition::where('attendance_verified', false)
            ->where('tipo', 'competicion')
            ->where('fecha_evento', '<=', $today)
            ->whereHas('attendingDogs', function($q) use ($dog) {
                $q->where('dogs.id', $dog->id);
            })
            ->get();
            
        foreach ($unverifiedCompetitions as $comp) {
            \App\Models\DogWorkload::firstOrCreate(
                [
                    'dog_id' => $dog->id,
                    'source_type' => 'auto_competition',
                    'source_id' => $comp->id
                ],
                [
                    'date' => $comp->fecha_evento,
                    'duration_min' => 5,
                    'intensity_rpe' => 9,
                    'status' => 'pending_review',
                    'is_staff_verified' => false
                ]
            );
        }

        $pending = $dog->workloads()
            ->where('status', 'pending_review')
            ->orderBy('date', 'desc')
            ->get();
            
        // Calcular dinámicamente "al vuelo" para no anclar estimaciones viejas
        foreach ($pending as $p) {
            if ($p->source_type === 'auto_competition') {
                $p->duration_min = 5;
            } else if ($p->source_type === 'auto_attendance' && $p->source_id) {
                $res = \App\Models\Reservation::with('timeSlot')->find($p->source_id);
                if ($res && $res->timeSlot) {
                    $start = \Carbon\Carbon::parse($res->timeSlot->start_time);
                    $end = \Carbon\Carbon::parse($res->timeSlot->end_time);
                    $classLength = $start->diffInMinutes($end);
                    $p->duration_min = max(1, (int) round($classLength * (8 / 60)));
                } else {
                    $p->duration_min = 8;
                }
            } else {
                $p->duration_min = 8;
            }
        }
            
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
            'user_id' => auth()->id(),
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

    public function adminMonitorData()
    {
        // Solo admin
        if (auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $workloads = \App\Models\DogWorkload::whereIn('status', ['confirmed', 'auto_confirmed'])
            ->where('date', '>=', \Carbon\Carbon::now()->subDays(28))
            ->with(['dog.users', 'user']) // eager load dog owners and workload user
            ->get();

        $statsByUser = [];

        foreach ($workloads as $w) {
            $user = $w->user; // Trazabilidad estricta
            if (!$user && $w->dog && $w->dog->users->count() > 0) {
                // Fallback historico para registros antiguos sin user_id
                $user = $w->dog->users->first();
            }

            if ($user) {
                $id = $user->id;
                if (!isset($statsByUser[$id])) {
                    $statsByUser[$id] = [
                        'user_id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'total_workloads' => 0,
                        'manual_workloads' => 0,
                        'auto_workloads' => 0,
                        'dogs' => []
                    ];
                }

                $statsByUser[$id]['total_workloads']++;
                if ($w->status === 'auto_confirmed') {
                    $statsByUser[$id]['auto_workloads']++;
                } else {
                    $statsByUser[$id]['manual_workloads']++;
                }

                if ($w->dog) {
                    $statsByUser[$id]['dogs'][$w->dog->id] = $w->dog->name;
                }
            }
        }

        // Format dogs map into string lists and sort
        $result = array_values($statsByUser);
        foreach ($result as &$stat) {
            $stat['dogs_list'] = array_values($stat['dogs']);
            unset($stat['dogs']);
        }

        // Sort by total workloads descending
        usort($result, function($a, $b) {
            return $b['total_workloads'] <=> $a['total_workloads'];
        });

        return response()->json($result);
    }
}
