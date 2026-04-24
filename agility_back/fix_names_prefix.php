<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Dog;
use App\Models\Club;

echo "Añadiendo prefijos de club a usuarios y perros antiguos...\n";

// Cargar clubes
$clubs = Club::all()->keyBy('id');

$userCount = 0;
// Actualizar Usuarios
User::withoutGlobalScopes()->get()->each(function($user) use ($clubs, &$userCount) {
    // Solo si tiene club asignado
    if ($user->club_id && isset($clubs[$user->club_id])) {
        $clubName = $clubs[$user->club_id]->name;
        // Si no empieza ya por corchete
        if (!preg_match('/^\[.*\]/', $user->name)) {
            $user->name = "[{$clubName}] {$user->name}";
            $user->save();
            $userCount++;
        }
    }
});

$dogCount = 0;
// Actualizar Perros
Dog::withoutGlobalScopes()->get()->each(function($dog) use ($clubs, &$dogCount) {
    if ($dog->club_id && isset($clubs[$dog->club_id])) {
        $clubName = $clubs[$dog->club_id]->name;
        if (!preg_match('/^\[.*\]/', $dog->name)) {
            $dog->name = "[{$clubName}] {$dog->name}";
            $dog->save();
            $dogCount++;
        }
    }
});

echo "¡Listo! Se han actualizado $userCount usuarios y $dogCount perros con el prefijo de su club.\n";
