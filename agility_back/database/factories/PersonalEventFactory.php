<?php

namespace Database\Factories;

use App\Models\Dog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PersonalEvent>
 */
class PersonalEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'dog_id' => Dog::factory(),
            'title' => $this->faker->sentence(3),
            'type' => $this->faker->randomElement(['veterinario', 'fisioterapia', 'otro']),
            'start_date' => $this->faker->date(),
            'notes' => $this->faker->optional()->paragraph(),
        ];
    }
}
