<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Competition;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Competition>
 */
class CompetitionFactory extends Factory
{
    protected $model = Competition::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $fechaEvento = $this->faker->dateTimeBetween('-6 months', '+6 months');
        $isMultiDay = $this->faker->boolean(30); // 30% chance of being multi-day
        $fechaFinEvento = $isMultiDay ? (clone $fechaEvento)->modify('+' . $this->faker->numberBetween(1, 3) . ' days') : null;
        $fechaLimite = (clone $fechaEvento)->modify('-' . $this->faker->numberBetween(3, 15) . ' days');
        $tipo = $this->faker->randomElement(['competicion', 'otros']);

        $nameOptions = $tipo === 'competicion'
            ? ['Prueba Agility', 'Copa', 'Trofeo', 'Liga', 'Open Agility', 'Campeonato']
            : ['Seminario', 'Charla', 'Curso de Iniciación', 'Entrenamiento', 'Jornada'];

        return [
            'nombre' => $this->faker->randomElement($nameOptions) . ' ' . $this->faker->city,
            'lugar' => $this->faker->city . ' Club Agility',
            'fecha_evento' => $fechaEvento->format('Y-m-d'),
            'fecha_fin_evento' => $fechaFinEvento ? $fechaFinEvento->format('Y-m-d') : null,
            'fecha_limite' => $fechaLimite->format('Y-m-d'),
            'forma_pago' => $this->faker->randomElement(['Transferencia', 'Efectivo', 'Bizum']),
            'cartel' => null,
            'enlace' => $this->faker->boolean(70) ? $this->faker->url : null,
            'tipo' => $tipo,
        ];
    }
}
