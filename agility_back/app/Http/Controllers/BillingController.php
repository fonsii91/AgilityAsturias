<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Club;
use App\Models\Plan;
use Illuminate\Support\Facades\Log;

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
        
        // Determinar el Price ID de Stripe según la configuración del .env
        $priceId = match ($planSlug) {
            'basico' => env('STRIPE_PRICE_BASICO'),
            'profesional' => env('STRIPE_PRICE_PRO'),
            'elite' => env('STRIPE_PRICE_ELITE'),
        };

        if (!$priceId) {
            return response()->json(['message' => 'El plan seleccionado no está configurado en la pasarela de Stripe.'], 500);
        }

        try {
            // Inicializar la suscripción de Cashier
            $subscription = $club->newSubscription('default', $priceId);

            // Si es el Plan Pro (profesional), aplicamos la oferta de lanzamiento de Stripe
            if ($planSlug === 'profesional') {
                $couponId = env('STRIPE_COUPON_PRO_LAUNCH');
                if ($couponId) {
                    $subscription->withCoupon($couponId);
                }
            }

            // Generar el Checkout Session de Stripe
            // En producción, usa https y los dominios configurados
            $host = $request->getHost();
            $scheme = $request->secure() ? 'https' : 'http';
            $successUrl = "{$scheme}://{$host}/configuracion/facturacion?success=true&session_id={CHECKOUT_SESSION_ID}";
            $cancelUrl = "{$scheme}://{$host}/configuracion/facturacion?cancel=true";

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
            $host = $request->getHost();
            $scheme = $request->secure() ? 'https' : 'http';
            $returnUrl = "{$scheme}://{$host}/configuracion/facturacion";

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

        $bypass = env('BYPASS_SUBSCRIPTIONS', false) || env('STRIPE_BYPASS_SUBSCRIPTIONS', false);
        $subscriptionActive = $bypass ? true : $club->subscribed('default');
        $subscription = $club->subscription('default');
        
        $plan = $club->plan;
        
        return response()->json([
            'subscribed' => $subscriptionActive,
            'plan_name' => $plan ? $plan->name : 'Ninguno',
            'plan_slug' => $plan ? $plan->slug : null,
            'stripe_status' => $bypass ? 'active' : ($subscription ? $subscription->stripe_status : 'inactive'),
            'pm_type' => $club->pm_type,
            'pm_last_four' => $club->pm_last_four,
            'ends_at' => $subscription && $subscription->ends_at ? $subscription->ends_at->toIso8601String() : null,
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
            $invoices = $club->invoices()->map(function ($invoice) use ($club) {
                return [
                    'id' => $invoice->id,
                    'date' => $invoice->date()->toDateString(),
                    'total' => $invoice->total(),
                    'download_url' => route('billing.invoice-download', ['invoice' => $invoice->id]),
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
