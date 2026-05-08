<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Club;

class ClubController extends Controller
{
    public function current()
    {
        if (app()->bound('active_club_id')) {
            $club = Club::with('plan.features')->find(app('active_club_id'));
            if ($club) {
                return response()->json([
                    'id' => $club->id,
                    'name' => $club->name,
                    'slug' => $club->slug,
                    'domain' => $club->domain,
                    'logo_url' => $club->logo_url,
                    'settings' => $club->settings,
                    'plan_id' => $club->plan_id,
                    'features' => $club->plan ? $club->plan->features->pluck('slug') : [],
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
        return response()->json(Club::all());
    }

    public function show(Request $request, Club $club)
    {
        $user = $request->user();
        if ($user->role === 'manager' && $user->club_id !== $club->id) {
            return response()->json(['message' => 'Unauthorized. Managers can only view their own club.'], 403);
        }
        return response()->json($club);
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

        $settings = $request->input('settings');
        if (is_string($settings)) {
            $settings = json_decode($settings, true);
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

        $club->update($updateData);

        $this->handleClubFiles($request, $club);

        return response()->json($club);
    }

    private function handleClubFiles(Request $request, Club $club)
    {
        $settings = $club->settings ?? [];
        $slug = $club->slug;
        $changed = false;

        if ($request->hasFile('logo_file')) {
            if ($club->logo_url && str_contains($club->logo_url, '/storage/')) {
                $oldPath = str_replace(asset('storage/'), '', $club->logo_url);
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('logo_file')->store("clubs/{$slug}/settings", 'public');
            $club->logo_url = asset('storage/' . $path);
            $changed = true;
        }

        if ($request->hasFile('hero_file')) {
            if (isset($settings['homeConfig']['heroImage']) && str_contains($settings['homeConfig']['heroImage'], '/storage/')) {
                $oldPath = str_replace(asset('storage/'), '', $settings['homeConfig']['heroImage']);
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('hero_file')->store("clubs/{$slug}/settings", 'public');
            if (!isset($settings['homeConfig'])) {
                $settings['homeConfig'] = [];
            }
            $settings['homeConfig']['heroImage'] = asset('storage/' . $path);
            $changed = true;
        }

        if ($request->hasFile('cta_file')) {
            if (isset($settings['homeConfig']['ctaImage']) && str_contains($settings['homeConfig']['ctaImage'], '/storage/')) {
                $oldPath = str_replace(asset('storage/'), '', $settings['homeConfig']['ctaImage']);
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('cta_file')->store("clubs/{$slug}/settings", 'public');
            if (!isset($settings['homeConfig'])) {
                $settings['homeConfig'] = [];
            }
            $settings['homeConfig']['ctaImage'] = asset('storage/' . $path);
            $changed = true;
        }

        if ($changed) {
            $club->settings = $settings;
            $club->save();
        }
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
