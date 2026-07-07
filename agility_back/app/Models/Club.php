<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Cashier\Billable;

class Club extends Model
{
    use Billable;

    /**
     * Módulos de settings ligados a una feature del plan contratado. La
     * asignación feature↔plan se gestiona en la matriz de /admin/suscripciones
     * y es la única fuente de verdad del acceso a estos módulos.
     */
    public const PLAN_GATED_MODULES = [
        'gamification_enabled' => 'gamificacion',
        'provision_fondos_enabled' => 'provision-fondos',
        'sponsors_enabled' => 'patrocinadores',
        'liga_norte_enabled' => 'liga-norte',
        // Bitácoras personales de competición. Clubes anteriores a estas claves
        // no las tienen en settings: la ausencia cuenta como activado (solo un
        // false explícito apaga el módulo), para no retirárselas al desplegar.
        'rsce_tracker_enabled' => 'modulo-canina',
        'rfec_tracker_enabled' => 'modulo-caza',
    ];

    protected $fillable = [
        'name',
        'slug',
        'domain',
        'logo_url',
        'settings',
        'settings_ranking',
        'plan_id',
        'stripe_id',
        'pm_type',
        'pm_last_four',
        'courtesy_until',
        'plan_locked',
    ];

    protected $casts = [
        'settings' => 'array',
        'settings_ranking' => 'array',
        'courtesy_until' => 'datetime',
        'plan_locked' => 'boolean',
    ];

    /**
     * Indica si el club está dentro de un periodo de cortesía vigente.
     * Mientras lo esté, mantiene acceso completo aunque no tenga suscripción
     * de Stripe activa (migración escalonada de los clubes existentes a pago real).
     */
    public function onCourtesyPeriod(): bool
    {
        return $this->courtesy_until !== null && $this->courtesy_until->isFuture();
    }

    public function users()
    {
        return $this->hasMany(\App\Models\User::class);
    }

    public function dogs()
    {
        return $this->hasMany(\App\Models\Dog::class);
    }

    public function videos()
    {
        return $this->hasMany(\App\Models\Video::class);
    }

    public function plan()
    {
        return $this->belongsTo(\App\Models\Plan::class);
    }

    public function gamificationSeasons()
    {
        return $this->hasMany(\App\Models\GamificationSeason::class);
    }

    protected static function booted()
    {
        // Todo club nace con su pista de entrenamiento principal: la regla de
        // negocio exige al menos una pista por club para poder asociar los
        // horarios de clase. club_id explícito porque la creación puede correr
        // fuera del contexto de tenant (webhook de Stripe, panel de admin).
        static::created(function ($club) {
            \App\Models\TrainingTrack::create([
                'club_id' => $club->id,
                'name' => \App\Models\TrainingTrack::DEFAULT_NAME,
                'surface' => 'otro',
            ]);
        });

        static::deleting(function ($club) {
            // Delete all videos of the club via Eloquent to trigger file cleanups (Bunny.net & Local)
            \App\Models\Video::withoutGlobalScopes()
                ->where('club_id', $club->id)
                ->get()
                ->each
                ->delete();

            // Delete all photos of the club via Eloquent to trigger file cleanups (Mega S4 / Local)
            \App\Models\ClubPhoto::withoutGlobalScopes()
                ->where('club_id', $club->id)
                ->get()
                ->each
                ->delete();

            // Delete all dogs of the club via Eloquent to trigger their delete events (which also cleans up their videos)
            \App\Models\Dog::withoutGlobalScopes()
                ->where('club_id', $club->id)
                ->get()
                ->each
                ->delete();

            // Delete all users of the club via Eloquent to trigger their delete events (which also cleans up their videos)
            \App\Models\User::withoutGlobalScopes()
                ->where('club_id', $club->id)
                ->get()
                ->each
                ->delete();

            // Delete all training tracks via Eloquent to trigger photo file cleanup
            \App\Models\TrainingTrack::withoutGlobalScopes()
                ->where('club_id', $club->id)
                ->get()
                ->each
                ->delete();

            // Delete local logo if exists
            if ($club->logo_url && !str_starts_with($club->logo_url, 'http') && \Illuminate\Support\Facades\Storage::disk('public')->exists($club->logo_url)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($club->logo_url);
            }
        });
    }

    /**
     * Apaga en settings los módulos cuya feature no incluye el plan actual.
     * Se invoca tras cada cambio de plan (panel de admin y sincronización de
     * Stripe) para que una bajada de plan retire los módulos del plan superior.
     * Solo desactiva: subir de plan no enciende módulos automáticamente. Las
     * features sin crear en BD (seeder pendiente) y los clubes sin plan no
     * restringen nada.
     */
    public function syncModuleSettingsWithPlan(): void
    {
        $this->refresh();

        if (!$this->plan) {
            return;
        }

        $registered = Feature::whereIn('slug', array_values(self::PLAN_GATED_MODULES))
            ->pluck('slug')->all();
        $planFeatures = $this->plan->features()->pluck('slug')->all();

        $settings = $this->settings ?? [];
        $changed = false;

        foreach (self::PLAN_GATED_MODULES as $key => $featureSlug) {
            if (!in_array($featureSlug, $registered, true) || in_array($featureSlug, $planFeatures, true)) {
                continue;
            }
            if (($settings[$key] ?? null) !== false) {
                $settings[$key] = false;
                $changed = true;
            }
        }

        if ($changed) {
            $this->settings = $settings;
            $this->save();
        }
    }

    /**
     * Check if the club's current plan includes a specific feature.
     */
    public function hasFeature($featureSlug)
    {
        if (!$this->plan) {
            return false;
        }

        // We can cache this in the future if needed
        return $this->plan->features()->where('slug', $featureSlug)->exists();
    }
}
