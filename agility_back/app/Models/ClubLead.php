<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClubLead extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'email',
        'phone',
        'plan_selected',
        'password',
        'status',
        'stripe_session_id',
        'club_id',
        'provisioned_at',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'provisioned_at' => 'datetime',
    ];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }
}
