<?php

namespace App\Http\Controllers;

use App\Models\TimeSlot;
use App\Models\TimeSlotException;
use App\Models\TrackReservation;
use App\Models\TrainingTrack;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Reserva individual de pistas para entrenamientos libres (sin monitor).
 * Solo disponible con el módulo activado (middleware track_booking.enabled).
 *
 * Reglas: franjas de una hora en punto (08:00-22:00), disponibilidad calculada
 * POR PISTA (no global), las clases tienen prioridad y una franja ocupada por
 * clase u otra reserva nunca se ofrece como disponible.
 */
class TrackReservationController extends Controller
{
    /**
     * Disponibilidad de todas las pistas del club para una fecha: cada pista
     * con sus franjas de 1h y estado (free | class | booked | mine).
     */
    public function availability(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
        ]);
        $date = $validated['date'];

        $tracks = TrainingTrack::orderBy('id')->get();
        $classes = $this->activeClassesOn($date);
        $reservations = TrackReservation::with('user:id,name')
            ->where('date', $date)
            ->get();

        $userId = $request->user()->id;

        $result = $tracks->map(function ($track) use ($classes, $reservations, $userId) {
            $slots = [];
            for ($h = TrackReservation::OPEN_HOUR; $h < TrackReservation::CLOSE_HOUR; $h++) {
                $start = sprintf('%02d:00', $h);
                $end = sprintf('%02d:00', $h + 1);

                $class = $classes->first(fn ($c) => $c->training_track_id == $track->id
                    && TrackReservation::overlaps($start, $end, substr($c->start_time, 0, 5), substr($c->end_time, 0, 5)));

                if ($class) {
                    $slots[] = [
                        'start_time' => $start,
                        'end_time' => $end,
                        'status' => 'class',
                        'class_name' => $class->name,
                    ];
                    continue;
                }

                $booking = $reservations->first(fn ($r) => $r->training_track_id == $track->id
                    && TrackReservation::overlaps($start, $end, $r->start_time, $r->end_time));

                if ($booking) {
                    $slots[] = [
                        'start_time' => $start,
                        'end_time' => $end,
                        'status' => $booking->user_id === $userId ? 'mine' : 'booked',
                        'reservation_id' => $booking->id,
                        'reserved_by' => $booking->user?->name,
                    ];
                } else {
                    $slots[] = [
                        'start_time' => $start,
                        'end_time' => $end,
                        'status' => 'free',
                    ];
                }
            }

            return [
                'id' => $track->id,
                'name' => $track->name,
                'surface' => $track->surface,
                'photo_url' => $track->photo_url,
                'slots' => $slots,
            ];
        })->values();

        return response()->json([
            'date' => $date,
            'tracks' => $result,
        ]);
    }

    /**
     * Reservar una pista una hora para entrenamiento libre.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'training_track_id' => 'required|integer',
            'date' => 'required|date_format:Y-m-d',
            'start_time' => ['required', 'regex:/^\d{2}:00$/'],
        ]);

        $track = TrainingTrack::findOrFail($validated['training_track_id']);
        $date = $validated['date'];

        $hour = (int) substr($validated['start_time'], 0, 2);
        if ($hour < TrackReservation::OPEN_HOUR || $hour >= TrackReservation::CLOSE_HOUR) {
            return response()->json(['message' => 'La franja está fuera del horario reservable.'], 422);
        }
        $start = sprintf('%02d:00', $hour);
        $end = sprintf('%02d:00', $hour + 1);

        if (Carbon::parse("$date $start")->isPast()) {
            return response()->json(['message' => 'No se puede reservar una franja ya pasada.'], 422);
        }

        // Las clases tienen prioridad: una pista ocupada por clase no es reservable.
        $classConflict = $this->activeClassesOn($date)
            ->first(fn ($c) => $c->training_track_id == $track->id
                && TrackReservation::overlaps($start, $end, substr($c->start_time, 0, 5), substr($c->end_time, 0, 5)));
        if ($classConflict) {
            return response()->json(['message' => 'La pista está ocupada por una clase en esa franja.'], 422);
        }

        $alreadyBooked = TrackReservation::where('training_track_id', $track->id)
            ->where('date', $date)
            ->get()
            ->first(fn ($r) => TrackReservation::overlaps($start, $end, $r->start_time, $r->end_time));
        if ($alreadyBooked) {
            return response()->json(['message' => 'La pista ya está reservada por otro socio en esa franja.'], 422);
        }

        try {
            $reservation = TrackReservation::create([
                'training_track_id' => $track->id,
                'user_id' => $request->user()->id,
                'date' => $date,
                'start_time' => $start,
                'end_time' => $end,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // Índice único (pista, fecha, hora): otro socio ganó la carrera.
            return response()->json(['message' => 'La pista ya está reservada por otro socio en esa franja.'], 422);
        }

        return response()->json($reservation->load('trainingTrack:id,name,surface'), 201);
    }

    /**
     * Próximas reservas de pista del usuario autenticado.
     */
    public function myReservations(Request $request)
    {
        return TrackReservation::with('trainingTrack:id,name,surface,photo_url')
            ->where('user_id', $request->user()->id)
            ->where('date', '>=', now()->toDateString())
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();
    }

    /**
     * Cancelar una reserva: el propio socio o el staff.
     */
    public function destroy(Request $request, string $id)
    {
        $reservation = TrackReservation::findOrFail($id);

        $user = $request->user();
        if ($reservation->user_id !== $user->id && !in_array($user->role, ['admin', 'manager', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $reservation->delete();

        return response()->noContent();
    }

    /**
     * Clases activas (no anuladas por excepción) que se imparten en la fecha
     * dada: semanales de ese día de la semana + clases únicas de esa fecha.
     */
    private function activeClassesOn(string $date)
    {
        $dayName = TrackReservation::dayNameFor($date);
        $cancelledSlotIds = TimeSlotException::whereDate('date', $date)->pluck('slot_id')->all();

        return TimeSlot::where(function ($q) use ($date) {
                $q->whereNull('date')->orWhere('date', $date);
            })
            ->get()
            ->filter(function ($slot) use ($dayName, $cancelledSlotIds) {
                if (in_array($slot->id, $cancelledSlotIds)) {
                    return false;
                }
                // Única (date ya filtrado en SQL) o semanal del mismo día.
                return $slot->date || TrackReservation::sameDay($slot->day, $dayName);
            })
            ->values();
    }
}
