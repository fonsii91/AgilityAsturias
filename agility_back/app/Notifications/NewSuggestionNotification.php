<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\Suggestion;

class NewSuggestionNotification extends Notification
{
    use Queueable;

    protected $suggestion;

    /**
     * Create a new notification instance.
     */
    public function __construct(Suggestion $suggestion)
    {
        $this->suggestion = $suggestion;
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
        $tipoStr = $this->suggestion->type === 'bug' ? 'incidencia' : 'sugerencia';

        return [
            'type' => 'new_suggestion',
            'suggestion_id' => $this->suggestion->id,
            'action_url' => '/admin/sugerencias',
            'message' => 'Nueva ' . $tipoStr . ' ha sido reportada por un usuario.',
        ];
    }
}
