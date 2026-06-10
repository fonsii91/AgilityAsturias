<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Club;
use App\Models\User;
use App\Models\Plan;

class SubscriptionControlTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $manager;
    protected $member;
    protected $plan;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Crear plan
        $this->plan = Plan::create([
            'name' => 'Plan Profesional',
            'slug' => 'profesional',
            'price' => 49.00,
        ]);

        // 2. Crear club
        $this->club = Club::create([
            'name' => 'Club Asturias Test',
            'slug' => 'asturias-test',
            'plan_id' => $this->plan->id,
        ]);

        // 3. Crear manager
        $this->manager = User::create([
            'name' => 'Manager Test',
            'email' => 'manager@asturiastest.com',
            'password' => bcrypt('password123'),
            'role' => 'manager',
            'club_id' => $this->club->id,
        ]);

        // 4. Crear miembro
        $this->member = User::create([
            'name' => 'Member Test',
            'email' => 'member@asturiastest.com',
            'password' => bcrypt('password123'),
            'role' => 'member',
            'club_id' => $this->club->id,
        ]);
    }

    public function test_manager_gets_402_on_private_endpoints_when_subscription_is_inactive()
    {
        // El club no tiene suscripción activa (no se ha registrado pago en Stripe)
        $response = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Club-Slug', 'asturias-test')
            ->withHeader('X-Test-Check-Subscription', 'true')
            ->getJson('/api/dogs');

        $response->assertStatus(402);
        $response->assertJsonPath('error', 'subscription_expired');
    }

    public function test_member_gets_403_on_private_endpoints_when_subscription_is_inactive()
    {
        $response = $this->actingAs($this->member, 'sanctum')
            ->withHeader('X-Club-Slug', 'asturias-test')
            ->withHeader('X-Test-Check-Subscription', 'true')
            ->getJson('/api/dogs');

        $response->assertStatus(403);
        $response->assertJsonPath('error', 'club_suspended');
    }

    public function test_exempt_endpoints_are_accessible_by_manager_even_without_active_subscription()
    {
        // El endpoint /api/billing/status debe estar accesible
        $response = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Club-Slug', 'asturias-test')
            ->withHeader('X-Test-Check-Subscription', 'true')
            ->getJson('/api/billing/status');

        $response->assertStatus(200);
        $response->assertJsonPath('subscribed', false);
        $response->assertJsonPath('stripe_status', 'inactive');
    }

    public function test_accessible_with_active_subscription()
    {
        // Simular que el club está suscrito creando un registro en la tabla de suscripciones
        $this->club->subscriptions()->create([
            'type' => 'default',
            'stripe_id' => 'sub_test123',
            'stripe_status' => 'active',
            'stripe_price' => 'price_test123',
            'quantity' => 1,
        ]);

        // Ahora el manager debería poder consultar /api/dogs sin error 402
        $response = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Club-Slug', 'asturias-test')
            ->withHeader('X-Test-Check-Subscription', 'true')
            ->getJson('/api/dogs');

        $response->assertStatus(200); // Devuelve array vacío de perros de forma normal
    }

    public function test_manager_can_access_invoices_endpoint_when_no_stripe_id()
    {
        $response = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Club-Slug', 'asturias-test')
            ->withHeader('X-Test-Check-Subscription', 'true')
            ->getJson('/api/billing/invoices');

        $response->assertStatus(200);
        $response->assertExactJson([]);
    }

    public function test_manager_gets_404_on_download_invoice_when_no_stripe_id()
    {
        $response = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Club-Slug', 'asturias-test')
            ->withHeader('X-Test-Check-Subscription', 'true')
            ->getJson('/api/billing/invoices/in_123/download');

        $response->assertStatus(404);
        $response->assertJsonPath('message', 'No se encontraron facturas.');
    }
}

