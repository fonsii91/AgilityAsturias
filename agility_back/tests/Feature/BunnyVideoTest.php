<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Dog;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class BunnyVideoTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $dog;
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

        Notification::fake();
        
        $this->user = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $this->dog = Dog::factory()->create(['user_id' => $this->user->id, 'club_id' => $this->club->id]);
        $this->dog->users()->attach($this->user->id, ['is_primary_owner' => true]);

        // Force the video driver to bunny for these tests
        config(['services.videos.driver' => 'bunny']);
        config(['services.bunny.library_id' => '674294']);
        config(['services.bunny.api_key' => '121c41b6-144d-436a-b95930edaa4c-5fd2-42b8']);
    }

    public function test_bunny_video_store_creates_video_in_bunny_stream_and_returns_upload_details()
    {
        Http::fake([
            'https://video.bunnycdn.com/library/674294/videos' => Http::response([
                'guid' => 'bunny-video-guid-123',
                'title' => 'Mi super carrera Bunny',
                'status' => 0
            ], 200)
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/videos', [
            'dog_id' => $this->dog->id,
            'date' => now()->format('Y-m-d'),
            'title' => 'Mi super carrera Bunny',
            'orientation' => 'vertical',
            'manga_type' => 'Agility 1'
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'video' => ['id', 'title', 'bunny_video_id', 'status'],
            'uploadUrl',
            'accessKey'
        ]);

        $this->assertEquals('bunny-video-guid-123', $response->json('video.bunny_video_id'));
        $this->assertEquals('uploading', $response->json('video.status'));
        $this->assertEquals('https://video.bunnycdn.com/library/674294/videos/bunny-video-guid-123', $response->json('uploadUrl'));
        $this->assertEquals('121c41b6-144d-436a-b95930edaa4c-5fd2-42b8', $response->json('accessKey'));

        $this->assertDatabaseHas('videos', [
            'bunny_video_id' => 'bunny-video-guid-123',
            'status' => 'uploading'
        ]);
    }

    public function test_bunny_video_uploaded_transitions_to_encoding()
    {
        $video = Video::create([
            'club_id' => $this->club->id,
            'dog_id' => $this->dog->id,
            'user_id' => $this->user->id,
            'date' => now()->format('Y-m-d'),
            'title' => 'Video Bunny',
            'status' => 'uploading',
            'bunny_video_id' => 'bunny-video-guid-123',
            'orientation' => 'vertical',
            'manga_type' => 'Agility 1',
            'is_public' => true
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/videos/{$video->id}/uploaded");

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Video marked as uploaded to Bunny and processing started'
        ]);

        $this->assertEquals('encoding', $video->fresh()->status);
    }

    public function test_bunny_webhook_finished_transitions_to_completed()
    {
        $video = Video::create([
            'club_id' => $this->club->id,
            'dog_id' => $this->dog->id,
            'user_id' => $this->user->id,
            'date' => now()->format('Y-m-d'),
            'title' => 'Video Bunny Webhook',
            'status' => 'encoding',
            'bunny_video_id' => 'bunny-video-guid-456',
            'orientation' => 'vertical',
            'manga_type' => 'Agility 1',
            'is_public' => true
        ]);

        // Status 3 = Finished
        $response = $this->postJson('/api/webhooks/bunny', [
            'VideoGuid' => 'bunny-video-guid-456',
            'Status' => 3
        ]);

        $response->assertStatus(200);
        $this->assertEquals('completed', $video->fresh()->status);
        $this->assertEquals(
            'https://iframe.mediadelivery.net/play/674294/bunny-video-guid-456/playlist.m3u8',
            $video->fresh()->playback_url
        );
    }

    public function test_bunny_webhook_failed_transitions_to_failed()
    {
        $video = Video::create([
            'club_id' => $this->club->id,
            'dog_id' => $this->dog->id,
            'user_id' => $this->user->id,
            'date' => now()->format('Y-m-d'),
            'title' => 'Video Bunny Webhook Fail',
            'status' => 'encoding',
            'bunny_video_id' => 'bunny-video-guid-789',
            'orientation' => 'vertical',
            'manga_type' => 'Agility 1',
            'is_public' => true
        ]);

        // Status 5 = Failed
        $response = $this->postJson('/api/webhooks/bunny', [
            'VideoGuid' => 'bunny-video-guid-789',
            'Status' => 5
        ]);

        $response->assertStatus(200);
        $this->assertEquals('failed', $video->fresh()->status);
        $this->assertEquals('Bunny.net transcoding failed', $video->fresh()->error_message);
    }
}
