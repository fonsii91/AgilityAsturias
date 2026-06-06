<?php

namespace App\Mail;

use App\Models\ClubLead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClubLeadReceived extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $lead;
    public $activationLink;

    /**
     * Create a new message instance.
     */
    public function __construct(ClubLead $lead, string $activationLink = null)
    {
        $this->lead = $lead;
        $this->activationLink = $activationLink;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '¡Solicitud de Club Recibida! - Club Agility',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.leads.received',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
