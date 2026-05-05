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
                $userRole = auth()->user()->role;
                if ($userRole !== 'admin') {
                    $builder->where(function($q) use ($userRole) {
                        if (in_array($userRole, ['staff', 'manager'])) {
                            // Staff/managers always see global resources to be able to manage them
                            $q->where('resources.club_id', auth()->user()->club_id)
                              ->orWhere('resources.is_global', true);
                        } else {
                            // Users/members see their club resources or global, EXCEPT if hidden by their club
                            $q->where(function($q2) {
                                $q2->where('resources.club_id', auth()->user()->club_id)
                                   ->orWhere('resources.is_global', true);
                            })->whereDoesntHave('hiddenByClubs', function($q3) {
                                $q3->where('club_hidden_resources.club_id', auth()->user()->club_id);
                            });
                        }
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

    public function hiddenByClubs()
    {
        return $this->belongsToMany(Club::class, 'club_hidden_resources', 'resource_id', 'club_id')->withTimestamps();
    }
}
