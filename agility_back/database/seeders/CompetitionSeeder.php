<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CompetitionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\Competition::create([
            'nombre' => 'Trofeo de Verano Agility',
            'lugar' => 'Pista Principal',
            'fecha_evento' => now()->addDays(15)->toDateString(),
            'fecha_fin_evento' => now()->addDays(16)->toDateString(),
            'fecha_limite' => now()->addDays(10)->toDateString(),
            'forma_pago' => 'Transferencia',
            'tipo' => 'competicion',
            'cartel' => null
        ]);

        \App\Models\Competition::create([
            'nombre' => 'Liga de Invierno',
            'lugar' => 'Pista Cubierta',
            'fecha_evento' => now()->subDays(20)->toDateString(),
            'fecha_fin_evento' => now()->subDays(19)->toDateString(),
            'fecha_limite' => now()->subDays(25)->toDateString(),
            'forma_pago' => 'Efectivo',
            'tipo' => 'competicion',
            'cartel' => null
        ]);

        \App\Models\Competition::create([
            'nombre' => 'Seminario de Motivación',
            'lugar' => 'Pista Principal',
            'fecha_evento' => now()->addDays(30)->toDateString(),
            'fecha_fin_evento' => now()->addDays(30)->toDateString(),
            'fecha_limite' => now()->addDays(20)->toDateString(),
            'forma_pago' => 'Transferencia',
            'tipo' => 'otros',
            'cartel' => null
        ]);

        \App\Models\Competition::factory(15)->create();
    }
}
