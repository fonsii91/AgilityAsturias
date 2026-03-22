<?php

namespace App\Http\Controllers;

use App\Models\Dog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Notifications\DogExtraPointNotification;
use App\Models\PointHistory;

class DogController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        return $request->user()->dogs()->with(['pointHistories' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }])->orderBy('name', 'asc')->get();
    }

    /**
     * Display a listing of all dogs in the system.
     */
    public function all()
    {
        return Dog::with(['user:id,name', 'pointHistories' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }])->orderBy('name', 'asc')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'breed' => 'nullable|string',
            'birth_date' => 'nullable|date',
            'license_expiration_date' => 'nullable|date',
            'microchip' => 'nullable|string|max:15',
            'pedigree' => 'nullable|string',
        ]);

        $dog = $request->user()->dogs()->create($validated);

        return response()->json($dog, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return Auth::user()->dogs()->with(['pointHistories' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }])->findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $dog = Auth::user()->dogs()->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string',
            'breed' => 'nullable|string',
            'birth_date' => 'nullable|date',
            'license_expiration_date' => 'nullable|date',
            'microchip' => 'nullable|string|max:15',
            'pedigree' => 'nullable|string',
        ]);

        $dog->update($validated);

        $dog->load(['pointHistories' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }]);

        return response()->json($dog);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $dog = Auth::user()->dogs()->findOrFail($id);
        $dog->delete();

        return response()->noContent();
    }

    /**
     * Upload a photo for the dog.
     */
    public function uploadPhoto(Request $request, string $id)
    {
        $dog = Auth::user()->dogs()->findOrFail($id);

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
        ]);

        if ($request->hasFile('photo')) {
            // Delete old photo if exists
            if ($dog->photo_url && str_contains($dog->photo_url, '/storage/')) {
                $oldPath = str_replace(asset('storage/'), '', $dog->photo_url);
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
            }

            $path = $request->file('photo')->store('dog_photos', 'public');
            $dog->photo_url = asset('storage/' . $path);
            $dog->save();
        }

        $dog->load(['pointHistories' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }]);

        return response()->json($dog);
    }

    /**
     * Give extra points to a dog (Staff/Admin only).
     */
    public function giveExtraPoints(Request $request, string $id)
    {
        $request->validate([
            'points' => 'required|integer|min:-3|max:3|not_in:0',
            'category' => 'required|string|max:50',
        ]);

        $dog = Dog::findOrFail($id);
        $dog->points += $request->points;
        $dog->save();

        PointHistory::create([
            'dog_id' => $dog->id,
            'points' => $request->points,
            'category' => $request->category
        ]);

        if ($dog->user) {
            $dog->user->notify(new DogExtraPointNotification($dog, $request->points, $request->category));
        }

        $dog->load(['pointHistories' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }]);

        return response()->json([
            'message' => 'Puntos modificados exitosamente',
            'dog' => $dog
        ]);
    }
}
