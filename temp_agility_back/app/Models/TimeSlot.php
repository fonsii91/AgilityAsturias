<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TimeSlot extends Model
{
    /** @use HasFactory<\Database\Factories\TimeSlotFactory> */
    use HasFactory;

    protected $fillable = [
        'day',
        'start_time',
        'end_time',
        'max_bookings',
    ];

    public function reservations()
    {
        return $this->hasMany(Reservation::class, 'slot_id');
    }
}
