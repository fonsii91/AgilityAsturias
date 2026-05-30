<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Club;
use App\Models\User;
use App\Models\Dog;
use App\Models\GamificationSeason;
use App\Models\DogSeasonPoint;
use App\Models\BountyContract;
use Carbon\Carbon;

class BountyBoardFeedSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Ensure club and active season exist
        $club = Club::firstOrCreate(['id' => 1], [
            'name' => 'Asturias Agility',
            'subdomain' => 'asturias',
            'slug' => 'asturias',
            'settings_ranking' => ['bounty_board_enabled' => true]
        ]);

        // Ensure club has bounty_board_enabled in settings_ranking
        $settings = $club->settings_ranking ?? [];
        $settings['bounty_board_enabled'] = true;
        $club->settings_ranking = $settings;
        $club->save();

        $season = GamificationSeason::firstOrCreate(
            ['club_id' => $club->id, 'gamification_type' => 'ranking', 'status' => 'active'],
            [
                'name' => 'Temporada del Tablón (Activa)',
                'start_date' => Carbon::now()->subMonth()->toDateString(),
            ]
        );

        // 2. Ensure default users and dogs are loaded
        if (User::where('club_id', $club->id)->count() < 4) {
            $this->call(UserAndDogSeeder::class);
        }

        $dogs = Dog::where('club_id', $club->id)->take(4)->get();
        if ($dogs->count() < 4) {
            $this->command->error("No hay suficientes perros para sembrar los contratos del tablón.");
            return;
        }

        // 3. Establish points for the dogs in the active season
        $pointsConfig = [100, 80, 50, 30];
        foreach ($dogs as $idx => $dog) {
            $pts = $pointsConfig[$idx];
            DogSeasonPoint::updateOrCreate(
                ['dog_id' => $dog->id, 'season_id' => $season->id],
                ['points' => $pts]
            );
            $dog->update(['points' => $pts]);
        }

        // Get a member to validate as a witness
        $witnessUser = User::where('club_id', $club->id)
            ->where('role', 'member')
            ->first();

        // 4. Delete existing contracts to avoid duplicates in feed testing
        BountyContract::where('season_id', $season->id)->delete();

        // 5. Seed 'claimed' (Cazado) contract
        BountyContract::create([
            'club_id' => $club->id,
            'season_id' => $season->id,
            'hunter_dog_id' => $dogs[0]->id,
            'victim_dog_id' => $dogs[1]->id,
            'action_description' => 'Conseguir que la víctima diga exactamente la palabra "¡Caracoles!" al proponerle realizar un ejercicio simple de agility.',
            'witness_1_id' => $witnessUser->id,
            'cost' => 7, // ceil(80 * 0.08)
            'bounty' => 16, // floor(80 * 0.20)
            'cartel_type' => 'asalto',
            'status' => 'claimed',
            'witness_validated_id' => $witnessUser->id,
            'expires_at' => Carbon::now()->subDays(2),
            'created_at' => Carbon::now()->subDays(5),
            'updated_at' => Carbon::now()->subDays(2)
        ]);

        // 6. Seed 'burned' (Fallido) contract
        BountyContract::create([
            'club_id' => $club->id,
            'season_id' => $season->id,
            'hunter_dog_id' => $dogs[2]->id,
            'victim_dog_id' => $dogs[3]->id,
            'action_description' => 'Conseguir que la víctima te preste el mordedor o juguete motivador de su perro para jugar un momento con el tuyo.',
            'witness_1_id' => $witnessUser->id,
            'cost' => 5, // ceil(30 * 0.16)
            'bounty' => 9, // floor(30 * 0.30)
            'cartel_type' => 'hachazo',
            'status' => 'burned',
            'witness_validated_id' => $witnessUser->id,
            'expires_at' => Carbon::now()->subDays(3),
            'created_at' => Carbon::now()->subDays(6),
            'updated_at' => Carbon::now()->subDays(3)
        ]);

        // 7. Seed 'expired' (Expirado) contract
        BountyContract::create([
            'club_id' => $club->id,
            'season_id' => $season->id,
            'hunter_dog_id' => $dogs[1]->id,
            'victim_dog_id' => $dogs[2]->id,
            'action_description' => 'Retar a la víctima a realizar un recorrido corto caminando despacio (sin correr en absoluto) mientras guía al perro, y conseguir que acepte.',
            'witness_1_id' => $witnessUser->id,
            'cost' => 1, // ceil(50 * 0.02)
            'bounty' => 5, // floor(50 * 0.10)
            'cartel_type' => 'guante_blanco',
            'status' => 'expired',
            'expires_at' => Carbon::now()->subDays(1),
            'created_at' => Carbon::now()->subDays(31),
            'updated_at' => Carbon::now()->subDays(1)
        ]);

        $this->command->info("¡Seeder de contratos del Tablón (Bounty Board Feed) ejecutado con éxito!");
    }
}
