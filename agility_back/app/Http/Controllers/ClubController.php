<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Club;
use App\Services\ClubProvisioningService;

class ClubController extends Controller
{
    // Claves de settings que los formularios de gestión pueden editar.
    // Al actualizar, solo estas claves se toman del cliente; cualquier otra
    // (internas del backend como bunny_collection_id, o claves futuras)
    // se conserva tal cual está en base de datos.
    private const CLIENT_EDITABLE_SETTINGS_KEYS = [
        'slogan',
        'colors',
        'homeConfig',
        'contact',
        'social',
        'gamification_enabled',
        'provision_fondos_enabled',
        'liga_norte_enabled',
        'sponsors_enabled',
        'customizationRequest',
        'landing_page_requested',
        'cancellation_notice_hours',
    ];

    public function current()
    {
        if (app()->bound('active_club_id')) {
            $club = Club::with('plan.features')->find(app('active_club_id'));
            if ($club) {
                $bypass = config('services.stripe.bypass_subscriptions');
                // El periodo de cortesía cuenta como acceso activo: el frontend
                // usa este flag para permitir la navegación (subscription-active
                // guard), igual que CheckSubscriptionActive lo permite en la API.
                $hasAccess = $bypass
                    || $club->subscribed('default')
                    || $club->onCourtesyPeriod();
                return response()->json([
                    'id' => $club->id,
                    'name' => $club->name,
                    'slug' => $club->slug,
                    'domain' => $club->domain,
                    'logo_url' => $club->logo_url,
                    'settings' => $club->settings,
                    'settings_ranking' => $club->settings_ranking,
                    'plan_id' => $club->plan_id,
                    'features' => $club->plan ? $club->plan->features->pluck('slug') : [],
                    'subscribed' => $hasAccess,
                    'stripe_status' => $bypass ? 'active' : ($club->subscription('default') ? $club->subscription('default')->stripe_status : 'inactive'),
                ]);
            }
        }
        
        return response()->json(null, 404);
    }

    public function manifest(Request $request)
    {
        $clubDomain = $request->header('X-Club-Domain') ?: $request->query('domain');
        $clubSlug = $request->header('X-Club-Slug') ?: $request->query('slug');

        $club = null;
        if ($clubDomain) {
            $club = Club::where('domain', $clubDomain)->first();
        }
        if (!$club && $clubSlug) {
            $club = Club::where('slug', $clubSlug)->first();
        }

        if (!$club && app()->bound('active_club_id')) {
            $club = Club::find(app('active_club_id'));
        }

        if ($club) {
            $primaryColor = $club->settings['colors']['primary'] ?? ($club->settings['primary_color'] ?? '#0073CF');
            
            $iconType = 'image/png';
            $logoUrl = $club->logo_url ?? '/ClubAgilityBlue.png';
            $lowerUrl = strtolower($logoUrl);
            if (str_ends_with($lowerUrl, '.jpg') || str_ends_with($lowerUrl, '.jpeg')) {
                $iconType = 'image/jpeg';
            } elseif (str_ends_with($lowerUrl, '.svg')) {
                $iconType = 'image/svg+xml';
            } elseif (str_ends_with($lowerUrl, '.webp')) {
                $iconType = 'image/webp';
            }

            return response()->json([
                'name' => $club->name,
                'short_name' => $club->name,
                'display' => 'standalone',
                'start_url' => '/',
                'theme_color' => $primaryColor,
                'background_color' => '#f8fafc',
                'icons' => [
                    [
                        'src' => $logoUrl,
                        'sizes' => '192x192',
                        'type' => $iconType,
                        'purpose' => 'any maskable'
                    ],
                    [
                        'src' => $logoUrl,
                        'sizes' => '512x512',
                        'type' => $iconType,
                        'purpose' => 'any maskable'
                    ]
                ]
            ]);
        }
        
        // Default manifest if no club found
        return response()->json([
            'name' => 'Club Agility',
            'short_name' => 'Club Agility',
            'display' => 'standalone',
            'start_url' => '/',
            'theme_color' => '#0073CF',
            'background_color' => '#f8fafc',
            'icons' => [
                [
                    'src' => '/ClubAgilityBlue.png',
                    'sizes' => '192x192',
                    'type' => 'image/png',
                    'purpose' => 'any maskable'
                ],
                [
                    'src' => '/ClubAgilityBlue.png',
                    'sizes' => '512x512',
                    'type' => 'image/png',
                    'purpose' => 'any maskable'
                ]
            ]
        ]);
    }

