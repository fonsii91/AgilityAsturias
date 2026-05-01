<?php

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\PersonalEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PersonalEventTest extends TestCase
{
    use RefreshDatabase;

    private $club;
    private $user;
    private $dog;

    protected function setUp(): void
    {
        parent::setUp();
        $this->club = \App\Models\Club::create(['name' => 'Club Test', 'slug' => 'club-test']);
        $this->user = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $this->dog = Dog::factory()->create(['user_id' => $this->user->id, 'club_id' => $this->club->id]);
    }

    public function test_can_list_user_personal_events()
    {
        Sanctum::actingAs($this->user);

        PersonalEvent::factory()->count(3)->create([
            'user_id' => $this->user->id,
            'dog_id' => $this->dog->id,
            'club_id' => $this->club->id,
        ]);

        $otherUser = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $otherDog = Dog::factory()->create(['user_id' => $otherUser->id, 'club_id' => $this->club->id]);
        PersonalEvent::factory()->create([
            'user_id' => $otherUser->id,
            'dog_id' => $otherDog->id,
            'club_id' => $this->club->id,
        ]);

        $response = $this->getJson('/api/personal-events');

        $response->assertStatus(200)
            ->assertJsonCount(3);
    }

    public function test_can_create_a_personal_event()
    {
        Sanctum::actingAs($this->user);

        $payload = [
            'dog_id' => $this->dog->id,
            'title' => 'Visita al veterinario',
            'type' => 'veterinario',
            'start_date' => '2026-05-15',
            'notes' => 'Revisión anual',
        ];

        $response = $this->postJson('/api/personal-events', $payload);

        $response->assertStatus(201)
            ->assertJsonFragment(['title' => 'Visita al veterinario']);

        $this->assertDatabaseHas('personal_events', [
            'user_id' => $this->user->id,
            'dog_id' => $this->dog->id,
            'title' => 'Visita al veterinario',
            'type' => 'veterinario',
        ]);
    }

    public function test_fails_to_create_an_event_if_dog_does_not_exist()
    {
        Sanctum::actingAs($this->user);

        $payload = [
            'dog_id' => 9999, // Invalid dog
            'title' => 'Visita',
            'type' => 'veterinario',
            'start_date' => '2026-05-15',
        ];

        $response = $this->postJson('/api/personal-events', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['dog_id']);
    }

    public function test_can_update_a_personal_event()
    {
        Sanctum::actingAs($this->user);

        $event = PersonalEvent::factory()->create([
            'user_id' => $this->user->id,
            'dog_id' => $this->dog->id,
            'title' => 'Old Title',
        ]);

        $payload = [
            'title' => 'New Title',
        ];

        $response = $this->putJson("/api/personal-events/{$event->id}", $payload);

        $response->assertStatus(200)
            ->assertJsonFragment(['title' => 'New Title']);

        $this->assertDatabaseHas('personal_events', [
            'id' => $event->id,
            'title' => 'New Title',
        ]);
    }

    public function test_cannot_update_another_users_personal_event()
    {
        Sanctum::actingAs($this->user);

        $otherUser = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $otherDog = Dog::factory()->create(['user_id' => $otherUser->id, 'club_id' => $this->club->id]);
        $event = PersonalEvent::factory()->create([
            'user_id' => $otherUser->id,
            'dog_id' => $otherDog->id,
            'title' => 'Other Title',
            'club_id' => $this->club->id,
        ]);

        $payload = [
            'title' => 'Hacked Title',
        ];

        $response = $this->putJson("/api/personal-events/{$event->id}", $payload);

        $response->assertStatus(404);
    }

    public function test_can_delete_a_personal_event()
    {
        Sanctum::actingAs($this->user);

        $event = PersonalEvent::factory()->create([
            'user_id' => $this->user->id,
            'dog_id' => $this->dog->id,
            'club_id' => $this->club->id,
        ]);

        $response = $this->deleteJson("/api/personal-events/{$event->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('personal_events', [
            'id' => $event->id,
        ]);
    }

    public function test_cannot_delete_another_users_personal_event()
    {
        Sanctum::actingAs($this->user);

        $otherUser = User::factory()->create(['club_id' => $this->club->id]);
        $otherDog = Dog::factory()->create(['user_id' => $otherUser->id, 'club_id' => $this->club->id]);
        $event = PersonalEvent::factory()->create([
            'user_id' => $otherUser->id,
            'dog_id' => $otherDog->id,
            'club_id' => $this->club->id,
        ]);

        $response = $this->deleteJson("/api/personal-events/{$event->id}");

        $response->assertStatus(404);
    }
}
