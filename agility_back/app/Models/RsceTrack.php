<?php

namespace App\Models;

use App\Traits\HasClub;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RsceTrack extends Model
{
    use HasClub, HasFactory;
    protected $fillable = [
        'dog_id',
        'date',
        'manga_type',
        'qualification',
        'speed',
        'judge_name',
        'location',
        'notes'
    ];

    public function dog()
    {
        return $this->belongsTo(Dog::class);
    }
}
