<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Aviso al socio cuando su reserva individual de pista (entrenamiento libre)
 * se anula porque el club ha programado una clase en esa franja: las clases
 * tienen prioridad sobre las reservas individuales.
 */
class TrackReservationCancelledNotification extends Notification
{
    use Queueable;

    public $trackName;
    public $dateStr;
    public $timeStr;

    public function __construct($trackName, $dateStr, $timeStr)
    {
        $this->trackName = $trackName;
        $this->dateStr = $dateStr;
        $this->timeStr = $timeStr;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'track_reservation_cancelled',
            'track' => $this->trackName,
            'date' => $this->dateStr,
            'time' => $this->timeStr,
            'message' => 'Tu reserva de la pista "' . $this->trackName . '" del ' . $this->dateStr . ' a las ' . $this->timeStr . ' se ha anulado: el club ha programado una clase en ese horario.',
        ];
    }
}
