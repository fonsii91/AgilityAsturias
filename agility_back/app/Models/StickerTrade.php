<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StickerTrade extends Model
{
    protected $table = 'sticker_trades';

    protected $fillable = [
        'sender_id',
        'receiver_id',
        'season_id',
        'offered_dog_id',
        'requested_dog_id',
        'status',
    ];

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    public function season()
    {
        return $this->belongsTo(GamificationSeason::class, 'season_id');
    }

    public function offeredDog()
    {
        return $this->belongsTo(Dog::class, 'offered_dog_id');
    }

    public function requestedDog()
    {
        return $this->belongsTo(Dog::class, 'requested_dog_id');
    }
}
