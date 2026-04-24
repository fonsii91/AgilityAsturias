<?php

namespace App\Models;

use App\Traits\HasClub;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Resource extends Model
{
    use HasClub;
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'type',
        'url',
        'file_path',
        'category',
        'level',
        'uploaded_by',
    ];

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
