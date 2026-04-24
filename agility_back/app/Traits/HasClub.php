<?php

namespace App\Traits;

use App\Models\Scopes\TenantScope;
use App\Models\Club;

trait HasClub
{
    protected static function bootHasClub()
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function ($model) {
            if (!$model->club_id) {
                if (auth()->hasUser()) {
                    $model->club_id = auth()->user()->club_id;
                } elseif (app()->bound('active_club_id')) {
                    $model->club_id = app('active_club_id');
                }
            }
        });
    }

    public function club()
    {
        return $this->belongsTo(Club::class);
    }
}
