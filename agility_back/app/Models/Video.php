<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Video extends Model
{
    use HasFactory;

    protected $fillable = [
        'dog_id',
        'user_id',
        'competition_id',
        'date',
        'local_path',
        'youtube_id',
        'youtube_error',
        'status',
        'title',
        'is_public',
        'in_public_gallery',
        'youtube_error',
        'orientation'
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'in_public_gallery' => 'boolean',
    ];

    public function dog()
    {
        return $this->belongsTo(Dog::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function competition()
    {
        return $this->belongsTo(Competition::class);
    }

    public function likes()
    {
        return $this->hasMany(VideoLike::class);
    }
}
