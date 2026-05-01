<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Club;
use App\Models\TimeSlot;
use App\Models\Dog;
use App\Models\Reservation;
use App\Models\TimeSlotException;
use Illuminate\Support\Facades\Notification;
use App\Notifications\ClassCancelledNotification;
use Carbon\Carbon;

class TimeSlotExceptionTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $admin;
    protected $staff;
    protected $member;
    protected $coOwner;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);
        
        $this->admin = User::factory()->create(['club_id' => $this->club->id, 'role' => 'admin']);
        $this->staff = User::factory()->create(['club_id' => $this->club->id, 'role' => 'staff']);
        $this->member = User::factory()->create(['club_id' => $this->club->id, 'role' => 'member']);
        $this->coOwner = User::factory()->create(['club_id' => $this->club->id, 'role' => 'member']);
    }

    private function createDogForUser($user, $coOwnerUser = null)
    {
        $dog = Dog::factory()->create([
            'user_id' => $user->id,
            'club_id' => $this->club->id
        ]);
        
        $dog->users()->attach($user->id, ['is_primary_owner' => true]);
        
        if ($coOwnerUser) {
            $dog->users()->attach($coOwnerUser->id, ['is_primary_owner' => false]);
        }
        
        return $dog;
    }

    public function test_anyone_can_view_future_exceptions()
    {
        $this->actingAs($this->member);

        // Past exception
        TimeSlotException::factory()->create([
            'club_id' => $this->club->id,
            'date' => Carbon::now()->subDay()->toDateString()
        ]);

        // Future exception
        $futureException = TimeSlotException::factory()->create([
            'club_id' => $this->club->id,
            'date' => Carbon::now()->addDay()->toDateString(),
            'reason' => 'Mantenimiento de pista'
        ]);

        $response = $this->getJson('/api/time-slot-exceptions');

        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonFragment([
            'reason' => 'Mantenimiento de pista'
        ]);
    }

    public function test_staff_can_create_exception_and_notify_users()
    {
        Notification::fake();
        $this->actingAs($this->staff);

        $slot = TimeSlot::factory()->create([
            'club_id' => $this->club->id,
            'start_time' => '18:00',
            'day' => 'Lunes'
        ]);

        $dog = $this->createDogForUser($this->member, $this->coOwner);
        
        $date = Carbon::now()->next(Carbon::MONDAY)->toDateString();

        // Create a reservation for that day
        $reservation = Reservation::factory()->create([
            'club_id' => $this->club->id,
            'user_id' => $this->member->id,
            'dog_id' => $dog->id,
            'slot_id' => $slot->id,
            'date' => $date
        ]);

        $response = $this->postJson('/api/time-slot-exceptions', [
            'slot_id' => $slot->id,
            'date' => $date,
            'reason' => 'Torneo RSCE'
        ]);

        $response->assertStatus(201);
        
        $this->assertDatabaseHas('time_slot_exceptions', [
            'slot_id' => $slot->id,
            'date' => $date . ' 00:00:00',
            'reason' => 'Torneo RSCE'
        ]);

        // Assert reservation is deleted
        $this->assertDatabaseMissing('reservations', [
            'id' => $reservation->id
        ]);

        // Assert notification sent to member
        Notification::assertSentTo(
            [$this->member],
            ClassCancelledNotification::class
        );

        // Assert notification sent to coOwner
        Notification::assertSentTo(
            [$this->coOwner],
            ClassCancelledNotification::class
        );
    }

    public function test_standard_users_cannot_manage_exceptions()
    {
        $this->actingAs($this->member);

        $slot = TimeSlot::factory()->create(['club_id' => $this->club->id]);

        $response = $this->postJson('/api/time-slot-exceptions', [
            'slot_id' => $slot->id,
            'date' => Carbon::now()->addDay()->toDateString(),
            'reason' => 'No autorizado'
        ]);

        $response->assertStatus(403);
    }

    public function test_staff_can_delete_exception()
    {
        $this->actingAs($this->admin);

        $slot = TimeSlot::factory()->create(['club_id' => $this->club->id]);
        $date = Carbon::now()->addDay()->toDateString();

        TimeSlotException::factory()->create([
            'club_id' => $this->club->id,
            'slot_id' => $slot->id,
            'date' => $date,
            'reason' => 'Temporal'
        ]);

        $response = $this->postJson('/api/time-slot-exceptions/delete', [
            'slot_id' => $slot->id,
            'date' => $date
        ]);

        $response->assertStatus(204);

        $this->assertDatabaseMissing('time_slot_exceptions', [
            'slot_id' => $slot->id,
            'date' => $date
        ]);
    }
}
