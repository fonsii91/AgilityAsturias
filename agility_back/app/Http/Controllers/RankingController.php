<?php

namespace App\Http\Controllers;

use App\Models\Dog;
use Illuminate\Http\Request;

class RankingController extends Controller
{
    public function index()
    {
        // Return dogs with points > 0, ordered by points descending
        // Limit to top 50
        $ranking = Dog::with('user:id,name,photo_url')
            ->withCount([
                'reservations as weekly_points' => function ($query) {
                    // Count reservations that were marked as completed in the last 7 days
                    $query->where('status', 'completed')
                        ->where('attendance_verified', true)
                        ->where('updated_at', '>=', now()->subDays(7));
                }
            ])
            ->where('points', '>', 0)
            ->orderBy('points', 'desc')
            ->select('id', 'name', 'points', 'photo_url', 'user_id')
            ->limit(50)
            ->get();

        return response()->json($ranking);
    }
}
