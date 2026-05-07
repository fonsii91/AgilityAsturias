<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Feature extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'type',
        'description',
    ];

    public function plans()
    {
        return $this->belongsToMany(Plan::class)
            ->withPivot('value')
            ->withTimestamps();
    }
}
