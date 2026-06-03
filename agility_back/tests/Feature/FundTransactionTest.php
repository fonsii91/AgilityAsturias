<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Club;
use App\Models\FundTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FundTransactionTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $manager;
    protected $member;
    protected $otherMember;
    protected $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->club = Club::create([
            'name' => 'Club de Agility Asturias',
            'slug' => 'asturias',
            'settings' => ['provision_fondos_enabled' => true]
        ]);

        $this->manager = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'manager'
        ]);

        $this->member = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'member'
        ]);

        $this->otherMember = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'member'
        ]);

        $this->staff = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'staff'
        ]);

        // Simula el subdominio activo configurando active_club_id
        app()->instance('active_club_id', $this->club->id);
    }

    public function test_gestor_puede_registrar_ingreso_y_gasto_para_socio()
    {
        $response = $this->actingAs($this->manager)->postJson('/api/fund-transactions', [
            'user_id' => $this->member->id,
            'amount' => 50.00,
            'type' => 'ingreso',
            'concept' => 'Depósito de fondos inicial',
            'payment_method' => 'bizum'
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('transaction.type', 'ingreso')
            ->assertJsonPath('transaction.concept', 'Depósito de fondos inicial');

        $this->assertDatabaseHas('fund_transactions', [
            'user_id' => $this->member->id,
            'amount' => 50.00,
            'type' => 'ingreso',
            'club_id' => $this->club->id,
            'created_by' => $this->manager->id
        ]);

        // Registrar un gasto
        $response2 = $this->actingAs($this->manager)->postJson('/api/fund-transactions', [
            'user_id' => $this->member->id,
            'amount' => 15.00,
            'type' => 'gasto',
            'concept' => 'Inscripción a examen sociabilidad',
            'payment_method' => 'efectivo'
        ]);

        $response2->assertStatus(200);

        $this->assertDatabaseHas('fund_transactions', [
            'user_id' => $this->member->id,
            'amount' => 15.00,
            'type' => 'gasto',
            'club_id' => $this->club->id
        ]);
    }

    public function test_socio_puede_consultar_su_propio_saldo_e_historial()
    {
        FundTransaction::create([
            'club_id' => $this->club->id,
            'user_id' => $this->member->id,
            'amount' => 100.00,
            'type' => 'ingreso',
            'concept' => 'Transferencia',
            'payment_method' => 'transferencia',
            'created_by' => $this->manager->id,
            'fecha' => now()->toDateTimeString()
        ]);

        FundTransaction::create([
            'club_id' => $this->club->id,
            'user_id' => $this->member->id,
            'amount' => 30.00,
            'type' => 'gasto',
            'concept' => 'Cuota mensual',
            'payment_method' => 'otro',
            'created_by' => $this->manager->id,
            'fecha' => now()->toDateTimeString()
        ]);

        $response = $this->actingAs($this->member)->getJson('/api/fund-transactions');

        $response->assertStatus(200)
            ->assertJsonPath('balance', 70)
            ->assertJsonCount(2, 'transactions');
    }

    public function test_socio_no_puede_consultar_saldo_de_otros_socios()
    {
        // El socio intenta consultar pasando el user_id de otro socio
        $response = $this->actingAs($this->member)->getJson('/api/fund-transactions?user_id=' . $this->otherMember->id);

        // El controlador debe forzar el ID al usuario autenticado, devolviendo sus propias transacciones (0 en este caso)
        $response->assertStatus(200)
            ->assertJsonPath('user.id', $this->member->id);
    }

    public function test_staff_no_puede_registrar_transacciones()
    {
        $response = $this->actingAs($this->staff)->postJson('/api/fund-transactions', [
            'user_id' => $this->member->id,
            'amount' => 20.00,
            'type' => 'ingreso',
            'concept' => 'Intento staff',
            'payment_method' => 'bizum'
        ]);

        $response->assertStatus(403);
    }

    public function test_modulo_desactivado_devuelve_403()
    {
        // Desactivar el módulo en la configuración del club
        $this->club->settings = ['provision_fondos_enabled' => false];
        $this->club->save();

        $response = $this->actingAs($this->member)->getJson('/api/fund-transactions');
        $response->assertStatus(403);
    }

    public function test_staff_puede_consultar_su_propia_provision_pero_no_la_de_otros()
    {
        // El staff tiene permitido ver su propio saldo (status 200)
        $response = $this->actingAs($this->staff)->getJson('/api/fund-transactions');
        $response->assertStatus(200);

        // Si intenta consultar pasando el user_id de otro socio, se debe forzar al ID del staff autenticado
        $response2 = $this->actingAs($this->staff)->getJson('/api/fund-transactions?user_id=' . $this->member->id);
        $response2->assertStatus(200)
            ->assertJsonPath('user.id', $this->staff->id);
    }

    public function test_gestor_no_puede_registrar_transaccion_para_socio_de_otro_club()
    {
        $otherClub = Club::create([
            'name' => 'Otro Club de Agility',
            'slug' => 'otroclub',
            'settings' => ['provision_fondos_enabled' => true]
        ]);
        $userFromOtherClub = User::factory()->create([
            'club_id' => $otherClub->id,
            'role' => 'member'
        ]);

        $response = $this->actingAs($this->manager)->postJson('/api/fund-transactions', [
            'user_id' => $userFromOtherClub->id,
            'amount' => 50.00,
            'type' => 'ingreso',
            'concept' => 'Intento registrar en otro club',
            'payment_method' => 'bizum'
        ]);

        $response->assertStatus(422);
    }

    public function test_gestor_no_puede_consultar_saldo_de_socio_de_otro_club()
    {
        $otherClub = Club::create([
            'name' => 'Otro Club de Agility',
            'slug' => 'otroclub',
            'settings' => ['provision_fondos_enabled' => true]
        ]);
        $userFromOtherClub = User::factory()->create([
            'club_id' => $otherClub->id,
            'role' => 'member'
        ]);

        $response = $this->actingAs($this->manager)->getJson('/api/fund-transactions?user_id=' . $userFromOtherClub->id);
        $response->assertStatus(404);
    }
}

