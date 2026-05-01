<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Club;
use App\Models\TimeSlot;
use App\Models\Reservation;
use App\Models\TimeSlotException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimeSlotTest extends TestCase
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
        
        $this->admin = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'admin',
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

    public function test_permite_a_un_administrador_crear_un_horario()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/time-slots', [
            'day' => 'Lunes',
            'name' => 'Clase de Agility',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'max_bookings' => 5,
        ]);

        $response->assertStatus(201);
        
        $this->assertDatabaseHas('time_slots', [
            'club_id' => $this->club->id,
            'day' => 'Lunes',
            'name' => 'Clase de Agility',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'max_bookings' => 5,
        ]);
    }

    public function test_deniega_a_un_miembro_crear_un_horario()
    {
        $response = $this->actingAs($this->member)->postJson('/api/time-slots', [
            'day' => 'Martes',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'max_bookings' => 5,
        ]);

        $response->assertStatus(403);
    }

    public function test_permite_a_un_staff_ver_todos_los_horarios()
    {
        TimeSlot::factory()->count(3)->create([
            'club_id' => $this->club->id,
        ]);

        $response = $this->actingAs($this->staff)->getJson('/api/time-slots');

        $response->assertStatus(200);
        $response->assertJsonCount(3);
    }

    public function test_permite_a_un_staff_actualizar_un_horario()
    {
        $timeSlot = TimeSlot::factory()->create([
            'club_id' => $this->club->id,
            'max_bookings' => 5,
        ]);

        $response = $this->actingAs($this->staff)->postJson("/api/time-slots/{$timeSlot->id}", [
            'max_bookings' => 10,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('time_slots', [
            'id' => $timeSlot->id,
            'max_bookings' => 10,
        ]);
    }

    public function test_permite_a_un_staff_eliminar_un_horario_y_elimina_en_cascada()
    {
        $timeSlot = TimeSlot::factory()->create([
            'club_id' => $this->club->id,
        ]);

        $dog = \App\Models\Dog::factory()->create([
            'user_id' => $this->member->id,
            'club_id' => $this->club->id,
        ]);

        // Create reservation for cascade check
        Reservation::factory()->create([
            'club_id' => $this->club->id,
            'user_id' => $this->member->id,
            'dog_id' => $dog->id,
            'slot_id' => $timeSlot->id,
        ]);

        // Create exception for cascade check
        \App\Models\TimeSlotException::unguarded(function () use ($timeSlot) {
            \App\Models\TimeSlotException::create([
                'club_id' => $this->club->id,
                'slot_id' => $timeSlot->id,
                'date' => now()->addDays(2)->toDateString(),
            ]);
        });

        $response = $this->actingAs($this->staff)->postJson("/api/time-slots/{$timeSlot->id}/delete");

        $response->assertStatus(204);

        $this->assertDatabaseMissing('time_slots', [
            'id' => $timeSlot->id,
        ]);
        
        $this->assertDatabaseMissing('reservations', [
            'slot_id' => $timeSlot->id,
        ]);

        $this->assertDatabaseMissing('time_slot_exceptions', [
            'slot_id' => $timeSlot->id,
        ]);
    }
}
