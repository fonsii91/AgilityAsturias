<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class PasswordResetTest extends TestCase
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
        return User::factory()->create(array_merge(['club_id' => $this->club->id], $attributes));
    }

    public function test_allows_an_admin_to_generate_a_reset_link()
    {
        $admin = $this->createUser(['role' => 'admin']);
        $targetUser = $this->createUser();

        $response = $this->actingAs($admin)->postJson("/api/users/{$targetUser->id}/generate-reset-link");

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'link']);

        $this->assertDatabaseHas('users', [
            'id' => $targetUser->id,
        ]);
        
        $targetUser->refresh();
        $this->assertNotNull($targetUser->reset_token);
    }

    public function test_allows_a_staff_member_to_generate_a_reset_link()
    {
        $staff = $this->createUser(['role' => 'staff']);
        $targetUser = $this->createUser();

        $response = $this->actingAs($staff)->postJson("/api/users/{$targetUser->id}/generate-reset-link");

        $response->assertStatus(200);
    }

    public function test_prevents_normal_users_from_generating_a_reset_link()
    {
        $user = $this->createUser(['role' => 'user']);
        $targetUser = $this->createUser();

        $response = $this->actingAs($user)->postJson("/api/users/{$targetUser->id}/generate-reset-link");

        $response->assertStatus(403);
    }

    public function test_returns_404_when_generating_a_link_for_a_non_existent_user()
    {
        $admin = $this->createUser(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson("/api/users/99999/generate-reset-link");

        $response->assertStatus(404);
    }

    public function test_allows_a_user_to_reset_their_password_with_a_valid_token()
    {
        $token = Str::random(60);
        $user = $this->createUser([
            'password' => Hash::make('old_password'),
            'reset_token' => $token,
        ]);

        $response = $this->postJson("/api/reset-password", [
            'token' => $token,
            'password' => 'new_password123',
            'password_confirmation' => 'new_password123',
        ]);

        $response->assertStatus(200)
                 ->assertJson(['message' => 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.']);

        $user->refresh();
        $this->assertNull($user->reset_token);
        $this->assertTrue(Hash::check('new_password123', $user->password));
    }

    public function test_fails_to_reset_password_with_an_invalid_token()
    {
        $this->createUser([
            'reset_token' => Str::random(60),
        ]);

        $response = $this->postJson("/api/reset-password", [
            'token' => 'invalid-token',
            'password' => 'new_password123',
            'password_confirmation' => 'new_password123',
        ]);

        $response->assertStatus(400)
                 ->assertJson(['message' => 'El enlace de recuperación es inválido o ya ha sido utilizado.']);
    }

    public function test_validates_password_length_and_confirmation()
    {
        $token = Str::random(60);
        $this->createUser([
            'reset_token' => $token,
        ]);

        // Short password
        $response1 = $this->postJson("/api/reset-password", [
            'token' => $token,
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);

        $response1->assertStatus(422)
                  ->assertJsonValidationErrors(['password']);

        // Mismatched confirmation
        $response2 = $this->postJson("/api/reset-password", [
            'token' => $token,
            'password' => 'new_password123',
            'password_confirmation' => 'mismatch',
        ]);

        $response2->assertStatus(422)
                  ->assertJsonValidationErrors(['password']);
    }
}
