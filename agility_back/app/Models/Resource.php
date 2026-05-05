<?php

namespace App\Models;


use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Resource extends Model
{
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
        'club_id',
        'is_global',
    ];

    protected $casts = [
        'is_global' => 'boolean',
    ];

    protected static function booted()
    {
        static::addGlobalScope('club_or_global', function (Builder $builder) {
            if (auth()->hasUser()) {
                if (auth()->user()->role !== 'admin') {
                    $builder->where(function($q) {
                        $q->where('resources.club_id', auth()->user()->club_id)
                          ->orWhere('resources.is_global', true);
                    });
                } else {
                    if (app()->bound('active_club_id')) {
                        $builder->where(function($q) {
                            $q->where('resources.club_id', app('active_club_id'))
                              ->orWhere('resources.is_global', true);
                        });
                    }
                }
            } elseif (app()->bound('active_club_id')) {
                $builder->where(function($q) {
                    $q->where('resources.club_id', app('active_club_id'))
                      ->orWhere('resources.is_global', true);
                });
            }
        });

        static::creating(function ($model) {
            if (!$model->club_id) {
                if (auth()->hasUser()) {
                    $model->club_id = auth()->user()->club_id;
                } elseif (app()->bound('active_club_id')) {
                    $model->club_id = app('active_club_id');
                }
            }
        });
    }

    public function club()
    {
        return $this->belongsTo(Club::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
