<?php

namespace App\Models;

use App\Traits\HasClub;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Reserva individual de pista para entrenamiento libre (sin monitor): un socio
 * bloquea una pista concreta durante una franja de una hora, siempre que no
 * esté ocupada por una clase u otra reserva. Las clases tienen prioridad:
 * TimeSlotController elimina las reservas que se solapen al programar una clase.
 */
class TrackReservation extends Model
{
    use HasFactory, HasClub;

    /** Rango de franjas reservables: horas en punto de 08:00 a 22:00. */
    public const OPEN_HOUR = 8;
    public const CLOSE_HOUR = 22;

    public const DAY_NAMES = [
        1 => 'Lunes',
        2 => 'Martes',
        3 => 'Miércoles',
        4 => 'Jueves',
        5 => 'Viernes',
        6 => 'Sábado',
        7 => 'Domingo',
    ];

    protected $fillable = [
        'training_track_id',
        'user_id',
        'date',
        'start_time',
        'end_time',
        'club_id',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function trainingTrack()
    {
        return $this->belongsTo(TrainingTrack::class);
    }

    /**
     * ¿Se solapan dos rangos horarios "HH:MM"?
     */
    public static function overlaps(string $aStart, string $aEnd, string $bStart, string $bEnd): bool
    {
        return self::toMinutes($aStart) < self::toMinutes($bEnd)
            && self::toMinutes($aEnd) > self::toMinutes($bStart);
    }

    public static function toMinutes(string $time): int
    {
        [$h, $m] = array_pad(explode(':', $time), 2, '0');

        return ((int) $h) * 60 + (int) $m;
    }

    /**
     * Nombre del día de la semana (en español) de una fecha Y-m-d.
     */
    public static function dayNameFor(string $date): string
    {
        return self::DAY_NAMES[\Carbon\Carbon::parse($date)->dayOfWeekIso];
    }

    /**
     * Compara nombres de día tolerando variantes sin tilde guardadas en
     * time_slots ("Miercoles", "Sabado").
     */
    public static function sameDay(?string $a, ?string $b): bool
    {
        $normalize = fn (?string $day) => strtr(mb_strtolower($day ?? ''), ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u']);

        return $normalize($a) === $normalize($b);
    }
}
