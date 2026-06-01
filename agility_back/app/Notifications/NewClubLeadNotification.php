<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\ClubLead;

class NewClubLeadNotification extends Notification
{
    use Queueable;

    protected $lead;

    /**
     * Create a new notification instance.
     */
    public function __construct(ClubLead $lead)
    {
        $this->lead = $lead;
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
            'type' => 'new_club_lead',
            'lead_id' => $this->lead->id,
            'action_url' => '/admin/clubs',
            'message' => 'Nueva solicitud de alta de club: ' . $this->lead->name . ' (' . $this->lead->slug . ')',
        ];
    }
}
