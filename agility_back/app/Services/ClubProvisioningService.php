<?php

namespace App\Services;

use App\Mail\ClubLeadReceived;
use App\Mail\NewClubLeadAdmin;
use App\Models\Club;
use App\Models\ClubLead;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

/**
 * Aprovisiona un club a partir de un ClubLead: club + usuario manager + settings,
 * email de activación, avisos a administración y certificado SSL.
 *
 * Se invoca desde dos puntos:
 *  - ClubLeadController@store cuando el bypass de suscripciones está activo (sin pago).
 *  - StripeEventListener al confirmarse el pago (checkout.session.completed).
 */
class ClubProvisioningService
{
    /**
     * @param ClubLead $lead Lead con la contraseña ya hasheada en `password`.
     * @param string|null $stripeCustomerId Cliente de Stripe a asociar al club (flujo con pago).
     */
    public function provision(ClubLead $lead, ?string $stripeCustomerId = null): Club
    {
        $result = DB::transaction(function () use ($lead, $stripeCustomerId) {
            $planSlug = $this->resolvePlanSlug($lead->plan_selected);
            $plan = Plan::where('slug', $planSlug)->first() ?: Plan::first();

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
                    'phone' => $lead->phone ?? '',
                    'email' => $lead->email ?? '',
                    'addressLine1' => '',
                    'addressLine2' => '',
                    'mapUrl' => '',
                ],
                'social' => [
                    'instagram' => '',
                    'facebook' => '',
                ]
            ];

            $club = Club::create([
                'name' => $lead->name,
                'slug' => $lead->slug,
                'plan_id' => $plan ? $plan->id : null,
                'settings' => $settings,
            ]);

            if ($stripeCustomerId) {
                $club->stripe_id = $stripeCustomerId;
                $club->save();
            }

            // El token de activación se guarda hasheado; 7 días para completar la activación
            $resetToken = Str::random(60);
            User::create([
                'name' => $lead->name . ' Admin',
                'email' => $lead->email,
                // El cast 'hashed' del modelo detecta el hash existente y no lo re-hashea
                'password' => $lead->password,
                'role' => 'manager',
                'club_id' => $club->id,
                'reset_token' => hash('sha256', $resetToken),
                'reset_token_expires_at' => now()->addDays(7),
            ]);

            $lead->update([
                'status' => 'approved',
                'club_id' => $club->id,
                'provisioned_at' => now(),
            ]);

            return ['club' => $club, 'activation_token' => $resetToken];
        });

        $club = $result['club'];
        $activationLink = $this->buildActivationLink($lead->slug, $result['activation_token']);

        // Send emails (wrapped in try-catch to prevent crash if mail server is not configured)
        try {
            Mail::to($lead->email)->send(new ClubLeadReceived($lead, $activationLink));
            Mail::to(config('mail.admin_address'))->send(new NewClubLeadAdmin($lead));
        } catch (\Exception $mailEx) {
            \Log::warning('Could not send SaaS subscription notification emails: ' . $mailEx->getMessage());
        }

        // Send database notification to admin users
        try {
            $admins = User::where('role', 'admin')->get();
            Notification::send($admins, new \App\Notifications\NewClubLeadNotification($lead));
        } catch (\Exception $notifEx) {
            \Log::warning('Could not send database notifications: ' . $notifEx->getMessage());
        }

        // Trigger SSL generation asynchronously in production (detached to prevent 504 timeouts)
        if (config('app.env') === 'production') {
            shell_exec('nohup sudo /root/auto_ssl.sh < /dev/null > /dev/null 2>&1 &');
        }

        return $club;
    }

    public function resolvePlanSlug(string $planSelected): string
    {
        $planName = strtolower($planSelected);
        if (str_contains($planName, 'pro')) {
            return 'profesional';
        }
        if (str_contains($planName, 'elit') || str_contains($planName, 'élite')) {
            return 'elite';
        }
        return 'basico';
    }

    private function buildActivationLink(string $slug, string $token): string
    {
        if (config('app.env') === 'production') {
            return "https://{$slug}.clubagility.com/reset-password?token={$token}";
        }

        $frontendUrl = config('services.frontend_url');
        $parsedUrl = parse_url($frontendUrl);
        $scheme = $parsedUrl['scheme'] ?? 'http';
        $hostOnly = $parsedUrl['host'] ?? 'localhost';
        $portOnly = isset($parsedUrl['port']) ? ':' . $parsedUrl['port'] : '';

        return "{$scheme}://{$slug}.{$hostOnly}{$portOnly}/reset-password?token={$token}";
    }
}
