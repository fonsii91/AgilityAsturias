<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\User;
use App\Models\Dog;
use App\Models\Reservation;
use App\Models\TimeSlot;
use App\Models\Competition;
use App\Models\PointHistory;
use App\Models\DogWorkload;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Carbon\Carbon;
use Illuminate\Support\Facades\Notification;

class StaffAttendanceTest extends TestCase
{
    use RefreshDatabase;

    private $club;
    private $staff;
    private $member;
    private $dog;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->club = Club::create(['name' => 'Test Club', 'slug' => 'test-club']);
        
        $this->staff = User::factory()->create([
            'role' => 'staff',
            'club_id' => $this->club->id,
        ]);
        
        $this->member = User::factory()->create([
            'role' => 'member',
            'club_id' => $this->club->id,
        ]);

        $this->dog = Dog::factory()->create([
            'user_id' => $this->member->id,
            'club_id' => $this->club->id,
            'points' => 0
        ]);

        $this->member->dogs()->attach($this->dog->id, ['is_primary_owner' => true]);
    }

    public function test_staff_can_view_pending_attendance_sessions()
    {
        Sanctum::actingAs($this->staff);

        $yesterday = Carbon::yesterday()->format('Y-m-d 00:00:00');
        $slot = TimeSlot::factory()->create(['club_id' => $this->club->id]);
        
        // Active and not verified (should appear)
        $res1 = Reservation::factory()->create([
            'user_id' => $this->member->id,
            'dog_id' => $this->dog->id,
            'slot_id' => $slot->id,
            'date' => $yesterday,
            'status' => 'active',
            'attendance_verified' => false,
        ]);

        // Verified (should NOT appear)
        $res2 = Reservation::factory()->create([
            'user_id' => $this->member->id,
            'dog_id' => $this->dog->id,
            'slot_id' => $slot->id,
            'date' => $yesterday,
            'status' => 'completed',
            'attendance_verified' => true,
        ]);

        // Future session (should NOT appear unless it's past its end time today, but tomorrow definitely won't)
        $res3 = Reservation::factory()->create([
            'user_id' => $this->member->id,
            'dog_id' => $this->dog->id,
            'slot_id' => $slot->id,
            'date' => Carbon::tomorrow()->format('Y-m-d 00:00:00'),
            'status' => 'active',
            'attendance_verified' => false,
        ]);

        $response = $this->getJson('/api/admin/attendance/pending');

        $response->assertStatus(200);
        $data = $response->json();
        
        $this->assertCount(1, $data);
        // Compare just the date part if the API returns string date or datetime
        $this->assertStringContainsString(Carbon::yesterday()->toDateString(), $data[0]['date']);
        $this->assertEquals($slot->id, $data[0]['slot']['id']);
        $this->assertCount(1, $data[0]['reservations']);
        $this->assertEquals($res1->id, $data[0]['reservations'][0]['id']);
    }

    public function test_staff_can_confirm_attendance_for_training_session()
    {
        Sanctum::actingAs($this->staff);
        Notification::fake();

        // In API we pass 'date' as Y-m-d, but in SQLite it might be stored as Y-m-d 00:00:00
        $yesterdayDate = Carbon::yesterday()->toDateString();
        $yesterdayDateTime = $yesterdayDate . ' 00:00:00';
        
        $slot = TimeSlot::factory()->create(['club_id' => $this->club->id]);
        
        // Attended
        $resAttended = Reservation::factory()->create([
            'user_id' => $this->member->id,
            'dog_id' => $this->dog->id,
            'slot_id' => $slot->id,
            'date' => $yesterdayDateTime,
            'status' => 'active',
            'attendance_verified' => false,
        ]);

        // No-show
        $resNoShow = Reservation::factory()->create([
            'user_id' => $this->member->id,
            'dog_id' => Dog::factory()->create(['user_id' => $this->member->id, 'club_id' => $this->club->id])->id,
            'slot_id' => $slot->id,
            'date' => $yesterdayDateTime,
            'status' => 'active',
            'attendance_verified' => false,
        ]);

        $response = $this->postJson('/api/admin/attendance/confirm', [
            'date' => $yesterdayDateTime, // SQLite matching
            'slot_id' => $slot->id,
            'attended_ids' => [$resAttended->id]
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Asistencia confirmada y puntos actualizados']);

        // Assert attended reservation updated
        $this->assertDatabaseHas('reservations', [
            'id' => $resAttended->id,
            'status' => 'completed',
            'attendance_verified' => true
        ]);

        // Assert dog received points
        $this->assertDatabaseHas('dogs', [
            'id' => $this->dog->id,
            'points' => 3
        ]);

        $this->assertDatabaseHas('point_histories', [
            'dog_id' => $this->dog->id,
            'points' => 3,
            'category' => 'Asistencia a entrenamiento'
        ]);

        // Assert dog workload was generated
        $this->assertDatabaseHas('dog_workloads', [
            'dog_id' => $this->dog->id,
            'source_type' => 'auto_attendance',
            'source_id' => $resAttended->id,
            'date' => $yesterdayDateTime,
            'is_staff_verified' => 1
        ]);

        // Assert notification was sent
        Notification::assertSentTo(
            [$this->member],
            \App\Notifications\DogPointNotification::class
        );

        // Assert no-show reservation updated
        $this->assertDatabaseHas('reservations', [
            'id' => $resNoShow->id,
            'status' => 'cancelled',
            'attendance_verified' => true
        ]);
    }

    public function test_staff_can_view_pending_competitions()
    {
        Sanctum::actingAs($this->staff);

        $yesterday = Carbon::yesterday()->toDateString();
        
        $compPending = Competition::factory()->create([
            'club_id' => $this->club->id,
            'fecha_evento' => $yesterday,
            'attendance_verified' => false,
        ]);

        $compVerified = Competition::factory()->create([
            'club_id' => $this->club->id,
            'fecha_evento' => $yesterday,
            'attendance_verified' => true,
        ]);

        $response = $this->getJson('/api/admin/attendance/pending-competitions');

        $response->assertStatus(200);
        $data = $response->json();
        
        // Might return more than 1 if other tests bleed, but with RefreshDatabase it should be isolated.
        $this->assertCount(1, $data);
        $this->assertEquals($compPending->id, $data[0]['id']);
    }

    public function test_staff_can_confirm_competition_attendance_and_assign_points_and_workload()
    {
        Sanctum::actingAs($this->staff);
        Notification::fake();

        $yesterday = Carbon::yesterday()->toDateString();
        
        $competition = Competition::factory()->create([
            'club_id' => $this->club->id,
            'fecha_evento' => $yesterday,
            'tipo' => 'competicion',
            'nombre' => 'Regional Test',
            'attendance_verified' => false,
        ]);

        // Dog 1 was already enrolled
        $competition->attendees()->attach($this->member->id, ['dias_asistencia' => json_encode([$yesterday])]);
        $competition->attendingDogs()->attach($this->dog->id, ['user_id' => $this->member->id]);

        // Dog 2 is an extra attendee added at the moment
        $dog2 = Dog::factory()->create(['user_id' => $this->member->id, 'club_id' => $this->club->id]);
        $this->member->dogs()->attach($dog2->id);

        $payload = [
            'competition_id' => $competition->id,
            'attended_dogs' => [
                ['id' => $this->dog->id, 'position' => '1']
            ],
            'new_attendees' => [
                ['user_id' => $this->member->id, 'dog_id' => $dog2->id, 'position' => '3']
            ]
        ];

        $response = $this->postJson('/api/admin/attendance/confirm-competition', $payload);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Asistencia de competición confirmada']);

        $this->assertDatabaseHas('competitions', [
            'id' => $competition->id,
            'attendance_verified' => 1
        ]);

        // Verify dog 1 received 4 points for 1st place
        $this->assertDatabaseHas('dogs', [
            'id' => $this->dog->id,
            'points' => 4
        ]);
        
        $this->assertDatabaseHas('point_histories', [
            'dog_id' => $this->dog->id,
            'points' => 4,
            'category' => 'Primero en Regional Test'
        ]);

        // Verify dog 2 received 2 points for 3rd place
        $this->assertDatabaseHas('dogs', [
            'id' => $dog2->id,
            'points' => 2
        ]);

        // Verify workload was created for dog 1
        $this->assertDatabaseHas('dog_workloads', [
            'dog_id' => $this->dog->id,
            'source_type' => 'auto_competition',
            'source_id' => $competition->id,
            'date' => $yesterday . ' 00:00:00',
            'is_staff_verified' => 1
        ]);

        // Verify workload was created for dog 2
        $this->assertDatabaseHas('dog_workloads', [
            'dog_id' => $dog2->id,
            'source_type' => 'auto_competition',
            'source_id' => $competition->id,
            'date' => $yesterday . ' 00:00:00',
            'is_staff_verified' => 1
        ]);

        // Verify both are in competition_dog pivot with correct positions
        $this->assertDatabaseHas('competition_dog', [
            'competition_id' => $competition->id,
            'dog_id' => $this->dog->id,
            'position' => '1'
        ]);

        $this->assertDatabaseHas('competition_dog', [
            'competition_id' => $competition->id,
            'dog_id' => $dog2->id,
            'position' => '3'
        ]);
    }
}
