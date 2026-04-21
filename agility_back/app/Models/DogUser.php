<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class DogUser extends Pivot
{
    protected $table = 'dog_user';

    protected $casts = [
        'is_primary_owner' => 'boolean',
        'rsce_license' => \App\Casts\GracefulEncryption::class,
        'rsce_expiration_date' => \App\Casts\GracefulEncryption::class,
        'sociability_test_passed' => 'boolean',
    ];
}
