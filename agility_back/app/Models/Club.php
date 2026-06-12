<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Cashier\Billable;

class Club extends Model
{
    use Billable;

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

            // Delete local logo if exists
            if ($club->logo_url && !str_starts_with($club->logo_url, 'http') && \Illuminate\Support\Facades\Storage::disk('public')->exists($club->logo_url)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($club->logo_url);
            }
        });
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
