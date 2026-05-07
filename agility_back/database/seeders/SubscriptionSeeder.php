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

        // Create plans
        $planBasico = Plan::firstOrCreate(['slug' => 'basico'], [
            'name' => 'Plan Básico',
            'price' => 0.00,
            'description' => 'Plan gratuito inicial para gestión de socios y reservas básicas.',
            'is_active' => true,
        ]);

        $planPro = Plan::firstOrCreate(['slug' => 'profesional'], [
            'name' => 'Plan Profesional',
            'price' => 29.99,
            'description' => 'Plan completo con seguimiento de competiciones (RSCE y RFEC).',
            'is_active' => true,
        ]);

        $planElite = Plan::firstOrCreate(['slug' => 'elite'], [
            'name' => 'Plan Élite',
            'price' => 49.99,
            'description' => 'Todo lo del plan pro más módulo de salud y recursos avanzados.',
            'is_active' => true,
        ]);

        // Sync features to plans
        // Basic: Only reservations
        $planBasico->features()->syncWithoutDetaching([
            $featureReservas->id,
        ]);

        // Pro: Reservations + RSCE + RFEC
        $planPro->features()->syncWithoutDetaching([
            $featureReservas->id,
            $featureRsce->id,
            $featureRfec->id,
        ]);

        // Elite: All features
        $planElite->features()->syncWithoutDetaching([
            $featureReservas->id,
            $featureRsce->id,
            $featureRfec->id,
            $featureSalud->id,
        ]);

        // Assign default 'Pro' plan to all existing clubs so no one loses access suddenly
        // You can change this to basico if you prefer
        Club::whereNull('plan_id')->update(['plan_id' => $planPro->id]);
    }
}