    public function index()
    {
        // Marca cada club con si su plan está gobernado por una suscripción de Stripe
        // activa (en ese caso el plan_id se sincroniza solo desde Stripe y el selector
        // manual de /admin/clubs es solo un override).
        $clubs = Club::all()->map(function (Club $club) {
            $club->setAttribute('has_active_subscription', $club->subscribed('default'));
            return $club;
        });

        return response()->json($clubs);
    }

    public function show(Request $request, Club $club)
    {
        $user = $request->user();
        if ($user->role === 'manager' && $user->club_id !== $club->id) {
            return response()->json(['message' => 'Unauthorized. Managers can only view their own club.'], 403);
        }
        // El plan y sus features se incluyen para que el formulario de gestión
        // pueda reflejar qué módulos permite activar el plan contratado
        // (PLAN_GATED_MODULES).
        return response()->json($club->load('plan.features'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:clubs,slug',
            'domain' => 'nullable|string|max:255|unique:clubs,domain',
            'plan_id' => 'nullable|exists:plans,id',
            'logo_url' => 'nullable|string|max:255',
            'logo_file' => 'nullable|image|mimes:jpeg,png,jpg,webp,svg|max:2048',
            'hero_file' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'cta_file' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $settings = $request->input('settings');
        if (is_string($settings)) {
            $settings = json_decode($settings, true);
        }

        if (!isset($settings['homeConfig'])) {
            $settings['homeConfig'] = [];
        }
        if (!isset($settings['homeConfig']['heroImage'])) {
            $settings['homeConfig']['heroImage'] = '/Images/Salud/collie-cansancio-1.png';
        }
        if (!isset($settings['homeConfig']['ctaImage'])) {
            $settings['homeConfig']['ctaImage'] = '/Images/Salud/collie-salto-alto.png';
        }

        $club = Club::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'domain' => $validated['domain'] ?? null,
            'plan_id' => $validated['plan_id'] ?? null,
            'logo_url' => $validated['logo_url'] ?? null,
            'settings' => $settings,
        ]);

        $this->handleClubFiles($request, $club);

        $leadId = $request->input('lead_id');
        if ($leadId) {
            $lead = \App\Models\ClubLead::find($leadId);
            if ($lead) {
                $lead->update(['status' => 'approved']);
            }
        }

        return response()->json($club, 201);
    }

    public function update(Request $request, Club $club)
    {
        $user = $request->user();
        if ($user->role === 'manager' && $user->club_id !== $club->id) {
            return response()->json(['message' => 'Unauthorized. Managers can only update their own club.'], 403);
        }
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'slug' => 'required|string|max:255|unique:clubs,slug,' . $club->id,
                'domain' => 'nullable|string|max:255|unique:clubs,domain,' . $club->id,
                'plan_id' => 'nullable|exists:plans,id',
                'logo_url' => 'nullable|string|max:255',
                'logo_file' => 'nullable|image|mimes:jpeg,png,jpg,webp,svg|max:2048',
                'hero_file' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
                'cta_file' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation failed: ' . json_encode($e->errors()));
            throw $e;
        }

        $incoming = $request->input('settings');
        if (is_string($incoming)) {
            $incoming = json_decode($incoming, true);
        }

        // Se parte siempre de los settings actuales y solo se sobrescriben las
        // claves editables que el cliente envía: las que no envía y las internas
        // del backend nunca se pierden.
        $currentSettings = $club->settings ?? [];
        $settings = $currentSettings;
        if (is_array($incoming)) {
            foreach (self::CLIENT_EDITABLE_SETTINGS_KEYS as $key) {
                if (array_key_exists($key, $incoming)) {
                    $settings[$key] = $incoming[$key];
                }
            }
        }

