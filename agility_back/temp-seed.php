<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$basicoFeatures = "+ Subdominio propio (.clubagility.com)\n+ Página web pública\n+ Gestión de reservas\n+ Calendario y eventos\n+ Registro de perros y alertas\n+ Tablón y Clasificación interna\n- Módulo Salud (ACWR)";
$proFeatures = "++ Todo lo del Plan Básico\n+ Página de bienvenida personalizada\n+ Módulo de Salud Deportiva\n+ Seguimiento Canina (RSCE) y Caza (RFEC)\n+ Acceso a recursos\n* Galería de vídeos: 200GB (100GB extra de regalo)";
$eliteFeatures = "++ Todo lo del Plan Pro\n+ Dominio web propio personalizado\n+ Galería de vídeos (1TB)";

App\Models\Plan::where('slug', 'basico')->update(['marketing_features' => $basicoFeatures]);
App\Models\Plan::where('slug', 'profesional')->orWhere('slug', 'pro')->update(['marketing_features' => $proFeatures]);
App\Models\Plan::where('slug', 'elite')->update(['marketing_features' => $eliteFeatures]);

echo "Plans seeded successfully on production!\n";
