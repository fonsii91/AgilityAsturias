<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReservationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Admin/Staff sees all
        $user = $request->user();
        if ($user->role === 'admin' || $user->role === 'staff') {
            return Reservation::with(['user', 'timeSlot', 'dog'])->get();
        }

        // Standard user only sees their own (fallback for index)
        return $this->myReservations($request);
    }

    /**
     * Get reservations for the current user.
     */
    public function myReservations(Request $request)
    {
        return $request->user()->reservations()->with(['user', 'timeSlot', 'dog'])->get();
    }

    /**
     * Get availability (booking counts) for slots.
     * Publicly accessible (or authenticated).
     */
    public function availability(Request $request)
    {
        // Fetch reservations from today onwards with relationships
        $reservations = Reservation::with(['user', 'timeSlot', 'dog'])
            ->where('date', '>=', now()->toDateString())
            ->get();

        // Group by slot and date
        $availability = [];

        foreach ($reservations as $reservation) {
            $key = $reservation->slot_id . '_' . $reservation->date->toDateString();

            if (!isset($availability[$key])) {
                $availability[$key] = [
                    'slot_id' => $reservation->slot_id,
                    'date' => $reservation->date->toDateString(),
                    'count' => 0,
                    'attendees' => []
                ];
            }

            // Increment overall count by 1 for this reservation row
            $availability[$key]['count'] += 1;

            // Group attendees by user to match the frontend expected structure
            $userName = $reservation->user ? $reservation->user->name : 'Usuario';
            $userImage = $reservation->user ? $reservation->user->photo_url : null;
            $dogName = $reservation->dog ? $reservation->dog->name : 'Perro Desconocido';
            $dogPhoto = $reservation->dog ? $reservation->dog->photo_url : null;

            $foundUserIdx = -1;
            foreach ($availability[$key]['attendees'] as $idx => $attendee) {
                if ($attendee['user_name'] === $userName) {
                    $foundUserIdx = $idx;
                    break;
                }
            }

            if ($foundUserIdx === -1) {
                $availability[$key]['attendees'][] = [
                    'user_name' => $userName,
                    'user_image' => $userImage,
                    'dogs' => [
                        ['name' => $dogName, 'image' => $dogPhoto]
                    ]
                ];
            } else {
                $availability[$key]['attendees'][$foundUserIdx]['dogs'][] = [
                    'name' => $dogName,
                    'image' => $dogPhoto
                ];
            }
        }

        return response()->json(array_values($availability));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'slot_id' => 'required|exists:time_slots,id',
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'dog_ids' => 'required|array',
            'dog_ids.*' => 'exists:dogs,id'
        ]);

        // DUPLICATE DOG CHECK
        // Check if any of the selected dogs are already booked in this slot/date
        $existingReservations = Reservation::where('slot_id', $validated['slot_id'])
            ->whereDate('date', $validated['date'])
            ->whereIn('dog_id', $validated['dog_ids'])
            ->get();

        if ($existingReservations->count() > 0) {
            return response()->json([
                'message' => 'Uno o más perros seleccionados ya tienen reserva en esta franja.'
            ], 422);
        }

        $createdReservations = [];
        foreach ($validated['dog_ids'] as $dogId) {
            $reservation = Reservation::create([
                'slot_id' => $validated['slot_id'],
                'user_id' => $validated['user_id'],
                'dog_id' => $dogId,
                'date' => $validated['date'],
                'status' => 'active',
            ]);
            $reservation->load(['user', 'timeSlot', 'dog']);
            $createdReservations[] = $reservation;
        }

        return response()->json($createdReservations, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $id)
    {
        $reservation = Reservation::with(['user', 'timeSlot', 'dog'])->findOrFail($id);

        // Authorization check
        if ($request->user()->id !== $reservation->user_id && !in_array($request->user()->role, ['admin', 'staff'])) {
            abort(403);
        }

        return $reservation;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $reservation = Reservation::findOrFail($id);

        // Authorization: User can update own, or staff/admin
        if ($request->user()->id !== $reservation->user_id && !in_array($request->user()->role, ['admin', 'staff'])) {
            abort(403);
        }

        $validated = $request->validate([
            'slot_id' => 'integer|exists:time_slots,id',
            'date' => 'nullable|date',
            'dog_id' => 'nullable|exists:dogs,id',
            'status' => 'in:active,cancelled,completed'
        ]);

        $reservation->update($validated);

        return response()->json($reservation->load(['user', 'timeSlot', 'dog']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        $reservation = Reservation::with('timeSlot')->findOrFail($id);
        $user = $request->user();

        // Authorization check
        $isAdminOrStaff = in_array($user->role, ['admin', 'staff']);
        if ($user->id !== $reservation->user_id && !$isAdminOrStaff) {
            abort(403);
        }

        // 24-hour rule: Members cannot cancel within 24 hours of the starting time
        if (!$isAdminOrStaff && $reservation->timeSlot && $reservation->date) {
            $dateStr = is_string($reservation->date) ? $reservation->date : $reservation->date->format('Y-m-d');
            $slotDateTime = \Carbon\Carbon::parse($dateStr . ' ' . $reservation->timeSlot->start_time);
            if (now()->diffInHours($slotDateTime, false) < 24) {
                return response()->json([
                    'message' => 'No puedes cancelar una reserva con menos de 24 horas de antelación. Contacta con administración en caso de emergencia.'
                ], 422);
            }
        }

        $reservation->delete();

        return response()->noContent();
    }

    /**
     * Remove all block reservations for a specific user, slot, and date.
     */
    public function destroyBlock(Request $request)
    {
        $request->validate([
            'slot_id' => 'required|exists:time_slots,id',
            'date' => 'required|date'
        ]);

        $user = $request->user();
        $isAdminOrStaff = in_array($user->role, ['admin', 'staff']);

        // 24-hour rule: Members cannot cancel within 24 hours of the starting time
        if (!$isAdminOrStaff) {
            $timeSlot = \App\Models\TimeSlot::find($request->slot_id);
            if ($timeSlot) {
                // Carbon parse combining the requested date and the timeslot's start time
                $slotDateTime = \Carbon\Carbon::parse($request->date . ' ' . $timeSlot->start_time);

                // diffInHours with false returns negative if $slotDateTime is in the past
                if (now()->diffInHours($slotDateTime, false) < 24) {
                    return response()->json([
                        'message' => 'No puedes cancelar una reserva con menos de 24 horas de antelación. Contacta con administración en caso de emergencia.'
                    ], 422);
                }
            }
        }

        Reservation::where('user_id', $user->id)
            ->where('slot_id', $request->slot_id)
            ->whereDate('date', $request->date)
            ->delete();

        return response()->noContent();
    }
}
