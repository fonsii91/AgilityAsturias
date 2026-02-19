<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    protected $fillable = [
        'slot_id',
        'user_id',
        'user_name',
        'user_email',
        'day',
        'start_time',
        'date',
        'selected_dogs',
    ];

    protected $casts = [
        'selected_dogs' => 'array',
        'date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
