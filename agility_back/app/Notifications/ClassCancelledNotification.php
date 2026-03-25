<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ClassCancelledNotification extends Notification
{
    use Queueable;

    public $dateStr;
    public $timeStr;

    public function __construct($dateStr, $timeStr)
    {
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
            'type' => 'class_cancelled',
            'date' => $this->dateStr,
            'time' => $this->timeStr,
            'message' => 'Atención: La clase del ' . $this->dateStr . ' a las ' . $this->timeStr . ' ha sido anulada por el staff.',
        ];
    }
}
