<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Club;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

echo "Configurando datos de prueba para entorno multi-tenant...\n";

// Desactivar comprobación de FK temporalmente por si acaso
DB::statement('SET FOREIGN_KEY_CHECKS=0;');

// 1. Crear Club A
$clubA = Club::firstOrCreate(
    ['slug' => 'cluba'],
    [
        'name' => 'Club de Agility A',
        'settings' => []
    ]
);
echo "Club A creado/encontrado: " . $clubA->name . " (ID: " . $clubA->id . ")\n";

// 2. Crear Club B
$clubB = Club::firstOrCreate(
    ['slug' => 'clubb'],
    [
        'name' => 'Club Deportivo B',
        'settings' => []
    ]
);
echo "Club B creado/encontrado: " . $clubB->name . " (ID: " . $clubB->id . ")\n";

// 3. Crear Usuario A (Club A)
$userA = User::withoutGlobalScopes()->updateOrCreate(
    ['email' => 'usuario_a@example.com'],
    [
        'name' => 'Usuario Club A',
        'password' => Hash::make('password123'),
        'role' => 'user',
        'club_id' => $clubA->id
    ]
);
echo "Usuario A listo: " . $userA->email . " (Club A) - Pass: password123\n";

// 4. Crear Usuario B (Club B)
$userB = User::withoutGlobalScopes()->updateOrCreate(
    ['email' => 'usuario_b@example.com'],
    [
        'name' => 'Usuario Club B',
        'password' => Hash::make('password123'),
        'role' => 'user',
        'club_id' => $clubB->id
    ]
);
echo "Usuario B listo: " . $userB->email . " (Club B) - Pass: password123\n";

// 5. Crear Admin Global
$admin = User::withoutGlobalScopes()->updateOrCreate(
    ['email' => 'admin_global@example.com'],
    [
        'name' => 'Administrador Global',
        'password' => Hash::make('password123'),
        'role' => 'admin',
        'club_id' => $clubA->id // Admin asignado a un club base, pero su rol le dará acceso a todo
    ]
);
echo "Admin Global listo: " . $admin->email . " - Pass: password123\n";

DB::statement('SET FOREIGN_KEY_CHECKS=1;');
echo "\n¡Datos creados con éxito! Ya puedes iniciar las pruebas manuales de la Fase 1.\n";
