<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\Dog;
use App\Models\PointHistory;
use App\Models\User;
use App\Notifications\DogExtraPointNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExtraPointsTest extends TestCase
{
    use RefreshDatabase;

    protected $club;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);
    }

    protected function createUser($attributes = [])
    {
        return User::factory()->create(array_merge(['club_id' => $this->club->id], $attributes));
    }

    public function test_admin_can_give_extra_points_to_a_dog()
    {
        $admin = $this->createUser(['role' => 'admin']);
        $owner = $this->createUser(['role' => 'member']);

        $dog = Dog::factory()->create(['points' => 10, 'club_id' => $this->club->id, 'user_id' => $owner->id]);
        $owner->dogs()->attach($dog->id, ['is_primary_owner' => true]);

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/dogs/{$dog->id}/extra-points", [
            'points' => 2,
            'category' => 'Puntualidad'
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('message', 'Puntos modificados exitosamente');

        $this->assertDatabaseHas('dogs', [
            'id' => $dog->id,
            'points' => 12
        ]);

        $this->assertDatabaseHas('point_histories', [
            'dog_id' => $dog->id,
            'points' => 2,
            'category' => 'Puntualidad'
        ]);

        Notification::assertSentTo($owner, DogExtraPointNotification::class);
    }

    public function test_staff_can_deduct_points_from_a_dog()
    {
        $staff = $this->createUser(['role' => 'staff']);
        $owner = $this->createUser(['role' => 'member']);

        $dog = Dog::factory()->create(['points' => 10, 'club_id' => $this->club->id, 'user_id' => $owner->id]);
        $owner->dogs()->attach($dog->id, ['is_primary_owner' => true]);

        Sanctum::actingAs($staff);
        $response = $this->postJson("/api/dogs/{$dog->id}/extra-points", [
            'points' => -3,
            'category' => 'Caca en pista'
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('dogs', [
            'id' => $dog->id,
            'points' => 7
        ]);

        $this->assertDatabaseHas('point_histories', [
            'dog_id' => $dog->id,
            'points' => -3,
            'category' => 'Caca en pista'
        ]);

        Notification::assertSentTo($owner, DogExtraPointNotification::class);
    }

    public function test_member_cannot_give_extra_points()
    {
        $member = $this->createUser(['role' => 'member']);
        $dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $member->id]);

        Sanctum::actingAs($member);
        $response = $this->postJson("/api/dogs/{$dog->id}/extra-points", [
            'points' => 2,
            'category' => 'Proactividad'
        ]);

        $response->assertStatus(403);
    }

    public function test_points_validation_rules()
    {
        $admin = $this->createUser(['role' => 'admin']);
        $dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $admin->id]);

        Sanctum::actingAs($admin);

        // Over 3 points
        $response = $this->postJson("/api/dogs/{$dog->id}/extra-points", [
            'points' => 4,
            'category' => 'Puntualidad'
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors('points');

        // Under -3 points
        $response = $this->postJson("/api/dogs/{$dog->id}/extra-points", [
            'points' => -4,
            'category' => 'Puntualidad'
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors('points');

        // 0 points not allowed
        $response = $this->postJson("/api/dogs/{$dog->id}/extra-points", [
            'points' => 0,
            'category' => 'Puntualidad'
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors('points');

        // Missing category
        $response = $this->postJson("/api/dogs/{$dog->id}/extra-points", [
            'points' => 2,
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors('category');
    }
}
