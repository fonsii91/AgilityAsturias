<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// En Laravel 10/11 con cast 'hashed', asignar 'password123' desencadena el Hash automáticamente.
// Si usamos Hash::make('password123') y luego se aplica el cast, puede ocurrir un doble hashing.

\App\Models\User::withoutGlobalScopes()->get()->each(function($user) {
    // Al asignar directamente el string, el Mutator/Cast 'hashed' de Laravel lo encriptará usando bcrypt.
    $user->password = 'password123';
    $user->save();
});

echo "Todas las contraseñas se han arreglado y encriptado correctamente con 'password123'.\n";
