<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\Video;

class NewVideoNotification extends Notification
{
    use Queueable;

    protected $video;

    /**
     * Create a new notification instance.
     */
    public function __construct(Video $video)
    {
        $this->video = $video;
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
            'type' => 'new_video',
            'video_id' => $this->video->id,
            'dog_id' => $this->video->dog_id,
            'nombre' => $this->video->dog->name ?? 'tu perro',
            'message' => '¡Se ha subido un nuevo vídeo de ' . ($this->video->dog->name ?? 'tu perro') . '!',
            'action_url' => '/galeria-videos'
        ];
    }
}
