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
        'rsce_license',
        'rsce_expiration_date',
        'rsce_grade',
        'rsce_category',
        'rfec_license',
        'rfec_expiration_date',
        'microchip',
        'pedigree',
        'photo_url',
        'points',
    ];

    protected $casts = [
        'rsce_license' => 'encrypted',
        'rsce_expiration_date' => 'encrypted',
        'rfec_license' => 'encrypted',
        'rfec_expiration_date' => 'encrypted',
        'microchip' => 'encrypted',
        'pedigree' => 'encrypted',
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

    public function rsceTracks()
    {
        return $this->hasMany(RsceTrack::class);
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
            unset($array['rsce_license']);
            unset($array['rsce_expiration_date']);
            unset($array['rfec_license']);
            unset($array['rfec_expiration_date']);
        }

        return $array;
    }
}
