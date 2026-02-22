<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\Competition;

class NewEventNotification extends Notification
{
    use Queueable;

    protected $competition;

    /**
     * Create a new notification instance.
     */
    public function __construct(Competition $competition)
    {
        $this->competition = $competition;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->competition->tipo,
            'nombre' => $this->competition->nombre,
            'competition_id' => $this->competition->id,
            'message' => 'Nuevo evento añadido: ' . ($this->competition->nombre ?? 'Sin nombre'),
        ];
    }
}
