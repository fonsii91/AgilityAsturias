<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        if (auth()->hasUser()) {
            if (auth()->user()->role !== 'admin') {
                $builder->where($model->getTable() . '.club_id', auth()->user()->club_id);
            } else {
                // admin sees data for the active club (subdomain) if in one
                if (app()->bound('active_club_id')) {
                    $builder->where($model->getTable() . '.club_id', app('active_club_id'));
                }
            }
        } elseif (app()->bound('active_club_id')) {
            $builder->where($model->getTable() . '.club_id', app('active_club_id'));
        }
    }
}
