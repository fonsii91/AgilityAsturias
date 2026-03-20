<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'slot_id',
        'user_id',
        'dog_id',
        'date',
        'status',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function timeSlot()
    {
        return $this->belongsTo(TimeSlot::class, 'slot_id');
    }

    public function dog()
    {
        return $this->belongsTo(Dog::class);
    }
}
