<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\Dog;
use App\Models\RsceTrack;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RsceTrackTest extends TestCase
{
    use RefreshDatabase;

    protected $club;

    protected function setUp(): void
    {
        parent::setUp();
        $this->club = \App\Models\Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);
    }

    protected function createUser($attributes = [])
    {
        return User::factory()->create(array_merge(['club_id' => $this->club->id, 'role' => 'member'], $attributes));
    }

    protected function createDog($user, $attributes = [])
    {
        $dog = Dog::factory()->create(array_merge(['user_id' => $user->id, 'club_id' => $this->club->id], $attributes));
        $dog->users()->attach($user->id, ['is_primary_owner' => true]);
        return $dog;
    }

    public function test_user_can_get_their_rsce_tracks()
    {
        $user = $this->createUser();
        $otherUser = $this->createUser();

        $dog = $this->createDog($user);

        $otherDog = $this->createDog($otherUser);

        RsceTrack::factory()->count(3)->create(['dog_id' => $dog->id, 'club_id' => $this->club->id]);
        RsceTrack::factory()->count(2)->create(['dog_id' => $otherDog->id, 'club_id' => $this->club->id]);

        $response = $this->actingAs($user)->getJson('/api/rsce-tracks');

        $response->assertStatus(200);
        $response->assertJsonCount(3);
    }

    public function test_user_can_create_an_rsce_track()
    {
        $user = $this->createUser();
        $dog = $this->createDog($user);

        $trackData = [
            'dog_id' => $dog->id,
            'date' => '2023-10-15',
            'manga_type' => 'Agility',
            'qualification' => 'EXC',
            'speed' => 4.5,
            'judge_name' => 'John Doe',
            'location' => 'Madrid',
            'notes' => 'Great run'
        ];

        $response = $this->actingAs($user)->postJson('/api/rsce-tracks', $trackData);

        $response->assertStatus(201);
        $this->assertDatabaseHas('rsce_tracks', [
            'dog_id' => $dog->id,
            'qualification' => 'EXC',
            'judge_name' => 'John Doe'
        ]);
    }

    public function test_user_cannot_create_track_for_unowned_dog()
    {
        $user = $this->createUser();
        $otherUser = $this->createUser();
        
        $otherDog = $this->createDog($otherUser);

        $trackData = [
            'dog_id' => $otherDog->id,
            'date' => '2023-10-15',
            'manga_type' => 'Agility',
            'qualification' => 'EXC'
        ];

        $response = $this->actingAs($user)->postJson('/api/rsce-tracks', $trackData);

        $response->assertStatus(403);
    }

    public function test_user_can_update_their_rsce_track()
    {
        $user = $this->createUser();
        $dog = $this->createDog($user);

        $track = RsceTrack::factory()->create(['dog_id' => $dog->id, 'club_id' => $this->club->id]);

        $updateData = [
            'date' => '2023-10-16',
            'manga_type' => 'Jumping',
            'qualification' => 'MB',
            'speed' => 5.0,
            'judge_name' => 'Jane Doe',
            'location' => 'Barcelona',
            'notes' => 'Updated notes'
        ];

        $response = $this->actingAs($user)->postJson("/api/rsce-tracks/{$track->id}", $updateData);

        $response->assertStatus(200);
        $this->assertDatabaseHas('rsce_tracks', [
            'id' => $track->id,
            'qualification' => 'MB',
            'location' => 'Barcelona'
        ]);
    }

    public function test_user_cannot_update_unowned_track()
    {
        $user = $this->createUser();
        $otherUser = $this->createUser();
        
        $otherDog = $this->createDog($otherUser);

        $track = RsceTrack::factory()->create(['dog_id' => $otherDog->id, 'club_id' => $this->club->id]);

        $updateData = [
            'date' => '2023-10-16',
            'manga_type' => 'Jumping',
            'qualification' => 'MB',
        ];

        $response = $this->actingAs($user)->postJson("/api/rsce-tracks/{$track->id}", $updateData);

        $response->assertStatus(403);
    }

    public function test_user_can_delete_their_rsce_track()
    {
        $user = $this->createUser();
        $dog = $this->createDog($user);

        $track = RsceTrack::factory()->create(['dog_id' => $dog->id, 'club_id' => $this->club->id]);

        $response = $this->actingAs($user)->postJson("/api/rsce-tracks/{$track->id}/delete");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('rsce_tracks', [
            'id' => $track->id
        ]);
    }

    public function test_user_cannot_delete_unowned_track()
    {
        $user = $this->createUser();
        $otherUser = $this->createUser();
        
        $otherDog = $this->createDog($otherUser);

        $track = RsceTrack::factory()->create(['dog_id' => $otherDog->id, 'club_id' => $this->club->id]);

        $response = $this->actingAs($user)->postJson("/api/rsce-tracks/{$track->id}/delete");

        $response->assertStatus(403);
    }

    public function test_admin_can_access_monitor_data()
    {
        $admin = $this->createUser(['role' => 'admin']);
        
        $user = $this->createUser();
        $dog = $this->createDog($user);
        RsceTrack::factory()->count(2)->create(['dog_id' => $dog->id, 'club_id' => $this->club->id]);

        $response = $this->actingAs($admin)->getJson('/api/admin/rsce/monitor');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            '*' => ['user_id', 'name', 'email', 'total_tracks', 'dogs_list']
        ]);
    }

    public function test_non_admin_cannot_access_monitor_data()
    {
        $user = $this->createUser(['role' => 'member']);

        $response = $this->actingAs($user)->getJson('/api/admin/rsce/monitor');

        $response->assertStatus(403);
    }
}
