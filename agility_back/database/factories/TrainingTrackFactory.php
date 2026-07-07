<?php

namespace Database\Factories;

use App\Models\TrainingTrack;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TrainingTrack>
 */
class TrainingTrackFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Pista ' . $this->faker->unique()->word(),
            'surface' => $this->faker->randomElement(TrainingTrack::SURFACES),
            'photo_url' => null,
        ];
    }
}
