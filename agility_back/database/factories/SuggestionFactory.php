<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Suggestion;
use App\Models\User;

class SuggestionFactory extends Factory
{
    protected $model = Suggestion::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => $this->faker->randomElement(['bug', 'suggestion']),
            'content' => $this->faker->paragraph(),
            'status' => 'pending',
            // club_id is handled by the model trait when creating or saving, but we can set it if we want
        ];
    }
}
