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
                // Use plural users table since that's what Laravel uses internally for auth checks usually, but to be safe we can use relation
                $comp->is_attending = $comp->attendees()->where('competition_user.user_id', $user->id)->exists();

                $comp->attending_dog_ids = $comp->attendingDogs()
                    ->where('dogs.user_id', $user->id)
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
            'dog_ids.*' => 'exists:dogs,id'
        ]);

        $competition = Competition::findOrFail($id);
        $user = $request->user();

        // Attach user
        $competition->attendees()->syncWithoutDetaching([$user->id]);

        // Attach dogs (verify they belong to user)
        $userDogs = $user->dogs()->pluck('id')->toArray();
        if ($request->has('dog_ids')) {
            $validDogIds = collect($request->dog_ids)->intersect($userDogs)->toArray();

            // Detach only this user's dogs, then attach the new valid ones
            $competition->attendingDogs()->detach($userDogs);
            if (!empty($validDogIds)) {
                $competition->attendingDogs()->attach($validDogIds);
            }
        } else {
            // Remove user's dogs if no dog is sent
            $competition->attendingDogs()->detach($userDogs);
        }

        return response()->json(['message' => 'Attendance recorded successfully']);
    }

    public function unattend(Request $request, string $id)
    {
        $competition = Competition::findOrFail($id);
        $user = $request->user();

        $competition->attendees()->detach($user->id);

        $userDogs = $user->dogs()->pluck('id')->toArray();
        $competition->attendingDogs()->detach($userDogs);

        return response()->json(['message' => 'Attendance removed successfully']);
    }

    public function getAttendees(string $id)
    {
        $competition = Competition::findOrFail($id);

        $attendees = $competition->attendees()->select('users.id', 'users.name', 'users.photo_url')->get();

        $attendees->transform(function ($user) use ($competition) {
            $user->attending_dogs = $competition->attendingDogs()
                ->where('dogs.user_id', $user->id)
                ->select('dogs.id', 'dogs.name', 'dogs.photo_url')
                ->get();
            return $user;
        });

        return response()->json($attendees);
    }
}
