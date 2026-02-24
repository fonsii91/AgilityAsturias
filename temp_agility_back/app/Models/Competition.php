<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Competition extends Model
{
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
        'nombre',
    ];
}
