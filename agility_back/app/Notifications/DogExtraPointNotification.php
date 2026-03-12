<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\Dog;

class DogExtraPointNotification extends Notification
{
    use Queueable;

    protected $dog;
    protected $points;
    protected $category;

    /**
     * Create a new notification instance.
     */
    public function __construct(Dog $dog, int $points, string $category)
    {
        $this->dog = $dog;
        $this->points = $points;
        $this->category = $category;
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
        $pointText = $this->points == 1 ? 'punto extra' : 'puntos extra';

        return [
            'type' => 'dog_extra_point',
            'dog_id' => $this->dog->id,
            'nombre' => $this->dog->name,
            'message' => '¡' . ($this->dog->name ?? 'Tu perro') . ' ha recibido ' . $this->points . ' ' . $pointText . ' en ' . $this->category . '!',
            'action_url' => '/ranking'
        ];
    }
}
