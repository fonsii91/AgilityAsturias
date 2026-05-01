<?php

namespace Tests\Feature;

use App\Models\Competition;
use App\Models\Dog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompetitionAttendanceTest extends TestCase
{
    use RefreshDatabase;

    private $club;
    private $user;
    private $dog;
    private $competition;

    protected function setUp(): void
    {
        parent::setUp();
        $this->club = \App\Models\Club::create(['name' => 'Club Test', 'slug' => 'club-test']);
        $this->user = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $this->dog = Dog::factory()->create(['user_id' => $this->user->id, 'club_id' => $this->club->id]);
        $this->user->dogs()->attach($this->dog->id, ['is_primary_owner' => true]);
        $this->competition = Competition::factory()->create([
            'fecha_evento' => '2026-06-01',
            'tipo' => 'competicion',
            'club_id' => $this->club->id,
        ]);
    }

    public function test_includes_attendance_status_when_getting_competitions_as_authenticated_user()
    {
        Sanctum::actingAs($this->user);

        // Attend the competition first
        $this->competition->attendees()->attach($this->user->id, [
            'dias_asistencia' => json_encode(['2026-06-01']),
        ]);
        
        $this->competition->attendingDogs()->attach($this->dog->id, [
            'user_id' => $this->user->id,
        ]);

        $response = $this->getJson('/api/competitions');

        $response->assertStatus(200)
            ->assertJsonFragment([
                'id' => $this->competition->id,
                'is_attending' => true,
            ]);
            
        $content = $response->json();
        $comp = collect($content)->firstWhere('id', $this->competition->id);
        
        $this->assertEquals(['2026-06-01'], $comp['dias_asistencia']);
        $this->assertContains($this->dog->id, $comp['attending_dog_ids']);
    }

    public function test_can_attend_a_competition_with_dogs_and_days()
    {
        Sanctum::actingAs($this->user);

        $payload = [
            'dog_ids' => [$this->dog->id],
            'dias_asistencia' => ['2026-06-01', '2026-06-02'],
        ];

        $response = $this->postJson("/api/competitions/{$this->competition->id}/attend", $payload);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Attendance recorded successfully']);

        $this->assertDatabaseHas('competition_user', [
            'competition_id' => $this->competition->id,
            'user_id' => $this->user->id,
        ]);
        
        $this->assertDatabaseHas('competition_dog', [
            'competition_id' => $this->competition->id,
            'dog_id' => $this->dog->id,
            'user_id' => $this->user->id,
        ]);
    }

    public function test_can_remove_attendance_from_a_competition()
    {
        Sanctum::actingAs($this->user);

        // Setup initial attendance
        $this->competition->attendees()->attach($this->user->id);
        $this->competition->attendingDogs()->attach($this->dog->id, [
            'user_id' => $this->user->id,
        ]);

        $response = $this->postJson("/api/competitions/{$this->competition->id}/unattend");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Attendance removed successfully']);

        $this->assertDatabaseMissing('competition_user', [
            'competition_id' => $this->competition->id,
            'user_id' => $this->user->id,
        ]);

        $this->assertDatabaseMissing('competition_dog', [
            'competition_id' => $this->competition->id,
            'dog_id' => $this->dog->id,
            'user_id' => $this->user->id,
        ]);
    }
}
