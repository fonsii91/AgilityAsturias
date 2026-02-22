# Script de Preparación para Despliegue en Hostalia
# Este script organiza todos los archivos en una carpeta 'deploy_package' lista para subir.

$ErrorActionPreference = "Stop"

Write-Host "Iniciando preparación del paquete de despliegue..." -ForegroundColor Green

# 1. Definir rutas
$rootDir = Get-Location
$deployDir = "$rootDir\deploy_package"
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
Write-Host "Copiando Backend Core..." -ForegroundColor Cyan
# Excluciones para no subir basura
$exclude = @('node_modules', '.git', '.idea', 'tests', 'public')
Get-ChildItem -Path $backendSrc -Exclude $exclude | Copy-Item -Destination "$deployDir\agility_back_core" -Recurse

# 5. Preparar Backend Public (index.php modificado)
Write-Host "Preparando Backend Public..." -ForegroundColor Cyan
Copy-Item -Path "$backendSrc\public\*" -Destination "$deployDir\httpdocs\backend" -Recurse

# Modificar index.php para apuntar al core
$indexPath = "$deployDir\httpdocs\backend\index.php"
$indexContent = Get-Content $indexPath
$indexContent = $indexContent -replace "require __DIR__.'/../vendor/autoload.php';", "require __DIR__.'/../../agility_back_core/vendor/autoload.php';"
$indexContent = $indexContent -replace "require_once __DIR__.'/../bootstrap/app.php';", "require_once __DIR__.'/../../agility_back_core/bootstrap/app.php';"
$indexContent | Set-Content $indexPath

# Copiar .env.example como .env para editar despues
Copy-Item -Path "$backendSrc\.env.example" -Destination "$deployDir\agility_back_core\.env"

Write-Host "--------------------------------------------------------" -ForegroundColor Green
Write-Host "¡Paquete creado en: $deployDir" -ForegroundColor Green
Write-Host "INSTRUCCIONES PARA SUBIR:" -ForegroundColor Yellow
Write-Host "1. Sube el contenido de 'deploy_package/agility_back_core' a la RAIZ de tu hosting (fuera de httpdocs)."
Write-Host "2. Sube el contenido de 'deploy_package/httpdocs' DENTRO de la carpeta 'httpdocs' de tu hosting."
Write-Host "3. Edita el archivo '.env' en 'agility_back_core' con tus datos de base de datos."
Write-Host "--------------------------------------------------------"
