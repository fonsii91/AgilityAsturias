# Script de Preparación para Despliegue en Hostalia (Sin Vendor)
# Este script organiza todos los archivos en una carpeta 'deploy_package' lista para subir.

$ErrorActionPreference = "Stop"

Write-Host "Iniciando preparación del paquete de despliegue (Excluyendo vendor)..." -ForegroundColor Green

# 1. Definir rutas
$rootDir = Get-Location
$deployDir = "$rootDir\deploy_package_new"
$frontendDist = "$rootDir\frontend\dist\AgilityAsturias\browser"
$backendSrc = "$rootDir\agility_back"

# 2. Limpiar carpeta de destino anterior
if (Test-Path $deployDir) {
    Remove-Item -Path $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path "$deployDir\httpdocs" | Out-Null
New-Item -ItemType Directory -Path "$deployDir\httpdocs\backend" | Out-Null
New-Item -ItemType Directory -Path "$deployDir\agility_back_core" | Out-Null

# 3. Copiar Frontend (Angular)
Write-Host "Copiando Frontend..." -ForegroundColor Cyan
if (!(Test-Path $frontendDist)) {
    Write-Error "No se encontró la build de Angular. Ejecuta 'npm run build' en frontend primero o revisa la ruta."
}
Copy-Item -Path "$frontendDist\*" -Destination "$deployDir\httpdocs" -Recurse

# 4. Copiar Backend Core (Laravel)
Write-Host "Copiando Backend Core (Ignorando vendor y archivos de usuario en storage)..." -ForegroundColor Cyan
# Excluciones para no subir basura, INCLUYENDO vendor
$exclude = @('node_modules', '.git', '.idea', 'tests', 'public', 'vendor')
Get-ChildItem -Path $backendSrc -Exclude $exclude | Copy-Item -Destination "$deployDir\agility_back_core" -Recurse

# Borrar archivos generados por usuarios de local que fueron copiados sin querer
$storageAppPublic = "$deployDir\agility_back_core\storage\app\public"
if (Test-Path $storageAppPublic) {
    Remove-Item -Path "$storageAppPublic\videos" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$storageAppPublic\dog_photos" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$storageAppPublic\profile_photos" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$storageAppPublic\gallery_photos" -Recurse -Force -ErrorAction SilentlyContinue
}

# 5. Preparar Backend Public (index.php modificado)
Write-Host "Preparando Backend Public (Excluyendo public/storage)..." -ForegroundColor Cyan
Get-ChildItem -Path "$backendSrc\public" -Exclude "storage" | Copy-Item -Destination "$deployDir\httpdocs\backend" -Recurse

# Modificar index.php para apuntar al core
$indexPath = "$deployDir\httpdocs\backend\index.php"
$indexContent = Get-Content $indexPath
$indexContent = $indexContent -replace "require __DIR__.'/../vendor/autoload.php';", "require __DIR__.'/../../agility_back_core/vendor/autoload.php';"
$indexContent = $indexContent -replace "require_once __DIR__.'/../bootstrap/app.php';", "require_once __DIR__.'/../../agility_back_core/bootstrap/app.php';"
$indexContent | Set-Content $indexPath

# Copiar .env.example como .env para editar despues
Copy-Item -Path "$backendSrc\.env.example" -Destination "$deployDir\agility_back_core\.env"

# 6. Generar script run_migrations.php
Write-Host "Generando script run_migrations.php..." -ForegroundColor Cyan
$migrationsScript = @"
<?php

// Mostrar errores para depuración (opcional, quitar en producción real)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
    // 1. Cargar el autoloader de Composer desde el core (fuera de httpdocs)
    require __DIR__ . '/../../agility_back_core/vendor/autoload.php';

    // 2. Inicializar la aplicación de Laravel
    `$app = require_once __DIR__ . '/../../agility_back_core/bootstrap/app.php';

    // 3. Crear una instancia del Kernel de la consola para ejecutar comandos
    `$kernel = `$app->make(Illuminate\Contracts\Console\Kernel::class);

    // 4. Capturar la salida del comando
    `$output = new Symfony\Component\Console\Output\BufferedOutput();

    // 5. Ejecutar la migración con --force para entorno de producción
    `$kernel->handle(
        new Symfony\Component\Console\Input\ArrayInput([
            'command' => 'migrate',
            '--force' => true,
        ]),
        `$output
    );

    // 6. Mostrar el resultado
    echo "<h1>Resultado de la Migración</h1>";
    echo "<pre style='background:#f4f4f4; padding:15px; border-radius:5px;'>" . htmlspecialchars(`$output->fetch()) . "</pre>";
    echo "<br><div style='color:red; font-size:18px;'><strong>⚠️ IMPORTANTE: ¡Borra este archivo (run_migrations.php) de tu servidor por seguridad para evitar ejecuciones accidentales!</strong></div>";

} catch (\Exception `$e) {
    echo "<h1>Ocurrió un error</h1>";
    echo "<p><strong>Mensaje:</strong> " . `$e->getMessage() . "</p>";
    echo "<p><strong>Archivo:</strong> " . `$e->getFile() . " en la línea " . `$e->getLine() . "</p>";
}
"@

Set-Content -Path "$deployDir\httpdocs\backend\run_migrations.php" -Value $migrationsScript

# 6.5 Copiar script de fix de tablas
Write-Host "Copiando script fix_tables.php..." -ForegroundColor Cyan
Copy-Item -Path "$rootDir\fix_tables.php" -Destination "$deployDir\httpdocs\backend\fix_tables.php"

Write-Host "--------------------------------------------------------" -ForegroundColor Green
Write-Host "¡Paquete creado en: $deployDir" -ForegroundColor Green
Write-Host "INSTRUCCIONES PARA SUBIR:" -ForegroundColor Yellow
Write-Host "1. Sube el contenido de 'deploy_package/agility_back_core' a la RAIZ de tu hosting (fuera de httpdocs), SOBRESCRIBIENDO lo que haya menos vendor."
Write-Host "2. Sube el contenido de 'deploy_package/httpdocs' DENTRO de la carpeta 'httpdocs' de tu hosting."
Write-Host "3. Edita el archivo '.env' en 'agility_back_core' con tus datos de base de datos."
Write-Host "--------------------------------------------------------"
