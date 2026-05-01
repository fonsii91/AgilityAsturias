<?php

namespace Database\Factories;

use App\Models\TimeSlotException;
use App\Models\TimeSlot;
use App\Models\Club;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TimeSlotException>
 */
class TimeSlotExceptionFactory extends Factory
{
    protected $model = TimeSlotException::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'club_id' => 1,
            'slot_id' => TimeSlot::factory(),
            'date' => $this->faker->dateTimeBetween('now', '+1 month')->format('Y-m-d'),
            'reason' => $this->faker->sentence(),
        ];
    }
}
