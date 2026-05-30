<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\Dog;
use App\Models\GamificationSeason;
use App\Models\DogSeasonPoint;
use App\Models\BountyContract;
use App\Models\BountyUserSetting;
use App\Models\User;
use App\Models\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class BountyBoardTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $season;

    protected function setUp(): void
    {
        parent::setUp();
        $this->club = Club::create([
            'name' => 'Asturias Agility',
            'subdomain' => 'asturias',
            'slug' => 'asturias',
            'db_connection' => 'sqlite',
            'settings_ranking' => ['bounty_board_enabled' => true]
        ]);

        $this->season = GamificationSeason::create([
            'club_id' => $this->club->id,
            'name' => 'Temporada de Test Bounty',
            'gamification_type' => 'ranking',
            'start_date' => now()->toDateString(),
            'status' => 'active'
        ]);
    }

    protected function createUser($attributes = [])
    {
        return User::factory()->create(array_merge(['club_id' => $this->club->id, 'role' => 'member'], $attributes));
    }

    protected function createDog($user, $points = 0)
    {
        $dog = Dog::factory()->create(['user_id' => $user->id, 'club_id' => $this->club->id]);
        $dog->users()->attach($user->id, ['is_primary_owner' => true]);

        if ($points > 0) {
            DogSeasonPoint::create([
                'dog_id' => $dog->id,
                'season_id' => $this->season->id,
                'points' => $points,
            ]);
        }

        return $dog;
    }

    public function test_admin_can_toggle_bounty_board()
    {
        $admin = $this->createUser(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson('/api/admin/bounty/toggle', ['enabled' => false]);
        $response->assertStatus(200);
        $this->assertFalse($this->club->fresh()->settings_ranking['bounty_board_enabled']);

        $response = $this->actingAs($admin)->postJson('/api/admin/bounty/toggle', ['enabled' => true]);
        $response->assertStatus(200);
        $this->assertTrue($this->club->fresh()->settings_ranking['bounty_board_enabled']);
    }

    public function test_non_admin_cannot_toggle_bounty_board()
    {
        $member = $this->createUser(['role' => 'member']);

        $response = $this->actingAs($member)->postJson('/api/admin/bounty/toggle', ['enabled' => false]);
        $response->assertStatus(403);
    }

    public function test_get_posters_returns_eligible_dogs_with_correct_calculations()
    {
        $hunterUser = $this->createUser();
        $hunterDog = $this->createDog($hunterUser, 50);

        $victimUser1 = $this->createUser();
        $victimDog1 = $this->createDog($victimUser1, 100); // Eligible (> 20 pts)

        $victimUser2 = $this->createUser();
        $victimDog2 = $this->createDog($victimUser2, 15); // Protected (< 20 pts)

        $victimUser3 = $this->createUser();
        $victimDog3 = $this->createDog($victimUser3, 80); // Opted out of board
        BountyUserSetting::create(['user_id' => $victimUser3->id, 'opt_in' => false]);

        $response = $this->actingAs($hunterUser)->getJson('/api/bounty/posters');
        $response->assertStatus(200);

        $posters = $response->json('posters');
        $this->assertCount(1, $posters);
        $this->assertEquals($victimDog1->id, $posters[0]['dog_id']);
        $this->assertContains($posters[0]['active_cartel_type'], ['guante_blanco', 'asalto', 'hachazo']);

        // Check Rounding:
        // Guante Blanco cost: ceil(100 * 0.02) = 2, bounty: floor(100 * 0.10) = 10
        // Asalto cost: ceil(100 * 0.08) = 8, bounty: floor(100 * 0.20) = 20
        // Hachazo cost: ceil(100 * 0.16) = 16, bounty: floor(100 * 0.30) = 30
        $this->assertEquals(2, $posters[0]['carteles']['guante_blanco']['cost']);
        $this->assertEquals(10, $posters[0]['carteles']['guante_blanco']['bounty']);
        $this->assertEquals(8, $posters[0]['carteles']['asalto']['cost']);
        $this->assertEquals(20, $posters[0]['carteles']['asalto']['bounty']);
        $this->assertEquals(16, $posters[0]['carteles']['hachazo']['cost']);
        $this->assertEquals(30, $posters[0]['carteles']['hachazo']['bounty']);
    }

    public function test_can_buy_contract_and_witnesses_are_assigned()
    {
        $hunterUser = $this->createUser();
        $hunterDog = $this->createDog($hunterUser, 50);

        $victimUser = $this->createUser();
        $victimDog = $this->createDog($victimUser, 100);

        // Create 5 potential witnesses in the club
        $w1 = $this->createUser();
        $w2 = $this->createUser();
        $w3 = $this->createUser();
        $w4 = $this->createUser();
        $w5 = $this->createUser();

        // Fetch posters first to see which cartel type is active for the victim
        $postersResponse = $this->actingAs($hunterUser)->getJson('/api/bounty/posters');
        $postersResponse->assertStatus(200);
        $posters = $postersResponse->json('posters');
        $activeType = $posters[0]['active_cartel_type'];

        // Get expected cost and bounty for calculations
        $expectedCost = $posters[0]['carteles'][$activeType]['cost'];
        $expectedBounty = $posters[0]['carteles'][$activeType]['bounty'];

        // Check initial points
        $this->assertEquals(50, DogSeasonPoint::where('dog_id', $hunterDog->id)->value('points'));

        $response = $this->actingAs($hunterUser)->postJson('/api/bounty/contracts', [
            'victim_dog_id' => $victimDog->id,
            'cartel_type' => $activeType,
            'hunter_dog_id' => $hunterDog->id
        ]);

        $response->assertStatus(201);
        
        $this->assertEquals(50 - $expectedCost, DogSeasonPoint::where('dog_id', $hunterDog->id)->value('points'));

        $contract = BountyContract::first();
        $this->assertNotNull($contract);
        $this->assertEquals($hunterDog->id, $contract->hunter_dog_id);
        $this->assertEquals($victimDog->id, $contract->victim_dog_id);
        $this->assertEquals($expectedCost, $contract->cost);
        $this->assertEquals($expectedBounty, $contract->bounty);
        $this->assertEquals('active', $contract->status);

        // Check that witnesses are set
        $this->assertNotNull($contract->witness_1_id);
        $this->assertNotNull($contract->witness_2_id);
        $this->assertNotNull($contract->witness_3_id);
        $this->assertNotNull($contract->witness_4_id);
        $this->assertNotNull($contract->witness_5_id);
    }

    public function test_validate_caza_approved_transfers_points()
    {
        $hunterUser = $this->createUser();
        $hunterDog = $this->createDog($hunterUser, 50);

        $victimUser = $this->createUser();
        $victimDog = $this->createDog($victimUser, 100);

        $witness = $this->createUser();

        $contract = BountyContract::create([
            'club_id' => $this->club->id,
            'season_id' => $this->season->id,
            'hunter_dog_id' => $hunterDog->id,
            'victim_dog_id' => $victimDog->id,
            'action_description' => 'Test Mission',
            'witness_1_id' => $witness->id,
            'cost' => 8,
            'bounty' => 20,
            'cartel_type' => 'asalto',
            'status' => 'active',
            'expires_at' => Carbon::now()->addDays(7),
        ]);

        // Hunter confirms with the witness
        $response = $this->actingAs($hunterUser)->postJson("/api/bounty/contracts/{$contract->id}/confirm", [
            'witness_id' => $witness->id
        ]);
        $response->assertStatus(200);

        // Witness approves
        $response = $this->actingAs($witness)->postJson("/api/bounty/contracts/{$contract->id}/validate", [
            'approved' => true
        ]);
        $response->assertStatus(200);

        $this->assertEquals('claimed', $contract->fresh()->status);
        // Victim lost 20 points (100 - 20 = 80)
        $this->assertEquals(80, DogSeasonPoint::where('dog_id', $victimDog->id)->value('points'));
        // Hunter gained 20 points (50 + 20 = 70)
        $this->assertEquals(70, DogSeasonPoint::where('dog_id', $hunterDog->id)->value('points'));
    }

    public function test_validate_caza_rejected_gives_fianza_to_victim()
    {
        $hunterUser = $this->createUser();
        $hunterDog = $this->createDog($hunterUser, 50);

        $victimUser = $this->createUser();
        $victimDog = $this->createDog($victimUser, 100);

        $witness = $this->createUser();

        $contract = BountyContract::create([
            'club_id' => $this->club->id,
            'season_id' => $this->season->id,
            'hunter_dog_id' => $hunterDog->id,
            'victim_dog_id' => $victimDog->id,
            'action_description' => 'Test Mission',
            'witness_1_id' => $witness->id,
            'cost' => 8,
            'bounty' => 20,
            'cartel_type' => 'asalto',
            'status' => 'active',
            'expires_at' => Carbon::now()->addDays(7),
            'witness_validated_id' => $witness->id
        ]);

        // Witness rejects
        $response = $this->actingAs($witness)->postJson("/api/bounty/contracts/{$contract->id}/validate", [
            'approved' => false
        ]);
        $response->assertStatus(200);

        $this->assertEquals('burned', $contract->fresh()->status);
        // Victim gets 20% of cost (20% of 8 = 1.6 floor = 1)
        // 100 + 1 = 101 points
        $this->assertEquals(101, DogSeasonPoint::where('dog_id', $victimDog->id)->value('points'));
        // Hunter keeps their points minus the cost already deducted at purchase (50)
        $this->assertEquals(50, DogSeasonPoint::where('dog_id', $hunterDog->id)->value('points'));
    }

    public function test_validate_caza_when_victim_points_decreased_awards_full_bounty_but_caps_victim_loss()
    {
        $hunterUser = $this->createUser();
        $hunterDog = $this->createDog($hunterUser, 50);

        $victimUser = $this->createUser();
        $victimDog = $this->createDog($victimUser, 100);

        $witness = $this->createUser();

        $contract = BountyContract::create([
            'club_id' => $this->club->id,
            'season_id' => $this->season->id,
            'hunter_dog_id' => $hunterDog->id,
            'victim_dog_id' => $victimDog->id,
            'action_description' => 'Test Mission',
            'witness_1_id' => $witness->id,
            'cost' => 8,
            'bounty' => 20,
            'cartel_type' => 'asalto',
            'status' => 'active',
            'expires_at' => Carbon::now()->addDays(7),
            'witness_validated_id' => $witness->id
        ]);

        // Simulate victim dog points decreasing to 10 points between purchase and validation
        DogSeasonPoint::where('dog_id', $victimDog->id)
            ->where('season_id', $this->season->id)
            ->update(['points' => 10]);

        // Witness approves the hunt
        $response = $this->actingAs($witness)->postJson("/api/bounty/contracts/{$contract->id}/validate", [
            'approved' => true
        ]);
        $response->assertStatus(200);

        $this->assertEquals('claimed', $contract->fresh()->status);
        
        // Victim points should only decrease by 10 (capped at 0), not by 20.
        $this->assertEquals(0, DogSeasonPoint::where('dog_id', $victimDog->id)->value('points'));
        
        // Hunter dog should still receive the FULL promised bounty of 20 points.
        // 50 initial + 20 bounty = 70 points
        $this->assertEquals(70, DogSeasonPoint::where('dog_id', $hunterDog->id)->value('points'));
    }


    public function test_member_cannot_buy_more_than_3_active_contracts()
    {
        $hunterUser = $this->createUser();
        $hunterDog = $this->createDog($hunterUser, 200);

        // Create 4 victims
        $victimDog1 = $this->createDog($this->createUser(), 100);
        $victimDog2 = $this->createDog($this->createUser(), 100);
        $victimDog3 = $this->createDog($this->createUser(), 100);
        $victimDog4 = $this->createDog($this->createUser(), 100);

        // Determine which types are active for each victim deterministically
        $postersResponse = $this->actingAs($hunterUser)->getJson('/api/bounty/posters');
        $posters = collect($postersResponse->json('posters'))->keyBy('dog_id');

        // Buy 3 contracts
        foreach ([$victimDog1, $victimDog2, $victimDog3] as $victim) {
            $activeType = $posters[$victim->id]['active_cartel_type'];
            $response = $this->actingAs($hunterUser)->postJson('/api/bounty/contracts', [
                'victim_dog_id' => $victim->id,
                'cartel_type' => $activeType,
                'hunter_dog_id' => $hunterDog->id
            ]);
            $response->assertStatus(201);
        }

        // Try to buy a 4th contract - should fail
        $activeType4 = $posters[$victimDog4->id]['active_cartel_type'];
        $response = $this->actingAs($hunterUser)->postJson('/api/bounty/contracts', [
            'victim_dog_id' => $victimDog4->id,
            'cartel_type' => $activeType4,
            'hunter_dog_id' => $hunterDog->id
        ]);
        
        $response->assertStatus(400);
        $response->assertJsonFragment(['message' => 'Has alcanzado el límite de 3 contratos activos simultáneos.']);
    }

    public function test_member_can_reroll_contract_mission_up_to_2_times()
    {
        $hunterUser = $this->createUser();
        $hunterDog = $this->createDog($hunterUser, 50);
        $victimDog = $this->createDog($this->createUser(), 100);

        $contract = BountyContract::create([
            'club_id' => $this->club->id,
            'season_id' => $this->season->id,
            'hunter_dog_id' => $hunterDog->id,
            'victim_dog_id' => $victimDog->id,
            'action_description' => 'Misión Inicial',
            'cost' => 8,
            'bounty' => 20,
            'cartel_type' => 'asalto',
            'status' => 'active',
            'expires_at' => Carbon::now()->addDays(30),
        ]);

        // 1st Reroll - Should succeed
        $response = $this->actingAs($hunterUser)->postJson("/api/bounty/contracts/{$contract->id}/reroll");
        $response->assertStatus(200);
        $this->assertEquals(1, $contract->fresh()->rerolls_used);
        $this->assertNotEquals('Misión Inicial', $contract->fresh()->action_description);

        $firstRerollMission = $contract->fresh()->action_description;

        // 2nd Reroll - Should succeed
        $response = $this->actingAs($hunterUser)->postJson("/api/bounty/contracts/{$contract->id}/reroll");
        $response->assertStatus(200);
        $this->assertEquals(2, $contract->fresh()->rerolls_used);
        $this->assertNotEquals($firstRerollMission, $contract->fresh()->action_description);

        // 3rd Reroll - Should fail
        $response = $this->actingAs($hunterUser)->postJson("/api/bounty/contracts/{$contract->id}/reroll");
        $response->assertStatus(400);
        $response->assertJsonFragment(['message' => 'Ya has agotado el límite de 2 re-rolls para este contrato.']);
    }

    public function test_victim_can_have_up_to_3_active_contracts_but_not_more_and_same_hunter_cannot_double_target()
    {
        $victimUser = $this->createUser();
        $victimDog = $this->createDog($victimUser, 100);

        $hunter1 = $this->createUser();
        $hunterDog1 = $this->createDog($hunter1, 100);

        $hunter2 = $this->createUser();
        $hunterDog2 = $this->createDog($hunter2, 100);

        $hunter3 = $this->createUser();
        $hunterDog3 = $this->createDog($hunter3, 100);

        $hunter4 = $this->createUser();
        $hunterDog4 = $this->createDog($hunter4, 100);

        // Fetch posters for each hunter to see the active type
        $postersResponse1 = $this->actingAs($hunter1)->getJson('/api/bounty/posters');
        $posters1 = collect($postersResponse1->json('posters'))->keyBy('dog_id');
        $activeType1 = $posters1[$victimDog->id]['active_cartel_type'] ?? 'asalto';

        $postersResponse2 = $this->actingAs($hunter2)->getJson('/api/bounty/posters');
        $posters2 = collect($postersResponse2->json('posters'))->keyBy('dog_id');
        $activeType2 = $posters2[$victimDog->id]['active_cartel_type'] ?? 'asalto';

        $postersResponse3 = $this->actingAs($hunter3)->getJson('/api/bounty/posters');
        $posters3 = collect($postersResponse3->json('posters'))->keyBy('dog_id');
        $activeType3 = $posters3[$victimDog->id]['active_cartel_type'] ?? 'asalto';

        $postersResponse4 = $this->actingAs($hunter4)->getJson('/api/bounty/posters');
        $posters4 = collect($postersResponse4->json('posters'))->keyBy('dog_id');
        $activeType4 = $posters4[$victimDog->id]['active_cartel_type'] ?? 'asalto';

        // Hunter 1 buys contract on victim - Should succeed (1 active contract)
        $response = $this->actingAs($hunter1)->postJson('/api/bounty/contracts', [
            'victim_dog_id' => $victimDog->id,
            'cartel_type' => $activeType1,
            'hunter_dog_id' => $hunterDog1->id
        ]);
        $response->assertStatus(201);

        // Hunter 1 tries to buy ANOTHER contract on the same victim - Should fail (already hunting)
        $response = $this->actingAs($hunter1)->postJson('/api/bounty/contracts', [
            'victim_dog_id' => $victimDog->id,
            'cartel_type' => $activeType1,
            'hunter_dog_id' => $hunterDog1->id
        ]);
        $response->assertStatus(400);
        $response->assertJsonFragment(['message' => 'Ya tienes un contrato activo sobre esta víctima.']);

        // Hunter 2 buys contract on victim - Should succeed (2 active contracts)
        $response = $this->actingAs($hunter2)->postJson('/api/bounty/contracts', [
            'victim_dog_id' => $victimDog->id,
            'cartel_type' => $activeType2,
            'hunter_dog_id' => $hunterDog2->id
        ]);
        $response->assertStatus(201);

        // Hunter 3 buys contract on victim - Should succeed (3 active contracts)
        $response = $this->actingAs($hunter3)->postJson('/api/bounty/contracts', [
            'victim_dog_id' => $victimDog->id,
            'cartel_type' => $activeType3,
            'hunter_dog_id' => $hunterDog3->id
        ]);
        $response->assertStatus(201);

        // Hunter 4 tries to buy contract on victim - Should fail (limit of 3 reached)
        $response = $this->actingAs($hunter4)->postJson('/api/bounty/contracts', [
            'victim_dog_id' => $victimDog->id,
            'cartel_type' => $activeType4,
            'hunter_dog_id' => $hunterDog4->id
        ]);
        $response->assertStatus(400);
        $response->assertJsonFragment(['message' => 'Esta víctima ya tiene el límite de 3 contratos activos sobre ella.']);
    }

    public function test_opted_out_user_cannot_interact_but_contracts_are_preserved()
    {
        $user = $this->createUser();
        $dog = $this->createDog($user, 50);

        $victim = $this->createUser();
        $victimDog = $this->createDog($victim, 100);

        // 1. Opt out
        BountyUserSetting::create(['user_id' => $user->id, 'opt_in' => false]);

        // 2. Try to buy contract - Should fail
        $response = $this->actingAs($user)->postJson('/api/bounty/contracts', [
            'victim_dog_id' => $victimDog->id,
            'cartel_type' => 'asalto',
            'hunter_dog_id' => $dog->id
        ]);
        $response->assertStatus(403);
        $response->assertJsonFragment(['message' => 'No puedes aceptar contratos si has desactivado tu participación en el Tablón.']);

        // 3. Setup active contract as hunter
        BountyUserSetting::where('user_id', $user->id)->update(['opt_in' => true]); // Temporarily opt-in
        
        $contract = BountyContract::create([
            'club_id' => $this->club->id,
            'season_id' => $this->season->id,
            'hunter_dog_id' => $dog->id,
            'victim_dog_id' => $victimDog->id,
            'action_description' => 'Test Mission',
            'witness_1_id' => $victim->id,
            'cost' => 8,
            'bounty' => 20,
            'cartel_type' => 'asalto',
            'status' => 'active',
            'expires_at' => Carbon::now()->addDays(30),
        ]);

        // 4. Opt out again and check that the contract is cancelled and refunded
        $response = $this->actingAs($user)->postJson('/api/bounty/settings', ['opt_in' => false]);
        $response->assertStatus(200);

        $this->assertEquals(1, BountyContract::where('id', $contract->id)->count());
        $this->assertEquals('cancelled', $contract->fresh()->status);
        $this->assertEquals(58, DogSeasonPoint::where('dog_id', $dog->id)->value('points'));
        $this->assertTrue(\App\Models\PointHistory::where([
            'dog_id' => $dog->id,
            'points' => 8,
            'category' => 'Reembolso por cancelación de contrato (Auto-desactivado)'
        ])->exists());
    }

    public function test_opt_out_cancels_victim_contracts_and_refunds_hunter()
    {
        $hunterUser = $this->createUser();
        $hunterDog = $this->createDog($hunterUser, 50);

        $victimUser = $this->createUser();
        $victimDog = $this->createDog($victimUser, 100);

        $contract = BountyContract::create([
            'club_id' => $this->club->id,
            'season_id' => $this->season->id,
            'hunter_dog_id' => $hunterDog->id,
            'victim_dog_id' => $victimDog->id,
            'action_description' => 'Test Mission',
            'witness_1_id' => $hunterUser->id,
            'cost' => 8,
            'bounty' => 20,
            'cartel_type' => 'asalto',
            'status' => 'active',
            'expires_at' => Carbon::now()->addDays(30),
        ]);

        // Victim opts out
        $response = $this->actingAs($victimUser)->postJson('/api/bounty/settings', ['opt_in' => false]);
        $response->assertStatus(200);

        // Contract should be cancelled
        $this->assertEquals('cancelled', $contract->fresh()->status);

        // Hunter should be refunded the cost (50 + 8 = 58)
        $this->assertEquals(58, DogSeasonPoint::where('dog_id', $hunterDog->id)->value('points'));

        // Point history record should exist
        $this->assertTrue(\App\Models\PointHistory::where([
            'dog_id' => $hunterDog->id,
            'points' => 8,
            'category' => 'Reembolso por cancelación de contrato (Víctima desactivada)'
        ])->exists());
    }

    public function test_opt_in_cooldown_enforced()
    {
        $user = $this->createUser();

        // 1. Initial change: user opts out. Should succeed and set last_opt_change_at.
        $response = $this->actingAs($user)->postJson('/api/bounty/settings', ['opt_in' => false]);
        $response->assertStatus(200);

        $setting = BountyUserSetting::where('user_id', $user->id)->first();
        $this->assertNotNull($setting->last_opt_change_at);
        $lastChange = $setting->last_opt_change_at;

        // 2. Second change: try to opt back in immediately. Should fail with 400.
        $response = $this->actingAs($user)->postJson('/api/bounty/settings', ['opt_in' => true]);
        $response->assertStatus(400);
        $response->assertJsonStructure(['message']);

        // 3. Travel in time: simulate 8 days passing.
        Carbon::setTestNow(Carbon::now()->addDays(8));

        // 4. Third change: opt back in after cooldown. Should succeed.
        $response = $this->actingAs($user)->postJson('/api/bounty/settings', ['opt_in' => true]);
        $response->assertStatus(200);
        
        $this->assertTrue(BountyUserSetting::where('user_id', $user->id)->value('opt_in'));
        $this->assertNotEquals($lastChange->toDateTimeString(), BountyUserSetting::where('user_id', $user->id)->value('last_opt_change_at')->toDateTimeString());

        // Reset time
        Carbon::setTestNow();
    }

    public function test_witness_cannot_see_contract_until_selected_for_validation()
    {
        $hunterUser = $this->createUser();
        $hunterDog = $this->createDog($hunterUser, 50);

        $victimUser = $this->createUser();
        $victimDog = $this->createDog($victimUser, 100);

        $witness = $this->createUser();

        // 1. Create contract with $witness as one of the potential witnesses
        $contract = BountyContract::create([
            'club_id' => $this->club->id,
            'season_id' => $this->season->id,
            'hunter_dog_id' => $hunterDog->id,
            'victim_dog_id' => $victimDog->id,
            'action_description' => 'Test Mission',
            'witness_1_id' => $witness->id,
            'cost' => 8,
            'bounty' => 20,
            'cartel_type' => 'asalto',
            'status' => 'active',
            'expires_at' => Carbon::now()->addDays(30),
        ]);

        // 2. Fetch my-contracts as the witness - witnessing list should be empty
        $response = $this->actingAs($witness)->getJson('/api/bounty/my-contracts');
        $response->assertStatus(200);
        $this->assertCount(0, $response->json('witnessing'));

        // 3. Hunter confirms and selects the witness
        $response2 = $this->actingAs($hunterUser)->postJson("/api/bounty/contracts/{$contract->id}/confirm", [
            'witness_id' => $witness->id
        ]);
        $response2->assertStatus(200);

        // 4. Fetch my-contracts as the witness again - contract should now appear under witnessing
        $response3 = $this->actingAs($witness)->getJson('/api/bounty/my-contracts');
        $response3->assertStatus(200);
        $this->assertCount(1, $response3->json('witnessing'));
        $this->assertEquals($contract->id, $response3->json('witnessing.0.id'));
        $this->assertTrue($response3->json('witnessing.0.is_selected_for_validation'));
    }
}
