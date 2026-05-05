<?php

namespace App\Models;

use App\Traits\HasClub;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Competition extends Model
{
    use HasClub;
    use HasFactory;

    protected $fillable = [
        'lugar',
        'fecha_evento',
        'fecha_fin_evento',
        'fecha_limite',
        'forma_pago',
        'cartel',
        'enlace',
        'tipo',
        'federacion',
        'nombre',
        'judge_name',
    ];

    public function attendees()
    {
        return $this->belongsToMany(User::class, 'competition_user')->withPivot('dias_asistencia')->withTimestamps();
    }

    public function attendingDogs()
    {
        return $this->belongsToMany(Dog::class, 'competition_dog')->withPivot('user_id', 'dias_asistencia')->withTimestamps();
    }
}
