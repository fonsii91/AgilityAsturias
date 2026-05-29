<?php

namespace App\Http\Controllers;

use App\Models\Dog;
use App\Models\GamificationSeason;
use App\Models\UserSticker;
use App\Models\UserStickerProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StickerAlbumController extends Controller
{
    /**
     * Get the stickers album status for the authenticated user.
     */
    public function getAlbum(Request $request)
    {
        $user = auth()->user();
        $seasonId = $request->query('season_id');

        if ($seasonId) {
            $season = GamificationSeason::findOrFail($seasonId);
        } else {
            $season = GamificationSeason::where('status', 'active')
                ->where('gamification_type', 'stickers')
                ->first();
        }

        if (!$season) {
            return response()->json([
                'season' => null,
                'profile' => null,
                'promotions' => []
            ]);
        }

        // Get or create profile for this season
        $profile = UserStickerProfile::firstOrCreate([
            'user_id' => $user->id,
            'season_id' => $season->id
        ], [
            'coins' => 0,
            'unopened_chests_count' => 0,
            'claimed_promotions' => []
        ]);

        // Get all dogs of the club
        $dogs = Dog::select('id', 'name', 'photo_url', 'club_entry_year', 'created_at')->get();

        // Get user collected stickers
        $userStickers = UserSticker::where('user_sticker_profile_id', $profile->id)
            ->get()
            ->keyBy('dog_id');

        $mappedDogs = $dogs->map(function ($dog) use ($userStickers) {
            $userSticker = $userStickers->get($dog->id);
            return [
                'id' => $dog->id,
                'name' => $dog->name,
                'photo_url' => $dog->photo_url,
                'club_entry_year' => $dog->club_entry_year,
                'level' => $userSticker ? $userSticker->level : 0,
                'duplicates_count' => $userSticker ? $userSticker->duplicates_count : 0,
            ];
        });

        // Group by year
        $promotions = $mappedDogs->groupBy('club_entry_year')->map(function ($items, $year) {
            return [
                'year' => (int) $year,
                'dogs' => $items->values(),
                'total' => $items->count(),
                'completed' => $items->where('level', 3)->count()
            ];
        })->values()->sortByDesc('year')->values();

        return response()->json([
            'season' => $season,
            'profile' => $profile,
            'promotions' => $promotions
        ]);
    }

    /**
     * Open an unopened chest to receive coins and a sticker.
     */
    public function openChest()
    {
        $user = auth()->user();

        $season = GamificationSeason::where('status', 'active')
            ->where('gamification_type', 'stickers')
            ->first();

        if (!$season) {
            return response()->json(['message' => 'No hay temporada de stickers activa'], 422);
        }

        $profile = UserStickerProfile::where('user_id', $user->id)
            ->where('season_id', $season->id)
            ->first();

        if (!$profile || $profile->unopened_chests_count <= 0) {
            return response()->json(['message' => 'No tienes cofres pendientes de abrir'], 422);
        }

        $allDogs = Dog::select('id', 'name', 'photo_url')->get();
        if ($allDogs->isEmpty()) {
            return response()->json(['message' => 'No hay perros registrados en el club'], 422);
        }

        $rewardData = DB::transaction(function () use ($profile, $allDogs) {
            // Deduct chest
            $profile->unopened_chests_count -= 1;

            // Generate coins reward (10 - 30 coins)
            $coinsReward = rand(10, 30);
            $profile->coins += $coinsReward;
            $profile->save();

            // Select random cromo
            $dog = $allDogs->random();

            $userSticker = UserSticker::firstOrCreate([
                'user_sticker_profile_id' => $profile->id,
                'dog_id' => $dog->id
            ], [
                'level' => 0,
                'duplicates_count' => 0
            ]);

            $previousLevel = $userSticker->level;

            if ($userSticker->level < 3) {
                $userSticker->level += 1;
            } else {
                $userSticker->duplicates_count += 1;
            }
            $userSticker->save();

            return [
                'coins_reward' => $coinsReward,
                'dog' => $dog,
                'level' => $userSticker->level,
                'is_new' => ($previousLevel === 0),
                'is_duplicate' => ($previousLevel === 3)
            ];
        });

        return response()->json(array_merge([
            'message' => '¡Cofre abierto con éxito!',
            'profile' => $profile->fresh()
        ], $rewardData));
    }

    /**
     * Buy a chest package for 100 coins.
     */
    public function buyStickerPack()
    {
        $user = auth()->user();

        $season = GamificationSeason::where('status', 'active')
            ->where('gamification_type', 'stickers')
            ->first();

        if (!$season) {
            return response()->json(['message' => 'No hay temporada de stickers activa'], 422);
        }

        $profile = UserStickerProfile::where('user_id', $user->id)
            ->where('season_id', $season->id)
            ->first();

        if (!$profile || $profile->coins < 100) {
            return response()->json(['message' => 'No tienes suficientes monedas (necesitas 100)'], 422);
        }

        DB::transaction(function () use ($profile) {
            $profile->coins -= 100;
            $profile->unopened_chests_count += 1;
            $profile->save();
        });

        return response()->json([
            'message' => '¡Cofre comprado con éxito!',
            'profile' => $profile->fresh()
        ]);
    }

    /**
     * Claim promotion reward for completing all stickers of a specific entry year.
     */
    public function claimPromotionReward(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer'
        ]);

        $year = $validated['year'];
        $user = auth()->user();

        $season = GamificationSeason::where('status', 'active')
            ->where('gamification_type', 'stickers')
            ->first();

        if (!$season) {
            return response()->json(['message' => 'No hay temporada de stickers activa'], 422);
        }

        $profile = UserStickerProfile::where('user_id', $user->id)
            ->where('season_id', $season->id)
            ->first();

        if (!$profile) {
            return response()->json(['message' => 'Perfil de stickers no encontrado'], 404);
        }

        $claimed = $profile->claimed_promotions ?? [];
        if (in_array($year, $claimed)) {
            return response()->json(['message' => 'Ya has reclamado la recompensa para esta promoción'], 422);
        }

        // Filter dogs belonging to this year
        $dogsOfYear = Dog::all()->filter(function ($dog) use ($year) {
            return $dog->club_entry_year === $year;
        });

        if ($dogsOfYear->isEmpty()) {
            return response()->json(['message' => 'No hay perros registrados en esta promoción'], 422);
        }

        $dogIds = $dogsOfYear->pluck('id')->toArray();
        $collectedCount = UserSticker::where('user_sticker_profile_id', $profile->id)
            ->whereIn('dog_id', $dogIds)
            ->where('level', 3)
            ->count();

        if ($collectedCount < count($dogIds)) {
            return response()->json(['message' => 'Aún no has completado todos los stickers de esta promoción'], 422);
        }

        DB::transaction(function () use ($profile, $year, $claimed) {
            $claimed[] = $year;
            $profile->claimed_promotions = $claimed;
            $profile->unopened_chests_count += 1;
            $profile->coins += 100;
            $profile->save();
        });

        return response()->json([
            'message' => "¡Recompensa de la Promoción {$year} reclamada con éxito!",
            'profile' => $profile->fresh()
        ]);
    }
}
