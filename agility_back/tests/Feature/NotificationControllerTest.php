<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;
use Tests\TestCase;

class NotificationControllerTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $member;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);
        
        $this->member = User::factory()->create([
            'role' => 'member',
            'club_id' => $this->club->id,
        ]);
    }

    public function test_lists_only_the_latest_10_notifications()
    {
        for ($i = 0; $i < 12; $i++) {
            DatabaseNotification::create([
                'id' => Str::uuid()->toString(),
                'type' => 'App\Notifications\TestNotification',
                'notifiable_type' => 'App\Models\User',
                'notifiable_id' => $this->member->id,
                'data' => ['message' => "Notification $i"],
                'read_at' => null,
            ]);
        }

        $response = $this->actingAs($this->member)
                         ->withHeader('X-Tenant-Club', 'test-club')
                         ->getJson('/api/notifications');

        $response->assertStatus(200)
                 ->assertJsonCount(10);
                 
        $this->assertDatabaseCount('notifications', 10);
    }

    public function test_marks_a_notification_as_read()
    {
        $notification = DatabaseNotification::create([
            'id' => Str::uuid()->toString(),
            'type' => 'App\Notifications\TestNotification',
            'notifiable_type' => 'App\Models\User',
            'notifiable_id' => $this->member->id,
            'data' => ['message' => 'Hello'],
            'read_at' => null,
        ]);

        $response = $this->actingAs($this->member)
                         ->withHeader('X-Tenant-Club', 'test-club')
                         ->postJson("/api/notifications/{$notification->id}/read");

        $response->assertStatus(200);
        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_marks_all_notifications_as_read()
    {
        DatabaseNotification::create([
            'id' => Str::uuid()->toString(),
            'type' => 'App\Notifications\TestNotification',
            'notifiable_type' => 'App\Models\User',
            'notifiable_id' => $this->member->id,
            'data' => ['message' => 'First'],
            'read_at' => null,
        ]);

        DatabaseNotification::create([
            'id' => Str::uuid()->toString(),
            'type' => 'App\Notifications\TestNotification',
            'notifiable_type' => 'App\Models\User',
            'notifiable_id' => $this->member->id,
            'data' => ['message' => 'Second'],
            'read_at' => null,
        ]);

        $response = $this->actingAs($this->member)
                         ->withHeader('X-Tenant-Club', 'test-club')
                         ->postJson('/api/notifications/mark-all-read');

        $response->assertStatus(200);
        $this->assertEquals(0, $this->member->unreadNotifications()->count());
    }
}
