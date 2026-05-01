<?php

namespace App\Models;

use App\Traits\HasClub;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PersonalEvent extends Model
{
    use HasFactory, HasClub;
    protected $fillable = [
        'user_id',
        'dog_id',
        'title',
        'type',
        'start_date',
        'end_date',
        'notes',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function dog()
    {
        return $this->belongsTo(Dog::class);
    }
}
