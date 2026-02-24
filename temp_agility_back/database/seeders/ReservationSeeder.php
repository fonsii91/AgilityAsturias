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
            $dogs = $user->dogs->pluck('id')->toArray();
            if (empty($dogs))
                continue;

            $slot1 = $slots->random()->id;
            $slot2 = $slots->random()->id;

            // Future reservation (only book 1 dog)
            \App\Models\Reservation::create([
                'slot_id' => $slot1,
                'user_id' => $user->id,
                'dog_id' => $dogs[0],
                'date' => now()->addDays(rand(1, 5))->toDateString(),
                'status' => 'active',
                'attendance_verified' => false
            ]);

            // Past completed reservation (book all dogs)
            foreach ($dogs as $dogId) {
                \App\Models\Reservation::create([
                    'slot_id' => $slot2,
                    'user_id' => $user->id,
                    'dog_id' => $dogId,
                    'date' => now()->subDays(rand(1, 5))->toDateString(),
                    'status' => 'completed',
                    'attendance_verified' => true
                ]);
            }
        }
    }
}
