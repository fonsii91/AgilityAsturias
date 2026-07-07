<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\Dog;
use App\Models\Reservation;
use App\Models\TimeSlot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassBonusTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $manager;
    protected $staff;
    protected $member;
    protected $dog;
    protected $slot;
    protected $futureDate;

    protected function setUp(): void
    {
        parent::setUp();

        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite',
        ]);

        // Funcionalidad de bonos activada (opt-in del gestor)
        $this->club->settings = ['class_bonuses_enabled' => true];
        $this->club->save();

        $this->manager = User::factory()->create(['club_id' => $this->club->id, 'role' => 'manager']);
        $this->staff = User::factory()->create(['club_id' => $this->club->id, 'role' => 'staff']);
        $this->member = User::factory()->create(['club_id' => $this->club->id, 'role' => 'member']);

        $this->dog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $this->member->id]);
        $this->member->dogs()->attach($this->dog->id);

        $this->slot = TimeSlot::factory()->create(['club_id' => $this->club->id]);
        $this->futureDate = now()->addDays(7)->format('Y-m-d');
    }

    private function setBonus(User $user, int $balance): void
    {
        $user->class_bonus_balance = $balance;
        $user->save();
    }

    private function bookAs(User $actor, array $overrides = [])
    {
        return $this->actingAs($actor)->postJson('/api/reservations', array_merge([
            'slot_id' => $this->slot->id,
            'user_id' => $this->member->id,
            'date' => $this->futureDate,
            'dog_ids' => [$this->dog->id],
        ], $overrides));
    }

    // --- Gestión de bonos ---

    public function test_el_staff_anade_clases_al_bono_de_un_socio()
    {
        $response = $this->actingAs($this->staff)->postJson("/api/class-bonuses/{$this->member->id}/add", [
            'classes' => 10,
        ]);

        $response->assertStatus(200);
        $this->assertEquals(10, $this->member->fresh()->class_bonus_balance);

        // Añadir más suma al contador
        $this->actingAs($this->staff)->postJson("/api/class-bonuses/{$this->member->id}/add", ['classes' => 5]);
        $this->assertEquals(15, $this->member->fresh()->class_bonus_balance);
    }

    public function test_una_correccion_negativa_no_deja_el_bono_por_debajo_de_cero()
    {
        $this->setBonus($this->member, 2);

        $this->actingAs($this->staff)->postJson("/api/class-bonuses/{$this->member->id}/add", ['classes' => -5])
            ->assertStatus(200);

        $this->assertEquals(0, $this->member->fresh()->class_bonus_balance);
    }

    public function test_bloquea_la_gestion_de_bonos_si_la_funcionalidad_esta_desactivada()
    {
        $this->club->settings = ['class_bonuses_enabled' => false];
        $this->club->save();

        $this->actingAs($this->staff)->postJson("/api/class-bonuses/{$this->member->id}/add", ['classes' => 10])
            ->assertStatus(403);
    }

    public function test_un_socio_no_puede_anadirse_bono()
    {
        $this->actingAs($this->member)->postJson("/api/class-bonuses/{$this->member->id}/add", ['classes' => 10])
            ->assertStatus(403);
    }

    // --- Consumo al reservar ---

    public function test_apuntarse_a_una_clase_consume_una_clase_del_bono()
    {
        $this->setBonus($this->member, 3);

        $this->bookAs($this->member)->assertStatus(201);

        $this->assertEquals(2, $this->member->fresh()->class_bonus_balance);
        $this->assertDatabaseHas('reservations', [
            'user_id' => $this->member->id,
            'dog_id' => $this->dog->id,
            'bonus_consumed' => true,
        ]);
    }

    public function test_reservar_con_dos_perros_consume_dos_clases()
    {
        $secondDog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $this->member->id]);
        $this->member->dogs()->attach($secondDog->id);
        $this->setBonus($this->member, 5);

        $this->bookAs($this->member, ['dog_ids' => [$this->dog->id, $secondDog->id]])->assertStatus(201);

        $this->assertEquals(3, $this->member->fresh()->class_bonus_balance);
    }

    public function test_sin_clases_en_el_bono_no_se_puede_apuntar()
    {
        $this->setBonus($this->member, 0);

        $this->bookAs($this->member)->assertStatus(422);

        $this->assertDatabaseMissing('reservations', ['user_id' => $this->member->id]);
        $this->assertEquals(0, $this->member->fresh()->class_bonus_balance);
    }

    public function test_el_staff_tampoco_puede_apuntar_a_un_socio_sin_bono()
    {
        $this->setBonus($this->member, 0);

        $response = $this->bookAs($this->staff);

        $response->assertStatus(422);
        $this->assertStringContainsString('bono', $response->json('message'));
    }

    public function test_las_reservas_del_staff_para_si_mismo_no_consumen_bono()
    {
        $staffDog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $this->staff->id]);
        $this->staff->dogs()->attach($staffDog->id);

        $this->bookAs($this->staff, [
            'user_id' => $this->staff->id,
            'dog_ids' => [$staffDog->id],
        ])->assertStatus(201);

        $this->assertDatabaseHas('reservations', [
            'user_id' => $this->staff->id,
            'bonus_consumed' => false,
        ]);
    }

    public function test_con_la_funcionalidad_desactivada_no_se_consume_bono()
    {
        $this->club->settings = ['class_bonuses_enabled' => false];
        $this->club->save();
        $this->setBonus($this->member, 3);

        $this->bookAs($this->member)->assertStatus(201);

        $this->assertEquals(3, $this->member->fresh()->class_bonus_balance);
        $this->assertDatabaseHas('reservations', [
            'user_id' => $this->member->id,
            'bonus_consumed' => false,
        ]);
    }

    // --- Devoluciones ---

    public function test_cancelar_la_inscripcion_devuelve_la_clase_al_bono()
    {
        $this->setBonus($this->member, 3);
        $this->bookAs($this->member)->assertStatus(201);
        $this->assertEquals(2, $this->member->fresh()->class_bonus_balance);

        $reservationId = Reservation::where('user_id', $this->member->id)->first()->id;

        $this->actingAs($this->member)->postJson("/api/reservations/{$reservationId}/delete")
            ->assertStatus(204);

        $this->assertEquals(3, $this->member->fresh()->class_bonus_balance);
        $this->assertDatabaseHas('reservations', [
            'id' => $reservationId,
            'status' => 'cancelled',
            'bonus_consumed' => false,
        ]);
    }

    public function test_cancelar_dos_veces_no_devuelve_dos_clases()
    {
        $this->setBonus($this->member, 3);
        $this->bookAs($this->member)->assertStatus(201);
        $reservationId = Reservation::where('user_id', $this->member->id)->first()->id;

        $this->actingAs($this->staff)->postJson("/api/reservations/{$reservationId}/delete")->assertStatus(204);
        $this->actingAs($this->staff)->postJson("/api/reservations/{$reservationId}/delete")->assertStatus(204);

        $this->assertEquals(3, $this->member->fresh()->class_bonus_balance);
    }

    public function test_el_staff_al_desapuntar_al_socio_en_bloque_devuelve_las_clases()
    {
        $secondDog = Dog::factory()->create(['club_id' => $this->club->id, 'user_id' => $this->member->id]);
        $this->member->dogs()->attach($secondDog->id);
        $this->setBonus($this->member, 5);

        $this->bookAs($this->member, ['dog_ids' => [$this->dog->id, $secondDog->id]])->assertStatus(201);
        $this->assertEquals(3, $this->member->fresh()->class_bonus_balance);

        $this->actingAs($this->staff)->postJson('/api/reservations/block/delete', [
            'slot_id' => $this->slot->id,
            'date' => $this->futureDate,
            'user_id' => $this->member->id,
        ])->assertStatus(204);

        $this->assertEquals(5, $this->member->fresh()->class_bonus_balance);
    }

    public function test_anular_la_clase_por_excepcion_devuelve_las_clases_consumidas()
    {
        $this->setBonus($this->member, 3);
        $this->bookAs($this->member)->assertStatus(201);
        $this->assertEquals(2, $this->member->fresh()->class_bonus_balance);

        $this->actingAs($this->staff)->postJson('/api/time-slot-exceptions', [
            'slot_id' => $this->slot->id,
            'date' => $this->futureDate,
            'reason' => 'Lluvia',
        ])->assertStatus(201);

        $this->assertEquals(3, $this->member->fresh()->class_bonus_balance);
    }

    public function test_borrar_el_horario_devuelve_las_clases_de_las_reservas_activas()
    {
        $this->setBonus($this->member, 3);
        $this->bookAs($this->member)->assertStatus(201);
        $this->assertEquals(2, $this->member->fresh()->class_bonus_balance);

        $this->actingAs($this->manager)->postJson("/api/time-slots/{$this->slot->id}/delete")
            ->assertStatus(204);

        $this->assertEquals(3, $this->member->fresh()->class_bonus_balance);
    }

    public function test_una_reserva_hecha_sin_funcionalidad_no_devuelve_bono_al_cancelarla_con_ella_activa()
    {
        // Reserva creada con los bonos desactivados
        $this->club->settings = ['class_bonuses_enabled' => false];
        $this->club->save();
        $this->setBonus($this->member, 3);
        $this->bookAs($this->member)->assertStatus(201);

        // El gestor activa los bonos y el socio cancela después
        $this->club->settings = ['class_bonuses_enabled' => true];
        $this->club->save();

        $reservationId = Reservation::where('user_id', $this->member->id)->first()->id;
        $this->actingAs($this->member)->postJson("/api/reservations/{$reservationId}/delete")
            ->assertStatus(204);

        // No consumió, no se devuelve: el saldo no cambia
        $this->assertEquals(3, $this->member->fresh()->class_bonus_balance);
    }
}
