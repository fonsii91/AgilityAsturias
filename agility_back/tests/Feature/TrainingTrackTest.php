<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\TimeSlot;
use App\Models\TrainingTrack;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrainingTrackTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $otherClub;
    protected $manager;
    protected $staff;
    protected $member;

    protected function setUp(): void
    {
        parent::setUp();

        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite',
        ]);

        $this->otherClub = Club::create([
            'name' => 'Other Club',
            'subdomain' => 'otherclub',
            'slug' => 'otherclub',
            'db_connection' => 'sqlite',
        ]);

        $this->manager = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'manager',
        ]);

        $this->staff = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'staff',
        ]);

        $this->member = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'member',
        ]);
    }

    public function test_al_crear_un_club_se_crea_su_pista_principal_por_defecto()
    {
        $this->assertDatabaseHas('training_tracks', [
            'club_id' => $this->club->id,
            'name' => TrainingTrack::DEFAULT_NAME,
        ]);

        $this->assertEquals(1, TrainingTrack::withoutGlobalScopes()
            ->where('club_id', $this->club->id)->count());
    }

    public function test_permite_al_gestor_crear_una_pista()
    {
        $response = $this->actingAs($this->manager)->postJson('/api/training-tracks', [
            'name' => 'Pista exterior',
            'surface' => 'cesped',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('training_tracks', [
            'club_id' => $this->club->id,
            'name' => 'Pista exterior',
            'surface' => 'cesped',
        ]);
    }

    public function test_rechaza_un_terreno_no_valido()
    {
        $response = $this->actingAs($this->manager)->postJson('/api/training-tracks', [
            'name' => 'Pista rara',
            'surface' => 'asfalto',
        ]);

        $response->assertStatus(422);
    }

    public function test_el_terreno_es_obligatorio()
    {
        $response = $this->actingAs($this->manager)->postJson('/api/training-tracks', [
            'name' => 'Pista sin terreno',
        ]);

        $response->assertStatus(422);
    }

    public function test_deniega_al_staff_crear_pistas_pero_permite_listarlas()
    {
        $this->actingAs($this->staff)->postJson('/api/training-tracks', [
            'name' => 'Pista staff',
            'surface' => 'tierra',
        ])->assertStatus(403);

        $this->actingAs($this->staff)->getJson('/api/training-tracks')
            ->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_el_listado_solo_devuelve_pistas_del_propio_club()
    {
        TrainingTrack::factory()->create(['club_id' => $this->otherClub->id]);

        $response = $this->actingAs($this->manager)->getJson('/api/training-tracks');

        $response->assertStatus(200)->assertJsonCount(1);
        $this->assertEquals($this->club->id, $response->json('0.club_id'));
    }

    public function test_permite_al_gestor_editar_una_pista()
    {
        $track = TrainingTrack::withoutGlobalScopes()
            ->where('club_id', $this->club->id)->first();

        $response = $this->actingAs($this->manager)->postJson("/api/training-tracks/{$track->id}", [
            'name' => 'Pista central',
            'surface' => 'cesped_artificial',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('training_tracks', [
            'id' => $track->id,
            'name' => 'Pista central',
            'surface' => 'cesped_artificial',
        ]);
    }

    public function test_no_permite_editar_pistas_de_otro_club()
    {
        $foreignTrack = TrainingTrack::factory()->create(['club_id' => $this->otherClub->id]);

        $response = $this->actingAs($this->manager)->postJson("/api/training-tracks/{$foreignTrack->id}", [
            'name' => 'Hackeada',
        ]);

        $response->assertStatus(404);
    }

    public function test_impide_borrar_la_ultima_pista_del_club()
    {
        $track = TrainingTrack::withoutGlobalScopes()
            ->where('club_id', $this->club->id)->first();

        $response = $this->actingAs($this->manager)->postJson("/api/training-tracks/{$track->id}/delete");

        $response->assertStatus(422);
        $this->assertDatabaseHas('training_tracks', ['id' => $track->id]);
    }

    public function test_al_borrar_una_pista_sus_horarios_pasan_a_la_pista_principal()
    {
        $mainTrack = TrainingTrack::withoutGlobalScopes()
            ->where('club_id', $this->club->id)->first();
        $secondTrack = TrainingTrack::factory()->create(['club_id' => $this->club->id]);

        $slot = TimeSlot::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $secondTrack->id,
        ]);

        // Reserva activa sobre la clase: debe conservarse intacta (las clases
        // no se borran al eliminar la pista, se reasignan).
        $dog = \App\Models\Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $this->member->id]);
        $reservation = new \App\Models\Reservation([
            'slot_id' => $slot->id,
            'user_id' => $this->member->id,
            'dog_id' => $dog->id,
            'date' => now()->addDays(3)->toDateString(),
            'status' => 'active',
        ]);
        $reservation->club_id = $this->club->id;
        $reservation->save();

        $response = $this->actingAs($this->manager)->postJson("/api/training-tracks/{$secondTrack->id}/delete");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('training_tracks', ['id' => $secondTrack->id]);
        $this->assertDatabaseHas('time_slots', [
            'id' => $slot->id,
            'training_track_id' => $mainTrack->id,
        ]);
        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'active',
        ]);
    }

    public function test_un_horario_nuevo_se_asigna_a_la_pista_principal_si_no_se_indica()
    {
        $mainTrack = TrainingTrack::withoutGlobalScopes()
            ->where('club_id', $this->club->id)->first();

        $response = $this->actingAs($this->manager)->postJson('/api/time-slots', [
            'day' => 'Lunes',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'max_bookings' => 5,
        ]);

        $response->assertStatus(201);
        $this->assertEquals($mainTrack->id, $response->json('training_track_id'));
    }

    public function test_un_horario_puede_asignarse_a_una_pista_concreta()
    {
        $secondTrack = TrainingTrack::factory()->create(['club_id' => $this->club->id]);

        $response = $this->actingAs($this->manager)->postJson('/api/time-slots', [
            'day' => 'Martes',
            'start_time' => '18:00',
            'end_time' => '19:00',
            'max_bookings' => 6,
            'training_track_id' => $secondTrack->id,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('time_slots', [
            'id' => $response->json('id'),
            'training_track_id' => $secondTrack->id,
        ]);
    }

    public function test_rechaza_asignar_un_horario_a_una_pista_de_otro_club()
    {
        $foreignTrack = TrainingTrack::factory()->create(['club_id' => $this->otherClub->id]);

        $response = $this->actingAs($this->manager)->postJson('/api/time-slots', [
            'day' => 'Martes',
            'start_time' => '18:00',
            'end_time' => '19:00',
            'max_bookings' => 6,
            'training_track_id' => $foreignTrack->id,
        ]);

        $response->assertStatus(422);
    }
}
