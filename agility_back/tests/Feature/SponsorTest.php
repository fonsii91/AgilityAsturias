<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\User;
use App\Models\Sponsor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SponsorTest extends TestCase
{
    use RefreshDatabase;

    private $club;
    private $staff;
    private $member;

    protected function setUp(): void
    {
        parent::setUp();
        $this->club = Club::create(['name' => 'Club Test', 'slug' => 'club-test']);
        $this->staff = User::factory()->create(['role' => 'staff', 'club_id' => $this->club->id]);
        $this->member = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
    }

    public function test_anyone_can_retrieve_sponsors_list()
    {
        Sponsor::create([
            'club_id' => $this->club->id,
            'nombre' => 'Patrocinador Test',
            'descripcion' => 'Una descripción de prueba',
            'enlace' => 'https://test-sponsor.com',
            'imagen' => 'data:image/png;base64,abc'
        ]);

        $response = $this->getJson('/api/sponsors');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment([
                'nombre' => 'Patrocinador Test',
                'enlace' => 'https://test-sponsor.com'
            ]);
    }

    public function test_non_staff_cannot_manage_sponsors()
    {
        Sanctum::actingAs($this->member);

        // Attempt creation
        $responseCreate = $this->postJson('/api/sponsors', [
            'nombre' => 'Nuevo Patrocinador'
        ]);
        $responseCreate->assertStatus(403);
    }

    public function test_staff_can_create_sponsor()
    {
        Sanctum::actingAs($this->staff);

        $response = $this->postJson('/api/sponsors', [
            'nombre' => 'Nuevo Patrocinador',
            'descripcion' => 'Descripción del nuevo',
            'enlace' => 'https://new-sponsor.com',
            'imagen' => 'data:image/png;base64,xyz'
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'nombre' => 'Nuevo Patrocinador'
            ]);

        $this->assertDatabaseHas('sponsors', [
            'club_id' => $this->club->id,
            'nombre' => 'Nuevo Patrocinador'
        ]);
    }

    public function test_staff_can_update_sponsor()
    {
        Sanctum::actingAs($this->staff);

        $sponsor = Sponsor::create([
            'club_id' => $this->club->id,
            'nombre' => 'Patrocinador Original',
            'descripcion' => 'Original',
            'enlace' => 'https://original.com'
        ]);

        $response = $this->postJson("/api/sponsors/{$sponsor->id}", [
            'nombre' => 'Patrocinador Actualizado',
            'descripcion' => 'Actualizado',
            'enlace' => 'https://updated.com'
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'nombre' => 'Patrocinador Actualizado'
            ]);

        $this->assertDatabaseHas('sponsors', [
            'id' => $sponsor->id,
            'nombre' => 'Patrocinador Actualizado'
        ]);
    }

    public function test_staff_can_delete_sponsor()
    {
        Sanctum::actingAs($this->staff);

        $sponsor = Sponsor::create([
            'club_id' => $this->club->id,
            'nombre' => 'Patrocinador a Borrar'
        ]);

        $response = $this->postJson("/api/sponsors/{$sponsor->id}/delete");

        $response->assertStatus(204);

        $this->assertDatabaseMissing('sponsors', [
            'id' => $sponsor->id
        ]);
    }
}
