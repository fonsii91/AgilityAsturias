<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Dog;
use App\Models\DogWorkload;
use Carbon\Carbon;

class DogWorkloadSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $dogs = Dog::all();
        
        if ($dogs->count() === 0) {
            $this->command->info('No hay perros en la base de datos para seedear Workloads.');
            return;
        }

        DogWorkload::truncate();
        
        $now = Carbon::now();

        foreach ($dogs as $dog) {
            // Un par de entrenos en el mes pasado pero dentro de los 28 días (Carga Crónica Base)
            DogWorkload::create([
                'dog_id' => $dog->id,
                'source_type' => 'auto_attendance',
                'date' => $now->copy()->subDays(25),
                'duration_min' => 15,
                'intensity_rpe' => 7,
                'status' => 'confirmed'
            ]);
            
            DogWorkload::create([
                'dog_id' => $dog->id,
                'source_type' => 'manual',
                'date' => $now->copy()->subDays(20),
                'duration_min' => 15,
                'intensity_rpe' => 8,
                'status' => 'confirmed'
            ]);

            DogWorkload::create([
                'dog_id' => $dog->id,
                'source_type' => 'auto_competition',
                'date' => $now->copy()->subDays(15),
                'duration_min' => 15,
                'intensity_rpe' => 9,
                'number_of_runs' => 4, // Modificador extra (+15%)
                'status' => 'confirmed'
            ]);

            // Carga Aguda Reciente (Últimos 7 días)
            DogWorkload::create([
                'dog_id' => $dog->id,
                'source_type' => 'auto_attendance',
                'date' => $now->copy()->subDays(5),
                'duration_min' => 15,
                'intensity_rpe' => 6,
                'status' => 'confirmed'
            ]);
            
            DogWorkload::create([
                'dog_id' => $dog->id,
                'source_type' => 'manual',
                'date' => $now->copy()->subDays(2),
                'duration_min' => 15,
                'intensity_rpe' => 8,
                'jumped_max_height' => true, // Modificador extra (+20%)
                'status' => 'confirmed'
            ]);

            // Dejamos 1 pendiente de validar
            DogWorkload::create([
                'dog_id' => $dog->id,
                'source_type' => 'auto_attendance',
                'date' => $now->copy()->subDays(1),
                'duration_min' => 15,
                'intensity_rpe' => 5,
                'status' => 'pending_review'
            ]);
        }
        
        $this->command->info('DogWorkloadSeeder ejecutado con éxito. Se ha generado historial ficticio del último mes.');
    }
}
