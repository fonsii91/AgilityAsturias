<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Traits\HasClub;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasClub;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'photo_url',
        'google_id',
        'points',
        'reset_token',
        'rfec_license',
        'rfec_expiration_date',
        'rfec_category',
        'birth_year',
        'club_id',
        'onboarding_progress',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'reset_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'rfec_license' => \App\Casts\GracefulEncryption::class,
            'rfec_expiration_date' => \App\Casts\GracefulEncryption::class,
            'onboarding_progress' => 'array',
        ];
    }
    /**
     * Get the dogs for the user.
     */
    public function dogs()
    {
        return $this->belongsToMany(Dog::class)->using(DogUser::class)->withPivot('is_primary_owner', 'rsce_license', 'rsce_expiration_date', 'rsce_grade', 'rsce_handler_category', 'sociability_test_passed');
    }

    /**
     * Get the reservations for the user.
     */
    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    /**
     * Get the events/competitions the user is attending.
     */
    public function competitions()
    {
        return $this->belongsToMany(Competition::class);
    }

    /**
     * Get the club the user belongs to.
     */
    public function club()
    {
        return $this->belongsTo(Club::class);
    }
}
