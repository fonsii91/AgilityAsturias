<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Dog extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'breed',
        'birth_date',
        'license_expiration_date',
        'microchip',
        'pedigree',
        'photo_url',
        'points',
    ];

    public function users()
    {
        return $this->belongsToMany(User::class);
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function competitions()
    {
        return $this->belongsToMany(Competition::class);
    }

    public function videos()
    {
        return $this->hasMany(Video::class);
    }

    public function pointHistories()
    {
        return $this->hasMany(PointHistory::class);
    }
}
