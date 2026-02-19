<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Dog extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'breed',
        'age',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
