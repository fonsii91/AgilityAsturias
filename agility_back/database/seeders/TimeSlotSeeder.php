<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TimeSlotSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $slots = [];
        $idCounter = 1;

        // 1. Lunes y Jueves
        foreach (['Lunes', 'Jueves'] as $day) {
            $slots[] = ['id' => $idCounter++, 'day' => $day, 'start_time' => '10:00', 'end_time' => '11:30', 'max_bookings' => 5];
            $slots[] = ['id' => $idCounter++, 'day' => $day, 'start_time' => '11:30', 'end_time' => '13:00', 'max_bookings' => 5];
            $slots[] = ['id' => $idCounter++, 'day' => $day, 'start_time' => '13:00', 'end_time' => '14:30', 'max_bookings' => 5];
        }

        // 2. Martes, Miércoles y Viernes
        foreach (['Martes', 'Miércoles', 'Viernes'] as $day) {
            $slots[] = ['id' => $idCounter++, 'day' => $day, 'start_time' => '16:30', 'end_time' => '18:00', 'max_bookings' => 7];
            $slots[] = ['id' => $idCounter++, 'day' => $day, 'start_time' => '18:00', 'end_time' => '19:30', 'max_bookings' => 5];
            $slots[] = ['id' => $idCounter++, 'day' => $day, 'start_time' => '19:30', 'end_time' => '21:00', 'max_bookings' => 6];
        }

        foreach ($slots as $slot) {
            \App\Models\TimeSlot::create($slot);
        }
    }
}
