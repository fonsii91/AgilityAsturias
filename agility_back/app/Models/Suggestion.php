<?php

namespace App\Models;

use App\Traits\HasClub;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Suggestion extends Model
{
    use HasClub;
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'content',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
