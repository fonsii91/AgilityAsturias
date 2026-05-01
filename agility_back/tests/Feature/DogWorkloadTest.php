<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Dog;
use App\Models\DogWorkload;
use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DogWorkloadTest extends TestCase
{
    use RefreshDatabase;

    protected $club;

    protected function setUp(): void
    {
        parent::setUp();
        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);
    }

    protected function createUser($attributes = [])
    {
        return User::factory()->create(array_merge(['club_id' => $this->club->id, 'role' => 'member'], $attributes));
    }

    public function test_permite_a_un_dueno_registrar_una_carga_de_trabajo_manualmente()
    {
        $user = $this->createUser();
        $res = $this->actingAs($user)->postJson('/api/dogs', ['name' => 'Fido']);
        $dogId = $res->json('id');

        $data = [
            'date' => '2023-10-10',
            'duration_min' => 45,
            'intensity_rpe' => 7,
            'jumped_max_height' => true,
            'number_of_runs' => 2
        ];

        $response = $this->actingAs($user)->postJson("/api/dogs/{$dogId}/workloads", $data);

        $response->assertStatus(200)
                 ->assertJsonPath('duration_min', 45)
                 ->assertJsonPath('intensity_rpe', 7);

        $this->assertDatabaseHas('dog_workloads', [
            'dog_id' => $dogId,
            'duration_min' => 45,
            'intensity_rpe' => 7,
            'source_type' => 'manual',
            'status' => 'confirmed'
        ]);
    }

    public function test_impide_a_un_usuario_registrar_cargas_de_trabajo_para_un_perro_que_no_es_suyo()
    {
        $user = $this->createUser();
        $otherUser = $this->createUser();
        
        $res = $this->actingAs($otherUser)->postJson('/api/dogs', ['name' => 'Fido']);
        $dogId = $res->json('id');

        $data = [
            'date' => '2023-10-10',
            'duration_min' => 45,
            'intensity_rpe' => 7
        ];

        $response = $this->actingAs($user)->postJson("/api/dogs/{$dogId}/workloads", $data);

        $response->assertStatus(403);
    }

    public function test_permite_a_un_administrador_registrar_cargas_de_trabajo_para_cualquier_perro()
    {
        $admin = $this->createUser(['role' => 'admin']);
        $user = $this->createUser();
        
        $res = $this->actingAs($user)->postJson('/api/dogs', ['name' => 'Fido']);
        $dogId = $res->json('id');

        $data = [
            'date' => '2023-10-10',
            'duration_min' => 45,
            'intensity_rpe' => 7
        ];

        $response = $this->actingAs($admin)->postJson("/api/dogs/{$dogId}/workloads", $data);

        $response->assertStatus(200);
    }

    public function test_permite_a_un_dueno_actualizar_una_carga_de_trabajo_existente()
    {
        $user = $this->createUser();
        $res = $this->actingAs($user)->postJson('/api/dogs', ['name' => 'Fido']);
        $dogId = $res->json('id');

        $workload = DogWorkload::forceCreate([
            'dog_id' => $dogId,
            'user_id' => $user->id,
            'club_id' => $this->club->id,
            'date' => '2023-10-10',
            'duration_min' => 30,
            'intensity_rpe' => 5,
            'source_type' => 'manual',
            'status' => 'confirmed'
        ]);

        $data = [
            'date' => '2023-10-11',
            'duration_min' => 40,
            'intensity_rpe' => 8
        ];

        $response = $this->actingAs($user)->putJson("/api/workloads/{$workload->id}", $data);

        $response->assertStatus(200)
                 ->assertJsonPath('duration_min', 40);

        $this->assertDatabaseHas('dog_workloads', [
            'id' => $workload->id,
            'duration_min' => 40,
            'intensity_rpe' => 8
        ]);
    }
    public function test_permite_a_un_administrador_ver_el_monitor_global_de_salud()
    {
        $admin = $this->createUser(['role' => 'admin']);
        $user = $this->createUser();
        
        $res = $this->actingAs($user)->postJson('/api/dogs', ['name' => 'Fido']);
        $dogId = $res->json('id');

        DogWorkload::forceCreate([
            'dog_id' => $dogId,
            'user_id' => $user->id,
            'club_id' => $this->club->id,
            'date' => now()->subDays(5)->toDateString(),
            'duration_min' => 30,
            'intensity_rpe' => 5,
            'source_type' => 'manual',
            'status' => 'confirmed'
        ]);

        DogWorkload::forceCreate([
            'dog_id' => $dogId,
            'user_id' => $user->id,
            'club_id' => $this->club->id,
            'date' => now()->subDays(2)->toDateString(),
            'duration_min' => 20,
            'intensity_rpe' => 8,
            'source_type' => 'auto_attendance',
            'status' => 'auto_confirmed'
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/salud/monitor');

        $response->assertStatus(200)
                 ->assertJsonFragment(['email' => $user->email])
                 ->assertJsonFragment(['total_workloads' => 2])
                 ->assertJsonFragment(['manual_workloads' => 1])
                 ->assertJsonFragment(['auto_workloads' => 1]);
    }

    public function test_no_permite_a_un_miembro_normal_ver_el_monitor_global_de_salud()
    {
        $user = $this->createUser();
        $response = $this->actingAs($user)->getJson('/api/admin/salud/monitor');
        $response->assertStatus(403);
    }
}
