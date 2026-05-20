<?php

namespace App\Http\Controllers;

use App\Models\Competition;
use App\Models\User;
use App\Notifications\NewEventNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Http\Request;

class CompetitionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $competitions = Competition::all();
        $user = $request->user('sanctum');

        if ($user) {
            $competitions->transform(function ($comp) use ($user) {
                $userAttendance = $comp->attendees()->where('competition_user.user_id', $user->id)->first();
                $comp->is_attending = $userAttendance ? true : false;
                $comp->dias_asistencia = $userAttendance && $userAttendance->pivot->dias_asistencia ? json_decode($userAttendance->pivot->dias_asistencia, true) : [];

                $attendingDogsPivot = $comp->attendingDogs()->wherePivot('user_id', $user->id)->get();
                $comp->attending_dog_ids = $attendingDogsPivot->pluck('id');
                $comp->attending_dogs_details = $attendingDogsPivot->map(function ($dog) {
                    return [
                        'id' => $dog->id,
                        'dias_asistencia' => $dog->pivot->dias_asistencia ? json_decode($dog->pivot->dias_asistencia, true) : []
                    ];
                });
                
                $comp->all_attending_dog_ids = $comp->attendingDogs()->pluck('dogs.id')->unique()->values();

                return $comp;
            });
        }

        return $competitions;
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
            'lugar' => 'nullable|string',
            'fecha_evento' => 'required|date',
            'fecha_fin_evento' => 'nullable|date',
            'fecha_limite' => 'nullable|date',
            'forma_pago' => 'nullable|string',
            'cartel' => 'nullable|string|max:2800000',
            'enlace' => 'nullable|string',
            'tipo' => 'required|in:competicion,otros',
            'federacion' => 'required_if:tipo,competicion|in:RSCE,RFEC,Otro|nullable',
            'nombre' => 'nullable|string',
            'judge_name' => 'nullable|string',
        ]);

        $competition = Competition::create($validated);

        Notification::send(User::all(), new NewEventNotification($competition));

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
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $competition = Competition::findOrFail($id);

        $validated = $request->validate([
            'lugar' => 'nullable|string',
            'fecha_evento' => 'required|date',
            'fecha_fin_evento' => 'nullable|date',
            'fecha_limite' => 'nullable|date',
            'forma_pago' => 'nullable|string',
            'cartel' => 'nullable|string|max:2800000',
            'enlace' => 'nullable|string',
            'tipo' => 'required|in:competicion,otros',
            'federacion' => 'required_if:tipo,competicion|in:RSCE,RFEC,Otro|nullable',
            'nombre' => 'nullable|string',
            'judge_name' => 'nullable|string',
        ]);

        $competition->update($validated);

        return response()->json($competition);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $competition = Competition::findOrFail($id);

        $dateToCompare = $competition->fecha_fin_evento ?: $competition->fecha_evento;
        if ($dateToCompare && $dateToCompare < now()->format('Y-m-d')) {
            abort(403, 'Cannot delete historical events.');
        }

        $competition->delete();

        return response()->noContent();
    }

    public function attend(Request $request, string $id)
    {
        $request->validate([
            'dog_ids' => 'nullable|array',
            'dog_ids.*' => 'exists:dogs,id',
            'dias_asistencia' => 'nullable|array',
            'dias_asistencia.*' => 'string',
            'dogs_attendance' => 'nullable|array',
            'dogs_attendance.*.dog_id' => 'required_with:dogs_attendance|exists:dogs,id',
            'dogs_attendance.*.dias_asistencia' => 'nullable|array',
            'dogs_attendance.*.dias_asistencia.*' => 'string'
        ]);

        $competition = Competition::findOrFail($id);
        $user = $request->user();

        // Attach user
        $pivotData = [];
        if ($request->has('dias_asistencia')) {
            $pivotData = ['dias_asistencia' => json_encode($request->dias_asistencia)];
        }
        
        $competition->attendees()->syncWithoutDetaching([$user->id => $pivotData]);

        // Attach dogs (verify they belong to user)
        $userDogs = $user->dogs()->pluck('dogs.id')->toArray();
        
        \Illuminate\Support\Facades\DB::table('competition_dog')
            ->where('competition_id', $competition->id)
            ->where('user_id', $user->id)
            ->delete();

        if ($request->has('dogs_attendance')) {
            $dogsAttendance = collect($request->dogs_attendance)->filter(function ($item) use ($userDogs) {
                return in_array($item['dog_id'], $userDogs);
            });

            foreach ($dogsAttendance as $att) {
                $dogPivotData = ['user_id' => $user->id];
                if (isset($att['dias_asistencia'])) {
                    $dogPivotData['dias_asistencia'] = json_encode($att['dias_asistencia']);
                }
                $competition->attendingDogs()->attach($att['dog_id'], $dogPivotData);
            }
        } elseif ($request->has('dog_ids')) {
            // Fallback for legacy format
            $validDogIds = collect($request->dog_ids)->intersect($userDogs)->toArray();
            foreach ($validDogIds as $dogId) {
                $dogPivotData = ['user_id' => $user->id];
                if ($request->has('dias_asistencia')) {
                    $dogPivotData['dias_asistencia'] = json_encode($request->dias_asistencia);
                }
                $competition->attendingDogs()->attach($dogId, $dogPivotData);
            }
        }

        return response()->json(['message' => 'Attendance recorded successfully']);
    }

    public function unattend(Request $request, string $id)
    {
        $competition = Competition::findOrFail($id);
        $user = $request->user();

        $competition->attendees()->detach($user->id);

        \Illuminate\Support\Facades\DB::table('competition_dog')
            ->where('competition_id', $competition->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json(['message' => 'Attendance removed successfully']);
    }

    public function getAttendees(string $id)
    {
        $competition = Competition::findOrFail($id);

        $attendees = $competition->attendees()->select('users.id', 'users.name', 'users.photo_url')->get();

        $attendees->transform(function ($user) use ($competition) {
            $user->attending_dogs = $competition->attendingDogs()
                ->wherePivot('user_id', $user->id)
                ->select('dogs.id', 'dogs.name', 'dogs.photo_url')
                ->get()
                ->map(function ($dog) {
                    $dog->dias_asistencia = $dog->pivot->dias_asistencia ? json_decode($dog->pivot->dias_asistencia, true) : [];
                    return $dog;
                });
            $user->dias_asistencia = $user->pivot->dias_asistencia ? json_decode($user->pivot->dias_asistencia, true) : [];
            return $user;
        });

        return response()->json($attendees);
    }

    public function adminScraperStatus(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized action.');
        }

        $today = now()->toDateString();
        $competitions = Competition::where('tipo', 'competicion')
            ->where(function($query) use ($today) {
                $query->where(function ($q) use ($today) {
                    $q->whereNotNull('fecha_fin_evento')
                      ->where('fecha_fin_evento', '<', $today);
                })->orWhere(function ($q) use ($today) {
                    $q->whereNull('fecha_fin_evento')
                      ->where('fecha_evento', '<', $today);
                });
            })
            ->orderBy('fecha_evento', 'desc')
            ->get();

        return response()->json($competitions);
    }

    public function adminScraperRun(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'competition_id' => 'required|exists:competitions,id'
        ]);

        $competition = Competition::findOrFail($request->competition_id);
        
        if (empty($competition->enlace) || strpos($competition->enlace, 'flowagility.com') === false) {
            return response()->json([
                'message' => 'Esta competición no tiene un enlace válido de FlowAgility.'
            ], 422);
        }

        $endDate = $competition->fecha_fin_evento ?: $competition->fecha_evento;
        if (now()->toDateString() <= $endDate) {
            return response()->json([
                'message' => 'No se puede realizar el scraping de una competición que aún no ha finalizado.'
            ], 422);
        }

        try {
            $competition->scrape_status = 'processing';
            $competition->scrape_error = null;
            $competition->save();

            \App\Jobs\ScrapeCompetitionJob::dispatch($competition->id);

            return response()->json([
                'message' => 'Scraping iniciado en segundo plano.',
                'status' => 'processing',
                'competition' => $competition
            ]);
        } catch (\Exception $e) {
            $competition->scrape_status = 'failed';
            $competition->scrape_error = $e->getMessage();
            $competition->save();

            return response()->json([
                'message' => 'Error al iniciar el scraping: ' . $e->getMessage()
            ], 500);
        }
    }

    public function adminScraperLastTracks(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized action.');
        }

        $rsce = \App\Models\RsceTrack::with(['dog.users', 'club'])
            ->where('notes', 'like', '%FlowAgility%')
            ->orderBy('id', 'desc')
            ->limit(100)
            ->get()
            ->map(function ($track) {
                $track->federation = 'RSCE';
                return $track;
            });

        $rfec = \App\Models\RfecTrack::with(['dog.users', 'club'])
            ->where('notes', 'like', '%FlowAgility%')
            ->orderBy('id', 'desc')
            ->limit(100)
            ->get()
            ->map(function ($track) {
                $track->federation = 'RFEC';
                return $track;
            });

        $merged = $rsce->concat($rfec)
            ->sortByDesc('created_at')
            ->take(100)
            ->values();

        $formatted = $merged->map(function ($track) {
            $primaryUser = $track->dog && $track->dog->users ? $track->dog->users->first() : null;
            return [
                'id' => $track->id,
                'federation' => $track->federation,
                'club_name' => $track->club ? $track->club->name : 'N/A',
                'dog_name' => $track->dog ? $track->dog->name : 'N/A',
                'owner_name' => $primaryUser ? $primaryUser->name : 'N/A',
                'manga_type' => $track->manga_type,
                'qualification' => $track->qualification,
                'speed' => $track->speed,
                'time' => $track->time,
                'faults' => $track->faults,
                'refusals' => $track->refusals,
                'total_penalty' => $track->total_penalty,
                'is_clean' => $track->is_clean,
                'location' => $track->location,
                'date' => $track->date,
                'created_at' => $track->created_at ? $track->created_at->toDateTimeString() : null,
                'is_my_dog' => ($track->dog && $track->dog->users ? $track->dog->users->contains('id', auth()->id()) : false),
            ];
        });

        return response()->json($formatted);
    }

    public function memberScraperLastTracks(Request $request)
    {
        $rsce = \App\Models\RsceTrack::with(['dog.users', 'club'])
            ->where('notes', 'like', '%FlowAgility%')
            ->orderBy('id', 'desc')
            ->limit(100)
            ->get()
            ->map(function ($track) {
                $track->federation = 'RSCE';
                return $track;
            });

        $rfec = \App\Models\RfecTrack::with(['dog.users', 'club'])
            ->where('notes', 'like', '%FlowAgility%')
            ->orderBy('id', 'desc')
            ->limit(100)
            ->get()
            ->map(function ($track) {
                $track->federation = 'RFEC';
                return $track;
            });

        $merged = $rsce->concat($rfec)
            ->sortByDesc('created_at')
            ->take(100)
            ->values();

        $formatted = $merged->map(function ($track) {
            $primaryUser = $track->dog && $track->dog->users ? $track->dog->users->first() : null;
            return [
                'id' => $track->id,
                'federation' => $track->federation,
                'club_name' => $track->club ? $track->club->name : 'N/A',
                'dog_name' => $track->dog ? $track->dog->name : 'N/A',
                'owner_name' => $primaryUser ? $primaryUser->name : 'N/A',
                'manga_type' => $track->manga_type,
                'qualification' => $track->qualification,
                'speed' => $track->speed,
                'time' => $track->time,
                'faults' => $track->faults,
                'refusals' => $track->refusals,
                'total_penalty' => $track->total_penalty,
                'is_clean' => $track->is_clean,
                'location' => $track->location,
                'date' => $track->date,
                'created_at' => $track->created_at ? $track->created_at->toDateTimeString() : null,
                'is_my_dog' => ($track->dog && $track->dog->users ? $track->dog->users->contains('id', auth()->id()) : false),
            ];
        });

        return response()->json($formatted);
    }
}

