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
        return $this->belongsToMany(User::class)->withPivot('is_primary_owner');
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

    /**
     * Override toArray to ensure private data is only exposed to the owners.
     */
    public function toArray()
    {
        $array = parent::toArray();
        
        $userId = auth()->id();
        $isOwner = false;

        if ($userId) {
            if ($this->relationLoaded('users')) {
                $isOwner = $this->users->contains('id', $userId);
            } else {
                $isOwner = \Illuminate\Support\Facades\DB::table('dog_user')
                            ->where('dog_id', $this->id)
                            ->where('user_id', $userId)
                            ->exists();
            }
        }

        if (!$isOwner) {
            unset($array['microchip']);
            unset($array['pedigree']);
            unset($array['license_expiration_date']);
        }

        return $array;
    }
}
