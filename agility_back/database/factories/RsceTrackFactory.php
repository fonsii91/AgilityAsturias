<?php

namespace Database\Factories;

use App\Models\Dog;
use App\Models\RsceTrack;
use Illuminate\Database\Eloquent\Factories\Factory;

class RsceTrackFactory extends Factory
{
    protected $model = RsceTrack::class;

    public function definition()
    {
        return [
            'dog_id' => Dog::factory(),
            'date' => $this->faker->date(),
            'manga_type' => $this->faker->randomElement(['Agility', 'Jumping', 'Gradients']),
            'qualification' => $this->faker->randomElement(['EXC', 'MB', 'B', 'ELIMINADO', 'NO CLASIFICADO']),
            'speed' => $this->faker->randomFloat(2, 3.0, 6.0),
            'judge_name' => $this->faker->name(),
            'location' => $this->faker->city(),
            'notes' => $this->faker->sentence(),
        ];
    }
}
