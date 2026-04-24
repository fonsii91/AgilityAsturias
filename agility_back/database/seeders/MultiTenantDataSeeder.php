<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Club;
use App\Models\User;
use App\Models\Dog;
use App\Models\Competition;
use App\Models\TimeSlot;
use App\Models\Reservation;
use App\Models\Video;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MultiTenantDataSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        $clubA = Club::firstOrCreate(['slug' => 'cluba'], ['name' => 'Club de Agility A']);
        $clubB = Club::firstOrCreate(['slug' => 'clubb'], ['name' => 'Club Deportivo B']);
        $clubC = Club::firstOrCreate(['slug' => 'clubc'], ['name' => 'Club Experimental C']);

        $clubs = [
            ['club' => $clubA, 'prefix' => '[Club A]'],
            ['club' => $clubB, 'prefix' => '[Club B]'],
            ['club' => $clubC, 'prefix' => '[Club C]'],
        ];

        echo "\nGenerando datos identificables visualmente por prefijo de club...\n";

        foreach ($clubs as $clubData) {
            $club = $clubData['club'];
            $prefix = $clubData['prefix'] . ' ';
            
            echo "-> Llenando " . $club->name . "\n";
            
            // 1. TimeSlots para reservas
            $slots = TimeSlot::factory()->count(2)->create([
                'club_id' => $club->id
            ]);

            // 2. Usuarios
            $users = User::factory()->count(4)->create([
                'club_id' => $club->id,
                'role' => 'user'
            ]);

            foreach ($users as $user) {
                // Actualizamos nombre con prefijo
                $user->update(['name' => $prefix . $user->name]);

                // 3. Perros
                $dogs = Dog::factory()->count(2)->create([
                    'club_id' => $club->id
                ]);
                
                foreach ($dogs as $dog) {
                    $dog->update(['name' => $prefix . $dog->name]);
                    
                    $user->dogs()->attach($dog->id, [
                        'is_primary_owner' => true,
                        'rsce_grade' => rand(1, 3)
                    ]);

                    // 4. Reservas de pista
                    foreach ($slots as $slot) {
                        Reservation::create([
                            'club_id' => $club->id,
                            'slot_id' => $slot->id,
                            'user_id' => $user->id,
                            'dog_id' => $dog->id,
                            'date' => now()->addDays(rand(1, 10)),
                            'status' => 'active'
                        ]);
                    }

                    // 5. Videos
                    Video::create([
                        'club_id' => $club->id,
                        'dog_id' => $dog->id,
                        'user_id' => $user->id,
                        'competition_id' => null,
                        'date' => now()->subDays(rand(1, 20)),
                        'local_path' => null,
                        'youtube_id' => Str::random(10),
                        'status' => 'on_youtube',
                        'title' => $prefix . 'Entrenamiento',
                        'is_public' => true
                    ]);
                }
            }

            // 6. Competiciones / Eventos
            $competitions = Competition::factory()->count(3)->create([
                'club_id' => $club->id
            ]);
            foreach ($competitions as $comp) {
                $comp->update(['nombre' => $prefix . $comp->nombre]);
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        
        echo "¡Seeder MultiTenant completado con éxito! Todos los registros tienen prefijos.\n";
    }
}
