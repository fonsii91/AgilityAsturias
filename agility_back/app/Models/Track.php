<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasClub;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Track extends Model
{
    use HasFactory, HasClub;

    protected $table = 'tracks';

    protected $fillable = [
        'dog_id',
        'date',
        'manga_type',
        'qualification',
        'speed',
        'judge_name',
        'location',
        'notes',
        'grade',
        'club_id',
        'time',
        'faults',
        'refusals',
        'time_penalty',
        'total_penalty',
        'is_clean',
        'course_length',
        'standard_time',
        'federation'
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
