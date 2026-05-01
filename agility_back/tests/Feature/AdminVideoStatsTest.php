<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Club;
use App\Models\Video;
use App\Models\DailyVideoStat;
use App\Models\DeletedVideoHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminVideoStatsTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $admin;
    protected $staff;
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
        $this->admin = User::factory()->create(['role' => 'admin', 'club_id' => $this->club->id]);
        $this->staff = User::factory()->create(['role' => 'staff', 'club_id' => $this->club->id]);
        $this->member = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
    }

    public function test_restricts_admin_video_endpoints_to_admin_and_staff_roles()
    {
        $endpoints = [
            ['GET', '/api/admin/videos/stats'],
            ['GET', '/api/admin/videos/daily-history'],
            ['GET', '/api/admin/deleted-videos'],
        ];

        // For retry endpoint we need an existing video to not get 404 before 403
        $dog = \App\Models\Dog::factory()->create([
            'user_id' => $this->member->id,
            'club_id' => $this->club->id
        ]);
        $video = Video::factory()->create(['status' => 'failed', 'club_id' => $this->club->id, 'dog_id' => $dog->id, 'user_id' => $this->member->id]);
        $endpoints[] = ['POST', '/api/admin/videos/' . $video->id . '/retry'];

        foreach ($endpoints as $endpoint) {
            $method = $endpoint[0];
            $url = $endpoint[1];



            // Member
            $this->actingAs($this->member)
                ->json($method, $url)
                ->assertForbidden();
        }
    }

    public function test_returns_correct_video_stats_for_admin()
    {
        $dog = \App\Models\Dog::factory()->create([
            'user_id' => $this->member->id,
            'club_id' => $this->club->id
        ]);

        Video::factory()->count(3)->create(['status' => 'local', 'club_id' => $this->club->id, 'dog_id' => $dog->id, 'user_id' => $this->member->id]);
        Video::factory()->count(2)->create(['status' => 'in_queue', 'club_id' => $this->club->id, 'dog_id' => $dog->id, 'user_id' => $this->member->id]);
        Video::factory()->count(5)->create(['status' => 'on_youtube', 'club_id' => $this->club->id, 'dog_id' => $dog->id, 'user_id' => $this->member->id]);

        $failedVideo = Video::factory()->create([
            'status' => 'failed',
            'club_id' => $this->club->id,
            'dog_id' => $dog->id,
            'user_id' => $this->member->id,
            'youtube_error' => 'Quota exceeded'
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/videos/stats');

        $response->assertOk()
            ->assertJsonStructure([
                'counts' => [
                    'local',
                    'in_queue',
                    'on_youtube',
                    'failed'
                ],
                'failed_videos' => [
                    '*' => ['id', 'title', 'youtube_error']
                ]
            ])
            ->assertJsonPath('counts.local', 3)
            ->assertJsonPath('counts.in_queue', 2)
            ->assertJsonPath('counts.on_youtube', 5)
            ->assertJsonPath('counts.failed', 1)
            ->assertJsonPath('failed_videos.0.id', $failedVideo->id);
    }

    public function test_returns_daily_video_stats_history()
    {
        DailyVideoStat::create([
            'club_id' => $this->club->id,
            'date' => '2023-10-01',
            'local_count' => 10,
            'youtube_count' => 20,
            'in_queue_count' => 2,
            'failed_count' => 1,
            'total_count' => 33
        ]);

        DailyVideoStat::create([
            'club_id' => $this->club->id,
            'date' => '2023-10-02',
            'local_count' => 5,
            'youtube_count' => 25,
            'in_queue_count' => 0,
            'failed_count' => 0,
            'total_count' => 30
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/videos/daily-history');

        $response->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['date' => '2023-10-02', 'local_count' => 5])
            ->assertJsonFragment(['date' => '2023-10-01', 'local_count' => 10]);
    }

    public function test_returns_deleted_videos_history_paginated()
    {
        DeletedVideoHistory::create([
            'club_id' => $this->club->id,
            'original_video_id' => 100,
            'video_title' => 'Deleted Video 1',
            'deleted_by_name' => $this->admin->name,
            'deleted_by_id' => $this->admin->id,
            'video_date' => '2023-10-01',
            'status_before_deletion' => 'local'
        ]);

        DeletedVideoHistory::create([
            'club_id' => $this->club->id,
            'original_video_id' => 101,
            'video_title' => 'Deleted Video 2',
            'deleted_by_name' => $this->admin->name,
            'deleted_by_id' => $this->admin->id,
            'video_date' => '2023-10-02',
            'status_before_deletion' => 'on_youtube'
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/deleted-videos');

        $response->assertOk()
            ->assertJsonStructure([
                'data',
                'current_page',
                'last_page',
                'total'
            ])
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('total', 2);
    }

    public function test_allows_admin_to_retry_failed_video_upload()
    {
        $dog = \App\Models\Dog::factory()->create([
            'user_id' => $this->member->id,
            'club_id' => $this->club->id
        ]);

        $video = Video::factory()->create([
            'status' => 'failed',
            'youtube_error' => 'Some error',
            'club_id' => $this->club->id,
            'dog_id' => $dog->id,
            'user_id' => $this->member->id
        ]);

        $response = $this->actingAs($this->admin)->postJson("/api/admin/videos/{$video->id}/retry");

        $response->assertOk()
            ->assertJson(['message' => 'Video requeued successfully']);

        $this->assertDatabaseHas('videos', [
            'id' => $video->id,
            'status' => 'local',
            'youtube_error' => null
        ]);
    }
}
