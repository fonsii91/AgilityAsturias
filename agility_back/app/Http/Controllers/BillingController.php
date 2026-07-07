<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Club;
use App\Models\Plan;
use App\Services\StripeSubscriptionSyncService;
use App\Support\FrontendUrl;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

class BillingController extends Controller
{
    /**
     * Create a Stripe Checkout session for a subscription.
     */
    public function checkout(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'manager' && $user->role !== 'admin') {
            return response()->json(['message' => 'No autorizado para gestionar facturación.'], 403);
        }

        $club = null;
        if (app()->bound('active_club_id')) {
            $club = Club::find(app('active_club_id'));
        } else {
            $club = $user->club;
        }

        if (!$club) {
            return response()->json(['message' => 'No se detectó ningún club activo.'], 404);
        }

        $validated = $request->validate([
            'plan_slug' => 'required|string|in:basico,profesional,elite',
        ]);

        $planSlug = $validated['plan_slug'];

        // Determinar el Price ID de Stripe (vía config() para soportar config:cache)
        $priceId = config("services.stripe.prices.{$planSlug}");

        if (!$priceId) {
            return response()->json(['message' => 'El plan seleccionado no está configurado en la pasarela de Stripe.'], 500);
        }

        try {
            // Inicializar la suscripción de Cashier
            $subscription = $club->newSubscription('default', $priceId);

            // Si es el Plan Pro (profesional), aplicamos la oferta de lanzamiento de Stripe
            if ($planSlug === 'profesional') {
                $couponId = config('services.stripe.coupon_pro_launch');
                if ($couponId) {
                    $subscription->withCoupon($couponId);
                }
            }

            // Generar el Checkout Session de Stripe.
            // Stripe debe redirigir al FRONTEND, no al backend: el host de la
            // petición ($request->getHost()) es el del backend (agility_back.test
            // en local), que no tiene la ruta Angular /configuracion/facturacion
            // y devuelve 404. Usamos el Origin de la petición para respetar el
            // subdominio del tenant (mismo criterio que el reset de contraseña).
            $returnHost = FrontendUrl::returnHost($request->header('origin'));

            $successUrl = "{$returnHost}/configuracion/facturacion?success=true&session_id={CHECKOUT_SESSION_ID}";
            $cancelUrl = "{$returnHost}/configuracion/facturacion?cancel=true";

            $checkoutSession = $subscription->checkout([
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
            ]);

            return response()->json(['url' => $checkoutSession->url]);
        } catch (\Exception $e) {
            Log::error('Error creando checkout session de Stripe: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al conectar con Stripe Checkout.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Sincroniza la suscripción tras volver del Stripe Checkout (success_url).
     *
     * El registro local de la suscripción lo crea normalmente el webhook, pero:
     *  - en local Stripe no puede alcanzar agility_back.test, así que nunca llega;
     *  - en producción el usuario suele aterrizar en la página de éxito antes de
     *    que Stripe entregue el webhook, y vería el aviso de "suscripción
     *    requerida" durante unos segundos.
     * Este endpoint verifica la sesión de Checkout contra Stripe y registra la
     * suscripción al momento. Es idempotente: si el webhook llegó primero, no hace nada.
     */
    public function syncCheckoutSession(Request $request, StripeSubscriptionSyncService $subscriptionSync)
    {
        $user = $request->user();
        if ($user->role !== 'manager' && $user->role !== 'admin') {
            return response()->json(['message' => 'No autorizado para gestionar facturación.'], 403);
        }

        $club = null;
        if (app()->bound('active_club_id')) {
            $club = Club::find(app('active_club_id'));
        } else {
            $club = $user->club;
        }

        if (!$club) {
            return response()->json(['message' => 'No se detectó ningún club activo.'], 404);
        }

        $validated = $request->validate([
            'session_id' => 'required|string',
        ]);

        try {
            $session = Cashier::stripe()->checkout->sessions->retrieve($validated['session_id']);

            // La sesión debe pertenecer al cliente de Stripe de ESTE club: el
            // session_id viene de la URL y no debe permitir activar un club ajeno.
            if (!$club->hasStripeId() || $session->customer !== $club->stripe_id) {
                return response()->json(['message' => 'La sesión de pago no corresponde a este club.'], 403);
            }

            if ($session->payment_status !== 'paid') {
                return response()->json(['message' => 'El pago de la sesión aún no está confirmado.'], 409);
            }

            $subscriptionSync->syncSubscription($club, $session->subscription);

            return $this->status($request);
        } catch (\Exception $e) {
            Log::error('Error sincronizando la sesión de Checkout de Stripe: ' . $e->getMessage());
            return response()->json(['message' => 'No se pudo verificar la sesión de pago con Stripe.'], 500);
        }
    }

    /**
     * Redirect the user to the Stripe Customer Portal.
     */
    public function portal(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'manager' && $user->role !== 'admin') {
            return response()->json(['message' => 'No autorizado para gestionar facturación.'], 403);
        }

        $club = null;
        if (app()->bound('active_club_id')) {
            $club = Club::find(app('active_club_id'));
        } else {
            $club = $user->club;
        }

        if (!$club || !$club->hasStripeId()) {
            return response()->json(['message' => 'El club no tiene configurado un perfil de Stripe aún (debe realizar el primer pago).'], 404);
        }

        try {
            // Igual que en checkout(): la vuelta del portal debe ir al frontend,
            // no al host del backend.
            $returnHost = FrontendUrl::returnHost($request->header('origin'));
            $returnUrl = "{$returnHost}/configuracion/facturacion";

            $portalUrl = $club->billingPortalUrl($returnUrl);

            return response()->json(['url' => $portalUrl]);
        } catch (\Exception $e) {
            Log::error('Error al generar Stripe Billing Portal URL: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al generar el portal de facturación.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get the current billing and plan status of the club.
     */
    public function status(Request $request)
    {
        $club = null;
        if (app()->bound('active_club_id')) {
            $club = Club::find(app('active_club_id'));
        } else {
            $club = $request->user()->club;
        }

        if (!$club) {
            return response()->json(['message' => 'Club no encontrado.'], 404);
        }

        $bypass = config('services.stripe.bypass_subscriptions');
        $subscription = $club->subscription('default');
        $realSubscribed = $club->subscribed('default');
        $onCourtesy = $club->onCourtesyPeriod();

        // El acceso se concede si hay suscripción real, si está en periodo de cortesía
        // o si el bypass global está activo. El gestor sigue viendo el banner de cortesía
        // (on_courtesy) para que migre a pago antes de la fecha límite.
        $subscriptionActive = $bypass || $realSubscribed || $onCourtesy;

        $plan = $club->plan;

        return response()->json([
            'subscribed' => $subscriptionActive,
            'plan_name' => $plan ? $plan->name : 'Ninguno',
            'plan_slug' => $plan ? $plan->slug : null,
            'stripe_status' => $bypass ? 'active' : ($subscription ? $subscription->stripe_status : 'inactive'),
            'pm_type' => $club->pm_type,
            'pm_last_four' => $club->pm_last_four,
            'ends_at' => $subscription && $subscription->ends_at ? $subscription->ends_at->toIso8601String() : null,
            // Periodo de cortesía: el gestor mantiene acceso pero debe añadir método de pago
            // antes de courtesy_until. Solo se marca on_courtesy si NO hay suscripción real.
            'on_courtesy' => $onCourtesy && !$realSubscribed,
            'courtesy_until' => $club->courtesy_until ? $club->courtesy_until->toIso8601String() : null,
            // Indica si el club tiene cliente en Stripe (necesario para el portal de facturación).
            // Sin cliente real, hay que hacer el primer pago vía Checkout, no abrir el portal.
            'has_stripe_customer' => $club->hasStripeId(),
        ]);
    }

    /**
     * Get the list of invoices for the club.
     */
    public function invoices(Request $request)
    {
        $club = null;
        if (app()->bound('active_club_id')) {
            $club = Club::find(app('active_club_id'));
        } else {
            $club = $request->user()->club;
        }

        if (!$club || !$club->hasStripeId()) {
            return response()->json([]);
        }

        try {
            $invoices = $club->invoices()->map(function ($invoice) {
                return [
                    'id' => $invoice->id,
                    'date' => $invoice->date()->toDateString(),
                    'total' => $invoice->total(),
                ];
            });

            return response()->json($invoices);
        } catch (\Exception $e) {
            Log::error('Error al recuperar facturas de Stripe: ' . $e->getMessage());
            return response()->json([]);
        }
    }

    /**
     * Download a specific invoice PDF.
     */
    public function downloadInvoice(Request $request, $invoice)
    {
        $club = null;
        if (app()->bound('active_club_id')) {
            $club = Club::find(app('active_club_id'));
        } else {
            $club = $request->user()->club;
        }

        if (!$club || !$club->hasStripeId()) {
            return response()->json(['message' => 'No se encontraron facturas.'], 404);
        }

        try {
            return $club->downloadInvoice($invoice, [
                'vendor' => 'ClubAgility SaaS',
                'product' => 'Suscripción Mensual ClubAgility',
            ]);
        } catch (\Exception $e) {
            Log::error('Error descargando factura PDF de Stripe: ' . $e->getMessage());
            return response()->json(['message' => 'Error al generar el PDF de la factura.'], 500);
        }
    }
}
