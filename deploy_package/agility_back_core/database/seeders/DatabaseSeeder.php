<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
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
