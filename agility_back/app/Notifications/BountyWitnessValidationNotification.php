<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\BountyContract;

class BountyWitnessValidationNotification extends Notification
{
    use Queueable;

    protected $contract;
    protected $hunterName;
    protected $victimName;

    /**
     * Create a new notification instance.
     */
    public function __construct(BountyContract $contract, string $hunterName, string $victimName)
    {
        $this->contract = $contract;
        $this->hunterName = $hunterName;
        $this->victimName = $victimName;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'bounty_witness',
            'contract_id' => $this->contract->id,
            'message' => '¿Has visto a ' . $this->hunterName . ' conseguir que el perro de ' . $this->victimName . ' realice la misión: "' . $this->contract->action_description . '"?',
            'action_url' => '/ranking'
        ];
    }
}
