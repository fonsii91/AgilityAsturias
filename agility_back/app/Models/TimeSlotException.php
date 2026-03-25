<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimeSlotException extends Model
{
    protected $fillable = [
        'slot_id',
        'date',
        'reason',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function timeSlot()
    {
        return $this->belongsTo(TimeSlot::class, 'slot_id');
    }
}
