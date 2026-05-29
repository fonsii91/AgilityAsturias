<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\Dog;
use App\Models\User;
use App\Models\GamificationSeason;
use App\Models\UserStickerProfile;
use App\Models\UserSticker;
use App\Models\StickerTrade;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StickersTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $season;

    protected function setUp(): void
    {
        parent::setUp();

        $this->club = Club::create([
            'name' => 'Sticker Club',
            'subdomain' => 'stickerclub',
            'slug' => 'stickerclub',
            'db_connection' => 'sqlite'
        ]);

        $this->season = GamificationSeason::create([
            'name' => 'Temporada de Stickers 1',
            'gamification_type' => 'stickers',
            'start_date' => now()->toDateString(),
            'status' => 'active'
        ]);
    }

    protected function createUser($attributes = [])
    {
        return User::factory()->create(array_merge([
            'club_id' => $this->club->id,
            'role' => 'member'
        ], $attributes));
    }

    public function test_get_album_creates_profile_and_returns_grouped_promotions()
    {
        $user = $this->createUser();
        $dog1 = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $user->id, 'club_entry_year' => 2024]);
        $dog2 = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $user->id, 'club_entry_year' => 2025]);

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/album');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'season',
            'profile',
            'promotions'
        ]);

        $this->assertDatabaseHas('user_sticker_profiles', [
            'user_id' => $user->id,
            'season_id' => $this->season->id
        ]);

        // Check grouped promotions
        $promotions = $response->json('promotions');
        $this->assertCount(2, $promotions);
        $this->assertEquals(2025, $promotions[0]['year']);
        $this->assertEquals(2024, $promotions[1]['year']);
    }

    public function test_open_chest_gives_coins_and_sticker()
    {
        $user = $this->createUser();
        $dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $user->id]);

        $profile = UserStickerProfile::create([
            'user_id' => $user->id,
            'season_id' => $this->season->id,
            'unopened_chests_count' => 1,
            'coins' => 0
        ]);

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/album/open-chest');

        $response->assertStatus(200);
        $response->assertJsonPath('message', '¡Cofre abierto con éxito!');

        $profile->refresh();
        $this->assertEquals(0, $profile->unopened_chests_count);
        $this->assertGreaterThan(0, $profile->coins);

        $this->assertDatabaseHas('user_stickers', [
            'user_sticker_profile_id' => $profile->id,
            'dog_id' => $dog->id,
            'level' => 1
        ]);
    }

    public function test_open_chest_handles_duplicates()
    {
        $user = $this->createUser();
        $dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $user->id]);

        $profile = UserStickerProfile::create([
            'user_id' => $user->id,
            'season_id' => $this->season->id,
            'unopened_chests_count' => 4,
            'coins' => 0
        ]);

        Sanctum::actingAs($user);

        // Open 3 times to get level 3
        $this->postJson('/api/album/open-chest');
        $this->postJson('/api/album/open-chest');
        $this->postJson('/api/album/open-chest');

        $this->assertDatabaseHas('user_stickers', [
            'user_sticker_profile_id' => $profile->id,
            'dog_id' => $dog->id,
            'level' => 3,
            'duplicates_count' => 0
        ]);

        // 4th time gives duplicate
        $response = $this->postJson('/api/album/open-chest');
        $response->assertStatus(200);

        $this->assertDatabaseHas('user_stickers', [
            'user_sticker_profile_id' => $profile->id,
            'dog_id' => $dog->id,
            'level' => 3,
            'duplicates_count' => 1
        ]);
    }

    public function test_buy_sticker_pack()
    {
        $user = $this->createUser();
        $profile = UserStickerProfile::create([
            'user_id' => $user->id,
            'season_id' => $this->season->id,
            'unopened_chests_count' => 0,
            'coins' => 120
        ]);

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/album/buy-pack');

        $response->assertStatus(200);
        $profile->refresh();
        $this->assertEquals(20, $profile->coins);
        $this->assertEquals(1, $profile->unopened_chests_count);
    }

    public function test_claim_promotion_reward()
    {
        $user = $this->createUser();
        $dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $user->id, 'club_entry_year' => 2024]);

        $profile = UserStickerProfile::create([
            'user_id' => $user->id,
            'season_id' => $this->season->id,
            'unopened_chests_count' => 0,
            'coins' => 0
        ]);

        Sanctum::actingAs($user);

        // Attempt to claim when incomplete
        $response = $this->postJson('/api/album/claim-promotion', ['year' => 2024]);
        $response->assertStatus(422);

        // Make sticker level 3
        UserSticker::create([
            'user_sticker_profile_id' => $profile->id,
            'dog_id' => $dog->id,
            'level' => 3
        ]);

        // Success claim
        $response = $this->postJson('/api/album/claim-promotion', ['year' => 2024]);
        $response->assertStatus(200);
        $response->assertJsonPath('message', '¡Recompensa de la Promoción 2024 reclamada con éxito!');

        $profile->refresh();
        $this->assertEquals(100, $profile->coins);
        $this->assertEquals(1, $profile->unopened_chests_count);
        $this->assertContains(2024, $profile->claimed_promotions);
    }

    public function test_trade_creation_and_acceptance()
    {
        $sender = $this->createUser();
        $receiver = $this->createUser();

        $dog1 = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $sender->id]);
        $dog2 = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $receiver->id]);

        $senderProfile = UserStickerProfile::create([
            'user_id' => $sender->id,
            'season_id' => $this->season->id
        ]);
        $receiverProfile = UserStickerProfile::create([
            'user_id' => $receiver->id,
            'season_id' => $this->season->id
        ]);

        // Give sender a duplicate of dog1
        UserSticker::create([
            'user_sticker_profile_id' => $senderProfile->id,
            'dog_id' => $dog1->id,
            'level' => 3,
            'duplicates_count' => 1
        ]);

        // Give receiver a duplicate of dog2
        UserSticker::create([
            'user_sticker_profile_id' => $receiverProfile->id,
            'dog_id' => $dog2->id,
            'level' => 3,
            'duplicates_count' => 1
        ]);

        Sanctum::actingAs($sender);

        // Propose trade
        $response = $this->postJson('/api/trades', [
            'receiver_id' => $receiver->id,
            'offered_dog_id' => $dog1->id,
            'requested_dog_id' => $dog2->id
        ]);

        $response->assertStatus(201);
        $tradeId = $response->json('trade.id');

        // Accept trade
        Sanctum::actingAs($receiver);
        $response = $this->postJson("/api/trades/{$tradeId}/accept");

        $response->assertStatus(200);

        $this->assertDatabaseHas('user_stickers', [
            'user_sticker_profile_id' => $senderProfile->id,
            'dog_id' => $dog1->id,
            'duplicates_count' => 0
        ]);

        $this->assertDatabaseHas('user_stickers', [
            'user_sticker_profile_id' => $senderProfile->id,
            'dog_id' => $dog2->id,
            'level' => 1
        ]);

        $this->assertDatabaseHas('user_stickers', [
            'user_sticker_profile_id' => $receiverProfile->id,
            'dog_id' => $dog2->id,
            'duplicates_count' => 0
        ]);

        $this->assertDatabaseHas('user_stickers', [
            'user_sticker_profile_id' => $receiverProfile->id,
            'dog_id' => $dog1->id,
            'level' => 1
        ]);
    }
}
