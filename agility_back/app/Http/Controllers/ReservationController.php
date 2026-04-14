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
            return Reservation::with(['user', 'timeSlot', 'dog.users:id'])
                ->where('status', 'active')
                ->get();
        }

        // Standard user only sees their own (fallback for index)
        return $this->myReservations($request);
    }

    /**
     * Get reservations for the current user.
     */
    public function myReservations(Request $request)
    {
        $userId = $request->user()->id;

        return Reservation::with(['user', 'timeSlot', 'dog.users:id']) // Load dog.users for frontend logic
            ->where(function($query) use ($userId) {
                $query->where('user_id', $userId)
                      ->orWhereHas('dog.users', function($qDogUser) use ($userId) {
                          $qDogUser->where('users.id', $userId);
                      });
            })
            ->where('status', 'active')
            ->get();
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
            ->where('status', 'active')
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
            $userId = $reservation->user ? $reservation->user->id : null;
            $userName = $reservation->user ? $reservation->user->name : 'Usuario';
            $userImage = $reservation->user ? $reservation->user->photo_url : null;
            $dogName = $reservation->dog ? $reservation->dog->name : 'Perro Desconocido';
            $dogPhoto = $reservation->dog ? $reservation->dog->photo_url : null;

            $foundUserIdx = -1;
            foreach ($availability[$key]['attendees'] as $idx => $attendee) {
                if ($attendee['user_id'] === $userId) {
                    $foundUserIdx = $idx;
                    break;
                }
            }

            if ($foundUserIdx === -1) {
                $availability[$key]['attendees'][] = [
                    'user_id' => $userId,
                    'user_name' => $userName,
                    'user_image' => $userImage,
                    'dogs' => [
                        ['name' => $dogName, 'image' => $dogPhoto, 'reservation_id' => $reservation->id]
                    ]
                ];
            } else {
                $availability[$key]['attendees'][$foundUserIdx]['dogs'][] = [
                    'name' => $dogName,
                    'image' => $dogPhoto,
                    'reservation_id' => $reservation->id
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

        $user = $request->user();
        $isAdminOrStaff = in_array($user->role, ['admin', 'staff']);

        if (!$isAdminOrStaff) {
            // SECURITY CHECK: Members can only book for themselves
            if ($user->id != $validated['user_id']) {
                return response()->json([
                    'message' => 'No puedes crear reservas para otros usuarios.'
                ], 403);
            }

            // SECURITY CHECK: Members can only book their own dogs
            $myDogs = $user->dogs()->pluck('dogs.id')->toArray();
            foreach ($validated['dog_ids'] as $dogId) {
                if (!in_array($dogId, $myDogs)) {
                    return response()->json([
                        'message' => 'Uno o más perros seleccionados no están asociados a tu cuenta.'
                    ], 403);
                }
            }

            // 24-HOUR RULE FOR BOOKING
            $timeSlot = \App\Models\TimeSlot::find($validated['slot_id']);
            if ($timeSlot) {
                $slotDateTime = \Carbon\Carbon::parse($validated['date'] . ' ' . $timeSlot->start_time);
                // Si la diferencia es menor a 24h significa que ya ha pasado el límite normal
                if (now()->diffInHours($slotDateTime, false) < 24) {
                    // Check if they have a recently cancelled reservation for this strict window
                    $recentCancel = \App\Models\Reservation::where('user_id', $validated['user_id'])
                        ->where('slot_id', $validated['slot_id'])
                        ->whereDate('date', $validated['date'])
                        ->where('status', 'cancelled')
                        ->where('updated_at', '>=', now()->subMinutes(15))
                        ->exists();

                    if (!$recentCancel) {
                        return response()->json([
                            'message' => 'No puedes reservar con menos de 24 horas de antelación.'
                        ], 422);
                    }
                }
            }
        }

        // EXCEPTION CHECK
        $isCancelled = \App\Models\TimeSlotException::where('slot_id', $validated['slot_id'])
            ->whereDate('date', $validated['date'])
            ->exists();

        if ($isCancelled) {
            return response()->json([
                'message' => 'Esta clase está cancelada y no admite reservas.'
            ], 422);
        }

        // DUPLICATE DOG CHECK
        // Check if any of the selected dogs are already booked in this slot/date
        $existingReservations = Reservation::where('slot_id', $validated['slot_id'])
            ->whereDate('date', $validated['date'])
            ->whereIn('dog_id', $validated['dog_ids'])
            ->where('status', 'active')
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
        $isDogOwner = $reservation->dog_id ? $request->user()->dogs()->where('dogs.id', $reservation->dog_id)->exists() : false;
        if ($request->user()->id !== $reservation->user_id && !$isDogOwner && !in_array($request->user()->role, ['admin', 'staff'])) {
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

        // Authorization: User can update own, or staff/admin, or explicitly co-owner
        $isDogOwner = $reservation->dog_id ? $request->user()->dogs()->where('dogs.id', $reservation->dog_id)->exists() : false;
        if ($request->user()->id !== $reservation->user_id && !$isDogOwner && !in_array($request->user()->role, ['admin', 'staff'])) {
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
        $isDogOwner = $reservation->dog_id ? $user->dogs()->where('dogs.id', $reservation->dog_id)->exists() : false;

        if ($user->id !== $reservation->user_id && !$isDogOwner && !$isAdminOrStaff) {
            abort(403);
        }

        // 24-hour rule: Members cannot cancel within 24 hours of the starting time
        if (!$isAdminOrStaff && $reservation->timeSlot && $reservation->date) {
            $dateStr = is_string($reservation->date) ? $reservation->date : $reservation->date->format('Y-m-d');
            $slotDateTime = \Carbon\Carbon::parse($dateStr . ' ' . $reservation->timeSlot->start_time);

            // 15-minute grace period
            $gracePeriodEnd = $reservation->created_at->addMinutes(15);
            $isWithinGracePeriod = now()->isBefore($gracePeriodEnd);

            if (now()->diffInHours($slotDateTime, false) < 24 && !$isWithinGracePeriod) {
                return response()->json([
                    'message' => 'No puedes cancelar una reserva con menos de 24 horas de antelación. Contacta con administración en caso de emergencia.'
                ], 422);
            }
        }

        $reservation->update(['status' => 'cancelled', 'updated_at' => now()]);

        return response()->noContent();
    }

    /**
     * Remove all block reservations for a specific user, slot, and date.
     */
    public function destroyBlock(Request $request)
    {
        $request->validate([
            'slot_id' => 'required|exists:time_slots,id',
            'date' => 'required|date',
            'user_id' => 'nullable|exists:users,id' // Target user to delete (admin only)
        ]);

        $user = $request->user();
        $isAdminOrStaff = in_array($user->role, ['admin', 'staff']);
        
        $targetUserId = $user->id;
        $myDogs = $user->dogs()->pluck('dogs.id')->toArray();

        // If a specific user is targeted and the requester is admin/staff
        if ($request->has('user_id') && $isAdminOrStaff) {
            $targetUserId = $request->user_id;
            // Admin doesn't need to specify myDogs when deleting, all dogs associated to target user should be deleted.
            // But to match behavior, we can fetch target user's dogs or simply delete all reservations for target user in this slot.
            // Actually, if we just use user_id, that's enough because reservations are linked to user_id.
            $reservationsToDelete = Reservation::where('slot_id', $request->slot_id)
                ->whereDate('date', $request->date)
                ->where('user_id', $targetUserId)
                ->where('status', 'active')
                ->get();
        } else {
            // Normal user behavior: cancel their own reservations or co-owned dogs
            $reservationsToDelete = Reservation::where('slot_id', $request->slot_id)
                ->whereDate('date', $request->date)
                ->where('status', 'active')
                ->where(function($query) use ($targetUserId, $myDogs) {
                    $query->where('user_id', $targetUserId)
                          ->orWhereIn('dog_id', $myDogs);
                })
                ->get();
        }

        if ($reservationsToDelete->isEmpty()) {
            return response()->noContent();
        }

        $isWithinGracePeriod = true;
        foreach ($reservationsToDelete as $res) {
            if (now()->isAfter($res->created_at->addMinutes(15))) {
                $isWithinGracePeriod = false;
                break;
            }
        }

        // 24-hour rule: Members cannot cancel within 24 hours of the starting time
        if (!$isAdminOrStaff && !$isWithinGracePeriod) {
            $timeSlot = \App\Models\TimeSlot::find($request->slot_id);
            if ($timeSlot) {
                // Carbon parse combining the requested date and the timeslot's start time
                $slotDateTime = \Carbon\Carbon::parse($request->date . ' ' . $timeSlot->start_time);

                // diffInHours with false returns negative if $slotDateTime is in the past
                if (now()->diffInHours($slotDateTime, false) < 24) {
                    return response()->json([
                        'message' => 'No puedes cancelar una reserva con menos de 24 horas de antelación y han pasado más de 15 minutos desde que la hiciste. Contacta con administración en caso de emergencia.'
                    ], 422);
                }
            }
        }

        Reservation::whereIn('id', $reservationsToDelete->pluck('id'))->update(['status' => 'cancelled', 'updated_at' => now()]);

        return response()->noContent();
    }
}
