<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;

class RsceTrack extends Track
{
    protected static function booted()
    {
        static::addGlobalScope('federation_rsce', function (Builder $builder) {
            $builder->where('federation', 'RSCE');
        });

        static::creating(function ($track) {
            $track->federation = 'RSCE';
        });
    }
}
