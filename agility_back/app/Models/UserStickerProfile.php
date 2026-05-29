<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserStickerProfile extends Model
{
    protected $table = 'user_sticker_profiles';

    protected $fillable = [
        'user_id',
        'season_id',
        'coins',
        'unopened_chests_count',
        'claimed_promotions',
    ];

    protected $casts = [
        'claimed_promotions' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function season()
    {
        return $this->belongsTo(GamificationSeason::class, 'season_id');
    }

    public function userStickers()
    {
        return $this->hasMany(UserSticker::class, 'user_sticker_profile_id');
    }
}
