<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\TimeSlot;
use App\Models\TrackReservation;
use App\Models\TrainingTrack;
use App\Models\User;
use App\Notifications\TrackReservationCancelledNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class TrackReservationTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $manager;
    protected $staff;
    protected $member;
    protected $member2;
    protected $mainTrack;
    protected $nextMonday;

    protected function setUp(): void
    {
        parent::setUp();

        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite',
        ]);

        // Módulo de reserva individual de pistas activado (opt-in del gestor)
        $this->club->settings = ['track_booking_enabled' => true];
        $this->club->save();

        $this->manager = User::factory()->create(['club_id' => $this->club->id, 'role' => 'manager']);
        $this->staff = User::factory()->create(['club_id' => $this->club->id, 'role' => 'staff']);
        $this->member = User::factory()->create(['club_id' => $this->club->id, 'role' => 'member']);
        $this->member2 = User::factory()->create(['club_id' => $this->club->id, 'role' => 'member']);

        $this->mainTrack = TrainingTrack::withoutGlobalScopes()
            ->where('club_id', $this->club->id)->first();

        $this->nextMonday = Carbon::now()->next('Monday')->toDateString();
    }

    public function test_bloquea_el_acceso_si_el_modulo_esta_desactivado()
    {
        $this->club->settings = ['track_booking_enabled' => false];
        $this->club->save();

        $this->actingAs($this->member)
            ->getJson('/api/track-bookings/availability?date=' . $this->nextMonday)
            ->assertStatus(403);

        $this->actingAs($this->member)->postJson('/api/track-bookings', [
            'training_track_id' => $this->mainTrack->id,
            'date' => $this->nextMonday,
            'start_time' => '10:00',
        ])->assertStatus(403);
    }

    public function test_un_socio_reserva_una_pista_libre_una_hora()
    {
        $response = $this->actingAs($this->member)->postJson('/api/track-bookings', [
            'training_track_id' => $this->mainTrack->id,
            'date' => $this->nextMonday,
            'start_time' => '10:00',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('track_reservations', [
            'club_id' => $this->club->id,
            'training_track_id' => $this->mainTrack->id,
            'user_id' => $this->member->id,
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);
    }

    public function test_no_se_puede_reservar_una_franja_ocupada_por_clase()
    {
        TimeSlot::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $this->mainTrack->id,
            'day' => 'Lunes',
            'start_time' => '10:00',
            'end_time' => '11:30',
        ]);

        $this->actingAs($this->member)->postJson('/api/track-bookings', [
            'training_track_id' => $this->mainTrack->id,
            'date' => $this->nextMonday,
            'start_time' => '10:00',
        ])->assertStatus(422);

        // También bloquea la segunda hora parcialmente solapada (11:00-12:00)
        $this->actingAs($this->member)->postJson('/api/track-bookings', [
            'training_track_id' => $this->mainTrack->id,
            'date' => $this->nextMonday,
            'start_time' => '11:00',
        ])->assertStatus(422);
    }

    public function test_la_disponibilidad_es_por_pista_no_global()
    {
        $secondTrack = TrainingTrack::factory()->create(['club_id' => $this->club->id]);

        // Clase en la pista principal, lunes 10:00-11:30
        TimeSlot::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $this->mainTrack->id,
            'day' => 'Lunes',
            'start_time' => '10:00',
            'end_time' => '11:30',
        ]);

        // La misma franja en la OTRA pista sigue siendo reservable
        $this->actingAs($this->member)->postJson('/api/track-bookings', [
            'training_track_id' => $secondTrack->id,
            'date' => $this->nextMonday,
            'start_time' => '10:00',
        ])->assertStatus(201);
    }

    public function test_no_se_puede_reservar_una_franja_ya_reservada_por_otro_socio()
    {
        TrackReservation::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $this->mainTrack->id,
            'user_id' => $this->member2->id,
            'date' => $this->nextMonday,
            'start_time' => '17:00',
            'end_time' => '18:00',
        ]);

        $this->actingAs($this->member)->postJson('/api/track-bookings', [
            'training_track_id' => $this->mainTrack->id,
            'date' => $this->nextMonday,
            'start_time' => '17:00',
        ])->assertStatus(422);
    }

    public function test_la_disponibilidad_marca_el_estado_de_cada_franja()
    {
        TimeSlot::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $this->mainTrack->id,
            'day' => 'Lunes',
            'name' => 'Iniciación',
            'start_time' => '10:00',
            'end_time' => '11:30',
        ]);

        TrackReservation::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $this->mainTrack->id,
            'user_id' => $this->member2->id,
            'date' => $this->nextMonday,
            'start_time' => '17:00',
            'end_time' => '18:00',
        ]);

        $response = $this->actingAs($this->member2)
            ->getJson('/api/track-bookings/availability?date=' . $this->nextMonday);

        $response->assertStatus(200);

        $track = collect($response->json('tracks'))->firstWhere('id', $this->mainTrack->id);
        $slots = collect($track['slots'])->keyBy('start_time');

        $this->assertEquals('class', $slots['10:00']['status']);
        $this->assertEquals('Iniciación', $slots['10:00']['class_name']);
        $this->assertEquals('class', $slots['11:00']['status']); // solape parcial 11:00-11:30
        $this->assertEquals('free', $slots['12:00']['status']);
        $this->assertEquals('mine', $slots['17:00']['status']); // reserva del propio member2
    }

    public function test_crear_una_clase_elimina_las_reservas_individuales_solapadas_y_notifica()
    {
        Notification::fake();

        $reservation = TrackReservation::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $this->mainTrack->id,
            'user_id' => $this->member->id,
            'date' => $this->nextMonday,
            'start_time' => '18:00',
            'end_time' => '19:00',
        ]);

        // Reserva en OTRA pista a la misma hora: no debe verse afectada
        $otherTrack = TrainingTrack::factory()->create(['club_id' => $this->club->id]);
        $untouched = TrackReservation::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $otherTrack->id,
            'user_id' => $this->member2->id,
            'date' => $this->nextMonday,
            'start_time' => '18:00',
            'end_time' => '19:00',
        ]);

        $this->actingAs($this->staff)->postJson('/api/time-slots', [
            'day' => 'Lunes',
            'start_time' => '18:00',
            'end_time' => '19:30',
            'max_bookings' => 6,
            'training_track_id' => $this->mainTrack->id,
        ])->assertStatus(201);

        $this->assertDatabaseMissing('track_reservations', ['id' => $reservation->id]);
        $this->assertDatabaseHas('track_reservations', ['id' => $untouched->id]);

        Notification::assertSentTo($this->member, TrackReservationCancelledNotification::class);
        Notification::assertNotSentTo($this->member2, TrackReservationCancelledNotification::class);
    }

    public function test_el_socio_cancela_su_reserva_pero_no_las_ajenas()
    {
        $own = TrackReservation::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $this->mainTrack->id,
            'user_id' => $this->member->id,
            'date' => $this->nextMonday,
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);

        $foreign = TrackReservation::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $this->mainTrack->id,
            'user_id' => $this->member2->id,
            'date' => $this->nextMonday,
            'start_time' => '12:00',
            'end_time' => '13:00',
        ]);

        $this->actingAs($this->member)
            ->postJson("/api/track-bookings/{$own->id}/delete")
            ->assertStatus(204);
        $this->assertDatabaseMissing('track_reservations', ['id' => $own->id]);

        $this->actingAs($this->member)
            ->postJson("/api/track-bookings/{$foreign->id}/delete")
            ->assertStatus(403);

        // El staff sí puede cancelar reservas de otros
        $this->actingAs($this->staff)
            ->postJson("/api/track-bookings/{$foreign->id}/delete")
            ->assertStatus(204);
    }

    public function test_rechaza_franjas_pasadas_no_en_punto_o_fuera_de_horario()
    {
        $this->actingAs($this->member)->postJson('/api/track-bookings', [
            'training_track_id' => $this->mainTrack->id,
            'date' => Carbon::yesterday()->toDateString(),
            'start_time' => '10:00',
        ])->assertStatus(422);

        $this->actingAs($this->member)->postJson('/api/track-bookings', [
            'training_track_id' => $this->mainTrack->id,
            'date' => $this->nextMonday,
            'start_time' => '10:30',
        ])->assertStatus(422);

        $this->actingAs($this->member)->postJson('/api/track-bookings', [
            'training_track_id' => $this->mainTrack->id,
            'date' => $this->nextMonday,
            'start_time' => '23:00',
        ])->assertStatus(422);
    }

    public function test_una_clase_anulada_por_excepcion_libera_la_pista()
    {
        $slot = TimeSlot::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $this->mainTrack->id,
            'day' => 'Lunes',
            'start_time' => '10:00',
            'end_time' => '11:30',
        ]);

        \App\Models\TimeSlotException::unguarded(function () use ($slot) {
            \App\Models\TimeSlotException::create([
                'club_id' => $this->club->id,
                'slot_id' => $slot->id,
                'date' => $this->nextMonday,
            ]);
        });

        $this->actingAs($this->member)->postJson('/api/track-bookings', [
            'training_track_id' => $this->mainTrack->id,
            'date' => $this->nextMonday,
            'start_time' => '10:00',
        ])->assertStatus(201);
    }

    public function test_mis_reservas_solo_devuelve_las_del_usuario()
    {
        TrackReservation::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $this->mainTrack->id,
            'user_id' => $this->member->id,
            'date' => $this->nextMonday,
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);

        TrackReservation::factory()->create([
            'club_id' => $this->club->id,
            'training_track_id' => $this->mainTrack->id,
            'user_id' => $this->member2->id,
            'date' => $this->nextMonday,
            'start_time' => '12:00',
            'end_time' => '13:00',
        ]);

        $response = $this->actingAs($this->member)->getJson('/api/track-bookings/my');

        $response->assertStatus(200)->assertJsonCount(1);
        $this->assertEquals($this->member->id, $response->json('0.user_id'));
    }
}
