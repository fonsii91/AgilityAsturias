<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Plan;
use App\Models\Club;

class SubscriptionAdminTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $admin;
    protected $manager;
    protected $member;
    protected $plan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);

        $this->admin = User::create([
            'name' => 'Admin Test',
            'email' => 'admin@test.com',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'club_id' => $this->club->id,
        ]);

        $this->manager = User::create([
            'name' => 'Manager Test',
            'email' => 'manager@test.com',
            'password' => bcrypt('password123'),
            'role' => 'manager',
            'club_id' => $this->club->id,
        ]);

        $this->member = User::create([
            'name' => 'Member Test',
            'email' => 'member@test.com',
            'password' => bcrypt('password123'),
            'role' => 'member',
            'club_id' => $this->club->id,
        ]);

        $this->plan = Plan::create([
            'name' => 'Plan Inicial',
            'slug' => 'inicial',
            'price' => 19.00,
            'photo_storage_limit_gb' => 10,
        ]);
    }

    public function test_admin_can_retrieve_plans()
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/plans');

        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonFragment([
            'slug' => 'inicial',
            'photo_storage_limit_gb' => 10,
        ]);
    }

    public function test_admin_can_create_plan_with_photo_storage_limit()
    {
        $payload = [
            'name' => 'Plan Gold',
            'slug' => 'gold',
            'price' => 99.00,
            'description' => 'Unlimited possibilities',
            'is_active' => true,
            'video_storage_limit_gb' => 200,
            'photo_storage_limit_gb' => 150,
            'is_featured' => false,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/plans', $payload);

        $response->assertStatus(201);
        $response->assertJsonFragment([
            'slug' => 'gold',
            'photo_storage_limit_gb' => 150,
        ]);

        $this->assertDatabaseHas('plans', [
            'slug' => 'gold',
            'photo_storage_limit_gb' => 150,
        ]);
    }

    public function test_admin_can_update_plan_photo_storage_limit()
    {
        $payload = [
            'name' => 'Plan Inicial Modificado',
            'slug' => 'inicial',
            'price' => 25.00,
            'description' => 'New description',
            'is_active' => true,
            'video_storage_limit_gb' => 20,
            'photo_storage_limit_gb' => 30, // modified limit
            'is_featured' => false,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/plans/{$this->plan->id}", $payload);

        $response->assertStatus(200);
        $response->assertJsonFragment([
            'name' => 'Plan Inicial Modificado',
            'photo_storage_limit_gb' => 30,
        ]);

        $this->assertDatabaseHas('plans', [
            'id' => $this->plan->id,
            'photo_storage_limit_gb' => 30,
        ]);
    }

    public function test_negative_storage_limit_is_rejected()
    {
        $payload = [
            'name' => 'Plan Invalid',
            'slug' => 'invalid',
            'price' => 10.00,
            'photo_storage_limit_gb' => -5, // invalid limit
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/plans', $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['photo_storage_limit_gb']);
    }

    public function test_non_admin_cannot_access_plans_administration()
    {
        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/admin/plans');

        $response->assertStatus(403);

        $response2 = $this->actingAs($this->member, 'sanctum')
            ->postJson('/api/admin/plans', [
                'name' => 'Unauthorized Plan',
                'slug' => 'unauth',
                'price' => 50.00,
            ]);

        $response2->assertStatus(403);
    }
}
