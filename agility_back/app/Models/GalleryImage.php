<?php

namespace App\Models;

use App\Traits\HasClub;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GalleryImage extends Model
{
    use HasClub;
    use HasFactory;

    protected $fillable = [
        'url',
        'alt',
    ];
}
