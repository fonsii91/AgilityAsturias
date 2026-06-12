<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Dog;
use App\Models\TimeSlot;
use App\Models\Club;
use App\Models\Competition;
use App\Models\Video;

class ManagerRoleCapabilitiesTest extends TestCase
{
    use RefreshDatabase;

    protected $manager;
    protected $club;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->club = Club::create([
            'name' => 'Test Club',
            'slug' => 'test-club',
            'domain' => 'test.clubagility.com',
            'settings' => []
        ]);
        
        $this->manager = User::factory()->create([
            'role' => 'manager',
            'club_id' => $this->club->id
        ]);
        
        // Ensure active club context is set
        app()->instance('active_club_id', $this->club->id);
    }

    /** @test */
    public function manager_can_update_their_own_club_settings()
    {
        $response = $this->actingAs($this->manager)->putJson("/api/admin/clubs/{$this->club->id}", [
            'name' => 'Updated Club Name',
            'slug' => 'updated-club',
            'settings' => ['colors' => ['primary' => '#ff0000']]
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('clubs', [
            'id' => $this->club->id,
            'name' => 'Updated Club Name'
        ]);
    }

    /** @test */
    public function updating_club_settings_preserves_internal_bunny_collection_id()
    {
        $this->club->settings = ['bunny_collection_id' => 'mock-collection-guid-333', 'colors' => ['primary' => '#0073CF']];
        $this->club->save();

        $response = $this->actingAs($this->manager)->putJson("/api/admin/clubs/{$this->club->id}", [
            'name' => 'Updated Club Name',
            'slug' => 'updated-club',
            'settings' => ['colors' => ['primary' => '#ff0000']]
        ]);

        $response->assertStatus(200);

        $settings = $this->club->fresh()->settings;
        $this->assertEquals('#ff0000', $settings['colors']['primary'] ?? null);
        $this->assertEquals('mock-collection-guid-333', $settings['bunny_collection_id'] ?? null);
    }

    /** @test */
    public function updating_club_settings_preserves_keys_not_sent_by_the_client()
    {
        $this->club->settings = [
            'colors' => ['primary' => '#0073CF'],
            'landing_page_requested' => true,
            'customizationRequest' => 'Quiero una landing verde',
            'future_internal_key' => ['nested' => 'value'],
        ];
        $this->club->save();

        $response = $this->actingAs($this->manager)->putJson("/api/admin/clubs/{$this->club->id}", [
            'name' => 'Updated Club Name',
            'slug' => 'updated-club',
            'settings' => [
                'colors' => ['primary' => '#ff0000'],
                'cancellation_notice_hours' => 48,
            ]
        ]);

        $response->assertStatus(200);

        $settings = $this->club->fresh()->settings;
        $this->assertEquals('#ff0000', $settings['colors']['primary'] ?? null);
        $this->assertEquals(48, $settings['cancellation_notice_hours'] ?? null);
        $this->assertTrue($settings['landing_page_requested'] ?? false);
        $this->assertEquals('Quiero una landing verde', $settings['customizationRequest'] ?? null);
        $this->assertEquals(['nested' => 'value'], $settings['future_internal_key'] ?? null);
    }

    /** @test */
    public function updating_club_settings_ignores_non_editable_keys_sent_by_the_client()
    {
        $this->club->settings = ['bunny_collection_id' => 'real-guid'];
        $this->club->save();

        $response = $this->actingAs($this->manager)->putJson("/api/admin/clubs/{$this->club->id}", [
            'name' => 'Updated Club Name',
            'slug' => 'updated-club',
            'settings' => [
                'gamification_enabled' => false,
                'bunny_collection_id' => 'forged-guid',
            ]
        ]);

        $response->assertStatus(200);

        $settings = $this->club->fresh()->settings;
        $this->assertFalse($settings['gamification_enabled'] ?? true);
        $this->assertEquals('real-guid', $settings['bunny_collection_id'] ?? null);
    }

    private function createModuleFeatures(): array
    {
        return [
            'gamificacion' => \App\Models\Feature::create(['slug' => 'gamificacion', 'name' => 'Gamificación', 'type' => 'boolean']),
            'provision-fondos' => \App\Models\Feature::create(['slug' => 'provision-fondos', 'name' => 'Provisión de Fondos', 'type' => 'boolean']),
            'patrocinadores' => \App\Models\Feature::create(['slug' => 'patrocinadores', 'name' => 'Patrocinadores', 'type' => 'boolean']),
        ];
    }

    /** @test */
    public function manager_cannot_enable_modules_not_included_in_their_plan()
    {
        // Las features existen pero el plan del club no las tiene asignadas.
        $this->createModuleFeatures();
        $plan = \App\Models\Plan::create(['name' => 'Plan Básico', 'slug' => 'basico', 'price' => 29]);
        $this->club->plan_id = $plan->id;
        $this->club->settings = [
            'gamification_enabled' => false,
            'provision_fondos_enabled' => true,
            'sponsors_enabled' => false,
        ];
        $this->club->save();

        $response = $this->actingAs($this->manager)->putJson("/api/admin/clubs/{$this->club->id}", [
            'name' => 'Updated Club Name',
            'slug' => 'updated-club',
            'settings' => [
                'gamification_enabled' => true,      // activar sin plan que lo incluya: bloqueado
                'provision_fondos_enabled' => false, // desactivar: siempre permitido
                'sponsors_enabled' => true,          // activar sin plan que lo incluya: bloqueado
            ]
        ]);

        $response->assertStatus(200);

        $settings = $this->club->fresh()->settings;
        $this->assertFalse($settings['gamification_enabled']);
        $this->assertFalse($settings['provision_fondos_enabled']);
        $this->assertFalse($settings['sponsors_enabled']);
    }

    /** @test */
    public function manager_can_enable_modules_included_in_their_plan()
    {
        $features = $this->createModuleFeatures();
        $plan = \App\Models\Plan::create(['name' => 'Plan Élite', 'slug' => 'elite', 'price' => 79]);
        $plan->features()->attach([$features['gamificacion']->id, $features['patrocinadores']->id]);
        $this->club->plan_id = $plan->id;
        $this->club->settings = ['gamification_enabled' => false, 'sponsors_enabled' => false];
        $this->club->save();

        $response = $this->actingAs($this->manager)->putJson("/api/admin/clubs/{$this->club->id}", [
            'name' => 'Updated Club Name',
            'slug' => 'updated-club',
            'settings' => ['gamification_enabled' => true, 'sponsors_enabled' => true]
        ]);

        $response->assertStatus(200);

        $settings = $this->club->fresh()->settings;
        $this->assertTrue($settings['gamification_enabled']);
        $this->assertTrue($settings['sponsors_enabled']);
    }

    /** @test */
    public function admin_can_enable_plan_gated_modules_regardless_of_plan()
    {
        $this->createModuleFeatures();
        $plan = \App\Models\Plan::create(['name' => 'Plan Básico', 'slug' => 'basico', 'price' => 29]);
        $this->club->plan_id = $plan->id;
        $this->club->settings = ['sponsors_enabled' => false];
        $this->club->save();

        $admin = User::factory()->create(['role' => 'admin', 'club_id' => $this->club->id]);

        $response = $this->actingAs($admin)->putJson("/api/admin/clubs/{$this->club->id}", [
            'name' => 'Updated Club Name',
            'slug' => 'updated-club',
            'settings' => ['sponsors_enabled' => true]
        ]);

        $response->assertStatus(200);
        $this->assertTrue($this->club->fresh()->settings['sponsors_enabled']);
    }

    /** @test */
    public function modules_not_in_plan_are_forced_off_when_manager_saves()
    {
        // Aunque el módulo estuviera activo (p. ej. de un plan superior previo),
        // al guardar con un plan que no lo incluye se fuerza a desactivado.
        $this->createModuleFeatures();
        $plan = \App\Models\Plan::create(['name' => 'Plan Básico', 'slug' => 'basico', 'price' => 29]);
        $this->club->plan_id = $plan->id;
        $this->club->settings = ['gamification_enabled' => true];
        $this->club->save();

        $response = $this->actingAs($this->manager)->putJson("/api/admin/clubs/{$this->club->id}", [
            'name' => 'Updated Club Name',
            'slug' => 'updated-club',
            'settings' => ['gamification_enabled' => true]
        ]);

        $response->assertStatus(200);

        $settings = $this->club->fresh()->settings;
        $this->assertFalse($settings['gamification_enabled']);
        $this->assertFalse($settings['provision_fondos_enabled']);
        $this->assertFalse($settings['sponsors_enabled']);
    }

    /** @test */
    public function admin_changing_plan_via_club_update_disables_modules_not_included()
    {
        $features = $this->createModuleFeatures();
        $elite = \App\Models\Plan::create(['name' => 'Plan Élite', 'slug' => 'elite', 'price' => 79]);
        $elite->features()->attach($features['gamificacion']->id);
        $basico = \App\Models\Plan::create(['name' => 'Plan Básico', 'slug' => 'basico', 'price' => 29]);

        $this->club->plan_id = $elite->id;
        $this->club->settings = ['gamification_enabled' => true];
        $this->club->save();

        $admin = User::factory()->create(['role' => 'admin', 'club_id' => $this->club->id]);

        $response = $this->actingAs($admin)->putJson("/api/admin/clubs/{$this->club->id}", [
            'name' => 'Updated Club Name',
            'slug' => 'updated-club',
            'plan_id' => $basico->id,
        ]);

        $response->assertStatus(200);
        $this->assertFalse($this->club->fresh()->settings['gamification_enabled']);
    }

    /** @test */
    public function modules_are_not_restricted_when_the_feature_is_not_registered()
    {
        // Si la feature aún no existe en BD (despliegue sin seeder), el módulo
        // no se restringe aunque el plan no la tenga.
        $plan = \App\Models\Plan::create(['name' => 'Plan Básico', 'slug' => 'basico', 'price' => 29]);
        $this->club->plan_id = $plan->id;
        $this->club->settings = ['gamification_enabled' => false];
        $this->club->save();

        $response = $this->actingAs($this->manager)->putJson("/api/admin/clubs/{$this->club->id}", [
            'name' => 'Updated Club Name',
            'slug' => 'updated-club',
            'settings' => ['gamification_enabled' => true]
        ]);

        $response->assertStatus(200);
        $this->assertTrue($this->club->fresh()->settings['gamification_enabled']);
    }

    /** @test */
    public function manager_cannot_update_other_clubs()
    {
        $otherClub = Club::create([
            'name' => 'Other Club',
            'slug' => 'other-club',
            'domain' => 'other.clubagility.com',
            'settings' => []
        ]);
        
        $response = $this->actingAs($this->manager)->putJson("/api/admin/clubs/{$otherClub->id}", [
            'name' => 'Should Not Update'
        ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function manager_can_create_and_manage_time_slots()
    {
        // Test Create
        $response = $this->actingAs($this->manager)->postJson('/api/time-slots', [
            'day' => 'Lunes',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'max_bookings' => 5
        ]);
        $response->assertStatus(201);
        $slotId = $response->json('id');

        // Test Update
        $updateResponse = $this->actingAs($this->manager)->postJson("/api/time-slots/{$slotId}", [
            'day' => 'Martes',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'max_bookings' => 10,
        ]);
        $updateResponse->assertStatus(200);

        // Test Delete
        $deleteResponse = $this->actingAs($this->manager)->postJson("/api/time-slots/{$slotId}/delete");
        $deleteResponse->assertStatus(204);
    }

    /** @test */
    public function manager_can_bypass_reservation_rules()
    {
        $slot = TimeSlot::factory()->create([
            'max_bookings' => 1,
            'club_id' => $this->club->id
        ]);
        
        $user = User::factory()->create(['club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['user_id' => $user->id]);

        // Manager booking for another user
        $response = $this->actingAs($this->manager)->postJson('/api/reservations', [
            'slot_id' => $slot->id,
            'date' => now()->addDays(2)->format('Y-m-d'),
            'dog_ids' => [$dog->id],
            'user_id' => $user->id
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('reservations', [
            'slot_id' => $slot->id,
            'user_id' => $user->id
        ]);
    }

    /** @test */
    public function manager_can_manage_competitions()
    {
        $response = $this->actingAs($this->manager)->postJson('/api/competitions', [
            'name' => 'Torneo Manager',
            'fecha_evento' => now()->addDays(5)->format('Y-m-d'),
            'location' => 'Club',
            'tipo' => 'competicion',
            'federacion' => 'RSCE',
        ]);

        $response->assertStatus(201);
    }

    /** @test */
    public function manager_can_moderate_videos()
    {
        $user = User::factory()->create(['club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['user_id' => $user->id]);
        $video = Video::factory()->create([
            'user_id' => $user->id,
            'dog_id' => $dog->id,
            'in_public_gallery' => false
        ]);

        $response = $this->actingAs($this->manager)->postJson("/api/videos/{$video->id}/toggle-public-gallery");

        $response->assertStatus(200);
        $this->assertDatabaseHas('videos', [
            'id' => $video->id,
            'in_public_gallery' => true
        ]);
    }
}
