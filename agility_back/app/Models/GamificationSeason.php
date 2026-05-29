<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GamificationSeason extends Model
{
    protected $table = 'gamification_seasons';

    protected $fillable = [
        'name',
        'gamification_type',
        'start_date',
        'end_date',
        'status',
    ];

    public function dogSeasonPoints()
    {
        return $this->hasMany(DogSeasonPoint::class, 'season_id');
    }

    public function pointHistories()
    {
        return $this->hasMany(PointHistory::class, 'season_id');
    }
}
