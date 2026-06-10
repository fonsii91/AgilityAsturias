<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Plan;
use App\Models\Feature;
use App\Models\Club;

class SubscriptionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create features
        $featureRsce = Feature::firstOrCreate(['slug' => 'modulo-canina'], [
            'name' => 'Módulo RSCE (Canina)',
            'type' => 'boolean',
            'description' => 'Acceso al registro y seguimiento de grados y clasificaciones de la RSCE.'
        ]);

        $featureRfec = Feature::firstOrCreate(['slug' => 'modulo-caza'], [
            'name' => 'Módulo RFEC (Caza)',
            'type' => 'boolean',
            'description' => 'Acceso al módulo de resultados y normativas de la RFEC.'
        ]);

        $featureReservas = Feature::firstOrCreate(['slug' => 'reservas-pistas'], [
            'name' => 'Reservas de Pistas',
            'type' => 'boolean',
            'description' => 'Permite a los socios reservar pistas de entrenamiento.'
        ]);

        $featureSalud = Feature::firstOrCreate(['slug' => 'salud-canina'], [
            'name' => 'Módulo de Salud Canina',
            'type' => 'boolean',
            'description' => 'Registro de vacunas, celos y revisiones veterinarias.'
        ]);

        $featureVideos = Feature::firstOrCreate(['slug' => 'galeria-videos'], [
            'name' => 'Galería de Vídeos',
            'type' => 'boolean',
            'description' => 'Acceso a la subida y visualización de vídeos de entrenamientos y competiciones.'
        ]);

        $featureRecursos = Feature::firstOrCreate(['slug' => 'recursos'], [
            'name' => 'Recursos Comunitarios',
            'type' => 'boolean',
            'description' => 'Acceso a normativas, tutoriales y recursos educativos del club.'
        ]);

        // Create plans
        $planBasico = Plan::firstOrCreate(['slug' => 'basico'], [
            'name' => 'Plan Básico',
            'price' => 29.00,
            'description' => 'Plan inicial para gestión de socios y reservas.',
            'is_active' => true,
            'photo_storage_limit_gb' => 5,
        ]);

        $planPro = Plan::firstOrCreate(['slug' => 'profesional'], [
            'name' => 'Plan Profesional',
            'price' => 49.00,
            'description' => 'Plan completo con seguimiento de competiciones (RSCE y RFEC) y recursos.',
            'is_active' => true,
            'photo_storage_limit_gb' => 25,
        ]);

        $planElite = Plan::firstOrCreate(['slug' => 'elite'], [
            'name' => 'Plan Élite',
            'price' => 79.00,
            'description' => 'Todo lo del plan pro más módulo de salud, galería de vídeos y recursos avanzados.',
            'is_active' => true,
            'photo_storage_limit_gb' => 100,
        ]);

        // Sync features to plans
        // Basic: Only reservations
        $planBasico->features()->syncWithoutDetaching([
            $featureReservas->id,
        ]);

        // Pro: Reservations + RSCE + RFEC + Resources
        $planPro->features()->syncWithoutDetaching([
            $featureReservas->id,
            $featureRsce->id,
            $featureRfec->id,
            $featureRecursos->id,
        ]);

        // Elite: All features (Pro + Salud + Videos)
        $planElite->features()->syncWithoutDetaching([
            $featureReservas->id,
            $featureRsce->id,
            $featureRfec->id,
            $featureSalud->id,
            $featureVideos->id,
            $featureRecursos->id,
        ]);

        // Assign default 'Pro' plan to all existing clubs so no one loses access suddenly
        // You can change this to basico if you prefer
        Club::whereNull('plan_id')->update(['plan_id' => $planPro->id]);
    }
}
