<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GlobalFlowagilityEvent extends Model
{
    use HasFactory;

    protected $table = 'global_flowagility_events';

    protected $fillable = [
        'uuid',
        'nombre',
        'lugar',
        'fecha_evento',
        'fecha_fin_evento',
        'fecha_limite',
        'enlace',
        'federacion',
        'organizador',
        'judge_name',
    ];
}
