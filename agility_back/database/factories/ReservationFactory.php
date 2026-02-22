<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\User;
use App\Models\TimeSlot;
use App\Models\Dog;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Reservation>
 */
class ReservationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slot_id' => TimeSlot::factory(),
            'user_id' => User::factory(),
            'dog_id' => Dog::factory(),
            'date' => now()->addDays(1)->toDateString(),
            'status' => 'active',
            'attendance_verified' => false,
        ];
    }
}
