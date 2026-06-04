<?php

namespace Tests\Feature;

use App\Models\Competition;
use App\Models\Dog;
use App\Models\User;
use App\Models\Reservation;
use App\Models\TimeSlot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceHistoryTest extends TestCase
{
    use RefreshDatabase;

    private $club;
    private $staff;
    private $member;
    private $dog;
    private $slot;

    protected function setUp(): void
    {
        parent::setUp();
        $this->club = \App\Models\Club::create(['name' => 'Club Test', 'slug' => 'club-test']);
        $this->staff = User::factory()->create(['role' => 'staff', 'club_id' => $this->club->id]);
        $this->member = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $this->dog = Dog::factory()->create(['user_id' => $this->member->id, 'club_id' => $this->club->id]);
        $this->member->dogs()->attach($this->dog->id, ['is_primary_owner' => true]);

        $slot = new TimeSlot([
            'day' => 'Lunes',
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);
        $slot->club_id = $this->club->id;
        $slot->save();
        $this->slot = $slot;
    }

    public function test_non_staff_cannot_access_stats()
    {
        Sanctum::actingAs($this->member);

        $response1 = $this->getJson('/api/staff/attendance-stats');
        $response1->assertStatus(403);

        $response2 = $this->getJson("/api/staff/attendance-stats/member/{$this->member->id}");
        $response2->assertStatus(403);
    }

    public function test_staff_can_access_general_stats()
    {
        Sanctum::actingAs($this->staff);

        // Create some attendance records
        Reservation::create([
            'club_id' => $this->club->id,
            'user_id' => $this->member->id,
            'dog_id' => $this->dog->id,
            'slot_id' => $this->slot->id,
            'date' => now()->toDateString(),
            'status' => 'completed',
            'attendance_verified' => true,
        ]);

        $response = $this->getJson('/api/staff/attendance-stats');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_members',
                'global_attendance_rate',
                'classes_attendance_count',
                'events_attendance_count',
                'monthly_trend',
            ]);
    }

    public function test_staff_can_access_member_stats()
    {
        Sanctum::actingAs($this->staff);

        // Create some attendance records
        Reservation::create([
            'club_id' => $this->club->id,
            'user_id' => $this->member->id,
            'dog_id' => $this->dog->id,
            'slot_id' => $this->slot->id,
            'date' => now()->toDateString(),
            'status' => 'completed',
            'attendance_verified' => true,
        ]);

        $response = $this->getJson("/api/staff/attendance-stats/member/{$this->member->id}");
        $response->assertStatus(200)
            ->assertJsonStructure([
                'member_info' => [
                    'id', 'name', 'email', 'dogs'
                ],
                'summary' => [
                    'total_classes_attended',
                    'total_classes_possible',
                    'attendance_rate_classes',
                    'total_events_attended',
                    'total_events_possible',
                    'attendance_rate_events',
                ],
                'history_list' => [
                    '*' => [
                        'date', 'name', 'type', 'status'
                    ]
                ]
            ]);
    }
}
