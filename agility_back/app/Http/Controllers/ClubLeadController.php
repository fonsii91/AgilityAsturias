<?php

namespace App\Http\Controllers;

use App\Models\ClubLead;
use App\Services\ClubProvisioningService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Cashier\Cashier;

class ClubLeadController extends Controller
{
    public function index()
    {
        return response()->json(ClubLead::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request, ClubProvisioningService $provisioner)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|regex:/^[a-z0-9-]+$/|unique:clubs,slug',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'required|string|regex:/^\+?[0-9\s\-]+$/|max:20',
            'password' => 'required|string|min:6',
            'plan_selected' => 'required|string|max:50',
        ], [
            'slug.unique' => 'Este subdominio ya está registrado para otro club.',
            'email.unique' => 'Este correo electrónico ya está registrado en la plataforma.',
            'phone.regex' => 'Introduce un número de teléfono válido (solo números, espacios o guiones, opcionalmente comenzando con +).',
        ]);

        // La contraseña se guarda hasheada en el lead y se copia al usuario manager al aprovisionar
        $lead = ClubLead::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'plan_selected' => $validated['plan_selected'],
            'password' => Hash::make($validated['password']),
            'status' => 'pending',
        ]);

        // Con el bypass de suscripciones activo no hay pago: aprovisionar inmediatamente
        if (config('services.stripe.bypass_subscriptions')) {
            try {
                $provisioner->provision($lead);
            } catch (\Exception $e) {
                \Log::error('Error during club auto-provisioning: ' . $e->getMessage());
                \Log::error($e->getTraceAsString());
                return response()->json([
                    'message' => 'Ocurrió un error al aprovisionar automáticamente tu club. Por favor contacta con soporte.',
                    'error' => $e->getMessage()
                ], 500);
            }

            return response()->json([
                'message' => 'Club aprovisionado correctamente.',
                'lead' => $lead->fresh(),
                'stripe_checkout_url' => null
            ], 201);
        }

        // Flujo normal: el club NO se crea aún. Se genera la sesión de Stripe Checkout
        // con el lead en los metadatos y el aprovisionamiento ocurre al confirmarse el
        // pago (webhook checkout.session.completed -> StripeEventListener).
        $planSlug = $provisioner->resolvePlanSlug($validated['plan_selected']);
        $priceId = config("services.stripe.prices.{$planSlug}");

        if (!$priceId) {
            \Log::error("Registro de club sin Price ID configurado para el plan '{$planSlug}' (lead {$lead->id}).");
            return response()->json([
                'message' => 'El plan seleccionado no está configurado en la pasarela de pagos. Por favor contacta con soporte.',
            ], 500);
        }

        try {
            $scheme = $request->secure() ? 'https' : 'http';
            $host = $request->getHost();

            if (str_contains($host, 'localhost') || str_contains($host, '127.0.0.1')) {
                $parsedUrl = parse_url(config('services.frontend_url'));
                $scheme = $parsedUrl['scheme'] ?? 'http';
                $hostOnly = $parsedUrl['host'] ?? 'localhost';
                $portOnly = isset($parsedUrl['port']) ? ':' . $parsedUrl['port'] : '';
                $returnHost = "{$scheme}://{$hostOnly}{$portOnly}";
            } else {
                $returnHost = "https://clubagility.com";
            }

            $successUrl = "{$returnHost}/?stripe_success=true&slug={$validated['slug']}&email=" . urlencode($validated['email']) . "&plan=" . urlencode($validated['plan_selected']) . "&session_id={CHECKOUT_SESSION_ID}";
            $cancelUrl = "{$returnHost}/?stripe_cancel=true";

            $sessionParams = [
                'mode' => 'subscription',
                'customer_email' => $validated['email'],
                'line_items' => [[
                    'price' => $priceId,
                    'quantity' => 1,
                ]],
                'metadata' => ['club_lead_id' => $lead->id],
                'subscription_data' => [
                    'metadata' => ['club_lead_id' => $lead->id],
                ],
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
            ];

            if ($planSlug === 'profesional') {
                $couponId = config('services.stripe.coupon_pro_launch');
                if ($couponId) {
                    $sessionParams['discounts'] = [['coupon' => $couponId]];
                }
            }

            $checkoutSession = Cashier::stripe()->checkout->sessions->create($sessionParams);

            $lead->update(['stripe_session_id' => $checkoutSession->id]);
        } catch (\Exception $stripeEx) {
            \Log::error('Error creando Stripe Checkout en registro de club: ' . $stripeEx->getMessage());
            return response()->json([
                'message' => 'No se pudo iniciar el proceso de pago. Por favor inténtalo de nuevo o contacta con soporte.',
            ], 500);
        }

        return response()->json([
            'message' => 'Solicitud registrada. Por favor complete el pago para aprovisionar su club.',
            'lead' => $lead,
            'stripe_checkout_url' => $checkoutSession->url
        ], 201);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,approved,rejected',
        ]);

        $lead = ClubLead::findOrFail($id);
        $lead->update(['status' => $validated['status']]);

        return response()->json($lead);
    }

    public function destroy($id)
    {
        $lead = ClubLead::findOrFail($id);
        $lead->delete();

        return response()->json(['message' => 'Lead deleted successfully']);
    }

    public function checkSslStatus(Request $request, $slug)
    {
        // 1. Validate slug format
        if (!preg_match('/^[a-z0-9-]+$/', $slug)) {
            return response()->json(['ready' => false, 'error' => 'Invalid slug format'], 400);
        }

        // 2. Verify club exists
        $clubExists = \App\Models\Club::where('slug', $slug)->exists();
        if (!$clubExists) {
            return response()->json(['ready' => false, 'error' => 'Club not found'], 404);
        }

        // 3. For local or non-production environment, return ready immediately
        if (config('app.env') !== 'production') {
            return response()->json(['ready' => true, 'env' => config('app.env')]);
        }

        // 4. Check if the domain is listed in the SSL state file
        $stateFile = storage_path('app/current_ssl_domains.txt');
        if (!file_exists($stateFile)) {
            return response()->json(['ready' => false, 'reason' => 'SSL state file not found']);
        }

        $domains = file_get_contents($stateFile);
        if (!str_contains($domains, $slug . '.clubagility.com')) {
            return response()->json(['ready' => false, 'reason' => 'Subdomain not registered in SSL state yet']);
        }

        // 5. Attempt an SSL connection to verify the certificate is active and Nginx is serving it
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://{$slug}.clubagility.com");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true); // We only need headers/handshake, no body
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3); // 3 seconds timeout
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);

        $response = curl_exec($ch);
        $err = curl_errno($ch);
        $errmsg = curl_error($ch);
        curl_close($ch);

        if ($err === 0) {
            return response()->json(['ready' => true]);
        }

        return response()->json([
            'ready' => false,
            'reason' => 'SSL handshake failed',
            'curl_error' => $errmsg,
            'curl_errno' => $err
        ]);
    }
}

