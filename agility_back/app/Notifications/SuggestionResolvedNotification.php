<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\Suggestion;

class SuggestionResolvedNotification extends Notification
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
            'type' => 'suggestion_resolved',
            'suggestion_id' => $this->suggestion->id,
            'action_url' => '/', // Or wherever a user can view their history (if any), standard is usually root or notification tab
            'message' => '¡Tu ' . $tipoStr . ' ha sido resuelta! Muchas gracias por tu feedback y por ayudarnos a mejorar.',
        ];
    }
}
