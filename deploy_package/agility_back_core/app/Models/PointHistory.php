<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PointHistory extends Model
{
    protected $fillable = [
        'dog_id',
        'points',
        'category',
    ];

    public function dog()
    {
        return $this->belongsTo(Dog::class);
    }
}
