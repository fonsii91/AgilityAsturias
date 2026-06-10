<?php

namespace App\Http\Controllers;

use App\Models\ClubLead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\ClubLeadReceived;
use App\Mail\NewClubLeadAdmin;

class ClubLeadController extends Controller
{
    public function index()
    {
        return response()->json(ClubLead::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
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

        try {
            $lead = \Illuminate\Support\Facades\DB::transaction(function () use ($validated) {
                $validated['status'] = 'approved';
                $lead = ClubLead::create($validated);

                // Map subscription plan name to standard slug
                $planName = strtolower($validated['plan_selected']);
                $planSlug = 'basico';
                if (str_contains($planName, 'pro')) {
                    $planSlug = 'profesional';
                } elseif (str_contains($planName, 'elit') || str_contains($planName, 'élite')) {
                    $planSlug = 'elite';
                }

                $plan = \App\Models\Plan::where('slug', $planSlug)->first() ?: \App\Models\Plan::first();

                // Setup default tenant settings
                $settings = [
                    'slogan' => 'Gestiona tu club de Agility con profesionalidad',
                    'colors' => [
                        'primary' => '#0073CF',
                        'accent' => '#E65100',
                    ],
                    'homeConfig' => [
                        'heroImage' => '/Images/Salud/collie-cansancio-1.png',
                        'ctaImage' => '/Images/Salud/collie-salto-alto.png',
                    ],
                    'customizationRequest' => '',
                    'landing_page_requested' => false,
                    'gamification_enabled' => in_array($planSlug, ['profesional', 'elite']),
                    'provision_fondos_enabled' => in_array($planSlug, ['profesional', 'elite']),
                    'sponsors_enabled' => ($planSlug === 'elite'),
                    'contact' => [
                        'phone' => $validated['phone'] ?? '',
                        'email' => $validated['email'] ?? '',
                        'addressLine1' => '',
                        'addressLine2' => '',
                        'mapUrl' => '',
                    ],
                    'social' => [
                        'instagram' => '',
                        'facebook' => '',
                    ]
                ];

                // Create the Club
                $club = \App\Models\Club::create([
                    'name' => $validated['name'],
                    'slug' => $validated['slug'],
                    'plan_id' => $plan ? $plan->id : null,
                    'settings' => $settings,
                ]);

                // Create initial Manager user using user-supplied password
                $resetToken = \Illuminate\Support\Str::random(60);
                $user = \App\Models\User::create([
                    'name' => $validated['name'] . ' Admin',
                    'email' => $validated['email'],
                    'password' => \Illuminate\Support\Facades\Hash::make($validated['password']),
                    'role' => 'manager',
                    'club_id' => $club->id,
                    'reset_token' => $resetToken,
                ]);

                // Attach token to memory instance
                $lead->activation_token = $resetToken;

                return $lead;
            });

            // Compute activation link dynamically
            $resetToken = $lead->activation_token;
            $host = $request->getHost();
            
            if (str_contains($host, 'localhost') || str_contains($host, '127.0.0.1')) {
                $frontendUrl = env('FRONTEND_URL', 'http://localhost:4200');
                $parsedUrl = parse_url($frontendUrl);
                $scheme = $parsedUrl['scheme'] ?? 'http';
                $hostOnly = $parsedUrl['host'] ?? 'localhost';
                $portOnly = isset($parsedUrl['port']) ? ':' . $parsedUrl['port'] : '';
                
                if ($hostOnly === 'localhost') {
                    $activationLink = "{$scheme}://{$validated['slug']}.localhost{$portOnly}/reset-password?token={$resetToken}";
                } else {
                    $activationLink = "{$scheme}://{$validated['slug']}.{$hostOnly}{$portOnly}/reset-password?token={$resetToken}";
                }
            } else {
                $activationLink = "https://{$validated['slug']}.clubagility.com/reset-password?token={$resetToken}";
            }

            // Send emails (wrapped in try-catch to prevent crash if mail server is not configured)
            try {
                Mail::to($lead->email)->send(new ClubLeadReceived($lead, $activationLink));
                Mail::to('fonsii@clubagility.com')->send(new NewClubLeadAdmin($lead));
            } catch (\Exception $mailEx) {
                \Log::warning('Could not send SaaS subscription notification emails: ' . $mailEx->getMessage());
            }

            // Send database notification to admin users
            try {
                $admins = \App\Models\User::where('role', 'admin')->get();
                \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\NewClubLeadNotification($lead));
            } catch (\Exception $notifEx) {
                \Log::warning('Could not send database notifications: ' . $notifEx->getMessage());
            }

            // Trigger SSL generation asynchronously in production (detached to prevent 504 timeouts)
            if (config('app.env') === 'production') {
                shell_exec('nohup sudo /root/auto_ssl.sh < /dev/null > /dev/null 2>&1 &');
            }

            // Generar sesión de Stripe Checkout para el plan seleccionado
            $stripeCheckoutUrl = null;
            if (!config('services.stripe.bypass_subscriptions')) {
                try {
                    $club = \App\Models\Club::where('slug', $validated['slug'])->first();
                    if ($club) {
                        $planName = strtolower($validated['plan_selected']);
                        $planSlug = 'basico';
                        if (str_contains($planName, 'pro')) {
                            $planSlug = 'profesional';
                        } elseif (str_contains($planName, 'elit') || str_contains($planName, 'élite')) {
                            $planSlug = 'elite';
                        }

                        $priceId = match ($planSlug) {
                            'basico' => env('STRIPE_PRICE_BASICO'),
                            'profesional' => env('STRIPE_PRICE_PRO'),
                            'elite' => env('STRIPE_PRICE_ELITE'),
                        };

                        if ($priceId) {
                            $subscription = $club->newSubscription('default', $priceId);
                            if ($planSlug === 'profesional') {
                                $couponId = env('STRIPE_COUPON_PRO_LAUNCH');
                                if ($couponId) {
                                    $subscription->withCoupon($couponId);
                                }
                            }

                            $scheme = $request->secure() ? 'https' : 'http';
                            $host = $request->getHost();
                            
                            if (str_contains($host, 'localhost') || str_contains($host, '127.0.0.1')) {
                                $frontendUrl = env('FRONTEND_URL', 'http://localhost:4200');
                                $parsedUrl = parse_url($frontendUrl);
                                $scheme = $parsedUrl['scheme'] ?? 'http';
                                $hostOnly = $parsedUrl['host'] ?? 'localhost';
                                $portOnly = isset($parsedUrl['port']) ? ':' . $parsedUrl['port'] : '';
                                $returnHost = "{$scheme}://{$hostOnly}{$portOnly}";
                            } else {
                                $returnHost = "https://clubagility.com";
                            }

                            $successUrl = "{$returnHost}/?stripe_success=true&slug={$club->slug}&email=" . urlencode($validated['email']) . "&plan=" . urlencode($validated['plan_selected']) . "&session_id={CHECKOUT_SESSION_ID}";
                            $cancelUrl = "{$returnHost}/?stripe_cancel=true";

                            $checkoutSession = $subscription->checkout([
                                'success_url' => $successUrl,
                                'cancel_url' => $cancelUrl,
                            ]);

                            $stripeCheckoutUrl = $checkoutSession->url;
                        }
                    }
                } catch (\Exception $stripeEx) {
                    \Log::error('Error creando Stripe Checkout en registro de club: ' . $stripeEx->getMessage());
                }
            }

        } catch (\Exception $e) {
            \Log::error('Error during club auto-provisioning: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json([
                'message' => 'Ocurrió un error al aprovisionar automáticamente tu club. Por favor contacta con soporte.',
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'message' => 'Club pre-aprovisionado correctamente. Por favor complete el pago.',
            'lead' => $lead,
            'stripe_checkout_url' => $stripeCheckoutUrl
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

