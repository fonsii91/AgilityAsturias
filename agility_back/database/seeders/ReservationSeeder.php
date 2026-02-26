<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ReservationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = \App\Models\User::where('role', 'member')->with('dogs')->get();
        $slots = \App\Models\TimeSlot::all();

        if ($slots->isEmpty() || $users->isEmpty())
            return;

        foreach ($users as $user) {
            $dogs = $user->dogs;
            if ($dogs->isEmpty())
                continue;

            // Future reservation (only book 1 dog)
            $slot1 = $slots->random()->id;
            \App\Models\Reservation::create([
                'slot_id' => $slot1,
                'user_id' => $user->id,
                'dog_id' => $dogs->first()->id,
                'date' => now()->addDays(rand(1, 5))->toDateString(),
                'status' => 'active',
                'attendance_verified' => false
            ]);

            // Simulate history for all dogs to generate rank changes
            foreach ($dogs as $dog) {
                // 1. Generate old reservations (more than 10 days ago)
                $oldResCount = rand(0, 5); // 0 to 5 old reservations
                for ($i = 0; $i < $oldResCount; $i++) {
                    $pastDate = now()->subDays(rand(11, 30));
                    \App\Models\Reservation::create([
                        'slot_id' => $slots->random()->id,
                        'user_id' => $user->id,
                        'dog_id' => $dog->id,
                        'date' => $pastDate->toDateString(),
                        'status' => 'completed',
                        'attendance_verified' => true,
                        'created_at' => $pastDate,
                        'updated_at' => $pastDate // Crucial for Ranking logic
                    ]);
                    $dog->increment('points');
                }

                // 2. Generate recent reservations (less than 10 days ago)
                $newResCount = rand(0, 5); // 0 to 5 new reservations
                for ($i = 0; $i < $newResCount; $i++) {
                    $recentDate = now()->subDays(rand(1, 9));
                    \App\Models\Reservation::create([
                        'slot_id' => $slots->random()->id,
                        'user_id' => $user->id,
                        'dog_id' => $dog->id,
                        'date' => $recentDate->toDateString(),
                        'status' => 'completed',
                        'attendance_verified' => true,
                        'created_at' => $recentDate,
                        'updated_at' => $recentDate // Crucial for Ranking logic
                    ]);
                    $dog->increment('points');
                }
            }
        }
    }
}
