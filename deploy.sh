#!/bin/bash
set -e

echo "🚀 Iniciando despliegue de Agility Asturias..."

# 1. Descargar cambios
echo "➡️  Descargando últimos cambios de Git..."
git pull origin main

# 2. Actualizar Backend (Laravel) - Carpeta agility_back
if [ -d "agility_back" ]; then
    echo "➡️  Actualizando Backend (Laravel)..."
    cd agility_back
    composer install --no-interaction --prefer-dist --optimize-autoloader
    php artisan migrate --force
    php artisan optimize:clear
    php artisan optimize
    php artisan queue:restart
    cd ..
else
    echo "⚠️  No se encontró la carpeta 'agility_back', omitiendo backend."
fi

# 3. Actualizar Frontend (Angular) - Carpeta frontend
if [ -d "frontend" ]; then
    echo "➡️  Compilando Frontend (Angular)..."
    cd frontend
    echo "🧹  Limpiando compilaciones anteriores..."
    rm -rf dist/*
    npm install --legacy-peer-deps
    # Usamos npx para asegurar el uso local de NG (Angular CLI)
    npx ng build --configuration production
    chown -R www-data:www-data dist/
    cd ..
else
    echo "⚠️  No se encontró la carpeta 'frontend', omitiendo front."
fi

echo "✅ ¡Despliegue finalizado exitosamente!"
