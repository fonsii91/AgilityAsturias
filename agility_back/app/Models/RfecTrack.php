<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Traits\HasClub;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RfecTrack extends Model
{
    use HasFactory, HasClub;

    protected $fillable = [
        'dog_id',
        'date',
        'manga_type',
        'qualification',
        'speed',
        'judge_name',
        'location',
        'notes',
        'club_id'
    ];

    public function dog()
    {
        return $this->belongsTo(Dog::class);
    }
}