        // Un gestor no puede tener activos módulos cuya feature no incluye su
        // plan (matriz de /admin/suscripciones): al guardar se fuerzan a
        // desactivado, en línea con Club::syncModuleSettingsWithPlan() al
        // cambiar de plan. Sin plan asignado, o con la feature sin crear en BD
        // (seeder pendiente), no se restringe nada.
        if ($user->role !== 'admin' && $club->plan) {
            $registered = \App\Models\Feature::whereIn('slug', array_values(Club::PLAN_GATED_MODULES))
                ->pluck('slug')->all();
            $planFeatures = $club->plan->features()->pluck('slug')->all();
            foreach (Club::PLAN_GATED_MODULES as $key => $featureSlug) {
                if (in_array($featureSlug, $registered, true)
                    && !in_array($featureSlug, $planFeatures, true)) {
                    $settings[$key] = false;
                }
            }
        }

        $updateData = [
            'name' => $validated['name'],
            'logo_url' => $request->has('logo_url') ? $validated['logo_url'] : $club->logo_url,
            'settings' => $settings,
        ];

        if ($user->role === 'admin') {
            if (array_key_exists('slug', $validated)) {
                $updateData['slug'] = $validated['slug'];
            }
            if (array_key_exists('domain', $validated)) {
                $updateData['domain'] = $validated['domain'] ?? null;
            }
            if (array_key_exists('plan_id', $validated)) {
                $updateData['plan_id'] = $validated['plan_id'] ?? null;
            }
        }

        $planChanged = array_key_exists('plan_id', $updateData)
            && (int) $updateData['plan_id'] !== (int) $club->plan_id;

        $club->update($updateData);

        // Una bajada de plan retira automáticamente los módulos que el nuevo
        // plan no incluye.
        if ($planChanged) {
            $club->syncModuleSettingsWithPlan();
        }

        $this->handleClubFiles($request, $club);

        return response()->json($club);
    }

    private function handleClubFiles(Request $request, Club $club)
    {
        $slug = $club->slug;

        if ($request->hasFile('logo_file')) {
            if ($club->logo_url && str_contains($club->logo_url, '/storage/')) {
                $oldPath = str_replace(asset('storage/'), '', $club->logo_url);
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('logo_file')->store("clubs/{$slug}/settings", 'public');
            $club->logo_url = asset('storage/' . $path);
            $club->save();
        }

        $settings = $club->settings ?? [];
        $homeConfigChanges = [];

        if ($request->hasFile('hero_file')) {
            if (isset($settings['homeConfig']['heroImage']) && str_contains($settings['homeConfig']['heroImage'], '/storage/')) {
                $oldPath = str_replace(asset('storage/'), '', $settings['homeConfig']['heroImage']);
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('hero_file')->store("clubs/{$slug}/settings", 'public');
            $homeConfigChanges['heroImage'] = asset('storage/' . $path);
        }

        if ($request->hasFile('cta_file')) {
            if (isset($settings['homeConfig']['ctaImage']) && str_contains($settings['homeConfig']['ctaImage'], '/storage/')) {
                $oldPath = str_replace(asset('storage/'), '', $settings['homeConfig']['ctaImage']);
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('cta_file')->store("clubs/{$slug}/settings", 'public');
            $homeConfigChanges['ctaImage'] = asset('storage/' . $path);
        }

        if ($homeConfigChanges) {
            // Se relee el club justo antes de escribir para no pisar cambios
            // concurrentes en settings hechos mientras se procesaban los ficheros.
            $club->refresh();
            $settings = $club->settings ?? [];
            if (!isset($settings['homeConfig']) || !is_array($settings['homeConfig'])) {
                $settings['homeConfig'] = [];
            }
            foreach ($homeConfigChanges as $key => $value) {
                $settings['homeConfig'][$key] = $value;
            }
            $club->settings = $settings;
            $club->save();
        }
    }

    public function clearDemoData(Request $request, Club $club, ClubProvisioningService $provisioner)
    {
        $user = $request->user();
        if ($user->role === 'manager' && $user->club_id !== $club->id) {
            return response()->json(['message' => 'Unauthorized. Managers can only clear their own club.'], 403);
        }

        $provisioner->clearDemoData($club);

        return response()->json([
            'message' => 'Datos de ejemplo eliminados.',
            'club' => $club->fresh()->load('plan.features'),
        ]);
    }

    public function destroy(Club $club)
    {
        // Don't delete the default club
        if ($club->id === 1) {
            return response()->json(['message' => 'No se puede eliminar el club principal.'], 403);
        }
        
        $club->delete();
        return response()->json(['message' => 'Club eliminado correctamente']);
    }
}
