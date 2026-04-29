<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Dog;
use App\Models\TimeSlot;
use App\Models\Reservation;
use App\Models\Club;
use Carbon\Carbon;

class MemberReservationTest extends TestCase
{
    use RefreshDatabase;

    protected $club;

    protected function setUp(): void
    {
        parent::setUp();
        // Since the app is multi-tenant, we need a club
        $this->club = Club::create([
            'name' => 'Club Agility',
            'subdomain' => 'club',
            'slug' => 'club',
            'database_name' => 'club_db' // Assuming fields based on previous tasks
        ]);
    }

    public function test_allows_a_member_to_view_their_own_reservations()
    {
        $member = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $member->id]);
        $member->dogs()->attach($dog->id);

        $slot = TimeSlot::factory()->create(['club_id' => $this->club->id]);

        // Create a reservation for this member
        Reservation::factory()->create([
            'user_id' => $member->id,
            'dog_id' => $dog->id,
            'slot_id' => $slot->id,
            'date' => now()->addDays(2)->format('Y-m-d'),
            'status' => 'active',
            'club_id' => $this->club->id
        ]);

        $otherUser = User::factory()->create(['club_id' => $this->club->id]);
        $otherDog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $otherUser->id]);
        $otherSlot = TimeSlot::factory()->create(['club_id' => $this->club->id]);
        
        Reservation::factory()->create([
            'user_id' => $otherUser->id,
            'dog_id' => $otherDog->id,
            'slot_id' => $otherSlot->id,
            'club_id' => $this->club->id
        ]);

        $response = $this->actingAs($member)->getJson('/api/reservations');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.user_id', $member->id);
    }

    public function test_allows_a_member_to_view_availability()
    {
        $member = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $member->id]);
        $member->dogs()->attach($dog->id);

        $slot = TimeSlot::factory()->create(['club_id' => $this->club->id]);

        Reservation::factory()->create([
            'user_id' => $member->id,
            'dog_id' => $dog->id,
            'slot_id' => $slot->id,
            'date' => now()->addDays(2)->format('Y-m-d'),
            'status' => 'active',
            'club_id' => $this->club->id
        ]);

        $response = $this->actingAs($member)->getJson('/api/availability');

        $response->assertStatus(200);
        
        $data = $response->json();
        $found = false;
        foreach ($data as $avail) {
            if ($avail['slot_id'] === $slot->id && $avail['count'] > 0) {
                $found = true;
                break;
            }
        }
        $this->assertTrue($found);
    }

    public function test_prevents_booking_for_a_dog_not_owned_by_the_member()
    {
        $member = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $otherOwner = User::factory()->create(['club_id' => $this->club->id]);
        $otherDog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $otherOwner->id]);

        $slot = TimeSlot::factory()->create(['start_time' => '10:00:00', 'club_id' => $this->club->id]);

        $response = $this->actingAs($member)->postJson('/api/reservations', [
            'slot_id' => $slot->id,
            'user_id' => $member->id,
            'date' => now()->addDays(2)->format('Y-m-d'),
            'dog_ids' => [$otherDog->id]
        ]);

        $response->assertStatus(403)
            ->assertJsonFragment(['message' => 'Uno o más perros seleccionados no están asociados a tu cuenta.']);
    }

    public function test_allows_booking_a_slot_if_requirements_are_met()
    {
        $member = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $member->id]);
        $member->dogs()->attach($dog->id);

        $slot = TimeSlot::factory()->create(['start_time' => '10:00:00', 'club_id' => $this->club->id]);

        $date = now()->addDays(2)->format('Y-m-d');

        $response = $this->actingAs($member)->postJson('/api/reservations', [
            'slot_id' => $slot->id,
            'user_id' => $member->id,
            'date' => $date,
            'dog_ids' => [$dog->id]
        ]);

        $response->assertStatus(201);
        
        $this->assertDatabaseHas('reservations', [
            'user_id' => $member->id,
            'dog_id' => $dog->id,
            'slot_id' => $slot->id,
            'date' => clone \Carbon\Carbon::parse($date)->startOfDay(),
            'status' => 'active'
        ]);
    }

    public function test_prevents_member_from_cancelling_within_24_hours_after_grace_period()
    {
        $member = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $member->id]);
        $member->dogs()->attach($dog->id);

        $slot = TimeSlot::factory()->create(['start_time' => '10:00:00', 'club_id' => $this->club->id]);

        Carbon::setTestNow(Carbon::today()->addHours(11));

        $reservation = Reservation::factory()->create([
            'user_id' => $member->id,
            'dog_id' => $dog->id,
            'slot_id' => $slot->id,
            'date' => Carbon::tomorrow()->format('Y-m-d'),
            'status' => 'active',
            'created_at' => now()->subHours(1),
            'club_id' => $this->club->id
        ]);

        $response = $this->actingAs($member)->postJson('/api/reservations/' . $reservation->id . '/delete');

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'No puedes cancelar una reserva con menos de 24 horas de antelación. Contacta con administración en caso de emergencia.']);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'active'
        ]);
        
        Carbon::setTestNow();
    }

    public function test_allows_member_to_cancel_within_24_hours_if_within_15_min_grace_period()
    {
        $member = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $member->id]);
        $member->dogs()->attach($dog->id);

        $slot = TimeSlot::factory()->create(['start_time' => '10:00:00', 'club_id' => $this->club->id]);

        Carbon::setTestNow(Carbon::today()->addHours(11));

        $reservation = Reservation::factory()->create([
            'user_id' => $member->id,
            'dog_id' => $dog->id,
            'slot_id' => $slot->id,
            'date' => Carbon::tomorrow()->format('Y-m-d'),
            'status' => 'active',
            'created_at' => now()->subMinutes(5),
            'club_id' => $this->club->id
        ]);

        $response = $this->actingAs($member)->postJson('/api/reservations/' . $reservation->id . '/delete');

        $response->assertStatus(204);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'cancelled'
        ]);
        
        Carbon::setTestNow();
    }
}
