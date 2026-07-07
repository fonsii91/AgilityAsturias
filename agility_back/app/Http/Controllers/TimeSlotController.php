<?php

namespace App\Http\Controllers;

use App\Models\TimeSlot;
use App\Models\TrainingTrack;
use Illuminate\Http\Request;

class TimeSlotController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return TimeSlot::with('trainingTrack:id,name,surface,photo_url')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'day' => 'required|string',
            'name' => 'nullable|string|max:255',
            'start_time' => 'required|string',
            'end_time' => 'required|string',
            'max_bookings' => 'required|integer',
            'color' => 'nullable|string|max:255',
            'date' => 'nullable|date',
            'training_track_id' => 'nullable|integer',
        ]);

        $this->assertTrackBelongsToClub($validated['training_track_id'] ?? null);

        // Toda clase se imparte en una pista: sin selección explícita se asigna
        // la pista principal del club (la más antigua).
        if (empty($validated['training_track_id'])) {
            $validated['training_track_id'] = TrainingTrack::orderBy('id')->value('id');
        }

        $timeSlot = TimeSlot::create($validated);

        $this->purgeConflictingTrackReservations($timeSlot);

        return response()->json($timeSlot->load('trainingTrack:id,name,surface,photo_url'), 201);
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
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $timeSlot = TimeSlot::findOrFail($id);

        $validated = $request->validate([
            'day' => 'string',
            'name' => 'nullable|string|max:255',
            'start_time' => 'string',
            'end_time' => 'string',
            'max_bookings' => 'integer',
            'color' => 'nullable|string|max:255',
            'date' => 'nullable|date',
            'training_track_id' => 'nullable|integer',
        ]);

        $this->assertTrackBelongsToClub($validated['training_track_id'] ?? null);

        // Un horario nunca se queda sin pista: enviar null equivale a
        // reasignarlo a la pista principal del club.
        if (array_key_exists('training_track_id', $validated) && empty($validated['training_track_id'])) {
            $validated['training_track_id'] = TrainingTrack::orderBy('id')->value('id');
        }

        $timeSlot->update($validated);

        $this->purgeConflictingTrackReservations($timeSlot->fresh());

        return response()->json($timeSlot->load('trainingTrack:id,name,surface,photo_url'));
    }

    /**
     * Las clases tienen prioridad sobre las reservas individuales de pista
     * (entrenamientos libres): al programar o mover una clase se eliminan las
     * reservas futuras que se solapen en esa pista, avisando al socio.
     */
    private function purgeConflictingTrackReservations(TimeSlot $slot): void
    {
        if (!$slot->training_track_id) {
            return;
        }

        $query = \App\Models\TrackReservation::with(['user', 'trainingTrack'])
            ->where('training_track_id', $slot->training_track_id)
            ->where('date', '>=', now()->toDateString());

        if ($slot->date) {
            $query->where('date', $slot->date);
        }

        $conflicting = $query->get()->filter(function ($reservation) use ($slot) {
            $dateStr = $reservation->date->toDateString();
            if (!$slot->date && !\App\Models\TrackReservation::sameDay($slot->day, \App\Models\TrackReservation::dayNameFor($dateStr))) {
                return false;
            }

            return \App\Models\TrackReservation::overlaps(
                $reservation->start_time,
                $reservation->end_time,
                substr($slot->start_time, 0, 5),
                substr($slot->end_time, 0, 5)
            );
        });

        foreach ($conflicting as $reservation) {
            try {
                $reservation->user?->notify(new \App\Notifications\TrackReservationCancelledNotification(
                    $reservation->trainingTrack?->name ?? 'Pista',
                    $reservation->date->format('d/m/Y'),
                    $reservation->start_time
                ));
            } catch (\Exception $e) {
                \Log::warning('No se pudo notificar la anulación de la reserva de pista ' . $reservation->id . ': ' . $e->getMessage());
            }
            $reservation->delete();
        }
    }

    /**
     * La pista debe existir y ser del club activo (la consulta ya viene
     * acotada por TenantScope).
     */
    private function assertTrackBelongsToClub(?int $trackId): void
    {
        if ($trackId && !TrainingTrack::whereKey($trackId)->exists()) {
            abort(422, 'La pista seleccionada no existe en este club.');
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $timeSlot = TimeSlot::findOrFail($id);

        // Al borrar la clase, las reservas activas devuelven al bono del socio
        // la clase consumida (el horario desaparece por decisión del club).
        app(\App\Services\ClassBonusService::class)->refund(
            $timeSlot->reservations()->where('status', 'active')->get()
        );

        // Delete associated records to prevent orphaned data
        $timeSlot->reservations()->delete();
        $timeSlot->exceptions()->delete();
        
        $timeSlot->delete();

        return response()->noContent();
    }
}

