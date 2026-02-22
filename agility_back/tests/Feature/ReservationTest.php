<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\TimeSlot;
use App\Models\Dog;
use App\Models\Reservation;

class ReservationTest extends TestCase
{
    use RefreshDatabase;

    public function test_availability_groups_dogs_and_counts_correctly()
    {
        $user = User::factory()->create();
        $slot = TimeSlot::factory()->create();
        $dog1 = Dog::factory()->create(['user_id' => $user->id]);
        $dog2 = Dog::factory()->create(['user_id' => $user->id]);

        // Create 2 reservations for the same user, same slot, same date
        Reservation::factory()->create([
            'user_id' => $user->id,
            'slot_id' => $slot->id,
            'dog_id' => $dog1->id,
            'date' => now()->toDateString(),
        ]);

        Reservation::factory()->create([
            'user_id' => $user->id,
            'slot_id' => $slot->id,
            'dog_id' => $dog2->id,
            'date' => now()->toDateString(),
        ]);

        $response = $this->actingAs($user)->getJson('/api/availability');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertCount(1, $data, 'Availability should group by slot and date');
        $this->assertEquals(2, $data[0]['count'], 'Count should be 2 dogs');
        $this->assertCount(1, $data[0]['attendees'], 'Should only be 1 attendee (user)');
        $this->assertCount(2, $data[0]['attendees'][0]['dogs'], 'Attendee should have 2 dogs listed');
    }

    public function test_store_creates_multiple_reservations_for_multiple_dogs()
    {
        $user = User::factory()->create();
        $slot = TimeSlot::factory()->create();
        $dog1 = Dog::factory()->create(['user_id' => $user->id]);
        $dog2 = Dog::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->postJson('/api/reservations', [
            'slot_id' => $slot->id,
            'user_id' => $user->id,
            'date' => now()->addDay()->toDateString(),
            'dog_ids' => [$dog1->id, $dog2->id]
        ]);

        $response->assertStatus(201);
        $data = $response->json();
        $this->assertCount(2, $data, 'Should return 2 created reservations');

        $this->assertDatabaseHas('reservations', [
            'user_id' => $user->id,
            'slot_id' => $slot->id,
            'dog_id' => $dog1->id,
        ]);

        $this->assertDatabaseHas('reservations', [
            'user_id' => $user->id,
            'slot_id' => $slot->id,
            'dog_id' => $dog2->id,
        ]);
    }

    public function test_store_prevents_duplicate_dog_bookings()
    {
        $user = User::factory()->create();
        $slot = TimeSlot::factory()->create();
        $dog = Dog::factory()->create(['user_id' => $user->id]);
        $date = now()->addDay()->toDateString();

        // Already booked
        Reservation::factory()->create([
            'user_id' => $user->id,
            'slot_id' => $slot->id,
            'dog_id' => $dog->id,
            'date' => $date,
        ]);

        // Attempt second booking
        $response = $this->actingAs($user)->postJson('/api/reservations', [
            'slot_id' => $slot->id,
            'user_id' => $user->id,
            'date' => $date,
            'dog_ids' => [$dog->id]
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('Uno o más perros seleccionados ya tienen reserva en esta franja', $response->json('message'));
    }

    public function test_destroy_block_deletes_all_reservations_for_user_slot_and_date()
    {
        $user = User::factory()->create();
        $slot = TimeSlot::factory()->create();
        $date = now()->addDay()->toDateString();

        Reservation::factory()->count(2)->create([
            'user_id' => $user->id,
            'slot_id' => $slot->id,
            'date' => $date,
        ]);

        // Create a different user reservation that should NOT be deleted
        $otherUser = User::factory()->create();
        Reservation::factory()->create([
            'user_id' => $otherUser->id,
            'slot_id' => $slot->id,
            'date' => $date,
        ]);

        $this->assertDatabaseCount('reservations', 3);

        $response = $this->actingAs($user)->deleteJson('/api/reservations/block', [
            'slot_id' => $slot->id,
            'date' => $date,
        ]);

        $response->assertStatus(204);

        $this->assertDatabaseCount('reservations', 1);
        $this->assertDatabaseMissing('reservations', [
            'user_id' => $user->id,
            'slot_id' => $slot->id,
            'date' => $date,
        ]);
    }
}
