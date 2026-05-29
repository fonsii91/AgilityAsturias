<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasClub;

class BountyContract extends Model
{
    use HasClub;

    protected $table = 'bounty_contracts';

    protected $fillable = [
        'club_id',
        'season_id',
        'hunter_dog_id',
        'victim_dog_id',
        'action_description',
        'witness_1_id',
        'witness_2_id',
        'witness_3_id',
        'witness_4_id',
        'witness_5_id',
        'cost',
        'bounty',
        'cartel_type',
        'status',
        'witness_validated_id',
        'expires_at',
        'rerolls_used',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function season()
    {
        return $this->belongsTo(GamificationSeason::class, 'season_id');
    }

    public function hunterDog()
    {
        return $this->belongsTo(Dog::class, 'hunter_dog_id');
    }

    public function victimDog()
    {
        return $this->belongsTo(Dog::class, 'victim_dog_id');
    }

    public function witness1()
    {
        return $this->belongsTo(User::class, 'witness_1_id');
    }

    public function witness2()
    {
        return $this->belongsTo(User::class, 'witness_2_id');
    }

    public function witness3()
    {
        return $this->belongsTo(User::class, 'witness_3_id');
    }

    public function witness4()
    {
        return $this->belongsTo(User::class, 'witness_4_id');
    }

    public function witness5()
    {
        return $this->belongsTo(User::class, 'witness_5_id');
    }

    public function witnessValidated()
    {
        return $this->belongsTo(User::class, 'witness_validated_id');
    }
}
