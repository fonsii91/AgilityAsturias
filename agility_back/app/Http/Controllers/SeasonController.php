<?php

namespace App\Http\Controllers;

use App\Models\GamificationSeason;
use App\Models\DogSeasonPoint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SeasonController extends Controller
{
    /**
     * List all seasons for the current club.
     */
    public function index()
    {
        $seasons = GamificationSeason::orderBy('created_at', 'desc')->get();
        return response()->json($seasons);
    }

    /**
     * Start a new season (ends the current one automatically).
     */
    public function start(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'gamification_type' => 'required|string|in:ranking,stickers',
            'start_date' => 'nullable|date',
        ]);

        $startDate = $validated['start_date'] ?? Carbon::now()->toDateString();

        $newSeason = DB::transaction(function () use ($validated, $startDate) {
            // Find active season and end it
            $activeSeason = GamificationSeason::where('status', 'active')->first();
            if ($activeSeason) {
                $this->endSeason($activeSeason);
            }

            // Create new season
            // club_id is automatically handled by HasClub trait on save/create
            return GamificationSeason::create([
                'name' => $validated['name'],
                'gamification_type' => $validated['gamification_type'],
                'start_date' => $startDate,
                'status' => 'active',
            ]);
        });

        return response()->json([
            'message' => 'Nueva temporada iniciada con éxito',
            'season' => $newSeason
        ], 201);
    }

    /**
     * End the current active season.
     */
    public function endCurrent()
    {
        $activeSeason = GamificationSeason::where('status', 'active')->first();

        if (!$activeSeason) {
            return response()->json(['message' => 'No hay ninguna temporada activa en este momento'], 422);
        }

        DB::transaction(function () use ($activeSeason) {
            $this->endSeason($activeSeason);
        });

        return response()->json([
            'message' => 'Temporada finalizada con éxito',
            'season' => $activeSeason->fresh()
        ]);
    }

    /**
     * Internal helper to end a season and calculate ranking positions if needed.
     */
    private function endSeason(GamificationSeason $season)
    {
        $season->status = 'finished';
        $season->end_date = Carbon::now()->toDateString();
        $season->save();

        // If it was a ranking season, freeze the final positions per club
        if ($season->gamification_type === 'ranking') {
            $clubs = \App\Models\Club::all();

            foreach ($clubs as $club) {
                $points = DogSeasonPoint::select('dog_season_points.*')
                    ->join('dogs', 'dog_season_points.dog_id', '=', 'dogs.id')
                    ->where('dogs.club_id', $club->id)
                    ->where('dog_season_points.season_id', $season->id)
                    ->orderByDesc('dog_season_points.points')
                    ->get();

                foreach ($points as $index => $row) {
                    $row->final_position = $index + 1;
                    $row->save();
                }
            }
        }
    }
}
