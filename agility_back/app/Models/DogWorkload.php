<?php

namespace App\Models;

use App\Traits\HasClub;

use Illuminate\Database\Eloquent\Model;

class DogWorkload extends Model
{
    use HasClub;
    protected $fillable = [
        'dog_id',
        'user_id',
        'source_type',
        'source_id',
        'date',
        'duration_min',
        'intensity_rpe',
        'status',
        'jumped_max_height',
        'number_of_runs',
        'is_staff_verified',
    ];

    protected $casts = [
        'date' => 'date',
        'duration_min' => 'integer',
        'intensity_rpe' => 'integer',
        'jumped_max_height' => 'boolean',
        'number_of_runs' => 'integer',
        'is_staff_verified' => 'boolean',
    ];

    public function dog()
    {
        return $this->belongsTo(Dog::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
