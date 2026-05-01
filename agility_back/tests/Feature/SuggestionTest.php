<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Club;
use App\Models\Suggestion;
use App\Notifications\NewSuggestionNotification;
use App\Notifications\SuggestionResolvedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class SuggestionTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $user;
    protected $admin;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);
        
        $this->user = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'member'
        ]);
        
        $this->admin = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'admin'
        ]);
    }

    public function test_permite_a_un_miembro_enviar_una_sugerencia_y_notifica_a_los_admins()
    {
        Notification::fake();

        $response = $this->actingAs($this->user)->postJson('/api/suggestions', [
            'type' => 'suggestion',
            'content' => 'Me gustaría que añadieran una función para...',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.type', 'suggestion')
            ->assertJsonPath('data.content', 'Me gustaría que añadieran una función para...');

        $this->assertDatabaseHas('suggestions', [
            'user_id' => $this->user->id,
            'type' => 'suggestion',
            'status' => 'pending',
            'club_id' => $this->club->id,
        ]);

        Notification::assertSentTo(
            [$this->admin],
            NewSuggestionNotification::class
        );
    }

    public function test_valida_que_el_contenido_y_tipo_son_obligatorios()
    {
        $response = $this->actingAs($this->user)->postJson('/api/suggestions', [
            'type' => 'invalid_type',
            'content' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type', 'content']);
    }

    public function test_no_permite_a_un_usuario_ver_todas_las_sugerencias()
    {
        $response = $this->actingAs($this->user)->getJson('/api/admin/suggestions');
        $response->assertStatus(403);
    }

    public function test_permite_a_un_administrador_ver_todas_las_sugerencias_de_su_club()
    {
        Suggestion::factory()->create([
            'user_id' => $this->user->id,
            'club_id' => $this->club->id,
            'status' => 'pending'
        ]);

        // Another club
        $otherClub = Club::create([
            'name' => 'Other Club',
            'subdomain' => 'otherclub',
            'slug' => 'otherclub',
            'db_connection' => 'sqlite'
        ]);
        $otherUser = User::factory()->create(['club_id' => $otherClub->id]);
        Suggestion::factory()->create([
            'user_id' => $otherUser->id,
            'club_id' => $otherClub->id,
            'status' => 'pending'
        ]);

        // Bind active_club_id to simulate being on the club's subdomain
        app()->instance('active_club_id', $this->club->id);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/suggestions');

        $response->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_permite_a_un_administrador_marcar_una_sugerencia_como_resuelta_y_notifica_al_usuario()
    {
        Notification::fake();

        $suggestion = Suggestion::factory()->create([
            'user_id' => $this->user->id,
            'club_id' => $this->club->id,
            'status' => 'pending'
        ]);

        $response = $this->actingAs($this->admin)->postJson("/api/admin/suggestions/{$suggestion->id}/resolve");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'resolved');

        $this->assertDatabaseHas('suggestions', [
            'id' => $suggestion->id,
            'status' => 'resolved',
        ]);

        Notification::assertSentTo(
            [$this->user],
            SuggestionResolvedNotification::class
        );
    }

    public function test_permite_a_un_administrador_marcar_una_sugerencia_como_no_resuelta()
    {
        $suggestion = Suggestion::factory()->create([
            'user_id' => $this->user->id,
            'club_id' => $this->club->id,
            'status' => 'resolved'
        ]);

        $response = $this->actingAs($this->admin)->postJson("/api/admin/suggestions/{$suggestion->id}/unresolve");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'unresolved');

        $this->assertDatabaseHas('suggestions', [
            'id' => $suggestion->id,
            'status' => 'unresolved',
        ]);
    }

    public function test_no_permite_a_un_usuario_normal_resolver_una_sugerencia()
    {
        $suggestion = Suggestion::factory()->create([
            'user_id' => $this->user->id,
            'club_id' => $this->club->id,
            'status' => 'pending'
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/admin/suggestions/{$suggestion->id}/resolve");

        $response->assertStatus(403);
    }
}
