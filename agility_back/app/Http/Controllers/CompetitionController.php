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

                $comp->attending_dog_ids = $comp->attendingDogs()
                    ->wherePivot('user_id', $user->id)
                    ->pluck('dogs.id');
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
        if (!in_array($request->user()->role, ['admin', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        Competition::destroy($id);

        return response()->noContent();
    }

    public function attend(Request $request, string $id)
    {
        $request->validate([
            'dog_ids' => 'nullable|array',
            'dog_ids.*' => 'exists:dogs,id',
            'dias_asistencia' => 'nullable|array',
            'dias_asistencia.*' => 'string'
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
        if ($request->has('dog_ids')) {
            $validDogIds = collect($request->dog_ids)->intersect($userDogs)->toArray();

            // Detach dog entries specifically tied to this user to refresh them
            \Illuminate\Support\Facades\DB::table('competition_dog')
                ->where('competition_id', $competition->id)
                ->where('user_id', $user->id)
                ->delete();

            // Re-attach selected dogs passing the user_id context
            foreach ($validDogIds as $dogId) {
                $competition->attendingDogs()->attach($dogId, ['user_id' => $user->id]);
            }
        } else {
            // Remove all user's dogs entries for this competition
            \Illuminate\Support\Facades\DB::table('competition_dog')
                ->where('competition_id', $competition->id)
                ->where('user_id', $user->id)
                ->delete();
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
                ->get();
            $user->dias_asistencia = $user->pivot->dias_asistencia ? json_decode($user->pivot->dias_asistencia, true) : [];
            return $user;
        });

        return response()->json($attendees);
    }
}
