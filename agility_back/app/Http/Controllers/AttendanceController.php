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
                        $club = $res->dog->club;
                        $gamificationEnabled = $club ? ($club->settings['gamification_enabled'] ?? true) : true;

                        if ($gamificationEnabled) {
                            $activeSeason = \App\Models\GamificationSeason::where('status', 'active')
                                ->where('gamification_type', 'ranking')
                                ->first();

                            $activeStickersSeason = \App\Models\GamificationSeason::where('status', 'active')
                                ->where('gamification_type', 'stickers')
                                ->first();

                            if ($activeSeason) {
                                $seasonId = $activeSeason->id;
                                $seasonPoint = \App\Models\DogSeasonPoint::firstOrCreate([
                                    'dog_id' => $res->dog->id,
                                    'season_id' => $seasonId,
                                ]);
                                $seasonPoint->increment('points', 3);
                                $res->dog->increment('points', 3);

                                PointHistory::create([
                                    'dog_id' => $res->dog->id,
                                    'points' => 3,
                                    'category' => 'Asistencia a entrenamiento',
                                    'season_id' => $seasonId,
                                ]);
                            } else if ($activeStickersSeason) {
                                if ($res->dog && $res->dog->users) {
                                    foreach ($res->dog->users as $owner) {
                                        $profile = \App\Models\UserStickerProfile::firstOrCreate([
                                            'user_id' => $owner->id,
                                            'season_id' => $activeStickersSeason->id
                                        ], [
                                            'coins' => 0,
                                            'unopened_chests_count' => 0,
                                            'claimed_promotions' => []
                                        ]);
                                        $profile->increment('unopened_chests_count', 1);
                                    }
                                }
                            }
                            
                            if ($res->dog && $res->dog->users) {
                                foreach ($res->dog->users as $owner) {
                                    Notification::send($owner, new DogPointNotification($res->dog));
                                }
                            }
                        }

                        $workload = \App\Models\DogWorkload::firstOrCreate(
                            ['dog_id' => $res->dog->id, 'source_type' => 'auto_attendance', 'source_id' => $res->id],
                            ['date' => $date, 'duration_min' => 5, 'intensity_rpe' => 6, 'status' => 'pending_review']
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

        $competitions->transform(function ($comp) {
            $comp->attendingDogs->transform(function ($dog) {
                $dog->dias_asistencia = $dog->pivot->dias_asistencia ? json_decode($dog->pivot->dias_asistencia, true) : [];
                return $dog;
            });
            return $comp;
        });

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
                $oldDias = isset($originalPivots[$dogData['id']]) ? $originalPivots[$dogData['id']]->dias_asistencia : null;
                $syncData[$dogData['id']] = ['position' => $pos, 'user_id' => $oldUserId];
                if ($oldDias) {
                    $syncData[$dogData['id']]['dias_asistencia'] = $oldDias;
                }
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
                        $club = $dog->club;
                        $gamificationEnabled = $club ? ($club->settings['gamification_enabled'] ?? true) : true;

                        if ($gamificationEnabled) {
                            $activeSeason = \App\Models\GamificationSeason::where('status', 'active')
                                ->where('gamification_type', 'ranking')
                                ->first();

                            $activeStickersSeason = \App\Models\GamificationSeason::where('status', 'active')
                                ->where('gamification_type', 'stickers')
                                ->first();

                            if ($activeSeason) {
                                $seasonId = $activeSeason->id;
                                $seasonPoint = \App\Models\DogSeasonPoint::firstOrCreate([
                                    'dog_id' => $dog->id,
                                    'season_id' => $seasonId,
                                ]);
                                $seasonPoint->increment('points', $pointsToAdd);
                                $dog->increment('points', $pointsToAdd);

                                PointHistory::create([
                                    'dog_id' => $dog->id,
                                    'points' => $pointsToAdd,
                                    'category' => $categoryName,
                                    'season_id' => $seasonId,
                                ]);
                            } else if ($activeStickersSeason) {
                                $dog->load('users');
                                if ($dog->users) {
                                    foreach ($dog->users as $owner) {
                                        $profile = \App\Models\UserStickerProfile::firstOrCreate([
                                            'user_id' => $owner->id,
                                            'season_id' => $activeStickersSeason->id
                                        ], [
                                            'coins' => 0,
                                            'unopened_chests_count' => 0,
                                            'claimed_promotions' => []
                                        ]);
                                        $profile->increment('unopened_chests_count', 1);
                                    }
                                }
                            }
                            // Notificamos a todos los dueños del perro
                            $dog->load('users');
                            if ($dog->users) {
                                foreach ($dog->users as $owner) {
                                    \Illuminate\Support\Facades\Notification::send($owner, new \App\Notifications\DogPointNotification($dog));
                                }
                            }
                        }

                        // Solo registrar cargas de trabajo automáticas para eventos deportivos (Competiciones y Exhibiciones)
                        if ($competition->tipo === 'competicion' || $competition->tipo === 'exhibicion') {
                            $diasAsistencia = [$competition->fecha_evento]; // Default

                            // First, try dog-specific days
                            if (isset($data['dias_asistencia']) && $data['dias_asistencia']) {
                                $parsed = json_decode($data['dias_asistencia'], true);
                                if (!empty($parsed)) {
                                    $diasAsistencia = $parsed;
                                }
                            } else {
                                // Fallback to user days
                                if (isset($data['user_id']) && $data['user_id']) {
                                    $userAttendance = $competition->attendees()->where('users.id', $data['user_id'])->first();
                                    if ($userAttendance && $userAttendance->pivot->dias_asistencia) {
                                        $parsed = json_decode($userAttendance->pivot->dias_asistencia, true);
                                        if (!empty($parsed)) {
                                            $diasAsistencia = $parsed;
                                        }
                                    }
                                }
                            }

                            // Un día de compe (calentamientos + mangas + estrés) pesa al menos como una clase (5x6=30):
                            // 4 min x RPE 8 = 32. Exhibición más ligera: 2 min x RPE 5 = 10.
                            $isExhibicion = $competition->tipo === 'exhibicion';
                            $durationMin = $isExhibicion ? 2 : 4;
                            $intensityRpe = $isExhibicion ? 5 : 8;

                            foreach ($diasAsistencia as $dia) {
                                $compWorkload = \App\Models\DogWorkload::firstOrCreate(
                                    [
                                        'dog_id' => $dog->id,
                                        'source_type' => 'auto_competition',
                                        'source_id' => $competitionId,
                                        'date' => $dia
                                    ],
                                    [
                                        'duration_min' => $durationMin,
                                        'intensity_rpe' => $intensityRpe,
                                        'number_of_runs' => $isExhibicion ? null : 2,
                                        'status' => 'pending_review'
                                    ]
                                );
                                $compWorkload->is_staff_verified = true;
                                $compWorkload->save();
                            }
                        }
                    }
                }
            }

            $competition->attendance_verified = true;
            $competition->save();
        });

        return response()->json(['message' => 'Asistencia de competición confirmada']);
    }

    // Fetch aggregated club attendance statistics
    public function historyStats(Request $request)
    {
        $clubId = app()->bound('active_club_id') ? app('active_club_id') : null;

        // Total active members (excluding global admins)
        $totalMembers = User::where('role', '!=', 'admin')->count();

        // Classes attendance stats
        $totalClasses = Reservation::where('attendance_verified', true)->count();
        $completedClasses = Reservation::where('attendance_verified', true)->where('status', 'completed')->count();
        $globalAttendanceRate = $totalClasses > 0 ? round(($completedClasses / $totalClasses) * 100) : 0;

        // Events attendance stats
        $eventsCount = DB::table('competition_dog')
            ->join('competitions', 'competition_dog.competition_id', '=', 'competitions.id')
            ->where('competitions.attendance_verified', true)
            ->when($clubId, function ($query, $clubId) {
                return $query->where('competitions.club_id', $clubId);
            })
            ->select('competition_dog.user_id', 'competition_dog.competition_id')
            ->distinct()
            ->count();

        // Calculate monthly trend for the last 6 months
        $monthlyTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $monthLabel = $date->translatedFormat('M'); // e.g. "ene", "feb"
            $yearLabel = $date->format('y'); // e.g. "26"
            $label = ucfirst($monthLabel) . ' ' . $yearLabel;

            $startOfMonth = $date->copy()->startOfMonth();
            $endOfMonth = $date->copy()->endOfMonth();

            // Classes in this month
            $monthClasses = Reservation::where('attendance_verified', true)
                ->where('status', 'completed')
                ->whereBetween('date', [$startOfMonth, $endOfMonth])
                ->count();

            // Events in this month
            $monthEvents = DB::table('competition_dog')
                ->join('competitions', 'competition_dog.competition_id', '=', 'competitions.id')
                ->where('competitions.attendance_verified', true)
                ->when($clubId, function ($query, $clubId) {
                    return $query->where('competitions.club_id', $clubId);
                })
                ->whereBetween('competitions.fecha_evento', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                ->select('competition_dog.user_id', 'competition_dog.competition_id')
                ->distinct()
                ->count();

            $monthlyTrend[] = [
                'month' => $label,
                'classes' => $monthClasses,
                'events' => $monthEvents,
            ];
        }

        return response()->json([
            'total_members' => $totalMembers,
            'global_attendance_rate' => $globalAttendanceRate,
            'classes_attendance_count' => $completedClasses,
            'events_attendance_count' => $eventsCount,
            'monthly_trend' => $monthlyTrend,
        ]);
    }

    // Fetch attendance stats and list for a specific member
    public function historyStatsByMember(Request $request, $userId)
    {
        $clubId = app()->bound('active_club_id') ? app('active_club_id') : null;
        $user = User::with('dogs')->findOrFail($userId);

        // Classes stats
        $classesPossible = Reservation::where('user_id', $userId)->where('attendance_verified', true)->count();
        $classesAttended = Reservation::where('user_id', $userId)->where('attendance_verified', true)->where('status', 'completed')->count();
        $rateClasses = $classesPossible > 0 ? round(($classesAttended / $classesPossible) * 100, 1) : 100;

        // Events stats
        $eventsAttended = DB::table('competition_dog')
            ->join('competitions', 'competition_dog.competition_id', '=', 'competitions.id')
            ->where('competitions.attendance_verified', true)
            ->where('competition_dog.user_id', $userId)
            ->select('competition_dog.competition_id')
            ->distinct()
            ->count();

        $eventsPossible = DB::table('competition_user')
            ->join('competitions', 'competition_user.competition_id', '=', 'competitions.id')
            ->where('competitions.attendance_verified', true)
            ->where('competition_user.user_id', $userId)
            ->count();

        $eventsPossible = max($eventsPossible, $eventsAttended);
        $rateEvents = $eventsPossible > 0 ? round(($eventsAttended / $eventsPossible) * 100, 1) : 100;

        // Build history list
        $classes = Reservation::with('timeSlot')
            ->where('user_id', $userId)
            ->where('attendance_verified', true)
            ->get()
            ->map(function ($res) {
                $dateStr = null;
                if ($res->date instanceof \Carbon\Carbon) {
                    $dateStr = $res->date->toDateString();
                } else if ($res->date) {
                    $dateStr = Carbon::parse($res->date)->toDateString();
                }
                return [
                    'date' => $dateStr,
                    'name' => $res->timeSlot ? "Clase " . $res->timeSlot->start_time . "-" . $res->timeSlot->end_time : "Clase de Entrenamiento",
                    'type' => 'clase',
                    'status' => $res->status === 'completed' ? 'asistido' : 'ausente',
                ];
            });

        $registeredCompIds = DB::table('competition_user')
            ->join('competitions', 'competition_user.competition_id', '=', 'competitions.id')
            ->where('competitions.attendance_verified', true)
            ->where('competition_user.user_id', $userId)
            ->pluck('competition_id')
            ->toArray();

        $attendedCompIds = DB::table('competition_dog')
            ->join('competitions', 'competition_dog.competition_id', '=', 'competitions.id')
            ->where('competitions.attendance_verified', true)
            ->where('competition_dog.user_id', $userId)
            ->pluck('competition_id')
            ->toArray();

        $allCompIds = array_unique(array_merge($registeredCompIds, $attendedCompIds));

        $competitions = Competition::whereIn('id', $allCompIds)->get()->map(function ($comp) use ($attendedCompIds) {
            $attended = in_array($comp->id, $attendedCompIds);
            return [
                'date' => $comp->fecha_evento,
                'name' => $comp->nombre ?: "Competición " . $comp->lugar,
                'type' => 'evento',
                'status' => $attended ? 'asistido' : 'ausente',
            ];
        });

        $historyList = collect($classes)
            ->concat($competitions)
            ->sortByDesc('date')
            ->values()
            ->toArray();

        return response()->json([
            'member_info' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'dogs' => $user->dogs->map(function($dog) {
                    return ['id' => $dog->id, 'name' => $dog->name];
                })
            ],
            'summary' => [
                'total_classes_attended' => $classesAttended,
                'total_classes_possible' => $classesPossible,
                'attendance_rate_classes' => $rateClasses,
                'total_events_attended' => $eventsAttended,
                'total_events_possible' => $eventsPossible,
                'attendance_rate_events' => $rateEvents,
            ],
            'history_list' => $historyList
        ]);
    }
}
