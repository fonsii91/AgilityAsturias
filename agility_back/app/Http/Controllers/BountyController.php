<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Dog;
use App\Models\User;
use App\Models\GamificationSeason;
use App\Models\DogSeasonPoint;
use App\Models\PointHistory;
use App\Models\BountyContract;
use App\Models\BountyUserSetting;
use App\Models\Club;
use App\Notifications\BountyWitnessValidationNotification;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BountyController extends Controller
{
    /**
     * Helper to resolve expired active contracts for a season.
     */
    private function resolveExpiredContracts($seasonId)
    {
        $expiredContracts = BountyContract::where('season_id', $seasonId)
            ->where('status', 'active')
            ->where('expires_at', '<=', Carbon::now())
            ->get();

        foreach ($expiredContracts as $contract) {
            DB::transaction(function () use ($contract, $seasonId) {
                $contract->status = 'expired';
                $contract->save();

                // 20% of cost goes to victim dog as survival reward
                $reward = (int) floor($contract->cost * 0.20);
                if ($reward > 0) {
                    $victimPoints = DogSeasonPoint::firstOrCreate(
                        ['dog_id' => $contract->victim_dog_id, 'season_id' => $seasonId],
                        ['points' => 0]
                    );
                    $victimPoints->points += $reward;
                    $victimPoints->save();

                    PointHistory::create([
                        'dog_id' => $contract->victim_dog_id,
                        'season_id' => $seasonId,
                        'points' => $reward,
                        'category' => 'Supervivencia de contrato (Fianza)',
                    ]);
                }
            });
        }
    }

    /**
     * Get all wanted posters (dogs in active season ranking >= 20 pts).
     */
    public function getPosters(Request $request)
    {
        $clubId = $request->user()->club_id;
        $season = GamificationSeason::where('club_id', $clubId)
            ->where('status', 'active')
            ->where('gamification_type', 'ranking')
            ->first();

        if (!$season) {
            return response()->json(['message' => 'No hay temporada de ranking activa.'], 404);
        }

        $this->resolveExpiredContracts($season->id);

        // Get opted out users
        $optedOutUsers = BountyUserSetting::where('opt_in', false)->pluck('user_id');

        // Get current user's dogs
        $myDogIds = DB::table('dog_user')
            ->where('user_id', $request->user()->id)
            ->pluck('dog_id')
            ->toArray();

        // Get dogs with at least 20 points in active season
        $dogs = Dog::select('dogs.id', 'dogs.name', 'dogs.photo_url')
            ->join('dog_season_points', 'dogs.id', '=', 'dog_season_points.dog_id')
            ->where('dog_season_points.season_id', $season->id)
            ->where('dog_season_points.points', '>=', 20)
            ->selectRaw('dog_season_points.points as points')
            ->with(['users:id,name'])
            ->get();

        $activeTargetedDogs = [];
        $availableDogs = [];

        foreach ($dogs as $dog) {
            // Check if any owner has opted out
            $ownerIds = $dog->users->pluck('id')->toArray();
            $isOptedOut = count(array_intersect($ownerIds, $optedOutUsers->toArray())) > 0;
            
            // Exclude my own dogs and opted out dogs
            $isMine = in_array($dog->id, $myDogIds);
            if ($isMine || $isOptedOut) {
                continue;
            }

            // Count active contracts targeting this victim dog's owners (up to 3 allowed)
            $activeContractsCount = BountyContract::where('season_id', $season->id)
                ->where('status', 'active')
                ->whereIn('victim_dog_id', function ($query) use ($ownerIds) {
                    $query->select('dog_id')
                        ->from('dog_user')
                        ->whereIn('user_id', $ownerIds);
                })
                ->count();

            // Check if current user already has an active contract on this victim dog
            $alreadyHuntingThisVictim = BountyContract::where('season_id', $season->id)
                ->whereIn('hunter_dog_id', $myDogIds)
                ->where('victim_dog_id', $dog->id)
                ->where('status', 'active')
                ->exists();

            $dog->has_active_contract = ($activeContractsCount >= 3) || $alreadyHuntingThisVictim;

            if ($dog->has_active_contract) {
                $activeTargetedDogs[] = $dog;
            } else {
                $availableDogs[] = $dog;
            }
        }

        // Shuffle available dogs deterministically by current hour (e.g. YYYYMMDDHH)
        $seed = date('YmdH');
        usort($availableDogs, function ($a, $b) use ($seed) {
            $hashA = md5($a->id . '_' . $seed);
            $hashB = md5($b->id . '_' . $seed);
            return strcmp($hashA, $hashB);
        });

        // Limit available dogs to 4 posters at a time
        $visibleAvailable = array_slice($availableDogs, 0, 4);

        // Merge targeted dogs (always visible) and the limited available dogs
        $finalDogs = array_merge($activeTargetedDogs, $visibleAvailable);

        $cartelTypes = ['guante_blanco', 'asalto', 'hachazo'];
        $posters = [];
        foreach ($finalDogs as $dog) {
            $pts = $dog->points;
            
            // Calculate active cartel type deterministically for this hour
            $typeHash = md5($dog->id . '_type_' . $seed);
            $typeIndex = hexdec(substr($typeHash, 0, 4)) % 3;
            $activeCartelType = $cartelTypes[$typeIndex];

            $posters[] = [
                'dog_id' => $dog->id,
                'name' => $dog->name,
                'photo_url' => $dog->photo_url,
                'points' => $pts,
                'owners' => $dog->users->map(fn($u) => $u->name)->join(' & '),
                'has_active_contract' => $dog->has_active_contract,
                'active_cartel_type' => $activeCartelType,
                'carteles' => [
                    'guante_blanco' => [
                        'cost' => (int) ceil($pts * 0.02),
                        'bounty' => (int) floor($pts * 0.10)
                    ],
                    'asalto' => [
                        'cost' => (int) ceil($pts * 0.08),
                        'bounty' => (int) floor($pts * 0.20)
                    ],
                    'hachazo' => [
                        'cost' => (int) ceil($pts * 0.16),
                        'bounty' => (int) floor($pts * 0.30)
                    ]
                ]
            ];
        }

        $userSetting = BountyUserSetting::where('user_id', $request->user()->id)->first();
        $optIn = $userSetting ? (bool) $userSetting->opt_in : true;

        return response()->json([
            'posters' => $posters,
            'bounty_board_enabled' => (bool) ($request->user()->club->settings_ranking['bounty_board_enabled'] ?? false),
            'opt_in' => $optIn
        ]);
    }

    /**
     * Buy a wanted contract poster.
     */
    public function buyContract(Request $request)
    {
        $request->validate([
            'victim_dog_id' => 'required|exists:dogs,id',
            'cartel_type' => 'required|in:guante_blanco,asalto,hachazo',
            'hunter_dog_id' => 'nullable|exists:dogs,id'
        ]);

        $user = $request->user();

        // Check if user has opted out of the Bounty Board
        $userSetting = BountyUserSetting::where('user_id', $user->id)->first();
        if ($userSetting && !$userSetting->opt_in) {
            return response()->json(['message' => 'No puedes aceptar contratos si has desactivado tu participación en el Tablón.'], 403);
        }

        $club = $user->club;
        $season = GamificationSeason::where('club_id', $club->id)
            ->where('status', 'active')
            ->where('gamification_type', 'ranking')
            ->first();

        if (!$season) {
            return response()->json(['message' => 'No hay temporada de ranking activa.'], 400);
        }

        if (!($club->settings_ranking['bounty_board_enabled'] ?? false)) {
            return response()->json(['message' => 'El Tablón de Cazarrecompensas está desactivado.'], 403);
        }

        // Fetch my dogs
        $myDogIds = DB::table('dog_user')
            ->where('user_id', $user->id)
            ->pluck('dog_id')
            ->toArray();

        // Get hunter dog
        $hunterDogId = $request->input('hunter_dog_id');
        if ($hunterDogId) {
            if (!in_array($hunterDogId, $myDogIds)) {
                return response()->json(['message' => 'El perro cazador seleccionado no te pertenece.'], 403);
            }
        } else {
            // Get my dog with most points
            $hunterDogId = DogSeasonPoint::whereIn('dog_id', $myDogIds)
                ->where('season_id', $season->id)
                ->orderBy('points', 'desc')
                ->value('dog_id');

            if (!$hunterDogId) {
                return response()->json(['message' => 'No tienes ningún perro registrado en esta clasificación.'], 400);
            }
        }

        $victimDogId = $request->input('victim_dog_id');
        if ($victimDogId == $hunterDogId) {
            return response()->json(['message' => 'No puedes cazarte a ti mismo.'], 400);
        }

        // Check if the member (user) already has 3 active contracts across all their dogs
        $activeContractsCount = BountyContract::where('season_id', $season->id)
            ->whereIn('hunter_dog_id', $myDogIds)
            ->where('status', 'active')
            ->count();
        if ($activeContractsCount >= 3) {
            return response()->json(['message' => 'Has alcanzado el límite de 3 contratos activos simultáneos.'], 400);
        }

        // Check if the current hunter already has an active contract on this victim dog
        $alreadyHuntingThisVictim = BountyContract::where('season_id', $season->id)
            ->whereIn('hunter_dog_id', $myDogIds)
            ->where('victim_dog_id', $victimDogId)
            ->where('status', 'active')
            ->exists();
        if ($alreadyHuntingThisVictim) {
            return response()->json(['message' => 'Ya tienes un contrato activo sobre esta víctima.'], 400);
        }

        // Get owner IDs of the victim dog
        $victimOwnerIds = DB::table('dog_user')
            ->where('dog_id', $victimDogId)
            ->pluck('user_id')
            ->toArray();

        // Check if the victim member(s) have reached the limit of 3 active contracts targeting their dogs
        $activeContractsOnVictim = BountyContract::where('season_id', $season->id)
            ->where('status', 'active')
            ->whereIn('victim_dog_id', function ($query) use ($victimOwnerIds) {
                $query->select('dog_id')
                    ->from('dog_user')
                    ->whereIn('user_id', $victimOwnerIds);
            })
            ->count();
        if ($activeContractsOnVictim >= 3) {
            return response()->json(['message' => 'Esta víctima ya tiene el límite de 3 contratos activos sobre ella.'], 400);
        }

        // Get victim points
        $victimPoints = DogSeasonPoint::where('dog_id', $victimDogId)
            ->where('season_id', $season->id)
            ->value('points') ?? 0;

        if ($victimPoints < 20) {
            return response()->json(['message' => 'La víctima está protegida por tener menos de 20 puntos.'], 400);
        }

        // Validate that the requested cartel type is the one currently active deterministically for the victim
        $seed = date('YmdH');
        $cartelTypes = ['guante_blanco', 'asalto', 'hachazo'];
        $typeHash = md5($victimDogId . '_type_' . $seed);
        $typeIndex = hexdec(substr($typeHash, 0, 4)) % 3;
        $expectedType = $cartelTypes[$typeIndex];

        $type = $request->input('cartel_type');
        if ($type !== $expectedType) {
            return response()->json(['message' => 'El tipo de cartel seleccionado no está disponible para esta víctima en esta hora.'], 400);
        }

        // Calculate dynamic cost and bounty
        $cost = 0;
        $bounty = 0;

        if ($type === 'guante_blanco') {
            $cost = (int) ceil($victimPoints * 0.02);
            $bounty = (int) floor($victimPoints * 0.10);
        } elseif ($type === 'asalto') {
            $cost = (int) ceil($victimPoints * 0.08);
            $bounty = (int) floor($victimPoints * 0.20);
        } elseif ($type === 'hachazo') {
            $cost = (int) ceil($victimPoints * 0.16);
            $bounty = (int) floor($victimPoints * 0.30);
        }

        // Check hunter points
$hunterPointsRow = DogSeasonPoint::where('dog_id', $hunterDogId)
            ->where('season_id', $season->id)
            ->first();
        if (!$hunterPointsRow || $hunterPointsRow->points < $cost) {
            return response()->json(['message' => 'Puntos insuficientes para adquirir este contrato.'], 400);
        }

        // Choose 5 witnesses using attendance logic (including victim owners as valid validators)
        $victimOwnerIds = DB::table('dog_user')
            ->where('dog_id', $victimDogId)
            ->pluck('user_id')
            ->toArray();
        
        // Exclude hunter user and victim owners from witness selection
        $excludedUserIds = array_unique(array_merge([$user->id], $victimOwnerIds));

        // Query high attendance in the last 14 days for this club
        $attendances = DB::table('reservations')
            ->select('user_id', DB::raw('count(*) as count'))
            ->where('club_id', $club->id)
            ->where('status', 'attended')
            ->where('date', '>=', Carbon::now()->subDays(14))
            ->whereNotIn('user_id', $excludedUserIds)
            ->groupBy('user_id')
            ->orderBy('count', 'desc')
            ->pluck('user_id')
            ->toArray();

        // Get all active club users excluding the hunter/victim
        $allClubUsers = User::where('club_id', $club->id)
            ->whereNotIn('id', $excludedUserIds)
            ->pluck('id')
            ->toArray();

        // Separate hot pool (attended in last 14 days) and cold pool
        $hotPool = array_intersect($attendances, $allClubUsers);
        $coldPool = array_values(array_diff($allClubUsers, $hotPool));

        shuffle($hotPool);
        shuffle($coldPool);

        $selectedWitnesses = [];
        // Take from hot pool (up to 4)
        while (count($selectedWitnesses) < 4 && count($hotPool) > 0) {
            $selectedWitnesses[] = array_shift($hotPool);
        }
        // Take from cold pool to fill up to 5
        while (count($selectedWitnesses) < 5 && count($coldPool) > 0) {
            $selectedWitnesses[] = array_shift($coldPool);
        }

        $witness1 = $selectedWitnesses[0] ?? null;
        $witness2 = $selectedWitnesses[1] ?? null;
        $witness3 = $selectedWitnesses[2] ?? null;
        $witness4 = $selectedWitnesses[3] ?? null;
        $witness5 = $selectedWitnesses[4] ?? null;
        
        // Select random mission
        $misiones = [
            'Conseguir que la víctima acepte intercambiar los perros contigo para correr una secuencia corta de 3 obstáculos.',
            'Retar a la víctima a realizar una secuencia corta de obstáculos guiando de espaldas, y conseguir que acepte el desafío.',
            'Retar a la víctima a guiar a su perro usando únicamente comandos de voz (sin mover los brazos) en una secuencia de 3 saltos, y que acepte.',
            'Retar a la víctima a realizar un recorrido corto caminando despacio (sin correr en absoluto) mientras guía al perro, y conseguir que acepte.',
            'Retar a la víctima a realizar una salida de práctica y conseguir que su perro rompa el "quieto" de la salida antes de que ella dé la orden de salida.',
            'Conseguir que la víctima diga exactamente la palabra "¡Caracoles!" al proponerle realizar un ejercicio simple de agility.',
            'Conseguir que la víctima diga exactamente la frase "Madre mía" en voz alta al mostrarle un diseño de pista extremadamente complejo dibujado por ti.',
            'Conseguir que la víctima te sujete la correa de tu perro en la zona de espera mientras tú entras a colocar o recolocar un obstáculo en pista.',
            'Proponer a la víctima ver qué perro aguanta más tiempo tumbado y quieto y ganarle.',
            'Colocar un cono o poste del eslalon, retar a la víctima a ver qué perro da 3 vueltas completas alrededor de él más rápido y ganarle.',
            'Retar a la víctima a guiar a su perro en una secuencia recta de 3 saltos manteniendo sus manos metidas dentro de los bolsillos todo el tiempo, y conseguir que acepte.',
            'Retar a la víctima a realizar una secuencia de 3 saltos señalando únicamente con el dedo índice (sin mover el resto del brazo), y lograr que acepte.',
            'Retar a la víctima a mandar a su perro al túnel de espaldas (ella mirando hacia el lado opuesto del túnel) y conseguir que acepte intentarlo.',
            'Conseguir que la víctima te revele de forma natural cuál es el obstáculo favorito de su perro al charlar sobre vuestros entrenamientos.',
            'Conseguir que la víctima te convide con un premio o trozo de comida para dárselo a tu perro.',
            'Conseguir que la víctima te preste el mordedor o juguete motivador de su perro para jugar un momento con el tuyo.',
            'Conseguir que la víctima acepte hacerse una foto contigo y vuestros dos perros juntos.',
            'Proponer a la víctima que su perro y el tuyo permanezcan sentados uno al lado del otro tranquilamente durante 10 segundos sin interactuar, y lograrlo.',
            'Conseguir que la víctima diga exactamente la palabra "¡Imposible!" al proponerle realizar un recorrido.',
            'Conseguir que la víctima diga exactamente la palabra "¡Casi!" en voz alta tras cometer tú un fallo al guiar a tu perro.',
            'Conseguir que la víctima diga exactamente la frase "¡Qué bien!" en voz alta al felicitar a tu perro.',
            'Conseguir que la víctima acepte guiar a tu perro únicamente a través del eslalon.'
        ];
        $action = $misiones[array_rand($misiones)];

        $contract = DB::transaction(function () use ($club, $season, $hunterDogId, $victimDogId, $cost, $bounty, $type, $action, $witness1, $witness2, $witness3, $witness4, $witness5, $hunterPointsRow) {
            // Deduct points
            $hunterPointsRow->points -= $cost;
            $hunterPointsRow->save();

            PointHistory::create([
                'dog_id' => $hunterDogId,
                'season_id' => $season->id,
                'points' => -$cost,
                'category' => 'Compra de contrato: ' . $type,
            ]);

            return BountyContract::create([
                'club_id' => $club->id,
                'season_id' => $season->id,
                'hunter_dog_id' => $hunterDogId,
                'victim_dog_id' => $victimDogId,
                'action_description' => $action,
                'witness_1_id' => $witness1,
                'witness_2_id' => $witness2,
                'witness_3_id' => $witness3,
                'witness_4_id' => $witness4,
                'witness_5_id' => $witness5,
                'cost' => $cost,
                'bounty' => $bounty,
                'cartel_type' => $type,
                'status' => 'active',
                'expires_at' => Carbon::now()->addDays(30),
            ]);
        });

        return response()->json([
            'message' => 'Contrato adquirido correctamente de forma anónima.',
            'contract' => $contract
        ], 201);
    }

    /**
     * Get contracts related to the authenticated user.
     */
    public function getMyContracts(Request $request)
    {
        $user = $request->user();
        $season = GamificationSeason::where('club_id', $user->club_id)
            ->where('status', 'active')
            ->where('gamification_type', 'ranking')
            ->first();

        if (!$season) {
            return response()->json([
                'hunting' => [],
                'targeted' => [],
                'witnessing' => []
            ]);
        }

        $this->resolveExpiredContracts($season->id);

        $myDogIds = DB::table('dog_user')
            ->where('user_id', $user->id)
            ->pluck('dog_id')
            ->toArray();

        // 1. Contracts where user is Hunter (returns all details)
        $hunting = BountyContract::where('season_id', $season->id)
            ->whereIn('hunter_dog_id', $myDogIds)
            ->where('status', 'active')
            ->with(['victimDog:id,name', 'victimDog.users:id,name', 'witness1:id,name', 'witness2:id,name', 'witness3:id,name', 'witness4:id,name', 'witness5:id,name'])
            ->get()
            ->map(function ($c) {
                $witnesses = [];
                if ($c->witness1) $witnesses[] = $c->witness1;
                if ($c->witness2) $witnesses[] = $c->witness2;
                if ($c->witness3) $witnesses[] = $c->witness3;
                if ($c->witness4) $witnesses[] = $c->witness4;
                if ($c->witness5) $witnesses[] = $c->witness5;

                // Add victim owners as selectable validators
                if ($c->victimDog && $c->victimDog->users) {
                    foreach ($c->victimDog->users as $vOwner) {
                        $exists = false;
                        foreach ($witnesses as $w) {
                            if ($w->id == $vOwner->id) {
                                $exists = true;
                                break;
                            }
                        }
                        if (!$exists) {
                            $victimValidator = clone $vOwner;
                            $victimValidator->name = $vOwner->name . ' (Víctima)';
                            $witnesses[] = $victimValidator;
                        }
                    }
                }

                $c->witnesses = $witnesses;
                return $c;
            });

        // 2. Contracts targeting the user (Victim) - hides hunter & mission to keep suspense
        $targeted = BountyContract::where('season_id', $season->id)
            ->whereIn('victim_dog_id', $myDogIds)
            ->where('status', 'active')
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'victim_dog_id' => $c->victim_dog_id,
                'cartel_type' => $c->cartel_type,
                'bounty' => $c->bounty,
                'expires_at' => $c->expires_at
            ]);

        // 3. Contracts where user is selected for validation
        $witnessing = BountyContract::where('season_id', $season->id)
            ->where('status', 'active')
            ->where('witness_validated_id', $user->id)
            ->with(['hunterDog:id,name', 'victimDog:id,name'])
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'hunter_dog' => $c->hunterDog,
                'victim_dog' => $c->victimDog,
                'action_description' => $c->action_description,
                'is_selected_for_validation' => true,
                'expires_at' => $c->expires_at
            ]);

        return response()->json([
            'hunting' => $hunting,
            'targeted' => $targeted,
            'witnessing' => $witnessing
        ]);
    }

    /**
     * Hunter declares validation, picking which witness to notify.
     */
    public function confirmCaza(Request $request, $id)
    {
        $request->validate([
            'witness_id' => 'required|exists:users,id'
        ]);

        $contract = BountyContract::findOrFail($id);

        // Check if user has opted out of the Bounty Board
        $userSetting = BountyUserSetting::where('user_id', $request->user()->id)->first();
        if ($userSetting && !$userSetting->opt_in) {
            return response()->json(['message' => 'No puedes canjear contratos si has desactivado tu participación en el Tablón.'], 403);
        }

        $myDogIds = DB::table('dog_user')
            ->where('user_id', $request->user()->id)
            ->pluck('dog_id')
            ->toArray();

        if (!in_array($contract->hunter_dog_id, $myDogIds)) {
            return response()->json(['message' => 'No posees este contrato.'], 403);
        }

        if ($contract->status !== 'active') {
            return response()->json(['message' => 'El contrato ya no está activo.'], 400);
        }

        $witnessId = $request->input('witness_id');
        $victimOwnerIds = DB::table('dog_user')
            ->where('dog_id', $contract->victim_dog_id)
            ->pluck('user_id')
            ->toArray();
        $allowedValidators = array_filter([
            $contract->witness_1_id,
            $contract->witness_2_id,
            $contract->witness_3_id,
            $contract->witness_4_id,
            $contract->witness_5_id
        ]);
        $allowedValidators = array_unique(array_merge($allowedValidators, $victimOwnerIds));

        if (!in_array($witnessId, $allowedValidators)) {
            return response()->json(['message' => 'El usuario seleccionado no es testigo ni víctima válida de tu contrato.'], 400);
        }

        $contract->witness_validated_id = $witnessId;
        $contract->save();

        // Send push / DB notification to the witness
        $witnessUser = User::find($witnessId);
        $hunterName = $request->user()->name;
        $victimDogName = Dog::where('id', $contract->victim_dog_id)->value('name');

        $witnessUser->notify(new BountyWitnessValidationNotification($contract, $hunterName, $victimDogName));

        return response()->json(['message' => 'Validación solicitada al testigo correctamente.']);
    }

    /**
     * Witness validates (approves or rejects) the hunting.
     */
    public function validateCaza(Request $request, $id)
    {
        $request->validate([
            'approved' => 'required|boolean'
        ]);

        $contract = BountyContract::findOrFail($id);
        $user = $request->user();

        // Check if user has opted out of the Bounty Board
        $userSetting = BountyUserSetting::where('user_id', $user->id)->first();
        if ($userSetting && !$userSetting->opt_in) {
            return response()->json(['message' => 'No puedes validar ni canjear contratos si has desactivado tu participación en el Tablón.'], 403);
        }

        if ($contract->witness_validated_id !== $user->id) {
            return response()->json(['message' => 'No estás asignado para validar este contrato.'], 403);
        }

        if ($contract->status !== 'active') {
            return response()->json(['message' => 'Este contrato ya no está activo.'], 400);
        }

        $approved = $request->input('approved');

        DB::transaction(function () use ($contract, $approved, $user) {
            if ($approved) {
                // 1. Robar puntos a la víctima (reducir sin bajar de 0)
                $victimPoints = DogSeasonPoint::firstOrCreate(
                    ['dog_id' => $contract->victim_dog_id, 'season_id' => $contract->season_id],
                    ['points' => 0]
                );
                $victimLoss = min($victimPoints->points, $contract->bounty);
                $victimPoints->points -= $victimLoss;
                $victimPoints->save();

                // 2. Incrementar puntos al cazador con el botín pactado y guardado en la compra
                $hunterPoints = DogSeasonPoint::firstOrCreate(
                    ['dog_id' => $contract->hunter_dog_id, 'season_id' => $contract->season_id],
                    ['points' => 0]
                );
                $hunterPoints->points += $contract->bounty;
                $hunterPoints->save();

                // 3. Crear PointHistory logs
                PointHistory::create([
                    'dog_id' => $contract->victim_dog_id,
                    'season_id' => $contract->season_id,
                    'points' => -$victimLoss,
                    'category' => 'Cazado por cazador misterioso',
                ]);
                PointHistory::create([
                    'dog_id' => $contract->hunter_dog_id,
                    'season_id' => $contract->season_id,
                    'points' => $contract->bounty,
                    'category' => 'Contrato cobrado sobre ' . Dog::where('id', $contract->victim_dog_id)->value('name'),
                ]);

                $contract->status = 'claimed';
            } else {
                // 1. Quemar contrato
                $contract->status = 'burned';

                // 2. 20% de fianza va a la víctima
                $reward = (int) floor($contract->cost * 0.20);
                if ($reward > 0) {
                    $victimPoints = DogSeasonPoint::firstOrCreate(
                        ['dog_id' => $contract->victim_dog_id, 'season_id' => $contract->season_id],
                        ['points' => 0]
                    );
                    $victimPoints->points += $reward;
                    $victimPoints->save();

                    PointHistory::create([
                        'dog_id' => $contract->victim_dog_id,
                        'season_id' => $contract->season_id,
                        'points' => $reward,
                        'category' => 'Supervivencia de contrato (Fianza)',
                    ]);
                }
            }
            $contract->save();
        });

        return response()->json([
            'message' => $approved ? 'Contrato validado y puntos transferidos.' : 'Contrato denegado y fianza abonada a la víctima.'
        ]);
    }

    /**
     * Get feed history (claimed, burned, expired).
     */
    public function getFeed(Request $request)
    {
        $clubId = $request->user()->club_id;
        $season = GamificationSeason::where('club_id', $clubId)
            ->where('status', 'active')
            ->where('gamification_type', 'ranking')
            ->first();

        if (!$season) {
            return response()->json([]);
        }

        $this->resolveExpiredContracts($season->id);

        $contracts = BountyContract::where('season_id', $season->id)
            ->whereIn('status', ['claimed', 'burned', 'expired'])
            ->with(['hunterDog:id,name,photo_url', 'victimDog:id,name,photo_url', 'witnessValidated:id,name'])
            ->orderBy('updated_at', 'desc')
            ->take(20)
            ->get()
            ->map(function ($c) {
                $msg = "";
                if ($c->status === 'claimed') {
                    $msg = "¡Contrato cobrado! " . $c->hunterDog->name . " ha cazado a " . $c->victimDog->name . 
                           " haciendo que realice: \"" . $c->action_description . "\". Testigo: " . 
                           ($c->witnessValidated->name ?? 'Comunidad') . ". Botín: +" . $c->bounty . " puntos.";
                } elseif ($c->status === 'burned') {
                    $msg = $c->victimDog->name . " ha sobrevivido al contrato anónimo. El testigo reportó falsedad. El cazador misterioso ha perdido su fianza y se ha transferido un 20% (" . (int)floor($c->cost * 0.20) . " puntos) a la víctima.";
                } else { // expired
                    $msg = $c->victimDog->name . " ha sobrevivido al contrato anónimo de 30 días. La víctima recibe un 20% (" . (int)floor($c->cost * 0.20) . " puntos) del coste por supervivencia.";
                }
                return [
                    'id' => $c->id,
                    'status' => $c->status,
                    'message' => $msg,
                    'hunter_dog' => $c->hunterDog ? [
                        'id' => $c->hunterDog->id,
                        'name' => $c->hunterDog->name,
                        'photo_url' => $c->hunterDog->photo_url,
                    ] : null,
                    'victim_dog' => $c->victimDog ? [
                        'id' => $c->victimDog->id,
                        'name' => $c->victimDog->name,
                        'photo_url' => $c->victimDog->photo_url,
                    ] : null,
                    'witness_name' => $c->witnessValidated->name ?? 'Comunidad',
                    'action_description' => $c->action_description,
                    'bounty' => $c->bounty,
                    'cost' => $c->cost,
                    'survival_reward' => (int)floor($c->cost * 0.20),
                    'updated_at' => $c->updated_at
                ];
            });

        return response()->json($contracts);
    }

    /**
     * Update opt-in / opt-out privacy settings.
     */
    public function updateSettings(Request $request)
    {
        $request->validate([
            'opt_in' => 'required|boolean'
        ]);

        $optIn = $request->input('opt_in');
        $user = $request->user();

        $setting = BountyUserSetting::where('user_id', $user->id)->first();

        // Enforce 7-day cooldown between opt-in status changes
        if ($setting && $setting->opt_in !== $optIn) {
            $cooldownDays = 7;
            if ($setting->last_opt_change_at) {
                $nextAllowed = Carbon::parse($setting->last_opt_change_at)->addDays($cooldownDays);
                if (Carbon::now()->lessThan($nextAllowed)) {
                    $minutesRemaining = Carbon::now()->diffInMinutes($nextAllowed);
                    $hoursRemaining = ceil($minutesRemaining / 60);
                    if ($hoursRemaining > 24) {
                        $days = ceil($hoursRemaining / 24);
                        return response()->json([
                            'message' => "Debes esperar {$days} día(s) antes de cambiar tu participación en el Tablón."
                        ], 400);
                    } else {
                        return response()->json([
                            'message' => "Debes esperar {$hoursRemaining} hora(s) antes de cambiar tu participación en el Tablón."
                        ], 400);
                    }
                }
            }
        }

        $isChanging = !$setting || ($setting->opt_in !== $optIn);
        $updateData = ['opt_in' => $optIn];
        if ($isChanging) {
            $updateData['last_opt_change_at'] = Carbon::now();
        }

        $setting = BountyUserSetting::updateOrCreate(
            ['user_id' => $user->id],
            $updateData
        );

        if (!$optIn) {
            $myDogIds = DB::table('dog_user')
                ->where('user_id', $user->id)
                ->pluck('dog_id')
                ->toArray();

            if (!empty($myDogIds)) {
                // 1. Cancel contracts where user's dogs are victims (refund the hunters)
                $victimContracts = BountyContract::whereIn('victim_dog_id', $myDogIds)
                    ->where('status', 'active')
                    ->get();

                foreach ($victimContracts as $contract) {
                    DB::transaction(function () use ($contract) {
                        $contract->status = 'cancelled';
                        $contract->save();

                        // Refund cost to the hunter dog
                        $hunterPoints = DogSeasonPoint::firstOrCreate(
                            ['dog_id' => $contract->hunter_dog_id, 'season_id' => $contract->season_id],
                            ['points' => 0]
                        );
                        $hunterPoints->points += $contract->cost;
                        $hunterPoints->save();

                        PointHistory::create([
                            'dog_id' => $contract->hunter_dog_id,
                            'season_id' => $contract->season_id,
                            'points' => $contract->cost,
                            'category' => 'Reembolso por cancelación de contrato (Víctima desactivada)',
                        ]);
                    });
                }

                // 2. Cancel contracts where user's dogs are hunters (refund themselves)
                $hunterContracts = BountyContract::whereIn('hunter_dog_id', $myDogIds)
                    ->where('status', 'active')
                    ->get();

                foreach ($hunterContracts as $contract) {
                    DB::transaction(function () use ($contract) {
                        $contract->status = 'cancelled';
                        $contract->save();

                        // Refund cost to themselves
                        $hunterPoints = DogSeasonPoint::firstOrCreate(
                            ['dog_id' => $contract->hunter_dog_id, 'season_id' => $contract->season_id],
                            ['points' => 0]
                        );
                        $hunterPoints->points += $contract->cost;
                        $hunterPoints->save();

                        PointHistory::create([
                            'dog_id' => $contract->hunter_dog_id,
                            'season_id' => $contract->season_id,
                            'points' => $contract->cost,
                            'category' => 'Reembolso por cancelación de contrato (Auto-desactivado)',
                        ]);
                    });
                }
            }
        }

        return response()->json([
            'message' => 'Configuración de privacidad del Tablón guardada correctamente.',
            'settings' => $setting
        ]);
    }

    /**
     * Toggle bounty board at club level (for managers/admins).
     */
    public function toggleBountyBoard(Request $request)
    {
        $request->validate([
            'enabled' => 'required|boolean'
        ]);

        $user = $request->user();
        if (!in_array($user->role, ['manager', 'admin'])) {
            return response()->json(['message' => 'No tienes permisos para modificar este ajuste.'], 403);
        }

        $club = $user->club;
        $settings = $club->settings_ranking ?? [];
        $settings['bounty_board_enabled'] = $request->input('enabled');
        
        $club->settings_ranking = $settings;
        $club->save();

        return response()->json([
            'message' => $settings['bounty_board_enabled'] ? 'Tablón de Cazarrecompensas activado.' : 'Tablón de Cazarrecompensas desactivado.',
            'settings_ranking' => $settings
        ]);
    }

    /**
     * Reroll a contract's mission.
     */
    public function reroll(Request $request, $id)
    {
        $contract = BountyContract::findOrFail($id);
        $user = $request->user();

        // Check if user has opted out of the Bounty Board
        $userSetting = BountyUserSetting::where('user_id', $user->id)->first();
        if ($userSetting && !$userSetting->opt_in) {
            return response()->json(['message' => 'No puedes realizar acciones en el Tablón si has desactivado tu participación.'], 403);
        }
        
        $myDogIds = DB::table('dog_user')
            ->where('user_id', $user->id)
            ->pluck('dog_id')
            ->toArray();

        if (!in_array($contract->hunter_dog_id, $myDogIds)) {
            return response()->json(['message' => 'No posees este contrato.'], 403);
        }

        if ($contract->status !== 'active') {
            return response()->json(['message' => 'El contrato ya no está activo.'], 400);
        }

        if ($contract->rerolls_used >= 2) {
            return response()->json(['message' => 'Ya has agotado el límite de 2 re-rolls para este contrato.'], 400);
        }

        $misiones = [
            'Retar a la víctima a colocar el perro quieto frente al primer obstáculo de una secuencia y lograr que tu perro mantenga el quieto más segundos que el suyo antes de arrancar.',
            'Proponer a la víctima realizar una secuencia espejo (dos recorridos idénticos en paralelo) y ganarle en tiempo de carrera.',
            'Conseguir que la víctima acepte intercambiar los perros contigo para correr una secuencia corta de 3 obstáculos.',
            'Retar a la víctima a realizar una secuencia corta de obstáculos guiando de espaldas, y conseguir que acepte el desafío.',
            'Retar a la víctima a guiar a su perro usando únicamente comandos de voz (sin mover los brazos) en una secuencia de 3 saltos, y que acepte.',
            'Retar a la víctima a realizar un recorrido corto caminando despacio (sin correr en absoluto) mientras guía al perro, y conseguir que acepte.',
            'Retar a la víctima a realizar una salida de práctica y conseguir que su perro rompa el "quieto" de la salida antes de que ella dé la orden de salida.',
            'Conseguir que la víctima diga exactamente la palabra "¡Caracoles!" al proponerle realizar un ejercicio simple de agility.',
            'Conseguir que la víctima diga exactamente la frase "Madre mía" en voz alta al mostrarle un diseño de pista extremadamente complejo dibujado por ti.',
            'Conseguir que la víctima te sujete la correa de tu perro en la zona de espera mientras tú entras a colocar o recolocar un obstáculo en pista.',
            'Proponer a la víctima ver qué perro aguanta más tiempo tumbado y quieto en la zona de descanso del club (fuera de pista) y ganarle. (No requiere velocidad, apto para novatos).',
            'Colocar un cono o poste del eslalon, retar a la víctima a ver qué perro da 3 vueltas completas alrededor de él más rápido y ganarle. (Un reto de control corto y divertido).',
            'Retar a la víctima a guiar a su perro en una secuencia recta de 3 saltos manteniendo sus manos metidas dentro de los bolsillos todo el tiempo, y conseguir que acepte.',
            'Retar a la víctima a realizar una secuencia de 3 saltos señalando únicamente con el dedo índice (sin mover el resto del brazo), y lograr que acepte.',
            'Retar a la víctima a mandar a su perro al túnel de espaldas (ella mirando hacia el lado opuesto del túnel) y conseguir que acepte intentarlo.',
            'Conseguir que la víctima te revele de forma natural cuál es el obstáculo favorito de su perro al charlar sobre vuestros entrenamientos.',
            'Conseguir que la víctima te convide con un premio o trozo de comida de su riñonera de premios para dárselo a tu perro.',
            'Conseguir que la víctima te preste el mordedor o juguete motivador de su perro para jugar un momento con el tuyo en la zona de descanso.',
            'Conseguir que la víctima acepte hacerse una foto contigo y vuestros dos perros juntos después de entrenar en el club.',
            'Proponer a la víctima que su perro y el tuyo permanezcan sentados uno al lado del otro tranquilamente durante 10 segundos sin interactuar, y lograrlo.',
            'Conseguir que la víctima diga exactamente la palabra "¡Imposible!" en voz alta al proponerle realizar un recorrido largo seguidos y sin descansar.',
            'Conseguir que la víctima diga exactamente la palabra "¡Casi!" en voz alta tras cometer tú un fallo voluntario y muy obvio al guiar a tu perro.',
            'Conseguir que la víctima diga exactamente la frase "¡Qué bien!" en voz alta al felicitar a tu perro tras finalizar una carrera.',
            'Conseguir que la víctima acepte guiar a tu perro únicamente a través del eslalon mientras tú guías al suyo en ese mismo obstáculo.'
        ];

        // Filter out current mission to avoid getting the same one
        $availableMissions = array_filter($misiones, fn($m) => $m !== $contract->action_description);
        $newMission = $availableMissions[array_rand($availableMissions)];

        $contract->action_description = $newMission;
        $contract->rerolls_used += 1;
        $contract->save();

        return response()->json([
            'message' => 'Misión cambiada correctamente.',
            'action_description' => $newMission,
            'rerolls_used' => $contract->rerolls_used
        ]);
    }
}
