<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\Competition;
use App\Models\User;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use App\Notifications\DogPointNotification;
use Illuminate\Support\Facades\Notification;
use App\Models\PointHistory;

class AttendanceController extends Controller
{
    // Fetch past reservations that haven't been verified yet
    public function pending()
    {
        $now = Carbon::now();
        $todayStr = $now->toDateString();
        $currentTime = $now->format('H:i');

        // Fetch all potential candidates (today or past)
        $reservations = Reservation::with(['user', 'timeSlot', 'dog'])
            ->where('attendance_verified', false)
            ->where('date', '<=', $todayStr)
            ->where('status', 'active') // Only verify active ones
            ->orderBy('date', 'desc')
            ->get();

        // Filter out orphaned reservations and today's future sessions
        $filtered = $reservations->filter(function ($res) use ($todayStr, $currentTime) {
            // Skip if the time slot was deleted (orphaned reservation)
            if (!$res->timeSlot) {
                return false;
            }

            if ($res->date < $todayStr)
                return true; // Past date
                
            // If today, check time
            if ($res->timeSlot->end_time < $currentTime)
                return true; // Session ended
                
            return false;
        });

        // Group by Date + Slot to make it easier for frontend
        // Structure: [ { date, slot, reservations: [] } ]
        $grouped = $filtered->groupBy(function ($res) {
            return $res->date . '|' . ($res->timeSlot ? $res->timeSlot->id : 'null');
        })->map(function ($group) {
            $first = $group->first();
            return [
                'date' => $first->date,
                'slot' => $first->timeSlot,
                'reservations' => $group->values()
            ];
        })->values();

        return response()->json($grouped);
    }

