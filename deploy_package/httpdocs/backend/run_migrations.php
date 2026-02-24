<?php
/**
 * Script para ejecutar migraciones de Laravel en Hostalia sin acceso SSH.
 * Sube este archivo a tu carpeta httpdocs, accede a él desde el navegador:
 * https://tu-dominio.com/run_migrations.php
 * ¡BORRA ESTE ARCHIVO INMEDIATAMENTE DESPUÉS DE USARLO!
 */

// Define the path to the Laravel core directory (adjust if needed)
$basePath = __DIR__ . '/../agility_back_core'; // Assuming it's one level above httpdocs

if (!file_exists($basePath . '/artisan')) {
    die("Error: No se encuentra el archivo artisan en la ruta: $basePath. Ajusta la ruta en el script.");
}

echo "<h1>Ejecutando Migraciones...</h1>";
echo "<pre>";

try {
    // 1. Run migrations and capture output
    $output = [];
    $returnVar = 0;

    // We use absolute path to php if possible, but 'php' might work.
    // In many shared hostings, you might need to specify the php version path e.g., /usr/bin/php8.1
    // We will try standard 'php' first.
    exec("php {$basePath}/artisan migrate --force 2>&1", $output, $returnVar);

    echo implode("\n", $output);
    echo "\n\nCódigo de salida (Migrations): " . $returnVar . "\n";

    // 2. Run storage:link as well just in case
    echo "\n\nEjecutando storage:link...\n";
    $outputLink = [];
    $returnVarLink = 0;
    exec("php {$basePath}/artisan storage:link 2>&1", $outputLink, $returnVarLink);

    echo implode("\n", $outputLink);
    echo "\n\nCódigo de salida (Storage Link): " . $returnVarLink . "\n";

} catch (Exception $e) {
    echo "Error ejecutando el comando: " . $e->getMessage();
}

echo "</pre>";
echo "<h2 style='color:red;'>¡IMPORTANTE: BORRA ESTE ARCHIVO AHORA MISMO POR SEGURIDAD!</h2>";
?>