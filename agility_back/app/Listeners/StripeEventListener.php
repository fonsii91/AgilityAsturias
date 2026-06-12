<?php

namespace App\Listeners;

use App\Models\Club;
use App\Models\ClubLead;
use App\Models\Plan;
use App\Models\User;
use App\Services\ClubProvisioningService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Laravel\Cashier\Cashier;
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
    public function __construct(private ClubProvisioningService $provisioner)
    {
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

        $this->syncSubscription($club, $session['subscription'] ?? null);
    }

    /**
     * Crea el registro local de la suscripción. El webhook customer.subscription.created
     * suele llegar antes de que el club exista, y Cashier lo descarta al no encontrar
     * el billable; sin esto el club quedaría bloqueado por CheckSubscriptionActive.
     */
    private function syncSubscription(Club $club, ?string $stripeSubscriptionId): void
    {
        if (!$stripeSubscriptionId) {
            return;
        }

        try {
            $stripeSubscription = Cashier::stripe()->subscriptions->retrieve($stripeSubscriptionId);

            if ($club->subscriptions()->where('stripe_id', $stripeSubscription->id)->exists()) {
                return;
            }

            $firstItem = $stripeSubscription->items->data[0] ?? null;

            $subscription = $club->subscriptions()->create([
                'type' => 'default',
                'stripe_id' => $stripeSubscription->id,
                'stripe_status' => $stripeSubscription->status,
                'stripe_price' => $firstItem ? $firstItem->price->id : null,
                'quantity' => $firstItem ? ($firstItem->quantity ?? 1) : 1,
                'trial_ends_at' => $stripeSubscription->trial_end
                    ? \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end)
                    : null,
                'ends_at' => null,
            ]);

            foreach ($stripeSubscription->items->data as $item) {
                $subscription->items()->create([
                    'stripe_id' => $item->id,
                    'stripe_product' => $item->price->product,
                    'stripe_price' => $item->price->id,
                    'quantity' => $item->quantity ?? 1,
                ]);
            }

            // El plan de pago de Stripe manda sobre las funciones del club
            $this->applyPlanFromPrice($club, $firstItem ? $firstItem->price->id : null);
        } catch (\Exception $e) {
            // No es fatal: Cashier creará la suscripción local con el siguiente
            // customer.subscription.updated del ciclo de vida.
            Log::error("No se pudo sincronizar la suscripción {$stripeSubscriptionId} del club {$club->id}: " . $e->getMessage());
        }
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

        $this->applyPlanFromPrice($club, $priceId);
    }

    /**
     * Mapea un Price ID de Stripe a un Plan local (vía config('services.stripe.prices'))
     * y actualiza el plan_id del club si cambia. No hace nada si el precio no se reconoce.
     */
    private function applyPlanFromPrice(Club $club, ?string $priceId): void
    {
        if (!$priceId) {
            return;
        }

        // Plan fijado por el admin: no se sincroniza desde Stripe (el club disfruta de
        // las funciones del plan asignado aunque pague un precio distinto).
        if ($club->plan_locked) {
            Log::info("Club {$club->id} con plan fijado (plan_locked); se omite la sincronización del plan desde Stripe.");
            return;
        }

        $slug = array_search($priceId, config('services.stripe.prices', []), true);
        if ($slug === false) {
            Log::warning("Precio de Stripe '{$priceId}' sin plan asociado en config; plan_id del club {$club->id} sin cambios.");
            return;
        }

        $plan = Plan::where('slug', $slug)->first();
        if (!$plan || $club->plan_id === $plan->id) {
            return;
        }

        $previous = $club->plan_id;
        $club->update(['plan_id' => $plan->id]);

        // Una bajada de plan retira automáticamente los módulos que el nuevo
        // plan no incluye.
        $club->syncModuleSettingsWithPlan();

        Log::info("Plan del club {$club->id} sincronizado desde Stripe: {$previous} -> {$plan->id} ({$slug}).");
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
