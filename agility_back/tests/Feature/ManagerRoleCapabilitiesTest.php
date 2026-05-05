<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Dog;
use App\Models\TimeSlot;
use App\Models\Club;
use App\Models\Competition;
use App\Models\Video;

class ManagerRoleCapabilitiesTest extends TestCase
{
    use RefreshDatabase;

    protected $manager;
    protected $club;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->club = Club::create([
            'name' => 'Test Club',
            'slug' => 'test-club',
            'domain' => 'test.clubagility.com',
            'settings' => []
        ]);
        
        $this->manager = User::factory()->create([
            'role' => 'manager',
            'club_id' => $this->club->id
        ]);
        
        // Ensure active club context is set
        app()->instance('active_club_id', $this->club->id);
    }

    /** @test */
    public function manager_can_update_their_own_club_settings()
    {
        $response = $this->actingAs($this->manager)->putJson("/api/admin/clubs/{$this->club->id}", [
            'name' => 'Updated Club Name',
            'slug' => 'updated-club',
            'settings' => ['colors' => ['primary' => '#ff0000']]
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('clubs', [
            'id' => $this->club->id,
            'name' => 'Updated Club Name'
        ]);
    }

    /** @test */
    public function manager_cannot_update_other_clubs()
    {
        $otherClub = Club::create([
            'name' => 'Other Club',
            'slug' => 'other-club',
            'domain' => 'other.clubagility.com',
            'settings' => []
        ]);
        
        $response = $this->actingAs($this->manager)->putJson("/api/admin/clubs/{$otherClub->id}", [
            'name' => 'Should Not Update'
        ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function manager_can_create_and_manage_time_slots()
    {
        // Test Create
        $response = $this->actingAs($this->manager)->postJson('/api/time-slots', [
            'day' => 'Lunes',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'max_bookings' => 5
        ]);
        $response->assertStatus(201);
        $slotId = $response->json('id');

        // Test Update
        $updateResponse = $this->actingAs($this->manager)->postJson("/api/time-slots/{$slotId}", [
            'day' => 'Martes',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'max_bookings' => 10,
        ]);
        $updateResponse->assertStatus(200);

        // Test Delete
        $deleteResponse = $this->actingAs($this->manager)->postJson("/api/time-slots/{$slotId}/delete");
        $deleteResponse->assertStatus(204);
    }

    /** @test */
    public function manager_can_bypass_reservation_rules()
    {
        $slot = TimeSlot::factory()->create([
            'max_bookings' => 1,
            'club_id' => $this->club->id
        ]);
        
        $user = User::factory()->create(['club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['user_id' => $user->id]);

        // Manager booking for another user
        $response = $this->actingAs($this->manager)->postJson('/api/reservations', [
            'slot_id' => $slot->id,
            'date' => now()->addDays(2)->format('Y-m-d'),
            'dog_ids' => [$dog->id],
            'user_id' => $user->id
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('reservations', [
            'slot_id' => $slot->id,
            'user_id' => $user->id
        ]);
    }

    /** @test */
    public function manager_can_manage_competitions()
    {
        $response = $this->actingAs($this->manager)->postJson('/api/competitions', [
            'name' => 'Torneo Manager',
            'fecha_evento' => now()->addDays(5)->format('Y-m-d'),
            'location' => 'Club',
            'tipo' => 'competicion',
            'federacion' => 'RSCE',
        ]);

        $response->assertStatus(201);
    }

    /** @test */
    public function manager_can_moderate_videos()
    {
        $user = User::factory()->create(['club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['user_id' => $user->id]);
        $video = Video::factory()->create([
            'user_id' => $user->id,
            'dog_id' => $dog->id,
            'in_public_gallery' => false
        ]);

        $response = $this->actingAs($this->manager)->postJson("/api/videos/{$video->id}/toggle-public-gallery");

        $response->assertStatus(200);
        $this->assertDatabaseHas('videos', [
            'id' => $video->id,
            'in_public_gallery' => true
        ]);
    }
}
