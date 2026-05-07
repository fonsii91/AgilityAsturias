<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;

class OnboardingControllerTest extends TestCase
{
    use RefreshDatabase;

    private function createUser($attributes = [])
    {
        $club = new Club();
        $club->name = 'Test Club';
        $club->slug = 'test-club';
        $club->save();
        $attributes['club_id'] = $club->id;
        $attributes['role'] = 'member'; // Required to pass the role middleware
        return User::factory()->create($attributes);
    }

    public function test_returns_empty_object_when_user_has_no_progress()
    {
        $user = $this->createUser([
            'onboarding_progress' => null
        ]);

        $this->actingAs($user)
            ->getJson('/api/user/onboarding')
            ->assertOk()
            ->assertJson([
                'onboarding_progress' => null
            ]);
    }

    public function test_can_retrieve_current_onboarding_progress()
    {
        $user = $this->createUser([
            'onboarding_progress' => [
                'staff' => ['staff_perros' => true]
            ]
        ]);

        $this->actingAs($user)
            ->getJson('/api/user/onboarding')
            ->assertOk()
            ->assertJson([
                'onboarding_progress' => [
                    'staff' => ['staff_perros' => true]
                ]
            ]);
    }

    public function test_can_mark_a_step_as_completed_in_a_specific_tutorial()
    {
        $user = $this->createUser([
            'onboarding_progress' => [
                'miembro' => ['miembro_clase' => true]
            ]
        ]);

        $this->actingAs($user)
            ->postJson('/api/user/onboarding/step', [
                'tutorial' => 'miembro',
                'step' => 'miembro_perros',
                'completed' => true
            ])
            ->assertOk()
            ->assertJson([
                'success' => true,
                'onboarding_progress' => [
                    'miembro' => [
                        'miembro_clase' => true,
                        'miembro_perros' => true
                    ]
                ]
            ]);

        $user->refresh();
        $this->assertTrue($user->onboarding_progress['miembro']['miembro_perros']);
        $this->assertTrue($user->onboarding_progress['miembro']['miembro_clase']);
    }

    public function test_can_mark_an_entire_tutorial_as_finished()
    {
        $user = $this->createUser([
            'onboarding_progress' => [
                'miembro' => ['miembro_perros' => true]
            ]
        ]);

        $this->actingAs($user)
            ->postJson('/api/user/onboarding/tutorial-finish', [
                'tutorial' => 'miembro'
            ])
            ->assertOk()
            ->assertJson([
                'success' => true,
                'onboarding_progress' => [
                    'miembro_finished' => true
                ]
            ]);

        $user->refresh();
        $this->assertTrue($user->onboarding_progress['miembro_finished']);
    }
}
