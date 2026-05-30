<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Fetch template season (season ID 1, 'Temporada Fundacional')
        $templateSeason = Illuminate\Support\Facades\DB::table('gamification_seasons')->where('id', 1)->first();
        if (!$templateSeason) {
            return;
        }

        // 2. Fetch all clubs
        $clubs = Illuminate\Support\Facades\DB::table('clubs')->get();

        foreach ($clubs as $club) {
            // Club 1 is already associated with season ID 1
            if ($club->id == 1) {
                continue;
            }

            // Check if there is already a season of type 'ranking' named 'Temporada Fundacional' for this club
            $existingSeason = Illuminate\Support\Facades\DB::table('gamification_seasons')
                ->where('club_id', $club->id)
                ->where('name', $templateSeason->name)
                ->where('gamification_type', 'ranking')
                ->first();

            if ($existingSeason) {
                $newSeasonId = $existingSeason->id;
            } else {
                $newSeasonId = Illuminate\Support\Facades\DB::table('gamification_seasons')->insertGetId([
                    'club_id' => $club->id,
                    'name' => $templateSeason->name,
                    'gamification_type' => 'ranking',
                    'start_date' => $templateSeason->start_date,
                    'end_date' => $templateSeason->end_date,
                    'status' => $templateSeason->status,
                    'created_at' => $templateSeason->created_at ?: now(),
                    'updated_at' => $templateSeason->updated_at ?: now(),
                ]);
            }

            // Fetch all dogs belonging to this club
            $dogIds = Illuminate\Support\Facades\DB::table('dogs')->where('club_id', $club->id)->pluck('id')->toArray();

            if (!empty($dogIds)) {
                // Update dog_season_points for these dogs to point to the new season ID
                Illuminate\Support\Facades\DB::table('dog_season_points')
                    ->whereIn('dog_id', $dogIds)
                    ->where('season_id', 1)
                    ->update(['season_id' => $newSeasonId]);

                // Update point_histories for these dogs to point to the new season ID
                Illuminate\Support\Facades\DB::table('point_histories')
                    ->whereIn('dog_id', $dogIds)
                    ->where('season_id', 1)
                    ->update(['season_id' => $newSeasonId]);

                // Update bounty_contracts for this club to point to the new season ID
                Illuminate\Support\Facades\DB::table('bounty_contracts')
                    ->where('club_id', $club->id)
                    ->where('season_id', 1)
                    ->update(['season_id' => $newSeasonId]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $templateSeason = Illuminate\Support\Facades\DB::table('gamification_seasons')->where('id', 1)->first();
        if (!$templateSeason) {
            return;
        }

        // Find all duplicated seasons (type 'ranking', named 'Temporada Fundacional', club_id > 1)
        $duplicatedSeasons = Illuminate\Support\Facades\DB::table('gamification_seasons')
            ->where('id', '>', 1)
            ->where('club_id', '>', 1)
            ->where('name', $templateSeason->name)
            ->where('gamification_type', 'ranking')
            ->get();

        foreach ($duplicatedSeasons as $season) {
            // Revert point histories to season 1
            Illuminate\Support\Facades\DB::table('point_histories')
                ->where('season_id', $season->id)
                ->update(['season_id' => 1]);

            // Revert dog season points to season 1
            Illuminate\Support\Facades\DB::table('dog_season_points')
                ->where('season_id', $season->id)
                ->update(['season_id' => 1]);

            // Revert bounty contracts to season 1
            Illuminate\Support\Facades\DB::table('bounty_contracts')
                ->where('season_id', $season->id)
                ->update(['season_id' => 1]);

            // Delete the duplicated season
            Illuminate\Support\Facades\DB::table('gamification_seasons')->where('id', $season->id)->delete();
        }
    }
};
