<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Announcement;
use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use App\Notifications\NewAnnouncementNotification;
use Tests\TestCase;

class AnnouncementControllerTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $admin;
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
        
        $this->admin = User::factory()->create([
            'role' => 'admin',
            'club_id' => $this->club->id,
        ]);
        
        $this->member = User::factory()->create([
            'role' => 'member',
            'club_id' => $this->club->id,
        ]);
    }

    public function test_allows_anyone_to_list_announcements()
    {
        Announcement::create([
            'user_id' => $this->admin->id,
            'title' => 'Test Announcement',
            'content' => 'Test Content',
            'is_pinned' => false,
            'category' => 'General',
            'club_id' => $this->club->id,
        ]);

        $response = $this->actingAs($this->member)
                         ->withHeader('X-Tenant-Club', 'test-club')
                         ->getJson('/api/announcements');

        $response->assertStatus(200)
                 ->assertJsonCount(1)
                 ->assertJsonPath('0.title', 'Test Announcement');
    }

    public function test_allows_admin_to_create_an_announcement_and_notifies_users()
    {
        Notification::fake();

        $response = $this->actingAs($this->admin)
                         ->withHeader('X-Tenant-Club', 'test-club')
                         ->postJson('/api/announcements', [
                             'title' => 'New Rule',
                             'content' => 'Please follow the new rules.',
                             'is_pinned' => true,
                             'category' => 'Importante',
                             'notify_all' => true,
                         ]);

        $response->assertStatus(201)
                 ->assertJsonPath('title', 'New Rule');

        $this->assertDatabaseHas('announcements', [
            'title' => 'New Rule',
            'category' => 'Importante',
            'is_pinned' => 1,
        ]);

        Notification::assertSentTo(
            [$this->member, $this->admin],
            NewAnnouncementNotification::class
        );
    }

    public function test_allows_a_user_to_mark_an_announcement_as_read()
    {
        $announcement = Announcement::create([
            'user_id' => $this->admin->id,
            'title' => 'Read Me',
            'content' => 'Content',
            'is_pinned' => false,
            'category' => 'General',
            'club_id' => $this->club->id,
        ]);

        $response = $this->actingAs($this->member)
                         ->withHeader('X-Tenant-Club', 'test-club')
                         ->postJson("/api/announcements/{$announcement->id}/read");

        $response->assertStatus(200);

        $this->assertDatabaseHas('announcement_reads', [
            'announcement_id' => $announcement->id,
            'user_id' => $this->member->id,
        ]);
    }
}
