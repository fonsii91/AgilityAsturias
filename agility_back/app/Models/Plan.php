<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'price',
        'description',
        'is_active',
        'video_storage_limit_gb',
        'promo_price',
        'promo_duration_months',
        'promo_label',
    ];

    public function features()
    {
        return $this->belongsToMany(Feature::class)
            ->withPivot('value')
            ->withTimestamps();
    }
}
