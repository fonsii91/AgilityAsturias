<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\Dog;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class RankingTest extends TestCase
{
    use RefreshDatabase;

    protected $club;

    protected function setUp(): void
    {
        parent::setUp();
        $this->club = \App\Models\Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);

        // Create an active ranking season
        \App\Models\GamificationSeason::create([
            'name' => 'Temporada de Test',
            'gamification_type' => 'ranking',
            'start_date' => now()->toDateString(),
            'status' => 'active'
        ]);
    }

    protected function createUser($attributes = [])
    {
        return User::factory()->create(array_merge(['club_id' => $this->club->id, 'role' => 'member'], $attributes));
    }

    protected function createDog($user, $attributes = [])
    {
        $points = isset($attributes['points']) ? $attributes['points'] : 0;
        
        $dog = Dog::factory()->create(array_merge(['user_id' => $user->id, 'club_id' => $this->club->id], $attributes));
        $dog->users()->attach($user->id, ['is_primary_owner' => true]);

        $activeSeason = \App\Models\GamificationSeason::where('status', 'active')
            ->first();

        if ($activeSeason && $points > 0) {
            \App\Models\DogSeasonPoint::create([
                'dog_id' => $dog->id,
                'season_id' => $activeSeason->id,
                'points' => $points,
            ]);
        }

        return $dog;
    }

    protected function createPointHistory($dogId, $points, $hoursAgo)
    {
        $activeSeason = \App\Models\GamificationSeason::where('status', 'active')
            ->first();

        return \App\Models\PointHistory::create([
            'dog_id' => $dogId,
            'club_id' => $this->club->id,
            'points' => $points,
            'category' => 'Test Points',
            'season_id' => $activeSeason ? $activeSeason->id : null,
            'created_at' => Carbon::now()->subHours($hoursAgo)
        ]);
    }

    public function test_user_can_view_ranking_and_positions_are_calculated_correctly()
    {
        $user = $this->createUser();

        // Dog 1: High points, no recent points -> Should be dropping or stable
        $dog1 = $this->createDog($user, ['points' => 100]);

        // Dog 2: Medium points, but high recent points -> Should be climbing
        $dog2 = $this->createDog($user, ['points' => 90]);
        
        // Add point histories in the last day representing recent points to match the test's expectation of 2 points
        $this->createPointHistory($dog2->id, 1, 2);
        $this->createPointHistory($dog2->id, 1, 2);

        // Dog 3: Low points, no recent points
        $dog3 = $this->createDog($user, ['points' => 10]);

        // Dog 4: Just entering (points > 0, recent points = current points)
        $dog4 = $this->createDog($user, ['points' => 5]);
        
        // Add point histories in the last day representing recent points to match the test's expectation of 5 points
        for ($i = 0; $i < 5; $i++) {
            $this->createPointHistory($dog4->id, 1, 5);
        }

        $response = $this->actingAs($user)->getJson('/api/ranking');

        $response->assertStatus(200);
        $data = $response->json();

        // Assert we got 4 dogs back
        $this->assertCount(4, $data);

        // Assert they are sorted correctly by current points: Dog1 (100), Dog2 (90), Dog3 (10), Dog4 (5)
        $this->assertEquals($dog1->id, $data[0]['id']);
        $this->assertEquals($dog2->id, $data[1]['id']);
        $this->assertEquals($dog3->id, $data[2]['id']);
        $this->assertEquals($dog4->id, $data[3]['id']);

        // Check Position Changes
        // Dog 1: past points = 100 - 0 = 100. Past pos = 1. Current pos = 1. Change = 0.
        $this->assertEquals(0, $data[0]['position_change']);

        // Dog 2: past points = 90 - 2 = 88. Past pos = 2. Current pos = 2. Change = 0.
        $this->assertEquals(0, $data[1]['position_change']);

        // Dog 3: past points = 10. Past pos = 3. Current pos = 3. Change = 0.
        $this->assertEquals(0, $data[2]['position_change']);

        // Dog 4: past points = 5 - 5 = 0. Past pos = 999. Current pos = 4. Change = 'NEW'
        $this->assertEquals('NEW', $data[3]['position_change']);
    }

    public function test_ranking_excludes_dogs_with_zero_points()
    {
        $user = $this->createUser();

        // Dog with 0 points
        $dogZero = $this->createDog($user, ['points' => 0]);

        // Dog with > 0 points
        $dogValid = $this->createDog($user, ['points' => 10]);

        $response = $this->actingAs($user)->getJson('/api/ranking');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertCount(1, $data);
        $this->assertEquals($dogValid->id, $data[0]['id']);
    }
}
