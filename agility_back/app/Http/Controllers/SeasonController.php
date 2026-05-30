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

        // If it was a ranking season, freeze the final positions for the season's club
        if ($season->gamification_type === 'ranking') {
            $clubId = $season->club_id;

            $points = DogSeasonPoint::select('dog_season_points.*')
                ->join('dogs', 'dog_season_points.dog_id', '=', 'dogs.id')
                ->where('dogs.club_id', $clubId)
                ->where('dog_season_points.season_id', $season->id)
                ->orderByDesc('dog_season_points.points')
                ->get();

            foreach ($points as $index => $row) {
                $row->final_position = $index + 1;
                $row->save();
            }
        }
    }

    /**
     * Update a season's name and dates.
     */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date',
        ]);

        $season = GamificationSeason::findOrFail($id);
        $season->update($validated);

        return response()->json([
            'message' => 'Temporada actualizada con éxito',
            'season' => $season
        ]);
    }

    /**
     * Reopen a finished season if there is no other active season.
     */
    public function reopen($id)
    {
        $activeSeason = GamificationSeason::where('status', 'active')->first();
        if ($activeSeason) {
            return response()->json([
                'message' => 'No se puede reabrir esta temporada porque ya hay otra activa (' . $activeSeason->name . '). Finalízala primero.'
            ], 422);
        }

        $season = GamificationSeason::findOrFail($id);

        DB::transaction(function () use ($season) {
            $season->status = 'active';
            $season->end_date = null;
            $season->save();

            // Clear final positions if it's a ranking
            if ($season->gamification_type === 'ranking') {
                DogSeasonPoint::where('season_id', $season->id)->update(['final_position' => null]);
            }
        });

        return response()->json([
            'message' => 'Temporada reabierta con éxito',
            'season' => $season->fresh()
        ]);
    }

    /**
     * Delete a season and safely cascade clean its related records.
     */
    public function destroy($id)
    {
        $season = GamificationSeason::findOrFail($id);

        DB::transaction(function () use ($season) {
            // 1. Delete points in dog_season_points
            DogSeasonPoint::where('season_id', $season->id)->delete();

            // 2. Unlink point histories
            \App\Models\PointHistory::where('season_id', $season->id)->update(['season_id' => null]);

            // 3. Delete bounty board contracts
            \App\Models\BountyContract::where('season_id', $season->id)->delete();

            // 4. Delete sticker trades
            \App\Models\StickerTrade::where('season_id', $season->id)->delete();

            // 5. Delete user stickers linked to profiles
            $profileIds = \App\Models\UserStickerProfile::where('season_id', $season->id)->pluck('id');
            \App\Models\UserSticker::whereIn('user_sticker_profile_id', $profileIds)->delete();

            // 6. Delete user sticker profiles
            \App\Models\UserStickerProfile::where('season_id', $season->id)->delete();

            // 7. Delete the season itself
            $season->delete();
        });

        return response()->json([
            'message' => 'Temporada y todos sus datos asociados eliminados con éxito'
        ]);
    }
}
