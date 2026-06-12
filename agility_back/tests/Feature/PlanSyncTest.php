<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Club;
use App\Models\User;
use App\Models\Plan;
use App\Listeners\StripeEventListener;
use Laravel\Cashier\Events\WebhookReceived;

class PlanSyncTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $admin;
    protected $basico;
    protected $profesional;
    protected $elite;

    protected function setUp(): void
    {
        parent::setUp();

        $this->basico = Plan::create(['name' => 'Plan Básico', 'slug' => 'basico', 'price' => 29.00]);
        $this->profesional = Plan::create(['name' => 'Plan Profesional', 'slug' => 'profesional', 'price' => 49.00]);
        $this->elite = Plan::create(['name' => 'Plan Élite', 'slug' => 'elite', 'price' => 79.00]);

        // Mapeo precio -> slug que usa el listener (config('services.stripe.prices'))
        config(['services.stripe.prices' => [
            'basico' => 'price_basico_test',
            'profesional' => 'price_pro_test',
            'elite' => 'price_elite_test',
        ]]);

        $this->club = Club::create([
            'name' => 'Club Sync Test',
            'slug' => 'sync-test',
            'plan_id' => $this->basico->id,
            'stripe_id' => 'cus_test123',
        ]);

        $this->admin = User::create([
            'name' => 'Admin', 'email' => 'admin@sync.com',
            'password' => bcrypt('password123'), 'role' => 'admin', 'club_id' => $this->club->id,
        ]);
    }

    private function fireSubscriptionUpdated(string $customer, string $priceId): void
    {
        $payload = [
            'type' => 'customer.subscription.updated',
            'data' => ['object' => [
                'customer' => $customer,
                'items' => ['data' => [
                    ['price' => ['id' => $priceId]],
                ]],
            ]],
        ];

        app(StripeEventListener::class)->handle(new WebhookReceived($payload));
    }

    public function test_plan_synced_from_stripe_price()
    {
        $this->fireSubscriptionUpdated('cus_test123', 'price_elite_test');

        $this->assertEquals($this->elite->id, $this->club->fresh()->plan_id);
    }

    public function test_unknown_price_does_not_change_plan()
    {
        $this->fireSubscriptionUpdated('cus_test123', 'price_desconocido');

        $this->assertEquals($this->basico->id, $this->club->fresh()->plan_id);
    }

    public function test_event_for_unknown_customer_is_ignored()
    {
        $this->fireSubscriptionUpdated('cus_inexistente', 'price_elite_test');

        $this->assertEquals($this->basico->id, $this->club->fresh()->plan_id);
    }

    public function test_locked_plan_is_not_synced_from_stripe()
    {
        // El club disfruta de Élite pero paga Básico: al fijar el plan, Stripe no lo cambia
        $this->club->update(['plan_id' => $this->elite->id, 'plan_locked' => true]);

        $this->fireSubscriptionUpdated('cus_test123', 'price_basico_test');

        $this->assertEquals($this->elite->id, $this->club->fresh()->plan_id);
    }

    public function test_downgrade_via_stripe_disables_modules_not_in_new_plan()
    {
        $gami = \App\Models\Feature::create(['slug' => 'gamificacion', 'name' => 'Gamificación', 'type' => 'boolean']);
        $this->elite->features()->attach($gami->id);
        $this->club->update([
            'plan_id' => $this->elite->id,
            'settings' => ['gamification_enabled' => true, 'colors' => ['primary' => '#0073CF']],
        ]);

        $this->fireSubscriptionUpdated('cus_test123', 'price_basico_test');

        $fresh = $this->club->fresh();
        $this->assertEquals($this->basico->id, $fresh->plan_id);
        $this->assertFalse($fresh->settings['gamification_enabled']);
        // El resto de settings no se toca
        $this->assertEquals('#0073CF', $fresh->settings['colors']['primary'] ?? null);
    }

    public function test_upgrade_via_stripe_does_not_auto_enable_modules()
    {
        $gami = \App\Models\Feature::create(['slug' => 'gamificacion', 'name' => 'Gamificación', 'type' => 'boolean']);
        $this->elite->features()->attach($gami->id);
        $this->club->update(['settings' => ['gamification_enabled' => false]]);

        $this->fireSubscriptionUpdated('cus_test123', 'price_elite_test');

        $fresh = $this->club->fresh();
        $this->assertEquals($this->elite->id, $fresh->plan_id);
        // Subir de plan no enciende módulos solo: lo decide el gestor
        $this->assertFalse($fresh->settings['gamification_enabled']);
    }

    public function test_admin_plan_assignment_disables_modules_not_in_new_plan()
    {
        $gami = \App\Models\Feature::create(['slug' => 'gamificacion', 'name' => 'Gamificación', 'type' => 'boolean']);
        $this->elite->features()->attach($gami->id);
        $this->club->update([
            'plan_id' => $this->elite->id,
            'settings' => ['gamification_enabled' => true],
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/clubs/{$this->club->id}/plan", ['plan_id' => $this->basico->id])
            ->assertStatus(200);

        $this->assertFalse($this->club->fresh()->settings['gamification_enabled']);
    }

    public function test_admin_can_lock_plan_via_endpoint()
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/clubs/{$this->club->id}/plan", [
                'plan_id' => $this->elite->id,
                'plan_locked' => true,
            ]);

        $response->assertStatus(200);
        $fresh = $this->club->fresh();
        $this->assertEquals($this->elite->id, $fresh->plan_id);
        $this->assertTrue($fresh->plan_locked);
    }

    public function test_admin_can_unlock_plan_and_sync_resumes()
    {
        $this->club->update(['plan_id' => $this->elite->id, 'plan_locked' => true]);

        // Liberar el plan
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/clubs/{$this->club->id}/plan", [
                'plan_id' => $this->elite->id,
                'plan_locked' => false,
            ])->assertStatus(200);

        $this->assertFalse($this->club->fresh()->plan_locked);

        // Ahora Stripe vuelve a mandar
        $this->fireSubscriptionUpdated('cus_test123', 'price_basico_test');
        $this->assertEquals($this->basico->id, $this->club->fresh()->plan_id);
    }

    public function test_changing_plan_does_not_alter_lock_flag()
    {
        $this->club->update(['plan_locked' => true]);

        // Cambiar solo el plan (sin enviar plan_locked) no debe tocar el flag
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/clubs/{$this->club->id}/plan", [
                'plan_id' => $this->profesional->id,
            ])->assertStatus(200);

        $fresh = $this->club->fresh();
        $this->assertEquals($this->profesional->id, $fresh->plan_id);
        $this->assertTrue($fresh->plan_locked);
    }
}
