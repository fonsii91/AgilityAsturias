<?php

namespace Database\Factories;

use App\Models\Video;
use App\Models\Dog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class VideoFactory extends Factory
{
    protected $model = Video::class;

    public function definition()
    {
        return [
            'dog_id' => Dog::factory(),
            'user_id' => User::factory(),
            'competition_id' => null,
            'date' => $this->faker->date(),
            'title' => $this->faker->sentence(3),
            'local_path' => 'videos/sample.mp4',
            'status' => 'local',
            'is_public' => true,
            'in_public_gallery' => true,
            'orientation' => $this->faker->randomElement(['vertical', 'horizontal']),
            'manga_type' => $this->faker->randomElement(['Agility 1', 'Jumping 1']),
        ];
    }
}
