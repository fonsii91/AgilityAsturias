<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Dog;
use App\Models\DogWorkload;
use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class AcwrEngineTest extends TestCase
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

    public function test_devuelve_acwr_y_datos_de_carga()
    {
        $user = $this->createUser();
        $res = $this->actingAs($user)->postJson('/api/dogs', ['name' => 'Fido']);
        $dogId = $res->json('id');

        // Create some workloads
        DogWorkload::forceCreate([
            'dog_id' => $dogId,
            'user_id' => $user->id,
            'club_id' => $this->club->id,
            'date' => Carbon::now()->subDays(10)->toDateString(),
            'duration_min' => 45,
            'intensity_rpe' => 7,
            'source_type' => 'manual',
            'status' => 'confirmed'
        ]);

        DogWorkload::forceCreate([
            'dog_id' => $dogId,
            'user_id' => $user->id,
            'club_id' => $this->club->id,
            'date' => Carbon::now()->subDays(2)->toDateString(),
            'duration_min' => 30,
            'intensity_rpe' => 8,
            'source_type' => 'manual',
            'status' => 'confirmed'
        ]);

        $response = $this->actingAs($user)->getJson("/api/dogs/{$dogId}/workload");

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'acwr',
                     'acute_load',
                     'chronic_load',
                     'yellow_threshold',
                     'red_threshold',
                     'status_color'
                 ]);
                 
        $this->assertGreaterThan(0, $response->json('acute_load'));
        $this->assertGreaterThan(0, $response->json('chronic_load'));
    }

    public function test_genera_y_devuelve_revisiones_pendientes()
    {
        $user = $this->createUser();
        $res = $this->actingAs($user)->postJson('/api/dogs', ['name' => 'Fido']);
        $dogId = $res->json('id');

        DogWorkload::forceCreate([
            'dog_id' => $dogId,
            'user_id' => $user->id,
            'club_id' => $this->club->id,
            'date' => Carbon::now()->toDateString(),
            'duration_min' => 10,
            'intensity_rpe' => 6,
            'source_type' => 'auto_attendance',
            'status' => 'pending_review'
        ]);

        $response = $this->actingAs($user)->getJson("/api/dogs/{$dogId}/pending-reviews");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json());
        $this->assertEquals('auto_attendance', $response->json('0.source_type'));
    }

    public function test_un_dueno_puede_confirmar_una_revision_pendiente()
    {
        $user = $this->createUser();
        $res = $this->actingAs($user)->postJson('/api/dogs', ['name' => 'Fido']);
        $dogId = $res->json('id');

        $workload = DogWorkload::forceCreate([
            'dog_id' => $dogId,
            'user_id' => $user->id,
            'club_id' => $this->club->id,
            'date' => Carbon::now()->toDateString(),
            'duration_min' => 10,
            'intensity_rpe' => 6,
            'source_type' => 'auto_attendance',
            'status' => 'pending_review'
        ]);

        $data = [
            'duration_min' => 15,
            'intensity_rpe' => 8
        ];

        $response = $this->actingAs($user)->postJson("/api/workloads/{$workload->id}/confirm", $data);

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'confirmed')
                 ->assertJsonPath('duration_min', 15)
                 ->assertJsonPath('intensity_rpe', 8);

        $this->assertDatabaseHas('dog_workloads', [
            'id' => $workload->id,
            'status' => 'confirmed',
            'duration_min' => 15
        ]);
    }
}
