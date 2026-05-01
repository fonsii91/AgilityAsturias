<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Dog;
use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected $club;

    protected function setUp(): void
    {
        parent::setUp();
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

    public function test_allows_admin_and_staff_to_list_users()
    {
        $admin = $this->createUser(['role' => 'admin']);
        $staff = $this->createUser(['role' => 'staff']);
        $user = $this->createUser(['role' => 'user']);
        $member = $this->createUser(['role' => 'member']);

        // Admin can list
        Sanctum::actingAs($admin);
        $responseAdmin = $this->getJson('/api/users');
        $responseAdmin->assertStatus(200)
            ->assertJsonCount(4);

        // Staff can list
        Sanctum::actingAs($staff);
        $responseStaff = $this->getJson('/api/users');
        $responseStaff->assertStatus(200)
            ->assertJsonCount(4);

        // Normal user cannot list
        Sanctum::actingAs($user);
        $responseUser = $this->getJson('/api/users');
        $responseUser->assertStatus(403);
    }

    public function test_allows_admin_to_update_user_roles()
    {
        $admin = $this->createUser(['role' => 'admin']);
        $user = $this->createUser(['role' => 'user']);

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/users/{$user->id}/role", [
            'role' => 'staff'
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Rol actualizado correctamente')
            ->assertJsonPath('user.role', 'staff');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'role' => 'staff'
        ]);
    }

    public function test_prevents_staff_from_updating_admin_or_other_staff_roles()
    {
        $staff = $this->createUser(['role' => 'staff']);
        $admin = $this->createUser(['role' => 'admin']);
        $otherStaff = $this->createUser(['role' => 'staff']);

        Sanctum::actingAs($staff);

        // Staff tries to modify admin
        $response1 = $this->postJson("/api/users/{$admin->id}/role", [
            'role' => 'user'
        ]);
        $response1->assertStatus(403)
            ->assertJsonPath('message', 'El personal no puede modificar a administradores u otro personal.');

        // Staff tries to modify another staff
        $response2 = $this->postJson("/api/users/{$otherStaff->id}/role", [
            'role' => 'user'
        ]);
        $response2->assertStatus(403);
    }

    public function test_prevents_staff_from_assigning_admin_or_staff_roles()
    {
        $staff = $this->createUser(['role' => 'staff']);
        $user = $this->createUser(['role' => 'user']);

        Sanctum::actingAs($staff);

        // Staff tries to make someone admin
        $response1 = $this->postJson("/api/users/{$user->id}/role", [
            'role' => 'admin'
        ]);
        $response1->assertStatus(403)
            ->assertJsonPath('message', 'El personal solo puede asignar roles de usuario o socio.');

        // Staff tries to make someone staff
        $response2 = $this->postJson("/api/users/{$user->id}/role", [
            'role' => 'staff'
        ]);
        $response2->assertStatus(403);
    }

    public function test_allows_staff_to_assign_member_or_user_roles()
    {
        $staff = $this->createUser(['role' => 'staff']);
        $user = $this->createUser(['role' => 'user']);

        Sanctum::actingAs($staff);

        // Make member
        $response1 = $this->postJson("/api/users/{$user->id}/role", [
            'role' => 'member'
        ]);
        $response1->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'role' => 'member']);

        // Revert to user
        $response2 = $this->postJson("/api/users/{$user->id}/role", [
            'role' => 'user'
        ]);
        $response2->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'role' => 'user']);
    }

    public function test_allows_admin_to_delete_users_and_their_associated_data()
    {
        $admin = $this->createUser(['role' => 'admin']);
        $user = $this->createUser(['role' => 'user']);
        
        // User has a dog
        $dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $user->id]);
        $user->dogs()->attach($dog->id);

        Sanctum::actingAs($admin);

        // Delete user
        $response = $this->postJson("/api/users/{$user->id}/delete");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Usuario y sus datos asociados eliminados correctamente.');

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('dogs', ['id' => $dog->id]);
    }

    public function test_preserves_dogs_if_they_are_shared_with_other_users_during_deletion()
    {
        $admin = $this->createUser(['role' => 'admin']);
        $user1 = $this->createUser(['role' => 'user']);
        $user2 = $this->createUser(['role' => 'user']);
        
        $dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $user1->id]);
        
        // Both users own the dog
        $user1->dogs()->attach($dog->id);
        $user2->dogs()->attach($dog->id);

        Sanctum::actingAs($admin);

        // Delete user 1
        $response = $this->postJson("/api/users/{$user1->id}/delete");
        $response->assertStatus(200);

        $this->assertDatabaseMissing('users', ['id' => $user1->id]);
        
        // Dog should still exist because user2 owns it
        $this->assertDatabaseHas('dogs', ['id' => $dog->id]);
    }

    public function test_prevents_self_deletion()
    {
        $admin = $this->createUser(['role' => 'admin']);

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/users/{$admin->id}/delete");

        $response->assertStatus(400)
            ->assertJsonPath('message', 'No puedes eliminarte a ti mismo desde esta vista.');
    }

    public function test_prevents_staff_from_deleting_admin_or_other_staff()
    {
        $staff = $this->createUser(['role' => 'staff']);
        $admin = $this->createUser(['role' => 'admin']);
        $otherStaff = $this->createUser(['role' => 'staff']);

        Sanctum::actingAs($staff);

        $response1 = $this->postJson("/api/users/{$admin->id}/delete");
        $response1->assertStatus(403);

        $response2 = $this->postJson("/api/users/{$otherStaff->id}/delete");
        $response2->assertStatus(403);
    }
}
