<?php

namespace App\Models;

use App\Traits\HasClub;

use Illuminate\Database\Eloquent\Model;

class PointHistory extends Model
{
    use HasClub;
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
