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
        'notes',
        'time',
        'faults',
        'refusals',
        'time_penalty',
        'total_penalty',
        'is_clean',
        'course_length',
        'standard_time',
        'club_id'
    ];

    protected $casts = [
        'speed' => 'float',
        'time' => 'float',
        'faults' => 'integer',
        'refusals' => 'integer',
        'time_penalty' => 'float',
        'total_penalty' => 'float',
        'is_clean' => 'boolean',
        'course_length' => 'float',
        'standard_time' => 'float',
    ];

    public function dog()
    {
        return $this->belongsTo(Dog::class);
    }
}
