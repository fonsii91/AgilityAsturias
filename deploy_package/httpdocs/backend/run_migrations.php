<?php

// Mostrar errores para depuración (opcional, quitar en producción real)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
    // 1. Cargar el autoloader de Composer desde el core (fuera de httpdocs)
    require __DIR__ . '/../../agility_back_core/vendor/autoload.php';

    // 2. Inicializar la aplicación de Laravel
    $app = require_once __DIR__ . '/../../agility_back_core/bootstrap/app.php';

    // 3. Crear una instancia del Kernel de la consola para ejecutar comandos
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

    // 4. Capturar la salida del comando
    $output = new Symfony\Component\Console\Output\BufferedOutput();

    // 5. Ejecutar la migración con --force para entorno de producción
    $kernel->handle(
        new Symfony\Component\Console\Input\ArrayInput([
            'command' => 'migrate',
            '--force' => true,
        ]),
        $output
    );

    // 6. Mostrar el resultado
    echo "<h1>Resultado de la Migración</h1>";
    echo "<pre style='background:#f4f4f4; padding:15px; border-radius:5px;'>" . htmlspecialchars($output->fetch()) . "</pre>";
    echo "<br><div style='color:red; font-size:18px;'><strong>⚠️ IMPORTANTE: ¡Borra este archivo (run_migrations.php) de tu servidor por seguridad para evitar ejecuciones accidentales!</strong></div>";

} catch (\Exception $e) {
    echo "<h1>Ocurrió un error</h1>";
    echo "<p><strong>Mensaje:</strong> " . $e->getMessage() . "</p>";
    echo "<p><strong>Archivo:</strong> " . $e->getFile() . " en la línea " . $e->getLine() . "</p>";
}
