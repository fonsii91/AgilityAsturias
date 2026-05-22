<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LigaNorteStanding extends Model
{
    use HasFactory;

    protected $table = 'liga_norte_standings';

    protected $fillable = [
        'tipo',
        'clase',
        'posicion',
        'club_nombre',
        'guia_nombre',
        'perro_nombre',
        'dog_id',
        'agility_ex_0',
        'agility_ex_5',
        'jumping_ex_0',
        'jumping_ex_5',
        'total_agility',
        'total_jumping',
        'puntos_total',
        'excelentes_totales',
        'excelentes_cero',
        'excelentes_cinco',
    ];

    public function dog()
    {
        return $this->belongsTo(Dog::class);
    }
}
