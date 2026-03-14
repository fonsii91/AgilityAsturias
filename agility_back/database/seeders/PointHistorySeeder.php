<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Dog;
use App\Models\PointHistory;
use Carbon\Carbon;

class PointHistorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $dogs = Dog::all();

        if ($dogs->isEmpty()) {
            $this->command->info('No dogs found to attach point histories to.');
            return;
        }

        $categories = [
            ['title' => 'Asistencia a entrenamiento', 'points' => 3],
            ['title' => 'Asistencia a competición (Posición: 1)', 'points' => 4],
            ['title' => 'Asistencia a competición (Posición: 2)', 'points' => 3],
            ['title' => 'Puntualidad', 'points' => 1],
            ['title' => 'Proactividad', 'points' => 2],
            ['title' => 'Motivación', 'points' => 2],
            ['title' => 'Compañerismo', 'points' => 1],
            ['title' => 'Caca', 'points' => -2],
            ['title' => 'Pis', 'points' => -1],
            ['title' => 'Mal comportamiento', 'points' => -3],
        ];

        foreach ($dogs as $dog) {
            // Generate between 3 and 8 random point history records for each dog
            $numRecords = rand(3, 8);
            
            for ($i = 0; $i < $numRecords; $i++) {
                $category = $categories[array_rand($categories)];
                $points = $category['points'];
                
                // Distribute creation dates over the last 30 days
                $createdAt = Carbon::now()->subDays(rand(0, 30))->subMinutes(rand(0, 1440));

                PointHistory::create([
                    'dog_id' => $dog->id,
                    'points' => $points,
                    'category' => $category['title'],
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt
                ]);
                
                // Automatically adjust the dog's total points based on the seeded history
                // (Optional: Un-comment if you want the seeder to also recount the total points.
                // Normally the seeder just adds history, but to keep 'points' column perfectly
                // synced with the new history, we update it).
                $dog->points += $points;
            }
            $dog->save();
        }

        $this->command->info('Point histories seeded successfully!');
    }
}
