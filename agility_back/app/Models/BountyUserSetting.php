<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BountyUserSetting extends Model
{
    protected $table = 'bounty_user_settings';

    protected $fillable = [
        'user_id',
        'opt_in',
        'allow_anonymous_alerts',
    ];

    protected $casts = [
        'opt_in' => 'boolean',
        'allow_anonymous_alerts' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
