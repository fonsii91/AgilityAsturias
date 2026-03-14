<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Dog;
use App\Models\Competition;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;

class CompetitionAttendanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create a few mock users if they don't exist
        $usersData = [
            ['name' => 'Test User 1', 'email' => 'testuser1@example.com', 'role' => 'member', 'password' => Hash::make('password')],
            ['name' => 'Test User 2', 'email' => 'testuser2@example.com', 'role' => 'member', 'password' => Hash::make('password')],
        ];

        $createdUsers = [];
        foreach ($usersData as $ud) {
            $user = User::firstOrCreate(['email' => $ud['email']], $ud);
            $createdUsers[] = $user;
        }

        // 2. Create mock dogs for these users
        $dogsData = [
            ['user_id' => $createdUsers[0]->id, 'name' => 'Rex Test', 'breed' => 'Border Collie', 'age' => 3, 'points' => 0],
            ['user_id' => $createdUsers[1]->id, 'name' => 'Max Test', 'breed' => 'Poodle', 'age' => 5, 'points' => 0],
        ];

        $createdDogs = [];
        foreach ($dogsData as $dd) {
            $dog = Dog::firstOrCreate(['name' => $dd['name'], 'user_id' => $dd['user_id']], $dd);
            $createdDogs[] = $dog;
        }

        // 3. Create a couple of past competitions
        $pastDate1 = Carbon::now()->subDays(2)->toDateString();
        $pastDate2 = Carbon::now()->subDays(5)->toDateString();

        $comp1 = Competition::firstOrCreate(
            ['nombre' => 'Competición de Prueba 1'],
            [
                'lugar' => 'Siero, Asturias',
                'fecha_evento' => $pastDate1,
                'tipo' => 'competicion',
                'attendance_verified' => false
            ]
        );

        $comp2 = Competition::firstOrCreate(
            ['nombre' => 'Competición de Prueba 2'],
            [
                'lugar' => 'Oviedo',
                'fecha_evento' => $pastDate2,
                'tipo' => 'competicion',
                'attendance_verified' => false
            ]
        );

        // 4. Attach users and dogs to competitions (User 1 signs up for Comp 1, User 2 for Comp 2)
        // Check if already attached to avoid pivot duplicate keys since we made them unique
        if (!$comp1->attendees()->where('users.id', $createdUsers[0]->id)->exists()) {
            $comp1->attendees()->attach($createdUsers[0]->id);
        }
        if (!$comp1->attendingDogs()->where('dogs.id', $createdDogs[0]->id)->exists()) {
            $comp1->attendingDogs()->attach($createdDogs[0]->id, ['position' => null]);
        }

        if (!$comp2->attendees()->where('users.id', $createdUsers[1]->id)->exists()) {
            $comp2->attendees()->attach($createdUsers[1]->id);
        }
        if (!$comp2->attendingDogs()->where('dogs.id', $createdDogs[1]->id)->exists()) {
            $comp2->attendingDogs()->attach($createdDogs[1]->id, ['position' => null]);
        }

        $this->command->info('CompetitionAttendanceSeeder ran successfully. Mock data added without deleting existing records.');
    }
}
