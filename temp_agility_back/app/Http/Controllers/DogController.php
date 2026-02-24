<?php

namespace App\Http\Controllers;

use App\Models\Dog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DogController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        return $request->user()->dogs;
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'breed' => 'nullable|string',
            'age' => 'nullable|integer',
        ]);

        $dog = $request->user()->dogs()->create($validated);

        return response()->json($dog, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return Auth::user()->dogs()->findOrFail($id);
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
            'age' => 'nullable|integer',
        ]);

        $dog->update($validated);

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

        return response()->json($dog);
    }
}
