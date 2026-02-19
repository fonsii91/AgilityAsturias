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
}