    // Confirm attendance for a specific session
    public function confirm(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'slot_id' => 'required|integer',
            'attended_ids' => 'present|array', // Array of Reservation IDs
            'attended_ids.*' => 'integer'
        ]);

        $date = $validated['date'];
        $slotId = $validated['slot_id'];
        $attendedIds = $validated['attended_ids'] ?? [];

        DB::transaction(function () use ($date, $slotId, $attendedIds) {
            // Fetch all pending reservations for this session
            $reservations = Reservation::where('date', $date)
                ->where('slot_id', $slotId)
                ->where('attendance_verified', false)
                ->with(['dog.users', 'timeSlot'])
                ->get();

            foreach ($reservations as $res) {
                $attended = in_array($res->id, $attendedIds);

                if ($attended) {
                    $res->status = 'completed';
                    // Award points directly to the assigned dog
                    if ($res->dog) {
                        $res->dog->increment('points', 3);
                        PointHistory::create([
                            'dog_id' => $res->dog->id,
                            'points' => 3,
                            'category' => 'Asistencia a entrenamiento'
                        ]);
                        
                        if ($res->dog && $res->dog->users) {
                            foreach ($res->dog->users as $owner) {
                                Notification::send($owner, new DogPointNotification($res->dog));
                            }
                        }

                        // Auto-create or confirm premature workload
                        $workload = \App\Models\DogWorkload::firstOrCreate(
                            ['dog_id' => $res->dog->id, 'source_type' => 'auto_attendance', 'source_id' => $res->id],
                            ['date' => $date, 'duration_min' => 10, 'intensity_rpe' => 5, 'status' => 'pending_review']
                        );
                        $workload->is_staff_verified = true;
                        $workload->save();
                    }
                } else {
                    // Did not attend (No Show)
                    // We mark as cancelled so it shows as such in history, or we could have a 'no_show' status
                    // For now, 'cancelled' is safest to clear it from "Active"
                    $res->status = 'cancelled';
                    
                    // Cleanup any prematurely generated workload since the dog didn't attend
                    \App\Models\DogWorkload::where('dog_id', ($res->dog ? $res->dog->id : null))
                        ->where('source_type', 'auto_attendance')
                        ->where('source_id', $res->id)
                        ->delete();
                }

                $res->attendance_verified = true;
                $res->save();
            }
        });

        return response()->json(['message' => 'Asistencia confirmada y puntos actualizados']);
    }

    // Fetch past competitions that haven't been verified yet
    public function pendingCompetitions()
    {
        $now = Carbon::now();
        $todayStr = $now->toDateString();

        $competitions = Competition::where('attendance_verified', false)
            ->where('fecha_evento', '<=', $todayStr)
            ->with(['attendees', 'attendingDogs'])
            ->orderBy('fecha_evento', 'desc')
            ->get();

        return response()->json($competitions);
    }

    // Confirm attendance for a competition
    public function confirmCompetition(Request $request)
    {
        $validated = $request->validate([
            'competition_id' => 'required|integer|exists:competitions,id',
            'attended_dogs' => 'present|array',
            'attended_dogs.*.id' => 'required|integer|exists:dogs,id',
            'attended_dogs.*.position' => 'nullable|string|in:1,2,3,4+',
            'new_attendees' => 'present|array',
            'new_attendees.*.user_id' => 'required|integer|exists:users,id',
            'new_attendees.*.dog_id' => 'required|integer|exists:dogs,id',
            'new_attendees.*.position' => 'nullable|string|in:1,2,3,4+',
        ]);

        $competitionId = $validated['competition_id'];
        $attendedDogsData = collect($validated['attended_dogs'] ?? []);
        $newAttendeesData = collect($validated['new_attendees'] ?? []);

        DB::transaction(function () use ($competitionId, $attendedDogsData, $newAttendeesData) {
            $competition = Competition::findOrFail($competitionId);

            // Re-sync all dogs that attended from original list
            $attendedDogIdsFromList = $attendedDogsData->pluck('id')->toArray();

            $allAttendedDogIds = [];
            $syncData = [];

            // Get original pivot data before syncing to preserve user_id
            $originalPivots = \Illuminate\Support\Facades\DB::table('competition_dog')
                                ->where('competition_id', $competitionId)
                                ->get()
                                ->keyBy('dog_id');

            // Add original attended dogs to sync data
            foreach ($attendedDogsData as $dogData) {
                $allAttendedDogIds[] = $dogData['id'];
                $pos = !empty($dogData['position']) ? $dogData['position'] : '4+';
                
                $oldUserId = isset($originalPivots[$dogData['id']]) ? $originalPivots[$dogData['id']]->user_id : null;
                $syncData[$dogData['id']] = ['position' => $pos, 'user_id' => $oldUserId];
            }

            // Sync new attendees
            foreach ($newAttendeesData as $newAtt) {
                // Ensure user is attached
                if (!$competition->attendees()->where('users.id', $newAtt['user_id'])->exists()) {
                    $competition->attendees()->attach($newAtt['user_id']);
                }
                $allAttendedDogIds[] = $newAtt['dog_id'];
                $pos = !empty($newAtt['position']) ? $newAtt['position'] : '4+';
                $syncData[$newAtt['dog_id']] = ['position' => $pos, 'user_id' => $newAtt['user_id']];
            }

            // Override attending dogs for this competition exactly to those who effectively attended
            // Or we could keep the non-attended dogs without a position, but the requirement implies we just detach non-attendees or keep them?
            // Usually, "non-attended" means they didn't go. Let's say if they didn't go, we remove them from competition_dog.
            $competition->attendingDogs()->sync($syncData);

            // Assign points to dogs based on their positions
            // Position 1 -> 4 points
            // Position 2 -> 3 points
            // Position 3 -> 2 points
            // Position 4+ -> 1 point
            foreach ($syncData as $dogId => $data) {
                $position = $data['position'];

                $pointsToAdd = 0;
                $categoryName = 'Asistencia a competición ' . $competition->nombre;

                switch ($position) {
                    case '1':
                        $pointsToAdd = 4;
                        $categoryName = 'Primero en ' . $competition->nombre;
                        break;
                    case '2':
                        $pointsToAdd = 3;
                        $categoryName = 'Segundo en ' . $competition->nombre;
                        break;
                    case '3':
                        $pointsToAdd = 2;
                        $categoryName = 'Tercero en ' . $competition->nombre;
                        break;
                    case '4+':
                        $pointsToAdd = 1;
                        break;
                }

                if ($pointsToAdd > 0) {
                    $dog = \App\Models\Dog::find($dogId);
                    if ($dog) {
                        $dog->increment('points', $pointsToAdd);
                        PointHistory::create([
                            'dog_id' => $dog->id,
                            'points' => $pointsToAdd,
                            'category' => $categoryName
                        ]);
                        // Notificamos a todos los dueños del perro
                        $dog->load('users');
                        if ($dog->users) {
                            foreach ($dog->users as $owner) {
                                \Illuminate\Support\Facades\Notification::send($owner, new \App\Notifications\DogPointNotification($dog));
                            }
                        }

                        // Solo registrar cargas de trabajo automáticas para eventos deportivos (Competiciones reales)
                        if ($competition->tipo === 'competicion') {
                            // Auto-create or confirm premature workload for competition
                            $compWorkload = \App\Models\DogWorkload::firstOrCreate(
                                ['dog_id' => $dog->id, 'source_type' => 'auto_competition', 'source_id' => $competitionId],
                                ['date' => $competition->fecha_evento, 'duration_min' => 10, 'intensity_rpe' => 9, 'status' => 'pending_review']
                            );
                            $compWorkload->is_staff_verified = true;
                            $compWorkload->save();
                        }
                    }
                }
            }

            $competition->attendance_verified = true;
            $competition->save();
        });

        return response()->json(['message' => 'Asistencia de competición confirmada']);
    }
}
