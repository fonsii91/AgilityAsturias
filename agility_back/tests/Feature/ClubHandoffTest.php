<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ClubHandoffTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_admin_can_create_and_exchange_a_one_time_club_handoff()
    {
        $mainClub = Club::create([
            'name' => 'Main Club',
            'slug' => 'main',
            'settings' => [],
        ]);
        $targetClub = Club::create([
            'name' => 'Target Club',
            'slug' => 'target',
            'settings' => [],
        ]);
        $admin = User::factory()->create([
            'club_id' => $mainClub->id,
            'role' => 'admin',
        ]);

        $createResponse = $this->actingAs($admin)
            ->postJson("/api/admin/clubs/{$targetClub->id}/handoff");

        $createResponse->assertOk()
            ->assertJsonStructure(['handoff', 'expires_in'])
            ->assertJsonPath('expires_in', 60);

        $handoff = $createResponse->json('handoff');

        $exchangeResponse = $this->withHeader('X-Club-Slug', 'target')
            ->postJson('/api/club-handoff', ['handoff' => $handoff]);

        $exchangeResponse->assertOk()
            ->assertJsonStructure(['access_token', 'token_type', 'user'])
            ->assertJsonPath('user.id', $admin->id);

        $this->withHeader('X-Club-Slug', 'target')
            ->postJson('/api/club-handoff', ['handoff' => $handoff])
            ->assertStatus(401);
    }

    public function test_only_admin_can_create_a_club_handoff()
    {
        $club = Club::create([
            'name' => 'Target Club',
            'slug' => 'target',
            'settings' => [],
        ]);

        foreach (['manager', 'staff', 'member'] as $role) {
            $user = User::factory()->create([
                'club_id' => $club->id,
                'role' => $role,
            ]);

            $this->actingAs($user)
                ->postJson("/api/admin/clubs/{$club->id}/handoff")
                ->assertStatus(403);
        }
    }

    public function test_handoff_can_only_be_exchanged_in_the_target_club()
    {
        $mainClub = Club::create([
            'name' => 'Main Club',
            'slug' => 'main',
            'settings' => [],
        ]);
        $targetClub = Club::create([
            'name' => 'Target Club',
            'slug' => 'target',
            'settings' => [],
        ]);
        $otherClub = Club::create([
            'name' => 'Other Club',
            'slug' => 'other',
            'settings' => [],
        ]);
        $admin = User::factory()->create([
            'club_id' => $mainClub->id,
            'role' => 'admin',
        ]);

        $handoff = $this->actingAs($admin)
            ->postJson("/api/admin/clubs/{$targetClub->id}/handoff")
            ->json('handoff');

        $this->withHeader('X-Club-Slug', $otherClub->slug)
            ->postJson('/api/club-handoff', ['handoff' => $handoff])
            ->assertStatus(403);

        $this->withHeader('X-Club-Slug', $targetClub->slug)
            ->postJson('/api/club-handoff', ['handoff' => $handoff])
            ->assertOk();
    }
}
