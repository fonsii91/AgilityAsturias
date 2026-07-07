<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TrackReservation>
 */
class TrackReservationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $hour = $this->faker->numberBetween(8, 21);

        return [
            'date' => now()->addDays($this->faker->numberBetween(1, 7))->toDateString(),
            'start_time' => sprintf('%02d:00', $hour),
            'end_time' => sprintf('%02d:00', $hour + 1),
        ];
    }
}
