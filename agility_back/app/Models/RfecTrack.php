<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;

class RfecTrack extends Track
{
    protected static function booted()
    {
        static::addGlobalScope('federation_rfec', function (Builder $builder) {
            $builder->where('federation', 'RFEC');
        });

        static::creating(function ($track) {
            $track->federation = 'RFEC';
        });
    }
}
