<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Laravel\Cashier\Events\WebhookReceived;
use Tests\TestCase;
use App\Listeners\StripeEventListener;
use App\Mail\ClubLeadReceived;
use App\Models\Club;
use App\Models\ClubLead;
use App\Models\User;

class ClubLeadSaaSProvisionTest extends TestCase
{
    use RefreshDatabase;

    private function leadPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Club Deportivo Asturias',
            'slug' => 'deportivo-asturias',
            'email' => 'manager@asturias.com',
            'phone' => '600123456',
            'password' => 'mysecurepassword123',
            'plan_selected' => 'Pro',
        ], $overrides);
    }

    private function createProPlan(): void
    {
        \App\Models\Plan::create([
            'name' => 'Pro Plan',
            'slug' => 'profesional',
            'price' => 19,
        ]);
    }

    public function test_club_provision_with_password_under_bypass()
    {
        // Con el bypass activo no hay pago: el club se aprovisiona en el momento
        config(['services.stripe.bypass_subscriptions' => true]);
        Mail::fake();
        Notification::fake();

        $this->createProPlan();

        $response = $this->postJson('/api/club-leads', $this->leadPayload());

        $response->assertStatus(201);
        $response->assertJsonPath('lead.status', 'approved');
        $response->assertJsonStructure([
            'message',
            'lead',
            'stripe_checkout_url'
        ]);

        // Check Club is created
        $club = Club::where('slug', 'deportivo-asturias')->first();
        $this->assertNotNull($club);
        $this->assertEquals('Club Deportivo Asturias', $club->name);

        // Check Manager User is created
        $user = User::where('email', 'manager@asturias.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('manager', $user->role);
        $this->assertEquals($club->id, $user->club_id);

        // Verify password hashes and matches
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('mysecurepassword123', $user->password));

        // El correo de activación se envía al gestor
        Mail::assertQueued(ClubLeadReceived::class, function ($mail) {
            return $mail->hasTo('manager@asturias.com') && $mail->activationLink !== null;
        });
    }

    public function test_no_provisioning_before_payment_without_bypass()
    {
        // Sin bypass, el registro solo crea el lead; el club se aprovisiona vía webhook.
        // Con un Price ID configurado pero sin credenciales de Stripe válidas, la creación
        // del Checkout falla: debe devolver 500 y NO debe existir ni club ni usuario.
        config([
            'services.stripe.bypass_subscriptions' => false,
            'services.stripe.prices.profesional' => 'price_test_fake',
        ]);
        Mail::fake();

        $this->createProPlan();

        $response = $this->postJson('/api/club-leads', $this->leadPayload());

        $response->assertStatus(500);

        $lead = ClubLead::where('slug', 'deportivo-asturias')->first();
        $this->assertNotNull($lead);
        $this->assertEquals('pending', $lead->status);
        $this->assertNull($lead->provisioned_at);

        $this->assertNull(Club::where('slug', 'deportivo-asturias')->first());
        $this->assertNull(User::where('email', 'manager@asturias.com')->first());
        Mail::assertNothingQueued();
    }

    public function test_webhook_checkout_completed_provisions_club_and_sends_activation_email()
    {
        config(['services.stripe.bypass_subscriptions' => false]);
        Mail::fake();
        Notification::fake();

        $this->createProPlan();

        $lead = ClubLead::create([
            'name' => 'Club Webhook',
            'slug' => 'club-webhook',
            'email' => 'webhook@asturias.com',
            'phone' => '600123456',
            'plan_selected' => 'Pro',
            'password' => \Illuminate\Support\Facades\Hash::make('mysecurepassword123'),
            'status' => 'pending',
        ]);

        $payload = [
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_test_123',
                    'customer' => 'cus_test_123',
                    'subscription' => null,
                    'metadata' => ['club_lead_id' => (string) $lead->id],
                ],
            ],
        ];

        app(StripeEventListener::class)->handle(new WebhookReceived($payload));

        $club = Club::where('slug', 'club-webhook')->first();
        $this->assertNotNull($club);
        $this->assertEquals('cus_test_123', $club->stripe_id);

        $user = User::where('email', 'webhook@asturias.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('manager', $user->role);
        $this->assertEquals($club->id, $user->club_id);
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('mysecurepassword123', $user->password));

        $lead->refresh();
        $this->assertEquals('approved', $lead->status);
        $this->assertNotNull($lead->provisioned_at);
        $this->assertEquals($club->id, $lead->club_id);

        Mail::assertQueued(ClubLeadReceived::class, function ($mail) {
            return $mail->hasTo('webhook@asturias.com');
        });

        // Idempotencia: un reintento del webhook no duplica el club
        app(StripeEventListener::class)->handle(new WebhookReceived($payload));
        $this->assertEquals(1, Club::where('slug', 'club-webhook')->count());
        $this->assertEquals(1, User::where('email', 'webhook@asturias.com')->count());
    }

    public function test_webhook_marks_lead_as_error_when_slug_already_taken()
    {
        config(['services.stripe.bypass_subscriptions' => false]);
        Mail::fake();

        $this->createProPlan();

        Club::create(['name' => 'Club Existente', 'slug' => 'club-ocupado']);

        $lead = ClubLead::create([
            'name' => 'Club Tardío',
            'slug' => 'club-ocupado',
            'email' => 'tardio@asturias.com',
            'phone' => '600123456',
            'plan_selected' => 'Pro',
            'password' => \Illuminate\Support\Facades\Hash::make('mysecurepassword123'),
            'status' => 'pending',
        ]);

        $payload = [
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_test_456',
                    'customer' => 'cus_test_456',
                    'subscription' => null,
                    'metadata' => ['club_lead_id' => (string) $lead->id],
                ],
            ],
        ];

        app(StripeEventListener::class)->handle(new WebhookReceived($payload));

        $lead->refresh();
        $this->assertEquals('error', $lead->status);
        $this->assertNull($lead->provisioned_at);
        $this->assertNull(User::where('email', 'tardio@asturias.com')->first());
        Mail::assertNotQueued(ClubLeadReceived::class);
    }

    public function test_phone_validation_rejects_letters()
    {
        $this->createProPlan();

        $response = $this->postJson('/api/club-leads', $this->leadPayload([
            'phone' => '600abc123', // Contains letters
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['phone']);
    }

    public function test_ssl_status_endpoint_validation()
    {
        // Invalid slug format (e.g. contains uppercase or special characters not allowed)
        $response = $this->getJson('/api/club-leads/status/Invalid_Slug!');
        $response->assertStatus(400);
        $response->assertJsonPath('ready', false);

        // Club not found
        $response = $this->getJson('/api/club-leads/status/non-existent-club');
        $response->assertStatus(404);
        $response->assertJsonPath('ready', false);
    }

    public function test_ssl_status_endpoint_local_env()
    {
        // Setup a Club
        $club = Club::create([
            'name' => 'Club Local Test',
            'slug' => 'local-test',
        ]);

        // In testing environment (not production), it should return ready immediately
        $response = $this->getJson('/api/club-leads/status/local-test');
        $response->assertStatus(200);
        $response->assertJsonPath('ready', true);
    }
}
