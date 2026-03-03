<?php

namespace App\Http\Controllers;

use App\Models\Dog;
use Illuminate\Http\Request;

class RankingController extends Controller
{
    public function index()
    {
        // 1. Get all dogs with their current points and points obtained in the last 10 days.
        $dogs = Dog::select('id', 'name', 'points', 'photo_url', 'user_id')
            ->with('user:id,name,photo_url')
            ->withCount([
                'reservations as recent_points' => function ($query) {
                    // Count reservations that were marked as completed in the last 10 days
                    $query->where('status', 'completed')
                        ->where('attendance_verified', true)
                        ->where('updated_at', '>=', now()->subDays(10));
                }
            ])
            ->where('points', '>', 0)
            ->get();

        // 2. Sort to get current ranking
        $currentRanking = $dogs->sortByDesc('points')->values();

        $currentPositions = [];
        foreach ($currentRanking as $index => $dog) {
            $currentPositions[$dog->id] = $index + 1;

            // Calculate past points
            $dog->past_points = $dog->points - $dog->recent_points;
        }

        // 3. Sort to get past ranking (10 days ago)
        $pastRanking = $dogs->sortByDesc('past_points')->values();

        $pastPositions = [];
        foreach ($pastRanking as $index => $dog) {
            if ($dog->past_points > 0) {
                $pastPositions[$dog->id] = $index + 1;
            } else {
                $pastPositions[$dog->id] = 999;
            }
        }

        // 4. Attach position change and format final list (Limit to top 50)
        $finalRanking = [];
        foreach ($currentRanking->take(50) as $dog) {
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
