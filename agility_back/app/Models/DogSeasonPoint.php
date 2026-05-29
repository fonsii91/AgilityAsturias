<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DogSeasonPoint extends Model
{
    protected $table = 'dog_season_points';

    protected $fillable = [
        'dog_id',
        'season_id',
        'points',
        'final_position',
    ];

    public function dog()
    {
        return $this->belongsTo(Dog::class);
    }

    public function season()
    {
        return $this->belongsTo(GamificationSeason::class, 'season_id');
    }
}
