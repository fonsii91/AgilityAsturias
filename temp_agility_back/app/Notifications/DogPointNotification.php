<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\Dog;

class DogPointNotification extends Notification
{
    use Queueable;

    protected $dog;

    /**
     * Create a new notification instance.
     */
    public function __construct(Dog $dog)
    {
        $this->dog = $dog;
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
            'type' => 'dog_point',
            'dog_id' => $this->dog->id,
            'nombre' => $this->dog->name,
            'message' => '¡' . ($this->dog->name ?? 'Sin nombre') . ' ha recibido un punto para el ranking!, se ha verificado su asistencia a un entrenamiento',
            'action_url' => '/ranking'
        ];
    }
}
