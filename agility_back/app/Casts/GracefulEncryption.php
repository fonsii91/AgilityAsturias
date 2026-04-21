<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Contracts\Encryption\DecryptException;

class GracefulEncryption implements CastsAttributes
{
    /**
     * Cast the given value.
     */
    public function get($model, $key, $value, $attributes)
    {
        if (empty($value)) return null;

        try {
            return Crypt::decryptString($value);
        } catch (DecryptException $e) {
            // Si estalla por estar en texto plano o estar corrupto, lo retornamos tal cual (fallback seguro).
            return $value;
        }
    }

    /**
     * Prepare the given value for storage.
     */
    public function set($model, $key, $value, $attributes)
    {
        if (empty($value)) return null;
        
        // Lo encriptamos nativamente de forma rígida y segura al guardar.
        return Crypt::encryptString($value);
    }
}
