<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Club;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Support\Carbon;

class CourtesyPeriodTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $admin;
    protected $manager;
    protected $member;

    protected function setUp(): void
    {
        parent::setUp();

        $plan = Plan::create([
            'name' => 'Plan Profesional',
            'slug' => 'profesional',
            'price' => 49.00,
        ]);

        $this->club = Club::create([
            'name' => 'Club Cortesia Test',
            'slug' => 'cortesia-test',
            'plan_id' => $plan->id,
        ]);

        $this->admin = User::create([
            'name' => 'Admin', 'email' => 'admin@cortesia.com',
            'password' => bcrypt('password123'), 'role' => 'admin', 'club_id' => $this->club->id,
        ]);
        $this->manager = User::create([
            'name' => 'Manager', 'email' => 'manager@cortesia.com',
            'password' => bcrypt('password123'), 'role' => 'manager', 'club_id' => $this->club->id,
        ]);
        $this->member = User::create([
            'name' => 'Member', 'email' => 'member@cortesia.com',
            'password' => bcrypt('password123'), 'role' => 'member', 'club_id' => $this->club->id,
        ]);
    }

    private function asClub(User $user)
    {
        return $this->actingAs($user, 'sanctum')
            ->withHeader('X-Club-Slug', 'cortesia-test')
            ->withHeader('X-Test-Check-Subscription', 'true');
    }

    public function test_access_granted_during_courtesy_period()
    {
        $this->club->update(['courtesy_until' => Carbon::now()->addMonth()]);

        $this->asClub($this->manager)->getJson('/api/dogs')->assertStatus(200);
        $this->asClub($this->member)->getJson('/api/dogs')->assertStatus(200);
    }

    public function test_blocked_after_courtesy_expires()
    {
        $this->club->update(['courtesy_until' => Carbon::now()->subDay()]);

        $this->asClub($this->manager)->getJson('/api/dogs')
            ->assertStatus(402)->assertJsonPath('error', 'subscription_expired');
        $this->asClub($this->member)->getJson('/api/dogs')
            ->assertStatus(403)->assertJsonPath('error', 'club_suspended');
    }

    public function test_blocked_without_courtesy_nor_subscription()
    {
        $this->asClub($this->manager)->getJson('/api/dogs')->assertStatus(402);
    }

    public function test_billing_status_reports_courtesy()
    {
        $until = Carbon::now()->addMonth();
        $this->club->update(['courtesy_until' => $until]);

        $response = $this->asClub($this->manager)->getJson('/api/billing/status');

        $response->assertStatus(200)
            ->assertJsonPath('subscribed', true)
            ->assertJsonPath('on_courtesy', true);
        $this->assertNotNull($response->json('courtesy_until'));
    }

    public function test_admin_can_set_and_clear_courtesy()
    {
        $set = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/clubs/{$this->club->id}/courtesy", ['courtesy_until' => '2030-01-15']);
        $set->assertStatus(200);
        $this->assertTrue($this->club->fresh()->onCourtesyPeriod());

        $clear = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/clubs/{$this->club->id}/courtesy", ['courtesy_until' => null]);
        $clear->assertStatus(200);
        $this->assertNull($this->club->fresh()->courtesy_until);
    }

    public function test_non_admin_cannot_set_courtesy()
    {
        $this->actingAs($this->manager, 'sanctum')
            ->putJson("/api/admin/clubs/{$this->club->id}/courtesy", ['courtesy_until' => '2030-01-15'])
            ->assertStatus(403);
    }
}
