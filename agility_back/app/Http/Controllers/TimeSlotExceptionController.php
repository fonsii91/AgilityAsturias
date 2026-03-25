<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class TimeSlotExceptionController extends Controller
{
    public function index()
    {
        return \App\Models\TimeSlotException::where('date', '>=', now()->toDateString())->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'slot_id' => 'required|exists:time_slots,id',
            'date' => 'required|date',
            'reason' => 'nullable|string'
        ]);

        $exception = \App\Models\TimeSlotException::firstOrCreate([
            'slot_id' => $validated['slot_id'],
            'date' => $validated['date']
        ], [
            'reason' => $validated['reason'] ?? null
        ]);

        $timeSlot = \App\Models\TimeSlot::find($validated['slot_id']);
        if ($timeSlot) {
            $reservations = \App\Models\Reservation::where('slot_id', $validated['slot_id'])
                ->where('date', $validated['date'])
                ->get();

            $userIds = $reservations->pluck('user_id')->unique();
            if ($userIds->isNotEmpty()) {
                $users = \App\Models\User::whereIn('id', $userIds)->get();
                $dateFormatted = \Carbon\Carbon::parse($validated['date'])->format('d/m/Y');
                $timeFormatted = \Carbon\Carbon::parse($timeSlot->start_time)->format('H:i');
                
                \Illuminate\Support\Facades\Notification::send(
                    $users, 
                    new \App\Notifications\ClassCancelledNotification($dateFormatted, $timeFormatted)
                );
            }

            // Eliminar las reservas de esta clase
            \App\Models\Reservation::where('slot_id', $validated['slot_id'])
                ->where('date', $validated['date'])
                ->delete();
        }

        return response()->json($exception, 201);
    }

    public function destroy(Request $request)
    {
        $request->validate([
            'slot_id' => 'required|exists:time_slots,id',
            'date' => 'required|date'
        ]);

        \App\Models\TimeSlotException::where('slot_id', $request->slot_id)
            ->where('date', $request->date)
            ->delete();

        return response()->noContent();
    }
}
