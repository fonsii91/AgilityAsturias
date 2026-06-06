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
            'phone' => 'required|string|max:20',
            'plan_selected' => 'required|string|max:50',
        ], [
            'slug.unique' => 'Este subdominio ya está registrado para otro club.',
            'email.unique' => 'Este correo electrónico ya está registrado en la plataforma.',
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

                // Create initial Manager user
                $resetToken = \Illuminate\Support\Str::random(60);
                $user = \App\Models\User::create([
                    'name' => $validated['name'] . ' Admin',
                    'email' => $validated['email'],
                    'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(24)),
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

            // Send emails
            Mail::to($lead->email)->send(new ClubLeadReceived($lead, $activationLink));
            Mail::to('fonsii@clubagility.com')->send(new NewClubLeadAdmin($lead));

            // Send database notification to admin users
            $admins = \App\Models\User::where('role', 'admin')->get();
            \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\NewClubLeadNotification($lead));

        } catch (\Exception $e) {
            \Log::error('Error during club auto-provisioning: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json([
                'message' => 'Ocurrió un error al aprovisionar automáticamente tu club. Por favor contacta con soporte.',
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'message' => 'Club aprovisionado y listo correctamente.',
            'lead' => $lead
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
}
