<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class DogUser extends Pivot
{
    protected $table = 'dog_user';

    protected $casts = [
        'is_primary_owner' => 'boolean',
        'rsce_license' => 'encrypted',
        'rsce_expiration_date' => 'encrypted',
        'sociability_test_passed' => 'boolean',
    ];
}
