<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class RankingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 20 random users with points
        User::factory(20)->create()->each(function ($user) {
            $user->update([
                'points' => rand(0, 50),
                'role' => 'member', // Ensure they show up as members
            ]);
        });

        // Create a few "top" users to test the podium
        User::factory()->create([
            'name' => 'Campeón Agility',
            'points' => 100,
            'role' => 'member',
        ]);

        User::factory()->create([
            'name' => 'Subcampeón Veloz',
            'points' => 90,
            'role' => 'member',
        ]);

        User::factory()->create([
            'name' => 'Tercer Lugar',
            'points' => 85,
            'role' => 'member',
        ]);
    }
}
