<?php

namespace App\Http\Controllers;

use App\Models\TimeSlot;
use Illuminate\Http\Request;

class TimeSlotController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return TimeSlot::all();
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
            'day' => 'required|string',
            'start_time' => 'required|string',
            'end_time' => 'required|string',
            'max_bookings' => 'required|integer',
        ]);

        $timeSlot = TimeSlot::create($validated);

        return response()->json($timeSlot, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return TimeSlot::findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        if (!in_array($request->user()->role, ['admin', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $timeSlot = TimeSlot::findOrFail($id);

        $validated = $request->validate([
            'day' => 'string',
            'start_time' => 'string',
            'end_time' => 'string',
            'max_bookings' => 'integer',
        ]);

        $timeSlot->update($validated);

        return response()->json($timeSlot);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        if (!in_array($request->user()->role, ['admin', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        TimeSlot::destroy($id);

        return response()->noContent();
    }
}
