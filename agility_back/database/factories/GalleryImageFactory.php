<?php

namespace Database\Factories;

use App\Models\GalleryImage;
use Illuminate\Database\Eloquent\Factories\Factory;

class GalleryImageFactory extends Factory
{
    protected $model = GalleryImage::class;

    public function definition()
    {
        return [
            'url' => $this->faker->imageUrl(),
            'alt' => $this->faker->sentence(4),
        ];
    }
}
