<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PersonalEventController extends Controller
{
    public function index()
    {
        $events = \App\Models\PersonalEvent::where('user_id', auth()->id())->get();
        return response()->json($events);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'dog_id' => 'required|exists:dogs,id',
            'title' => 'required|string|max:255',
            'type' => 'required|in:veterinario,fisioterapia,otro',
            'start_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $validated['user_id'] = auth()->id();

        $event = \App\Models\PersonalEvent::create($validated);

        return response()->json($event, 201);
    }

    public function update(Request $request, $id)
    {
        $event = \App\Models\PersonalEvent::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $validated = $request->validate([
            'dog_id' => 'sometimes|required|exists:dogs,id',
            'title' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:veterinario,fisioterapia,otro',
            'start_date' => 'sometimes|required|date',
            'notes' => 'nullable|string',
        ]);

        $event->update($validated);

        return response()->json($event);
    }

    public function destroy($id)
    {
        $event = \App\Models\PersonalEvent::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $event->delete();

        return response()->json(['message' => 'Event deleted successfully']);
    }
}
