<?php

namespace App\Http\Controllers;

use App\Models\Dog;
use App\Models\GamificationSeason;
use Illuminate\Http\Request;

class RankingController extends Controller
{
    public function index(Request $request)
    {
        $seasonId = $request->query('season_id');

        if ($seasonId) {
            $season = GamificationSeason::findOrFail($seasonId);
        } else {
            $season = GamificationSeason::where('status', 'active')
                ->where('gamification_type', 'ranking')
                ->first();
        }

        if (!$season || $season->gamification_type !== 'ranking') {
            return response()->json([]);
        }

        // 1. Get all dogs with their seasonal points and points obtained in the last day.
        $dogs = Dog::select('dogs.id', 'dogs.name', 'dogs.breed', 'dogs.birth_date', 'dogs.rsce_category', 'dogs.microchip', 'dogs.pedigree', 'dogs.photo_url')
            ->join('dog_season_points', 'dogs.id', '=', 'dog_season_points.dog_id')
            ->where('dog_season_points.season_id', $season->id)
            ->where('dog_season_points.points', '>', 0)
            ->selectRaw('dog_season_points.points as points, dog_season_points.final_position as final_position')
            ->with(['users:id,name,photo_url', 'pointHistories' => function ($query) use ($season) {
                $query->where('season_id', $season->id)->orderBy('created_at', 'desc');
            }])
            ->withSum(['pointHistories as recent_points' => function ($query) use ($season) {
                $query->where('season_id', $season->id)
                    ->where('created_at', '>=', now()->subDays(1));
            }], 'points')
            ->get();

        // 2. Sort to get current ranking
        $currentRanking = $dogs->sortByDesc('points')->values();

        $currentPositions = [];
        foreach ($currentRanking as $index => $dog) {
            $currentPositions[$dog->id] = $index + 1;

            // Calculate past points (default recent_points to 0 if null)
            $dog->past_points = $dog->points - ($dog->recent_points ?? 0);
        }

        // 3. Sort to get past ranking (1 day ago)
        $pastRanking = $dogs->sortByDesc('past_points')->values();

        $pastPositions = [];
        foreach ($pastRanking as $index => $dog) {
            if ($dog->past_points > 0) {
                $pastPositions[$dog->id] = $index + 1;
            } else {
                $pastPositions[$dog->id] = 999;
            }
        }

        // 4. Attach position change and format final list (Return all dogs in ranking)
        $finalRanking = [];
        foreach ($currentRanking as $dog) {
            $currentPos = $currentPositions[$dog->id];
            $pastPos = $pastPositions[$dog->id];

            $positionChange = 0;
            if ($pastPos !== 999) {
                // E.g., Past was 5th, Current is 3rd -> Change is +2
                $positionChange = $pastPos - $currentPos;
            } else {
                // New entering the ranking
                $positionChange = 'NEW';
            }

            $dog->position_change = $positionChange;

            // Clean up temporary properties
            unset($dog->recent_points);
            unset($dog->past_points);

            $finalRanking[] = $dog;
        }

        return response()->json($finalRanking);
    }
}
