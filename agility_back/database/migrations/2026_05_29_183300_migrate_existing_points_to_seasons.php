<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create a single global default active season
        $seasonId = DB::table('gamification_seasons')->insertGetId([
            'name' => 'Temporada Fundacional',
            'gamification_type' => 'ranking',
            'start_date' => '2026-01-01',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Migrate points from all dogs to dog_season_points
        $dogs = DB::table('dogs')->where('points', '>', 0)->get();

        foreach ($dogs as $dog) {
            DB::table('dog_season_points')->insert([
                'dog_id' => $dog->id,
                'season_id' => $seasonId,
                'points' => $dog->points,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 3. Update all existing point histories to link to this global season
        DB::table('point_histories')->update(['season_id' => $seasonId]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Simply truncate/delete seasonal records
        DB::table('dog_season_points')->truncate();
        DB::table('gamification_seasons')->delete();
        DB::table('point_histories')->update(['season_id' => null]);
    }
};
