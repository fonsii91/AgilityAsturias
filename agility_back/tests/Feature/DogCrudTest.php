<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Dog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DogCrudTest extends TestCase
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

    public function test_user_can_create_a_dog()
    {
        $user = $this->createUser();

        $dogData = [
            'name' => 'Toby',
            'breed' => 'Border Collie',
            'birth_date' => '2020-05-15',
        ];

        $response = $this->actingAs($user)->postJson('/api/dogs', $dogData);

        $response->assertStatus(201)
                 ->assertJsonPath('name', 'Toby')
                 ->assertJsonPath('breed', 'Border Collie');

        $this->assertDatabaseHas('dogs', [
            'name' => 'Toby',
            'breed' => 'Border Collie'
        ]);

        $this->assertDatabaseHas('dog_user', [
            'user_id' => $user->id,
            'is_primary_owner' => 1
        ]);
    }

    public function test_user_can_list_their_dogs_but_not_others()
    {
        $user = $this->createUser();
        $otherUser = $this->createUser();

        // Create a dog for the user
        $this->actingAs($user)->postJson('/api/dogs', [
            'name' => 'My Dog',
            'breed' => 'Poodle'
        ]);

        // Create a dog for the other user
        $this->actingAs($otherUser)->postJson('/api/dogs', [
            'name' => 'Other Dog',
            'breed' => 'Pug'
        ]);

        // List dogs as $user
        $response = $this->actingAs($user)->getJson('/api/dogs');

        $response->assertStatus(200)
                 ->assertJsonCount(1)
                 ->assertJsonPath('0.name', 'My Dog');
    }

    public function test_user_can_show_their_dog()
    {
        $user = $this->createUser();
        $response = $this->actingAs($user)->postJson('/api/dogs', [
            'name' => 'Toby'
        ]);
        
        $dogId = $response->json('id');

        $showResponse = $this->actingAs($user)->getJson("/api/dogs/{$dogId}");
        
        $showResponse->assertStatus(200)
                     ->assertJsonPath('name', 'Toby');
    }

    public function test_user_cannot_show_someone_elses_dog()
    {
        $user1 = $this->createUser();
        $user2 = $this->createUser();

        $response = $this->actingAs($user1)->postJson('/api/dogs', [
            'name' => 'Toby'
        ]);
        
        $dogId = $response->json('id');

        $showResponse = $this->actingAs($user2)->getJson("/api/dogs/{$dogId}");
        
        $showResponse->assertStatus(404);
    }

    public function test_user_can_update_their_dog()
    {
        $user = $this->createUser();
        $response = $this->actingAs($user)->postJson('/api/dogs', [
            'name' => 'Toby'
        ]);
        
        $dogId = $response->json('id');

        $updateResponse = $this->actingAs($user)->postJson("/api/dogs/{$dogId}", [
            'name' => 'Toby Junior',
            'breed' => 'Labrador'
        ]);

        $updateResponse->assertStatus(200)
                       ->assertJsonPath('name', 'Toby Junior')
                       ->assertJsonPath('breed', 'Labrador');

        $this->assertDatabaseHas('dogs', [
            'id' => $dogId,
            'name' => 'Toby Junior',
            'breed' => 'Labrador'
        ]);
    }

    public function test_primary_owner_can_delete_their_dog()
    {
        $user = $this->createUser();
        $response = $this->actingAs($user)->postJson('/api/dogs', [
            'name' => 'Toby'
        ]);
        
        $dogId = $response->json('id');

        $deleteResponse = $this->actingAs($user)->postJson("/api/dogs/{$dogId}/delete");
        $deleteResponse->assertStatus(204);

        $this->assertDatabaseMissing('dogs', [
            'id' => $dogId
        ]);
        
        $this->assertDatabaseMissing('dog_user', [
            'dog_id' => $dogId
        ]);
    }

    public function test_user_can_upload_dog_photo()
    {
        \Illuminate\Support\Facades\Storage::fake('public');
        $user = $this->createUser();
        $response = $this->actingAs($user)->postJson('/api/dogs', [
            'name' => 'Toby Photo'
        ]);
        
        $dogId = $response->json('id');

        $file = \Illuminate\Http\Testing\File::image('dog-photo.jpg', 600, 600);

        $uploadResponse = $this->actingAs($user)->postJson("/api/dogs/{$dogId}/photo", [
            'photo' => $file
        ]);

        $uploadResponse->assertStatus(200);
        $this->assertNotNull($uploadResponse->json('photo_url'));

        // Assert file exists in storage
        $files = \Illuminate\Support\Facades\Storage::disk('public')->allFiles();
        $hasPhoto = false;
        foreach ($files as $f) {
            if (str_contains($f, 'dog_photos')) {
                $hasPhoto = true;
                break;
            }
        }
        $this->assertTrue($hasPhoto);
    }

    public function test_user_can_update_health_and_training_metrics()
    {
        $user = $this->createUser();
        $response = $this->actingAs($user)->postJson('/api/dogs', [
            'name' => 'Toby Metrics',
            'birth_date' => '2020-01-01'
        ]);
        
        $dogId = $response->json('id');

        $updateResponse = $this->actingAs($user)->postJson("/api/dogs/{$dogId}", [
            'name' => 'Toby Metrics',
            'weight_kg' => 15.5,
            'height_cm' => 45,
            'has_previous_injuries' => true,
            'sterilized_at' => '2021-01-01',
            'rsce_category' => 'M'
        ]);

        $updateResponse->assertStatus(200)
                       ->assertJsonPath('has_previous_injuries', true)
                       ->assertJsonPath('rsce_category', 'M');

        $this->assertEquals(15.5, (float) $updateResponse->json('weight_kg'));
        $this->assertEquals(45, (float) $updateResponse->json('height_cm'));

        $this->assertDatabaseHas('dogs', [
            'id' => $dogId,
            'height_cm' => 45,
            'has_previous_injuries' => 1,
            'rsce_category' => 'M'
        ]);
        
        $dogInDb = \App\Models\Dog::find($dogId);
        $this->assertEquals(15.5, (float) $dogInDb->weight_kg);
    }

    public function test_user_can_update_documentation_and_licenses()
    {
        $user = $this->createUser();
        $response = $this->actingAs($user)->postJson('/api/dogs', [
            'name' => 'Toby Docs'
        ]);
        
        $dogId = $response->json('id');

        $updateResponse = $this->actingAs($user)->postJson("/api/dogs/{$dogId}", [
            'name' => 'Toby Docs',
            'microchip' => '123456789012345',
            'pedigree' => 'LOE-123456',
            'rsce_license' => 'RSCE-999',
            'rsce_expiration_date' => '2025-12-31',
            'rsce_grade' => '2'
        ]);

        $updateResponse->assertStatus(200)
                       ->assertJsonPath('microchip', '123456789012345')
                       ->assertJsonPath('pedigree', 'LOE-123456');

        $dogInDb = \App\Models\Dog::with('users')->find($dogId);
        $this->assertEquals('123456789012345', $dogInDb->microchip);
        $this->assertEquals('LOE-123456', $dogInDb->pedigree);
        
        $pivot = $dogInDb->users->first()->pivot;
        $this->assertEquals('RSCE-999', $pivot->rsce_license);
        $this->assertEquals('2025-12-31', explode('T', $pivot->rsce_expiration_date)[0]);
        $this->assertEquals('2', $pivot->rsce_grade);
    }

    public function test_user_can_share_their_dog()
    {
        $user1 = $this->createUser();
        $user2 = $this->createUser();
        
        $response = $this->actingAs($user1)->postJson('/api/dogs', [
            'name' => 'Toby Share'
        ]);
        $dogId = $response->json('id');

        $shareResponse = $this->actingAs($user1)->postJson("/api/dogs/{$dogId}/share", [
            'email' => $user2->email
        ]);

        $shareResponse->assertStatus(200);

        $this->assertDatabaseHas('dog_user', [
            'user_id' => $user2->id,
            'dog_id' => $dogId,
            'is_primary_owner' => 0
        ]);
    }

    public function test_user_can_unshare_their_dog()
    {
        $user1 = $this->createUser();
        $user2 = $this->createUser();
        
        $response = $this->actingAs($user1)->postJson('/api/dogs', [
            'name' => 'Toby Unshare'
        ]);
        $dogId = $response->json('id');

        // First share
        $this->actingAs($user1)->postJson("/api/dogs/{$dogId}/share", [
            'email' => $user2->email
        ]);

        // Then unshare
        $unshareResponse = $this->actingAs($user1)->postJson("/api/dogs/{$dogId}/unshare", [
            'user_id' => $user2->id
        ]);

        $unshareResponse->assertStatus(200);

        $this->assertDatabaseMissing('dog_user', [
            'user_id' => $user2->id,
            'dog_id' => $dogId
        ]);
    }

    public function test_only_primary_owner_can_unshare_a_dog()
    {
        $user1 = $this->createUser();
        $user2 = $this->createUser();
        $user3 = $this->createUser();
        
        $response = $this->actingAs($user1)->postJson('/api/dogs', [
            'name' => 'Toby Strict Unshare'
        ]);
        $dogId = $response->json('id');

        $this->actingAs($user1)->postJson("/api/dogs/{$dogId}/share", ['email' => $user2->email]);
        $this->actingAs($user1)->postJson("/api/dogs/{$dogId}/share", ['email' => $user3->email]);

        // User 2 tries to unshare User 3
        $unshareResponse = $this->actingAs($user2)->postJson("/api/dogs/{$dogId}/unshare", [
            'user_id' => $user3->id
        ]);

        $unshareResponse->assertStatus(403);
    }
}
