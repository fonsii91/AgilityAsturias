<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Dog;
use App\Models\TimeSlot;
use App\Models\Reservation;
use App\Models\Club;

class StaffReservationMonitorTest extends TestCase
{
    use RefreshDatabase;

    protected $club;

    protected function setUp(): void
    {
        parent::setUp();
        $this->club = Club::create([
            'name' => 'Club Agility',
            'subdomain' => 'club',
            'slug' => 'club',
            'database_name' => 'club_db'
        ]);
    }

    public function test_allows_staff_to_view_all_reservations_for_the_global_monitor()
    {
        $staff = User::factory()->create(['role' => 'staff', 'club_id' => $this->club->id]);
        
        $user1 = User::factory()->create(['club_id' => $this->club->id]);
        $dog1 = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $user1->id]);
        
        $user2 = User::factory()->create(['club_id' => $this->club->id]);
        $dog2 = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $user2->id]);

        $slot = TimeSlot::factory()->create(['club_id' => $this->club->id]);

        Reservation::factory()->create([
            'user_id' => $user1->id,
            'dog_id' => $dog1->id,
            'slot_id' => $slot->id,
            'status' => 'active',
            'club_id' => $this->club->id
        ]);

        Reservation::factory()->create([
            'user_id' => $user2->id,
            'dog_id' => $dog2->id,
            'slot_id' => $slot->id,
            'status' => 'active',
            'club_id' => $this->club->id
        ]);
        
        Reservation::factory()->create([
            'user_id' => $user1->id,
            'dog_id' => $dog1->id,
            'slot_id' => $slot->id,
            'status' => 'cancelled',
            'club_id' => $this->club->id
        ]);

        $response = $this->actingAs($staff)->getJson('/api/reservations');

        $response->assertStatus(200)
                 ->assertJsonCount(2);
    }

    public function test_prevents_normal_members_from_viewing_all_reservations()
    {
        $member = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $otherMember = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);

        $dog1 = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $member->id]);
        $member->dogs()->attach($dog1->id);

        $dog2 = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $otherMember->id]);
        $otherMember->dogs()->attach($dog2->id);

        $slot = TimeSlot::factory()->create(['club_id' => $this->club->id]);

        Reservation::factory()->create([
            'user_id' => $member->id,
            'dog_id' => $dog1->id,
            'slot_id' => $slot->id,
            'status' => 'active',
            'club_id' => $this->club->id
        ]);

        Reservation::factory()->create([
            'user_id' => $otherMember->id,
            'dog_id' => $dog2->id,
            'slot_id' => $slot->id,
            'status' => 'active',
            'club_id' => $this->club->id
        ]);

        $response = $this->actingAs($member)->getJson('/api/reservations');

        $response->assertStatus(200)
                 ->assertJsonCount(1)
                 ->assertJsonPath('0.user_id', $member->id);
    }

    public function test_includes_the_acwr_color_field_in_the_response_for_staff()
    {
        $staff = User::factory()->create(['role' => 'staff', 'club_id' => $this->club->id]);
        
        $user1 = User::factory()->create(['club_id' => $this->club->id]);
        $dog1 = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $user1->id]);

        $slot = TimeSlot::factory()->create(['club_id' => $this->club->id]);

        Reservation::factory()->create([
            'user_id' => $user1->id,
            'dog_id' => $dog1->id,
            'slot_id' => $slot->id,
            'status' => 'active',
            'club_id' => $this->club->id
        ]);

        $response = $this->actingAs($staff)->getJson('/api/reservations');

        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertArrayHasKey('acwr_color', $data[0]['dog']);
    }
}

