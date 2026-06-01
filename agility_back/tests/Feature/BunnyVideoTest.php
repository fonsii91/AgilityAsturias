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

    public function test_bunny_video_store_creates_collection_when_not_exists_and_caches_it()
    {
        Http::fake([
            // GET collections list (empty)
            'https://video.bunnycdn.com/library/674294/collections?search=testclub&perPage=100' => Http::response([
                'items' => [],
                'totalItems' => 0
            ], 200),
            // POST create collection
            'https://video.bunnycdn.com/library/674294/collections' => Http::response([
                'guid' => 'mock-collection-guid-777',
                'name' => 'testclub'
            ], 200),
            // POST create video (with collectionId)
            'https://video.bunnycdn.com/library/674294/videos' => Http::response([
                'guid' => 'bunny-video-guid-123',
                'title' => 'Mi super carrera Bunny',
                'status' => 0
            ], 200)
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Club-Slug' => 'testclub'])
            ->postJson('/api/videos', [
                'dog_id' => $this->dog->id,
                'date' => now()->format('Y-m-d'),
                'title' => 'Mi super carrera Bunny',
                'orientation' => 'vertical',
                'manga_type' => 'Agility 1'
            ]);

        $response->assertStatus(201);

        // Verify request payload sent to create video includes collectionId
        Http::assertSent(function ($request) {
            if ($request->url() === 'https://video.bunnycdn.com/library/674294/videos' && $request->method() === 'POST') {
                $data = json_decode($request->body(), true);
                return isset($data['collectionId']) && $data['collectionId'] === 'mock-collection-guid-777';
            }
            return true;
        });

        // Verify club settings cached the collection ID
        $this->assertEquals('mock-collection-guid-777', $this->club->fresh()->settings['bunny_collection_id'] ?? null);
    }

    public function test_bunny_video_store_uses_existing_collection_from_bunny_and_caches_it()
    {
        Http::fake([
            // GET collections list (finds collection)
            'https://video.bunnycdn.com/library/674294/collections?search=testclub&perPage=100' => Http::response([
                'items' => [
                    [
                        'guid' => 'mock-collection-guid-888',
                        'name' => 'testclub'
                    ]
                ],
                'totalItems' => 1
            ], 200),
            // POST create video (with collectionId)
            'https://video.bunnycdn.com/library/674294/videos' => Http::response([
                'guid' => 'bunny-video-guid-123',
                'title' => 'Mi super carrera Bunny',
                'status' => 0
            ], 200)
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Club-Slug' => 'testclub'])
            ->postJson('/api/videos', [
                'dog_id' => $this->dog->id,
                'date' => now()->format('Y-m-d'),
                'title' => 'Mi super carrera Bunny',
                'orientation' => 'vertical',
                'manga_type' => 'Agility 1'
            ]);

        $response->assertStatus(201);

        // Verify request payload sent to create video includes collectionId
        Http::assertSent(function ($request) {
            if ($request->url() === 'https://video.bunnycdn.com/library/674294/videos' && $request->method() === 'POST') {
                $data = json_decode($request->body(), true);
                return isset($data['collectionId']) && $data['collectionId'] === 'mock-collection-guid-888';
            }
            return true;
        });

        // Verify club settings cached the collection ID
        $this->assertEquals('mock-collection-guid-888', $this->club->fresh()->settings['bunny_collection_id'] ?? null);
    }

    public function test_bunny_video_store_uses_cached_collection_id_without_querying_bunny_api()
    {
        // Cache the collection ID beforehand
        $this->club->settings = ['bunny_collection_id' => 'mock-collection-guid-999'];
        $this->club->save();

        Http::fake([
            // POST create video (with collectionId)
            'https://video.bunnycdn.com/library/674294/videos' => Http::response([
                'guid' => 'bunny-video-guid-123',
                'title' => 'Mi super carrera Bunny',
                'status' => 0
            ], 200)
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Club-Slug' => 'testclub'])
            ->postJson('/api/videos', [
                'dog_id' => $this->dog->id,
                'date' => now()->format('Y-m-d'),
                'title' => 'Mi super carrera Bunny',
                'orientation' => 'vertical',
                'manga_type' => 'Agility 1'
            ]);

        $response->assertStatus(201);

        // Verify that GET /collections was NOT called
        Http::assertSent(function ($request) {
            if ($request->url() === 'https://video.bunnycdn.com/library/674294/videos' && $request->method() === 'POST') {
                $data = json_decode($request->body(), true);
                return isset($data['collectionId']) && $data['collectionId'] === 'mock-collection-guid-999';
            }
            return true;
        });

        Http::assertNotSent(function ($request) {
            return str_contains($request->url(), '/collections');
        });
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

    public function test_deleting_video_removes_it_from_bunny_stream()
    {
        Http::fake([
            'https://video.bunnycdn.com/library/674294/videos/bunny-video-guid-123' => Http::response(null, 200)
        ]);

        $video = Video::create([
            'club_id' => $this->club->id,
            'dog_id' => $this->dog->id,
            'user_id' => $this->user->id,
            'date' => now()->format('Y-m-d'),
            'title' => 'Video to Delete',
            'status' => 'completed',
            'bunny_video_id' => 'bunny-video-guid-123',
            'orientation' => 'vertical',
            'manga_type' => 'Agility 1',
            'is_public' => true
        ]);

        $video->delete();

        Http::assertSent(function ($request) {
            return $request->url() === 'https://video.bunnycdn.com/library/674294/videos/bunny-video-guid-123' &&
                   $request->method() === 'DELETE' &&
                   $request->header('AccessKey')[0] === '121c41b6-144d-436a-b95930edaa4c-5fd2-42b8';
        });

        $this->assertDatabaseMissing('videos', ['id' => $video->id]);
    }

    public function test_deleting_dog_cascades_eloquent_deletes_to_its_videos()
    {
        Http::fake([
            'https://video.bunnycdn.com/library/674294/videos/bunny-video-guid-123' => Http::response(null, 200)
        ]);

        $video = Video::create([
            'club_id' => $this->club->id,
            'dog_id' => $this->dog->id,
            'user_id' => $this->user->id,
            'date' => now()->format('Y-m-d'),
            'title' => 'Video of Dog',
            'status' => 'completed',
            'bunny_video_id' => 'bunny-video-guid-123',
            'orientation' => 'vertical',
            'manga_type' => 'Agility 1',
            'is_public' => true
        ]);

        $this->dog->delete();

        Http::assertSent(function ($request) {
            return $request->url() === 'https://video.bunnycdn.com/library/674294/videos/bunny-video-guid-123' &&
                   $request->method() === 'DELETE';
        });

        $this->assertDatabaseMissing('videos', ['id' => $video->id]);
    }

    public function test_deleting_user_cascades_eloquent_deletes_to_their_videos()
    {
        Http::fake([
            'https://video.bunnycdn.com/library/674294/videos/bunny-video-guid-123' => Http::response(null, 200)
        ]);

        $video = Video::create([
            'club_id' => $this->club->id,
            'dog_id' => $this->dog->id,
            'user_id' => $this->user->id,
            'date' => now()->format('Y-m-d'),
            'title' => 'Video of User',
            'status' => 'completed',
            'bunny_video_id' => 'bunny-video-guid-123',
            'orientation' => 'vertical',
            'manga_type' => 'Agility 1',
            'is_public' => true
        ]);

        $this->user->delete();

        Http::assertSent(function ($request) {
            return $request->url() === 'https://video.bunnycdn.com/library/674294/videos/bunny-video-guid-123' &&
                   $request->method() === 'DELETE';
        });

        $this->assertDatabaseMissing('videos', ['id' => $video->id]);
    }

    public function test_video_upload_local_to_bunny_command_uploads_and_updates_status()
    {
        // Setup a local video
        \Illuminate\Support\Facades\Storage::fake('public');
        \Illuminate\Support\Facades\Storage::disk('public')->put('clubs/testclub/videos/test.mp4', 'dummy video content');

        $video = Video::create([
            'club_id' => $this->club->id,
            'dog_id' => $this->dog->id,
            'user_id' => $this->user->id,
            'date' => now()->format('Y-m-d'),
            'title' => 'Test Video Upload Command',
            'status' => 'local',
            'local_path' => 'clubs/testclub/videos/test.mp4',
            'orientation' => 'vertical',
            'manga_type' => 'Agility 1',
            'is_public' => true
        ]);

        Http::fake([
            // GET collections list (empty)
            'https://video.bunnycdn.com/library/674294/collections?search=testclub&perPage=100' => Http::response([
                'items' => [],
                'totalItems' => 0
            ], 200),
            // POST create collection
            'https://video.bunnycdn.com/library/674294/collections' => Http::response([
                'guid' => 'mock-collection-guid-777',
                'name' => 'testclub'
            ], 200),
            // POST create video placeholder
            'https://video.bunnycdn.com/library/674294/videos' => Http::response([
                'guid' => 'bunny-video-guid-555',
                'title' => 'Test Video Upload Command',
                'status' => 0
            ], 200),
            // PUT upload file
            'https://video.bunnycdn.com/library/674294/videos/bunny-video-guid-555' => Http::response(null, 200)
        ]);

        // Run the command and confirm the prompt
        $this->artisan('video:upload-local-to-bunny', ['--limit' => 1])
            ->expectsConfirmation('Do you want to proceed with the sequential upload of 1 videos?', 'yes')
            ->assertExitCode(0);

        // Assert database record was updated correctly
        $video->refresh();
        $this->assertEquals('encoding', $video->status);
        $this->assertEquals('bunny-video-guid-555', $video->bunny_video_id);
        $this->assertEquals('clubs/testclub/videos/test.mp4', $video->local_path); // local path preserved!

        // Assert local file still exists
        \Illuminate\Support\Facades\Storage::disk('public')->assertExists('clubs/testclub/videos/test.mp4');
    }

    public function test_video_cleanup_command_removes_local_files_for_completed_bunny_videos()
    {
        // Setup local storage fake and local files
        \Illuminate\Support\Facades\Storage::fake('public');
        \Illuminate\Support\Facades\Storage::disk('public')->put('clubs/testclub/videos/test.mp4', 'dummy video content');

        // This video is completed on Bunny but still has a local file reference
        $video = Video::create([
            'club_id' => $this->club->id,
            'dog_id' => $this->dog->id,
            'user_id' => $this->user->id,
            'date' => now()->format('Y-m-d'),
            'title' => 'Test Completed Video',
            'status' => 'completed',
            'bunny_video_id' => 'bunny-video-guid-555',
            'local_path' => 'clubs/testclub/videos/test.mp4',
            'orientation' => 'vertical',
            'manga_type' => 'Agility 1',
            'is_public' => true
        ]);

        // Run the cleanup command and confirm the prompt
        $this->artisan('video:cleanup-migrated-bunny-videos', ['--limit' => 1])
            ->expectsConfirmation('Do you want to proceed with deleting local files for 1 videos?', 'yes')
            ->assertExitCode(0);

        // Assert database record has null local_path
        $video->refresh();
        $this->assertNull($video->local_path);

        // Assert local file was deleted
        \Illuminate\Support\Facades\Storage::disk('public')->assertMissing('clubs/testclub/videos/test.mp4');
    }
}
