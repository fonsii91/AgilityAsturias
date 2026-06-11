<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;
use App\Mail\PasswordResetMail;
use App\Models\Club;
use App\Models\User;

class PasswordRecoveryTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->club = Club::create([
            'name' => 'Club Asturias Test',
            'slug' => 'asturias-test',
        ]);

        $this->user = User::create([
            'name' => 'Socio Test',
            'email' => 'socio@asturiastest.com',
            'password' => bcrypt('password123'),
            'role' => 'member',
            'club_id' => $this->club->id,
        ]);
    }

    public function test_forgot_password_queues_email_and_stores_hashed_token()
    {
        Mail::fake();

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'socio@asturiastest.com',
        ]);

        $response->assertStatus(200);

        Mail::assertQueued(PasswordResetMail::class, function ($mail) {
            return $mail->hasTo('socio@asturiastest.com');
        });

        $this->user->refresh();
        $this->assertNotNull($this->user->reset_token);
        $this->assertNotNull($this->user->reset_token_expires_at);
        $this->assertTrue($this->user->reset_token_expires_at->isFuture());
        // El token guardado debe ser un hash sha256 (64 caracteres hex), no el token en claro
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $this->user->reset_token);
    }

    public function test_forgot_password_is_neutral_for_unknown_email()
    {
        Mail::fake();

        $known = $this->postJson('/api/forgot-password', ['email' => 'socio@asturiastest.com']);
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'noexiste@asturiastest.com']);

        // Misma respuesta para no revelar qué emails están registrados
        $known->assertStatus(200);
        $unknown->assertStatus(200);
        $this->assertEquals($known->json('message'), $unknown->json('message'));

        Mail::assertNotQueued(PasswordResetMail::class, function ($mail) {
            return $mail->hasTo('noexiste@asturiastest.com');
        });
    }

    public function test_reset_password_with_valid_token()
    {
        $plainToken = 'token-de-prueba-valido';
        $this->user->reset_token = hash('sha256', $plainToken);
        $this->user->reset_token_expires_at = now()->addMinutes(60);
        $this->user->save();

        $response = $this->postJson('/api/reset-password', [
            'token' => $plainToken,
            'password' => 'nuevaclave123',
            'password_confirmation' => 'nuevaclave123',
        ]);

        $response->assertStatus(200);

        $this->user->refresh();
        $this->assertTrue(Hash::check('nuevaclave123', $this->user->password));
        $this->assertNull($this->user->reset_token);
        $this->assertNull($this->user->reset_token_expires_at);
    }

    public function test_reset_password_with_expired_token_fails()
    {
        $plainToken = 'token-caducado';
        $this->user->reset_token = hash('sha256', $plainToken);
        $this->user->reset_token_expires_at = now()->subMinute();
        $this->user->save();

        $response = $this->postJson('/api/reset-password', [
            'token' => $plainToken,
            'password' => 'nuevaclave123',
            'password_confirmation' => 'nuevaclave123',
        ]);

        $response->assertStatus(400);
        $response->assertJsonFragment(['message' => 'El enlace de recuperación ha caducado. Solicita uno nuevo.']);

        $this->user->refresh();
        $this->assertTrue(Hash::check('password123', $this->user->password));
    }

    public function test_reset_password_with_legacy_plain_token_is_rejected()
    {
        // Tokens antiguos guardados en claro (anteriores al hasheado) dejan de ser válidos
        $this->user->reset_token = 'token-legado-en-claro';
        $this->user->save();

        $response = $this->postJson('/api/reset-password', [
            'token' => 'token-legado-en-claro',
            'password' => 'nuevaclave123',
            'password_confirmation' => 'nuevaclave123',
        ]);

        $response->assertStatus(400);
    }

    public function test_manager_generated_link_uses_hashed_token_with_expiry()
    {
        $manager = User::create([
            'name' => 'Manager Test',
            'email' => 'manager@asturiastest.com',
            'password' => bcrypt('password123'),
            'role' => 'manager',
            'club_id' => $this->club->id,
        ]);

        $response = $this->actingAs($manager, 'sanctum')
            ->withHeader('X-Club-Slug', 'asturias-test')
            ->postJson("/api/users/{$this->user->id}/generate-reset-link");

        $response->assertStatus(200);
        $link = $response->json('link');
        $this->assertNotNull($link);

        // Extraer el token en claro del enlace y comprobar que en BD está hasheado
        parse_str(parse_url($link, PHP_URL_QUERY), $queryParams);
        $plainToken = $queryParams['token'];

        $this->user->refresh();
        $this->assertEquals(hash('sha256', $plainToken), $this->user->reset_token);
        $this->assertTrue($this->user->reset_token_expires_at->isFuture());

        // Y que el enlace generado por el gestor funciona de punta a punta
        $reset = $this->postJson('/api/reset-password', [
            'token' => $plainToken,
            'password' => 'nuevaclave123',
            'password_confirmation' => 'nuevaclave123',
        ]);
        $reset->assertStatus(200);
    }
}
