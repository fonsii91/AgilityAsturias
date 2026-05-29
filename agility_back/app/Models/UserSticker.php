<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserSticker extends Model
{
    protected $table = 'user_stickers';

    protected $fillable = [
        'user_sticker_profile_id',
        'dog_id',
        'level',
        'duplicates_count',
    ];

    public function userStickerProfile()
    {
        return $this->belongsTo(UserStickerProfile::class, 'user_sticker_profile_id');
    }

    public function dog()
    {
        return $this->belongsTo(Dog::class);
    }
}
