<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Bind default club ID to 1 during console seeding so HasClub trait works
        app()->instance('active_club_id', 1);

        // Call all seeders in a logical order
        $this->call([
            UserAndDogSeeder::class,
            TimeSlotSeeder::class,
            CompetitionSeeder::class,
            ReservationSeeder::class,
            NotificationSeeder::class,
        ]);
    }
}
