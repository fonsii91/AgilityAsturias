<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class MultiDayAttendanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create a user
        $user = \App\Models\User::firstOrCreate(
            ['email' => 'multiday@agility.com'],
            [
                'name' => 'MultiDay Tester',
                'password' => bcrypt('password'),
                'role' => 'member',
                'club_id' => 1
            ]
        );

        // 2. Create two dogs for the user
        $dog1 = \App\Models\Dog::firstOrCreate(
            ['name' => 'Dog One (Sat Only)', 'club_id' => 1],
            ['breed' => 'Border Collie', 'points' => 0]
        );
        $user->dogs()->syncWithoutDetaching([$dog1->id => ['is_primary_owner' => true]]);

        $dog2 = \App\Models\Dog::firstOrCreate(
            ['name' => 'Dog Two (Sun Only)', 'club_id' => 1],
            ['breed' => 'Caniche', 'points' => 0]
        );
        $user->dogs()->syncWithoutDetaching([$dog2->id => ['is_primary_owner' => true]]);

        // 3. Create a multi-day competition (Past weekend)
        $saturday = now()->subDays(3)->format('Y-m-d');
        $sunday = now()->subDays(2)->format('Y-m-d');

        $competition = \App\Models\Competition::firstOrCreate(
            ['nombre' => 'MultiDay Test Event'],
            [
                'lugar' => 'Test Location',
                'fecha_evento' => $saturday,
                'fecha_fin_evento' => $sunday,
                'fecha_limite' => now()->subDays(10)->format('Y-m-d'),
                'forma_pago' => 'Transfer',
                'enlace' => 'http://test',
                'tipo' => 'competicion',
                'club_id' => 1 // Default club
            ]
        );

        // 4. Attach the user to the competition
        if (!$competition->attendees()->where('users.id', $user->id)->exists()) {
            $competition->attendees()->attach($user->id, ['dias_asistencia' => json_encode([$saturday, $sunday])]);
        }

        // 5. Attach the dogs to the competition with DIFFERENT days
        // Dog 1 goes only on Saturday
        \Illuminate\Support\Facades\DB::table('competition_dog')->updateOrInsert(
            ['competition_id' => $competition->id, 'dog_id' => $dog1->id],
            ['user_id' => $user->id, 'dias_asistencia' => json_encode([$saturday])]
        );

        // Dog 2 goes only on Sunday
        \Illuminate\Support\Facades\DB::table('competition_dog')->updateOrInsert(
            ['competition_id' => $competition->id, 'dog_id' => $dog2->id],
            ['user_id' => $user->id, 'dias_asistencia' => json_encode([$sunday])]
        );
    }
}
