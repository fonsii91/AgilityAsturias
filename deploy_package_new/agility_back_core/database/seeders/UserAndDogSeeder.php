<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UserAndDogSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Admin
        \App\Models\User::firstOrCreate(
            ['email' => 'admin@agility.com'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password'),
                'role' => 'admin'
            ]
        );

        // Staff
        \App\Models\User::firstOrCreate(
            ['email' => 'staff@agility.com'],
            [
                'name' => 'Staff User',
                'password' => bcrypt('password'),
                'role' => 'staff'
            ]
        );

        // Member
        $member = \App\Models\User::firstOrCreate(
            ['email' => 'member@agility.com'],
            [
                'name' => 'Test Member',
                'password' => bcrypt('password'),
                'role' => 'member'
            ]
        );

        // Additional 5 Members
        $users = \App\Models\User::factory(5)->create(['role' => 'member']);
        $users->push($member);

        $breeds = ['Border Collie', 'Pastor Belga', 'Caniche', 'Mestizo', 'Jack Russell'];

        foreach ($users as $user) {
            $numDogs = rand(1, 3);
            for ($i = 0; $i < $numDogs; $i++) {
                \App\Models\Dog::create([
                    'user_id' => $user->id,
                    'name' => \Faker\Factory::create()->firstName . ' (Perro)',
                    'breed' => $breeds[array_rand($breeds)],
                    'age' => rand(1, 10),
                    'points' => rand(0, 50) // seed with some points for testing
                ]);
            }
        }
    }
}
