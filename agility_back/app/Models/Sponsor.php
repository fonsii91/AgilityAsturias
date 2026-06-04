<?php

namespace App\Models;

use App\Traits\HasClub;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Sponsor extends Model
{
    use HasClub;
    use HasFactory;

    protected $fillable = [
        'nombre',
        'enlace',
        'descripcion',
        'imagen',
        'club_id',
    ];
}
