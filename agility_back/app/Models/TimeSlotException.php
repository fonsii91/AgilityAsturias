<?php

namespace App\Models;

use App\Traits\HasClub;
use Illuminate\Database\Eloquent\Factories\HasFactory;

use Illuminate\Database\Eloquent\Model;

class TimeSlotException extends Model
{
    use HasClub, HasFactory;
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
