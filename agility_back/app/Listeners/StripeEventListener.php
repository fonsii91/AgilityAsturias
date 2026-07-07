<?php

namespace App\Listeners;

use App\Models\Club;
use App\Models\ClubLead;
use App\Models\User;
use App\Services\ClubProvisioningService;
use App\Services\StripeSubscriptionSyncService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Laravel\Cashier\Events\WebhookReceived;

/**
 * Aprovisiona el club cuando Stripe confirma el pago del registro (join-saas).
 *
 * El formulario de registro solo crea el ClubLead y una sesión de Checkout con
 * `club_lead_id` en los metadatos. Al recibir `checkout.session.completed` se crea
 * el club, el usuario manager, y se envía el correo de activación al gestor.
 */
class StripeEventListener
{
    public function __construct(
        private ClubProvisioningService $provisioner,
        private StripeSubscriptionSyncService $subscriptionSync,
    ) {
    }

    public function handle(WebhookReceived $event): void
    {
        $type = $event->payload['type'] ?? null;

        // Sincroniza el plan (funciones/límites) del club con el plan facturado en Stripe
        // cuando la suscripción cambia (upgrade/downgrade desde el portal, renovaciones, etc.).
        if (in_array($type, ['customer.subscription.created', 'customer.subscription.updated'], true)) {
            $this->syncPlanFromSubscription($event->payload['data']['object'] ?? []);
            return;
        }

        if ($type !== 'checkout.session.completed') {
            return;
        }

        $session = $event->payload['data']['object'] ?? [];
        $leadId = $session['metadata']['club_lead_id'] ?? null;

        // Los checkouts de clubes ya existentes (BillingController) no llevan lead
        if (!$leadId) {
            return;
        }

        $lead = ClubLead::find($leadId);
        if (!$lead) {
            Log::error("Webhook checkout.session.completed con club_lead_id={$leadId} pero el lead no existe.");
            return;
        }

        // Idempotencia: Stripe reintenta los webhooks que no devuelven 2xx
        if ($lead->provisioned_at) {
            return;
        }

        // El slug o el email pudieron ocuparse entre el registro y el pago (dos leads en paralelo)
        if (Club::where('slug', $lead->slug)->exists() || User::where('email', $lead->email)->exists()) {
            Log::error("No se puede aprovisionar el lead {$lead->id} tras el pago: slug '{$lead->slug}' o email ya ocupados. Requiere gestión manual (posible reembolso).");
            $lead->update(['status' => 'error']);
            $this->notifyAdminOfConflict($lead);
            return;
        }

        try {
            $club = $this->provisioner->provision($lead, $session['customer'] ?? null);
        } catch (\Exception $e) {
            Log::error("Error aprovisionando el club del lead {$lead->id} tras el pago: " . $e->getMessage());
            Log::error($e->getTraceAsString());
            $lead->update(['status' => 'error']);
            $this->notifyAdminOfConflict($lead);
            return;
        }

        // Crea el registro local de la suscripción. El webhook customer.subscription.created
        // suele llegar antes de que el club exista, y Cashier lo descarta al no encontrar
        // el billable; sin esto el club quedaría bloqueado por CheckSubscriptionActive.
        $this->subscriptionSync->syncSubscription($club, $session['subscription'] ?? null);
    }

    /**
     * Sincroniza el plan del club a partir de un objeto Subscription de Stripe
     * (evento customer.subscription.created/updated). Localiza el club por el
     * cliente de Stripe y ajusta su plan_id al precio facturado.
     */
    private function syncPlanFromSubscription(array $subscription): void
    {
        $customerId = $subscription['customer'] ?? null;
        $priceId = $subscription['items']['data'][0]['price']['id'] ?? null;

        if (!$customerId || !$priceId) {
            return;
        }

        $club = Club::where('stripe_id', $customerId)->first();
        if (!$club) {
            return;
        }

        $this->subscriptionSync->applyPlanFromPrice($club, $priceId);
    }

    private function notifyAdminOfConflict(ClubLead $lead): void
    {
        try {
            Mail::raw(
                "El pago del lead #{$lead->id} ({$lead->name}, slug '{$lead->slug}', {$lead->email}, plan {$lead->plan_selected}) se completó en Stripe pero el aprovisionamiento ha fallado. " .
                "Revisa los logs del servidor: puede requerir aprovisionamiento manual o reembolso desde el Dashboard de Stripe.",
                function ($message) use ($lead) {
                    $message->to(config('mail.admin_address'))
                        ->subject("[ClubAgility] Fallo de aprovisionamiento tras pago - lead #{$lead->id}");
                }
            );
        } catch (\Exception $mailEx) {
            Log::warning('No se pudo avisar al admin del fallo de aprovisionamiento: ' . $mailEx->getMessage());
        }
    }
}
