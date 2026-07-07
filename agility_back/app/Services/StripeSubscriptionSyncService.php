<?php

namespace App\Services;

use App\Models\Club;
use App\Models\Plan;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

/**
 * Sincroniza la suscripción y el plan de un club a partir de los datos de Stripe.
 *
 * Se usa desde dos puntos:
 *  - StripeEventListener (webhooks): flujo normal en producción.
 *  - BillingController::syncCheckoutSession (retorno del Checkout): cubre el
 *    lag del webhook en producción y el desarrollo local, donde Stripe no
 *    puede alcanzar agility_back.test y el webhook nunca llega.
 */
class StripeSubscriptionSyncService
{
    /**
     * Crea el registro local de la suscripción si no existe y sincroniza el plan.
     * Idempotente: si la suscripción ya está registrada (p. ej. el webhook llegó
     * primero), no hace nada.
     */
    public function syncSubscription(Club $club, ?string $stripeSubscriptionId): void
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
     * Mapea un Price ID de Stripe a un Plan local (vía config('services.stripe.prices'))
     * y actualiza el plan_id del club si cambia. No hace nada si el precio no se reconoce.
     */
    public function applyPlanFromPrice(Club $club, ?string $priceId): void
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
}
