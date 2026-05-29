<?php

namespace App\Http\Controllers;

use App\Models\GamificationSeason;
use App\Models\StickerTrade;
use App\Models\UserSticker;
use App\Models\UserStickerProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StickerTradeController extends Controller
{
    /**
     * List all trades involving the authenticated user.
     */
    public function index()
    {
        $user = auth()->user();

        $trades = StickerTrade::with(['sender:id,name', 'receiver:id,name', 'offeredDog:id,name,photo_url', 'requestedDog:id,name,photo_url'])
            ->where(function ($query) use ($user) {
                $query->where('sender_id', $user->id)
                    ->orWhere('receiver_id', $user->id);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($trades);
    }

    /**
     * Create a new trade proposal.
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        $validated = $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'offered_dog_id' => 'required|exists:dogs,id',
            'requested_dog_id' => 'required|exists:dogs,id',
        ]);

        $season = GamificationSeason::where('status', 'active')
            ->where('gamification_type', 'stickers')
            ->first();

        if (!$season) {
            return response()->json(['message' => 'No hay temporada de stickers activa'], 422);
        }

        if ($user->id === (int) $validated['receiver_id']) {
            return response()->json(['message' => 'No puedes intercambiar contigo mismo'], 422);
        }

        // Validate sender has a duplicate of offered_dog
        $senderProfile = UserStickerProfile::where('user_id', $user->id)
            ->where('season_id', $season->id)
            ->first();

        if (!$senderProfile) {
            return response()->json(['message' => 'No tienes un perfil de stickers activo'], 422);
        }

        $senderSticker = UserSticker::where('user_sticker_profile_id', $senderProfile->id)
            ->where('dog_id', $validated['offered_dog_id'])
            ->first();

        if (!$senderSticker || $senderSticker->level < 3 || $senderSticker->duplicates_count <= 0) {
            return response()->json(['message' => 'No tienes duplicados disponibles de este perro para ofrecer'], 422);
        }

        // Validate receiver has a duplicate of requested_dog
        $receiverProfile = UserStickerProfile::where('user_id', $validated['receiver_id'])
            ->where('season_id', $season->id)
            ->first();

        if (!$receiverProfile) {
            return response()->json(['message' => 'El receptor no participa en esta temporada de stickers'], 422);
        }

        $receiverSticker = UserSticker::where('user_sticker_profile_id', $receiverProfile->id)
            ->where('dog_id', $validated['requested_dog_id'])
            ->first();

        if (!$receiverSticker || $receiverSticker->level < 3 || $receiverSticker->duplicates_count <= 0) {
            return response()->json(['message' => 'El receptor no tiene duplicados disponibles de este perro para intercambiar'], 422);
        }

        // Create the trade request
        $trade = StickerTrade::create([
            'sender_id' => $user->id,
            'receiver_id' => $validated['receiver_id'],
            'season_id' => $season->id,
            'offered_dog_id' => $validated['offered_dog_id'],
            'requested_dog_id' => $validated['requested_dog_id'],
            'status' => 'pending'
        ]);

        return response()->json([
            'message' => 'Solicitud de intercambio enviada con éxito',
            'trade' => $trade
        ], 201);
    }

    /**
     * Accept a pending trade proposal.
     */
    public function accept($id)
    {
        $user = auth()->user();
        $trade = StickerTrade::findOrFail($id);

        if ($trade->status !== 'pending') {
            return response()->json(['message' => 'Esta solicitud de intercambio ya no está pendiente'], 422);
        }

        if ($trade->receiver_id !== $user->id) {
            return response()->json(['message' => 'No estás autorizado para aceptar este intercambio'], 403);
        }

        // Check weekly limit (max 3 accepted trades per week per user)
        $startOfWeek = Carbon::now()->startOfWeek();
        $weeklyTradesCount = StickerTrade::where('status', 'accepted')
            ->where(function ($query) use ($user) {
                $query->where('sender_id', $user->id)
                    ->orWhere('receiver_id', $user->id);
            })
            ->where('updated_at', '>=', $startOfWeek)
            ->count();

        if ($weeklyTradesCount >= 3) {
            return response()->json(['message' => 'Has alcanzado el límite semanal de 3 intercambios completados'], 422);
        }

        // Transaction with concurrency lock
        $success = DB::transaction(function () use ($trade) {
            $senderProfile = UserStickerProfile::where('user_id', $trade->sender_id)
                ->where('season_id', $trade->season_id)
                ->first();

            $receiverProfile = UserStickerProfile::where('user_id', $trade->receiver_id)
                ->where('season_id', $trade->season_id)
                ->first();

            if (!$senderProfile || !$receiverProfile) {
                return false;
            }

            // Lock the stickers for updates
            $senderOfferedSticker = UserSticker::where('user_sticker_profile_id', $senderProfile->id)
                ->where('dog_id', $trade->offered_dog_id)
                ->lockForUpdate()
                ->first();

            $receiverRequestedSticker = UserSticker::where('user_sticker_profile_id', $receiverProfile->id)
                ->where('dog_id', $trade->requested_dog_id)
                ->lockForUpdate()
                ->first();

            // Verify they still have the duplicates
            if (!$senderOfferedSticker || $senderOfferedSticker->duplicates_count <= 0 ||
                !$receiverRequestedSticker || $receiverRequestedSticker->duplicates_count <= 0) {
                return false;
            }

            // Lock/fetch target stickers
            $senderRequestedSticker = UserSticker::firstOrCreate([
                'user_sticker_profile_id' => $senderProfile->id,
                'dog_id' => $trade->requested_dog_id
            ], ['level' => 0, 'duplicates_count' => 0]);

            $receiverOfferedSticker = UserSticker::firstOrCreate([
                'user_sticker_profile_id' => $receiverProfile->id,
                'dog_id' => $trade->offered_dog_id
            ], ['level' => 0, 'duplicates_count' => 0]);

            // Execute exchange: offered dog (sender -> receiver)
            $senderOfferedSticker->duplicates_count -= 1;
            $senderOfferedSticker->save();

            if ($receiverOfferedSticker->level < 3) {
                $receiverOfferedSticker->level += 1;
            } else {
                $receiverOfferedSticker->duplicates_count += 1;
            }
            $receiverOfferedSticker->save();

            // Execute exchange: requested dog (receiver -> sender)
            $receiverRequestedSticker->duplicates_count -= 1;
            $receiverRequestedSticker->save();

            if ($senderRequestedSticker->level < 3) {
                $senderRequestedSticker->level += 1;
            } else {
                $senderRequestedSticker->duplicates_count += 1;
            }
            $senderRequestedSticker->save();

            // Update status
            $trade->status = 'accepted';
            $trade->save();

            return true;
        });

        if (!$success) {
            return response()->json(['message' => 'No se pudo completar el intercambio. Asegúrate de que ambos usuarios aún tengan los duplicados disponibles.'], 422);
        }

        return response()->json([
            'message' => 'Intercambio completado con éxito',
            'trade' => $trade->fresh()
        ]);
    }

    /**
     * Reject a pending trade proposal.
     */
    public function reject($id)
    {
        $user = auth()->user();
        $trade = StickerTrade::findOrFail($id);

        if ($trade->status !== 'pending') {
            return response()->json(['message' => 'Esta solicitud de intercambio ya no está pendiente'], 422);
        }

        if ($trade->receiver_id !== $user->id) {
            return response()->json(['message' => 'No estás autorizado para rechazar este intercambio'], 403);
        }

        $trade->status = 'rejected';
        $trade->save();

        return response()->json([
            'message' => 'Intercambio rechazado',
            'trade' => $trade
        ]);
    }

    /**
     * Cancel a pending trade proposal initiated by the user.
     */
    public function cancel($id)
    {
        $user = auth()->user();
        $trade = StickerTrade::findOrFail($id);

        if ($trade->status !== 'pending') {
            return response()->json(['message' => 'Esta solicitud de intercambio ya no está pendiente'], 422);
        }

        if ($trade->sender_id !== $user->id) {
            return response()->json(['message' => 'No puedes cancelar una solicitud que no iniciaste'], 403);
        }

        $trade->status = 'cancelled';
        $trade->save();

        return response()->json([
            'message' => 'Intercambio cancelado',
            'trade' => $trade
        ]);
    }
}
