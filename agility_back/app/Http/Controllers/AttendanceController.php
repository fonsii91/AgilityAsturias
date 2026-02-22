<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\User;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use App\Notifications\DogPointNotification;
use Illuminate\Support\Facades\Notification;

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

        // Filter out today's future sessions
        $filtered = $reservations->filter(function ($res) use ($todayStr, $currentTime) {
            if ($res->date < $todayStr)
                return true; // Past date
            // If today, check time
            if ($res->timeSlot && $res->timeSlot->end_time < $currentTime)
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
            'attended_ids' => 'array', // Array of Reservation IDs
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
                ->with('dog')
                ->get();

            foreach ($reservations as $res) {
                $attended = in_array($res->id, $attendedIds);

                if ($attended) {
                    $res->status = 'completed';
                    // Award points directly to the assigned dog
                    if ($res->dog) {
                        $res->dog->increment('points');
                        if ($res->user) {
                            Notification::send($res->user, new DogPointNotification($res->dog));
                        }
                    }
                } else {
                    // Did not attend (No Show)
                    // We mark as cancelled so it shows as such in history, or we could have a 'no_show' status
                    // For now, 'cancelled' is safest to clear it from "Active"
                    $res->status = 'cancelled';
                }

                $res->attendance_verified = true;
                $res->save();
            }
        });

        return response()->json(['message' => 'Asistencia confirmada y puntos actualizados']);
    }
}
