<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Club extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'domain',
        'logo_url',
        'settings',
        'plan_id',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
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
