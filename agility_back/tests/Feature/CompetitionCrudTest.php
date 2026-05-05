<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\Competition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompetitionCrudTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $admin;
    protected $staff;
    protected $member;

    protected function setUp(): void
    {
        parent::setUp();

        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);
        $this->admin = User::factory()->create(['role' => 'admin', 'club_id' => $this->club->id]);
        $this->staff = User::factory()->create(['role' => 'staff', 'club_id' => $this->club->id]);
        $this->member = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
    }

    public function test_permite_a_un_administrador_crear_una_competicion()
    {
        $payload = [
            'nombre' => 'Trofeo Agility Asturias',
            'lugar' => 'Siero',
            'fecha_evento' => '2026-08-15',
            'fecha_fin_evento' => '2026-08-16',
            'fecha_limite' => '2026-08-01',
            'forma_pago' => 'Transferencia',
            'tipo' => 'competicion',
            'federacion' => 'RSCE',
            'judge_name' => 'Juez Internacional'
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/competitions', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('competitions', [
            'nombre' => 'Trofeo Agility Asturias',
            'tipo' => 'competicion',
            'federacion' => 'RSCE',
            'club_id' => $this->club->id,
        ]);
    }

    public function test_permite_a_un_staff_crear_una_competicion()
    {
        $payload = [
            'nombre' => 'Seminario Agility',
            'lugar' => 'Gijón',
            'fecha_evento' => '2026-09-10',
            'tipo' => 'otros',
        ];

        $response = $this->actingAs($this->staff)->postJson('/api/competitions', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('competitions', [
            'nombre' => 'Seminario Agility',
            'tipo' => 'otros',
        ]);
    }

    public function test_no_permite_a_un_miembro_crear_una_competicion()
    {
        $payload = [
            'nombre' => 'Seminario Agility',
            'fecha_evento' => '2026-09-10',
            'tipo' => 'otros',
        ];

        $response = $this->actingAs($this->member)->postJson('/api/competitions', $payload);

        $response->assertStatus(403);
    }

    public function test_permite_a_un_administrador_modificar_una_competicion()
    {
        $competition = Competition::factory()->create([
            'nombre' => 'Nombre Antiguo',
            'club_id' => $this->club->id,
        ]);

        $payload = [
            'nombre' => 'Nombre Nuevo',
            'lugar' => 'Siero',
            'fecha_evento' => '2026-08-15',
            'tipo' => 'competicion',
            'federacion' => 'RSCE',
        ];

        $response = $this->actingAs($this->admin)->postJson("/api/competitions/{$competition->id}", $payload);

        $response->assertStatus(200);
        $this->assertDatabaseHas('competitions', [
            'id' => $competition->id,
            'nombre' => 'Nombre Nuevo',
        ]);
    }

    public function test_requiere_federacion_si_tipo_es_competicion()
    {
        $payload = [
            'nombre' => 'Trofeo Sin Federacion',
            'fecha_evento' => '2026-08-15',
            'tipo' => 'competicion',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/competitions', $payload);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['federacion']);
    }

    public function test_permite_a_un_administrador_cancelar_o_eliminar_una_competicion()
    {
        $competition = Competition::factory()->create([
            'fecha_evento' => now()->addDays(10)->format('Y-m-d'),
            'fecha_fin_evento' => null,
            'club_id' => $this->club->id,
        ]);

        $response = $this->actingAs($this->admin)->postJson("/api/competitions/{$competition->id}/delete");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('competitions', [
            'id' => $competition->id,
        ]);
    }

    public function test_no_permite_eliminar_eventos_historicos()
    {
        $competition = Competition::factory()->create([
            'fecha_evento' => now()->subDays(10)->format('Y-m-d'),
            'fecha_fin_evento' => null,
            'club_id' => $this->club->id,
        ]);

        $response = $this->actingAs($this->admin)->postJson("/api/competitions/{$competition->id}/delete");
        
        $response->assertStatus(403);
    }

    public function test_competition_does_not_return_dogs_from_other_clubs()
    {
        $otherClub = Club::create([
            'name' => 'Other Club',
            'subdomain' => 'otherclub',
            'slug' => 'otherclub',
            'db_connection' => 'sqlite'
        ]);
        
        // Creamos un perro que pertenece a otro club
        $otherDog = \App\Models\Dog::factory()->create([
            'club_id' => $otherClub->id,
            'user_id' => \App\Models\User::factory()->create(['club_id' => $otherClub->id])->id
        ]);
        
        // Creamos una competición de nuestro club
        $competition = Competition::factory()->create([
            'club_id' => $this->club->id,
        ]);

        // Forzamos en base de datos la asistencia del perro del otro club (simulando un error o hack)
        \Illuminate\Support\Facades\DB::table('competition_dog')->insert([
            'competition_id' => $competition->id,
            'dog_id' => $otherDog->id,
            'user_id' => $this->admin->id
        ]);

        // Hacemos la petición como STAFF de NUESTRO club
        $response = $this->actingAs($this->staff)->getJson('/api/competitions');

        $response->assertStatus(200);
        
        // Verificamos que el perro del otro club NUNCA aparece en all_attending_dog_ids
        $competitionResponse = collect($response->json())->where('id', $competition->id)->first();
        
        $this->assertFalse(in_array($otherDog->id, $competitionResponse['all_attending_dog_ids']));
    }
}
