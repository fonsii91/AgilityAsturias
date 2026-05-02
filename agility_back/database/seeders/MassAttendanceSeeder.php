<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Dog;
use App\Models\Competition;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class MassAttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_ES');
        
        $competitions = Competition::where('club_id', 1)->get();
        if ($competitions->isEmpty()) {
            $competitions->push(Competition::create([
                'nombre' => 'Gran Campeonato Mass Seeder',
                'lugar' => 'Llanera, Asturias',
                'fecha_evento' => now()->addDays(5)->format('Y-m-d'),
                'fecha_fin_evento' => now()->addDays(6)->format('Y-m-d'),
                'tipo' => 'competicion',
                'attendance_verified' => false,
                'club_id' => 1
            ]));
        }

        // Crear o recuperar los 12 usuarios
        $usersData = [];
        for ($i = 1; $i <= 12; $i++) {
            $user = User::firstOrCreate(
                ['email' => "mass_asistente_{$i}@test.com"],
                [
                    'name' => $faker->name,
                    'password' => Hash::make('password'),
                    'role' => 'member',
                    'club_id' => 1
                ]
            );

            // Generate 1 to 3 dogs per user
            $numDogs = rand(1, 3);
            $userDogs = [];
            for ($d = 1; $d <= $numDogs; $d++) {
                $dog = Dog::firstOrCreate(
                    ['name' => $faker->firstName . ' (M)', 'club_id' => 1],
                    ['breed' => 'Border Collie', 'points' => 0]
                );
                $user->dogs()->syncWithoutDetaching([$dog->id => ['is_primary_owner' => true]]);
                $userDogs[] = $dog;
            }
            $usersData[] = ['user' => $user, 'dogs' => $userDogs];
        }

        // Apuntar a todos los eventos
        foreach ($competitions as $competition) {
            $day1 = $competition->fecha_evento;
            $day2 = $competition->fecha_fin_evento ?: $competition->fecha_evento;

            foreach ($usersData as $uData) {
                $user = $uData['user'];
                $userDogs = $uData['dogs'];

                // Decide days of attendance randomly
                $diasAsistencia = rand(0, 1) ? [$day1] : [$day1, $day2];

                // Attach user to competition
                if (!$competition->attendees()->where('users.id', $user->id)->exists()) {
                    $competition->attendees()->attach($user->id, ['dias_asistencia' => json_encode($diasAsistencia)]);
                } else {
                    $competition->attendees()->updateExistingPivot($user->id, ['dias_asistencia' => json_encode($diasAsistencia)]);
                }

                // Attach dogs to competition
                foreach ($userDogs as $dog) {
                    DB::table('competition_dog')->updateOrInsert(
                        ['competition_id' => $competition->id, 'dog_id' => $dog->id],
                        ['user_id' => $user->id, 'dias_asistencia' => json_encode($diasAsistencia)]
                    );
                }
            }
        }
        
        $this->command->info("Se han generado 12 asistentes con sus perros para TODOS los eventos (" . $competitions->count() . ").");
    }
}
