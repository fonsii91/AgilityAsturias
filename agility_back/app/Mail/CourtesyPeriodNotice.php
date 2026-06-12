<?php

namespace App\Mail;

use App\Models\Club;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Aviso al gestor de un club existente de que entra en un periodo de cortesía:
 * mantiene el acceso completo, pero debe añadir un método de pago antes de la
 * fecha límite para que el servicio no se suspenda.
 */
class CourtesyPeriodNotice extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Club $club;
    public string $managerName;
    public string $billingUrl;

    public function __construct(Club $club, string $managerName)
    {
        $this->club = $club;
        $this->managerName = $managerName;
        $this->billingUrl = "https://{$club->slug}.clubagility.com/configuracion/facturacion";
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Acción necesaria: activa el pago de ' . $this->club->name . ' antes de que termine tu periodo de cortesía',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.billing.courtesy-notice',
            with: [
                'club' => $this->club,
                'managerName' => $this->managerName,
                'billingUrl' => $this->billingUrl,
                'deadline' => $this->club->courtesy_until,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
