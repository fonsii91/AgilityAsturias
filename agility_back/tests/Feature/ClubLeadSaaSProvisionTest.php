<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Club;
use App\Models\User;

class ClubLeadSaaSProvisionTest extends TestCase
{
    use RefreshDatabase;

    public function test_club_provision_with_password()
    {
        // Setup a Plan in the DB
        \App\Models\Plan::create([
            'name' => 'Pro Plan',
            'slug' => 'profesional',
            'price' => 19,
        ]);

        $payload = [
            'name' => 'Club Deportivo Asturias',
            'slug' => 'deportivo-asturias',
            'email' => 'manager@asturias.com',
            'phone' => '600123456',
            'password' => 'mysecurepassword123',
            'plan_selected' => 'Pro',
        ];

        $response = $this->postJson('/api/club-leads', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('lead.status', 'approved');

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
    }
}
