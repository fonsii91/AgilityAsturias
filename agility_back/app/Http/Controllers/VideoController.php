<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Video;
use Illuminate\Support\Facades\Storage;

class VideoController extends Controller
{
    public function index(Request $request)
    {
        $query = Video::query()->with(['dog.users:id,name', 'user', 'competition'])
                     ->whereIn('status', ['local', 'on_youtube', 'completed']);

        // Ya no hay filtros de privacidad para miembros, todos ven todos los vídeos
        if (!auth()->check()) {
            $query->where('is_public', true);
        }

        if ($request->has('search') && $request->search) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                    ->orWhereHas('dog', function ($qDog) use ($searchTerm) {
                        $qDog->where('name', 'like', "%{$searchTerm}%");
                    });
            });
        }

        if ($request->has('date') && $request->date) {
            $query->whereDate('date', $request->date);
        }

        if ($request->has('dateRange') && $request->dateRange) {
            switch ($request->dateRange) {
                case 'week':
                    $query->where('date', '>=', now()->subWeek());
                    break;
                case 'month':
                    $query->where('date', '>=', now()->subMonth());
                    break;
                case '3months':
                    $query->where('date', '>=', now()->subMonths(3));
                    break;
                case '6months':
                    $query->where('date', '>=', now()->subMonths(6));
                    break;
                case 'year':
                    $query->where('date', '>=', now()->subYear());
                    break;
            }
        }



        if ($request->has('dog_id') && $request->dog_id) {
            $query->where('dog_id', $request->dog_id);
        }

        if ($request->has('competition_id') && $request->competition_id) {
            $query->where('competition_id', $request->competition_id);
        }

        if ($request->has('category') && $request->category) {
            switch ($request->category) {
                case 'my_videos':
                    if (auth()->check()) {
                        $userId = auth()->id();
                        $query->where(function ($q) use ($userId) {
                            $q->where('user_id', $userId)
                              ->orWhereHas('dog.users', function ($qDogUser) use ($userId) {
                                  $qDogUser->where('users.id', $userId);
                              });
                        });
                    }
                    break;
                case 'competitions':
                    $query->whereNotNull('competition_id');
                    break;
                case 'trainings':
                    $query->whereNull('competition_id');
                    break;
            }
        }

        $baseQueryForCounts = clone $query;
        $verticalCount = (clone $baseQueryForCounts)->where(function ($q) {
            $q->where('orientation', 'vertical')->orWhereNull('orientation');
        })->count();
        $horizontalCount = (clone $baseQueryForCounts)->where('orientation', 'horizontal')->count();

        if ($request->has('orientation') && $request->orientation) {
            if ($request->orientation === 'vertical') {
                $query->where(function ($q) {
                    $q->where('orientation', 'vertical')
                      ->orWhereNull('orientation');
                });
            } else {
                $query->where('orientation', $request->orientation);
            }
        }

        $query->withCount('likes');

        if (auth()->check()) {
            $query->withExists([
                'likes as is_liked_by_user' => function ($q) {
                    $q->where('user_id', auth()->id());
                }
            ]);
        }

        if ($request->has('sort') && $request->sort === 'popular') {
            $query->orderByDesc('likes_count')->latest()->orderBy('id', 'desc');
        } else {
            $query->latest()->orderBy('id', 'desc');
        }

        $perPage = $request->has('per_page') ? min((int) $request->per_page, 100) : 9;
        $videos = $query->paginate($perPage);
        
        $responseArray = $videos->toArray();
        $responseArray['counts'] = [
            'vertical' => $verticalCount,
            'horizontal' => $horizontalCount
        ];

        return response()->json($responseArray);
    }

    public function store(Request $request)
    {
        $driver = config('services.videos.driver', 'legacy');

        if ($driver === 'bunny') {
            $request->validate([
                'dog_id' => 'required|exists:dogs,id',
                'competition_id' => 'nullable|exists:competitions,id',
                'date' => 'required|date',
                'title' => 'nullable|string|max:255',
                'orientation' => 'nullable|in:horizontal,vertical',
                'manga_type' => 'nullable|in:Agility,Jumping,Otra,Agility 1,Agility 2,Jumping 1,Jumping 2'
            ]);

            $libraryId = config('services.bunny.library_id');
            $apiKey = config('services.bunny.api_key');

            if (empty($libraryId) || empty($apiKey)) {
                return response()->json(['message' => 'Bunny.net Stream API credentials not configured'], 500);
            }

            $title = $request->title ?? ($request->date . ' Video Upload');

            // Resolve and cache collection ID per club slug
            $collectionId = null;
            $clubId = app()->bound('active_club_id') ? app('active_club_id') : null;
            $club = $clubId ? \App\Models\Club::find($clubId) : null;

            if ($club && $club->slug) {
                $clubSlug = $club->slug;
                $settings = $club->settings ?? [];

                if (!empty($settings['bunny_collection_id'])) {
                    $collectionId = $settings['bunny_collection_id'];
                } else {
                    try {
                        // Search for existing collection in Bunny Stream
                        $searchResponse = \Illuminate\Support\Facades\Http::withHeaders([
                            'AccessKey' => $apiKey,
                            'Accept' => 'application/json',
                        ])->get("https://video.bunnycdn.com/library/{$libraryId}/collections", [
                            'search' => $clubSlug,
                            'perPage' => 100,
                        ]);

                        if ($searchResponse->successful()) {
                            $collections = $searchResponse->json()['items'] ?? [];
                            foreach ($collections as $col) {
                                if (isset($col['name']) && strtolower($col['name']) === strtolower($clubSlug)) {
                                    $collectionId = $col['guid'];
                                    break;
                                }
                            }
                        }

                        // If not found, create a new collection in Bunny Stream
                        if (!$collectionId) {
                            $createResponse = \Illuminate\Support\Facades\Http::withHeaders([
                                'AccessKey' => $apiKey,
                                'Content-Type' => 'application/json',
                                'Accept' => 'application/json',
                            ])->post("https://video.bunnycdn.com/library/{$libraryId}/collections", [
                                'name' => $clubSlug,
                            ]);

                            if ($createResponse->successful()) {
                                $createdCol = $createResponse->json();
                                $collectionId = $createdCol['guid'] ?? null;
                            } else {
                                \Illuminate\Support\Facades\Log::warning("Failed to create Bunny Stream collection for club {$clubSlug}", [
                                    'response' => $createResponse->body()
                                ]);
                            }
                        }

                        // Save the found or created collection ID in club settings
                        if ($collectionId) {
                            $settings['bunny_collection_id'] = $collectionId;
                            $club->settings = $settings;
                            $club->save();
                        }
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error("Error handling Bunny Stream collection for club {$clubSlug}: " . $e->getMessage());
                    }
                }
            }

            $videoPayload = [
                'title' => $title,
            ];
            if ($collectionId) {
                $videoPayload['collectionId'] = $collectionId;
            }

            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'AccessKey' => $apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->post("https://video.bunnycdn.com/library/{$libraryId}/videos", $videoPayload);

            if (!$response->successful()) {
                return response()->json([
                    'message' => 'Error creating video in Bunny Stream',
                    'details' => $response->json()
                ], 500);
            }

            $bunnyData = $response->json();
            $bunnyVideoId = $bunnyData['guid'] ?? null;

            if (!$bunnyVideoId) {
                return response()->json(['message' => 'Invalid response from Bunny.net'], 500);
            }

            $video = Video::create([
                'dog_id' => $request->dog_id,
                'user_id' => $request->user()->id,
                'competition_id' => $request->competition_id,
                'date' => $request->date,
                'title' => $request->title,
                'status' => 'uploading',
                'bunny_video_id' => $bunnyVideoId,
                'orientation' => $request->orientation ?? 'vertical',
                'manga_type' => $request->manga_type ?? 'Agility 1',
                'is_public' => true
            ]);

            $video->load(['dog.users', 'user', 'competition']);

            $uploadUrl = "https://video.bunnycdn.com/library/{$libraryId}/videos/{$bunnyVideoId}";

            return response()->json([
                'video' => $video,
                'uploadUrl' => $uploadUrl,
                'accessKey' => $apiKey
            ], 201);
        }

        if ($driver === 'bitmovin') {
            $request->validate([
                'dog_id' => 'required|exists:dogs,id',
                'competition_id' => 'nullable|exists:competitions,id',
                'date' => 'required|date',
                'title' => 'nullable|string|max:255',
                'orientation' => 'nullable|in:horizontal,vertical',
                'manga_type' => 'nullable|in:Agility,Jumping,Otra,Agility 1,Agility 2,Jumping 1,Jumping 2'
            ]);

            $apiKey = config('services.bitmovin.api_key');
            if (empty($apiKey)) {
                return response()->json(['message' => 'Bitmovin API key not configured'], 500);
            }

            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'X-Api-Key' => $apiKey,
                'Content-Type' => 'application/json',
            ])->post('https://api.bitmovin.com/v1/encoding/inputs/direct-file-upload', [
                'name' => 'Upload de video ClubAgility',
                'description' => 'Subida temporal para transcodificacion',
            ]);

            if (!$response->successful()) {
                return response()->json([
                    'message' => 'Error requesting upload URL from Bitmovin',
                    'details' => $response->json()
                ], 500);
            }

            $bitmovinData = $response->json();
            $uploadUrl = $bitmovinData['data']['result']['uploadUrl'] ?? null;
            $inputId = $bitmovinData['data']['result']['id'] ?? null;

            if (!$uploadUrl || !$inputId) {
                return response()->json(['message' => 'Invalid response from Bitmovin'], 500);
            }

            $video = Video::create([
                'dog_id' => $request->dog_id,
                'user_id' => $request->user()->id,
                'competition_id' => $request->competition_id,
                'date' => $request->date,
                'title' => $request->title,
                'status' => 'uploading',
                'bitmovin_input_id' => $inputId,
                'orientation' => $request->orientation ?? 'vertical',
                'manga_type' => $request->manga_type ?? 'Agility 1',
                'is_public' => true
            ]);

            $video->load(['dog.users', 'user', 'competition']);

            return response()->json([
                'video' => $video,
                'uploadUrl' => $uploadUrl
            ], 201);
        }

        // Legacy flow
        $request->validate([
            'dog_id' => 'required|exists:dogs,id',
            'competition_id' => 'nullable|exists:competitions,id',
            'date' => 'required|date',
            'video' => 'required|file|mimes:mp4,mov,avi,wmv,webm|max:512000', // 500MB
            'title' => 'nullable|string|max:255',
            'orientation' => 'nullable|in:horizontal,vertical',
            'manga_type' => 'nullable|in:Agility,Jumping,Otra,Agility 1,Agility 2,Jumping 1,Jumping 2'
        ]);

        $clubSlug = app()->bound('active_club_slug') ? app('active_club_slug') : 'default';
        $path = $request->file('video')->store("clubs/{$clubSlug}/videos", 'public');

        $video = Video::create([
            'dog_id' => $request->dog_id,
            'user_id' => $request->user()->id,
            'competition_id' => $request->competition_id,
            'date' => $request->date,
            'title' => $request->title,
            'local_path' => $path,
            'status' => 'local',
            'orientation' => $request->orientation ?? 'vertical',
            'manga_type' => $request->manga_type ?? 'Agility 1',
            'is_public' => true
        ]);

        $video->load(['dog.users', 'user', 'competition']);

        // Notify dog owners
        if ($video->dog) {
            foreach ($video->dog->users as $owner) {
                // Remove the condition temporarily to allow the user to test with their own dog
                // if ($owner->id !== $video->user_id) {
                    $owner->notify(new \App\Notifications\NewVideoNotification($video));
                // }
            }
        }

        return response()->json($video, 201);
    }

    public function update(Request $request, $id)
    {
        $video = Video::findOrFail($id);

        $user = auth()->user();
        $isDogOwner = $video->dog && $video->dog->users->contains('id', $user->id);

        if ($video->user_id !== $user->id && !$isDogOwner && !in_array($user->role, ['admin', 'manager', 'staff'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'dog_id' => 'required|exists:dogs,id',
            'competition_id' => 'nullable|exists:competitions,id',
            'date' => 'required|date',
            'title' => 'nullable|string|max:255',
            'manga_type' => 'nullable|in:Agility,Jumping,Otra,Agility 1,Agility 2,Jumping 1,Jumping 2'
        ]);

        $updateData = [
            'dog_id' => $request->dog_id,
            'competition_id' => $request->competition_id,
            'date' => $request->date,
            'title' => $request->title,
        ];
        
        if ($request->has('manga_type')) {
            $updateData['manga_type'] = $request->manga_type;
        }

        $video->update($updateData);

        return response()->json($video->load(['dog.users:id,name', 'user', 'competition']));
    }

    public function destroy($id)
    {
        $video = Video::findOrFail($id);

        $user = auth()->user();
        $isDogOwner = $video->dog && $video->dog->users->contains('id', $user->id);

        if ($video->user_id !== $user->id && !$isDogOwner && !in_array($user->role, ['admin', 'manager', 'staff'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        \App\Models\DeletedVideoHistory::create([
            'original_video_id' => $video->id,
            'dog_name' => $video->dog ? $video->dog->name : 'Unknown',
            'dog_id' => $video->dog_id,
            'uploader_name' => $video->user ? $video->user->name : 'Unknown',
            'uploader_id' => $video->user_id,
            'deleted_by_name' => $user->name,
            'deleted_by_id' => $user->id,
            'video_title' => $video->title,
            'competition_name' => $video->competition ? $video->competition->name : null,
            'competition_id' => $video->competition_id,
            'video_date' => $video->date,
            'manga_type' => $video->manga_type,
            'status_before_deletion' => $video->status,
        ]);

        $video->delete();

        return response()->json(['message' => 'Video deleted successfully']);
    }

    public function deletedHistory()
    {
        $history = \App\Models\DeletedVideoHistory::latest()->paginate(20);
        return response()->json($history);
    }

    public function toggleLike($id)
    {
        $video = Video::findOrFail($id);
        $user = auth()->user();

        $like = $video->likes()->where('user_id', $user->id)->first();

        if ($like) {
            $like->delete();
            return response()->json(['message' => 'Video unliked successfully', 'liked' => false]);
        } else {
            $video->likes()->create(['user_id' => $user->id]);
            return response()->json(['message' => 'Video liked successfully', 'liked' => true]);
        }
    }

    public function download($id)
    {
        $video = Video::findOrFail($id);
        $user = auth()->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (!$video->local_path || !Storage::disk('public')->exists($video->local_path)) {
            return response()->json(['message' => 'Video not found or is not local'], 404);
        }

        $extension = pathinfo($video->local_path, PATHINFO_EXTENSION);
        $safeTitle = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $video->title ?? ($video->dog->name ?? 'video_agility'));
        $filename = "{$safeTitle}.{$extension}";

        return Storage::disk('public')->download($video->local_path, $filename);
    }

    public function stats()
    {
        $statusCounts = Video::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $totalLocal = $statusCounts['local'] ?? 0;
        $totalYoutube = $statusCounts['on_youtube'] ?? 0;
        $totalQueue = $statusCounts['in_queue'] ?? 0;
        $totalFailed = $statusCounts['failed'] ?? 0;

        $failedVideos = Video::with(['dog:id,name', 'user:id,name'])
            ->where('status', 'failed')
            ->get(['id', 'title', 'date', 'youtube_error', 'dog_id', 'user_id']);

        return response()->json([
            'counts' => [
                'local' => $totalLocal,
                'on_youtube' => $totalYoutube,
                'in_queue' => $totalQueue,
                'failed' => $totalFailed,
                'total' => $totalLocal + $totalYoutube + $totalQueue + $totalFailed
            ],
            'failed_videos' => $failedVideos
        ]);
    }

    public function dailyHistory()
    {
        $history = \App\Models\DailyVideoStat::orderBy('date', 'desc')->take(30)->get();
        return response()->json($history);
    }

    public function retryUpload($id)
    {
        $video = Video::findOrFail($id);

        if ($video->status !== 'failed') {
            return response()->json(['message' => 'Video is not in failed state'], 400);
        }

        $video->update([
            'status' => 'local',
            'youtube_error' => null
        ]);

        return response()->json(['message' => 'Video requeued successfully']);
    }
    
    public function publicIndex(Request $request)
    {
        $query = Video::query()->with(['dog:id,name,photo_url', 'competition:id,nombre,fecha_evento'])
                     ->where('in_public_gallery', true)
                     ->where('is_public', true) // Must be explicitly public
                     ->whereIn('status', ['local', 'on_youtube', 'completed']);

        $videos = $query->latest()->paginate(9);
        return response()->json($videos);
    }

    public function togglePublicGallery($id)
    {
        $video = Video::findOrFail($id);
        
        // This is protected by middleware role:admin,staff in api.php
        $video->in_public_gallery = !$video->in_public_gallery;
        $video->save();

        return response()->json([
            'message' => 'Video gallery visibility updated', 
            'in_public_gallery' => $video->in_public_gallery
        ]);
    }

    public function uploadConfig()
    {
        return response()->json([
            'driver' => config('services.videos.driver', 'legacy'),
        ]);
    }

    public function uploaded($id)
    {
        $video = Video::findOrFail($id);

        if ($video->status !== 'uploading') {
            return response()->json(['message' => 'Video is not in uploading status'], 400);
        }

        $driver = config('services.videos.driver', 'legacy');

        if ($driver === 'bunny') {
            $video->update(['status' => 'encoding']);

            return response()->json([
                'message' => 'Video marked as uploaded to Bunny and processing started',
                'video' => $video->load(['dog.users', 'user', 'competition'])
            ]);
        }

        $video->update(['status' => 'uploaded']);

        try {
            $this->startBitmovinEncoding($video);
        } catch (\Exception $e) {
            $video->update([
                'status' => 'failed',
                'error_message' => $e->getMessage()
            ]);
            return response()->json([
                'message' => 'Failed to start Bitmovin transcoding job',
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'message' => 'Video marked as uploaded and encoding started',
            'video' => $video->load(['dog.users', 'user', 'competition'])
        ]);
    }

    public function webhook(Request $request)
    {
        $payload = $request->json()->all();
        \Illuminate\Support\Facades\Log::info('Bitmovin Webhook Received', $payload);

        $encodingId = $payload['encoding']['id'] ?? ($payload['triggeredForResourceId'] ?? ($payload['encodingId'] ?? ($payload['data']['encodingId'] ?? null)));
        $eventType = $payload['eventType'] ?? ($payload['type'] ?? '');

        if (!$encodingId) {
            return response()->json(['message' => 'No encodingId found in payload'], 400);
        }

        $video = Video::withoutGlobalScopes()->where('bitmovin_encoding_id', $encodingId)->first();

        if (!$video) {
            return response()->json(['message' => 'Video not found for this encodingId'], 404);
        }

        // Set tenant context based on the video's club to prevent scoping bugs in related models
        if ($video->club_id) {
            app()->instance('active_club_id', $video->club_id);
            $club = \App\Models\Club::find($video->club_id);
            if ($club) {
                app()->instance('active_club_slug', $club->slug);
            }
        }

        $eventTypeLower = strtolower($eventType);

        if (str_contains($eventTypeLower, 'finished')) {
            $video->update([
                'status' => 'completed',
                'error_message' => null
            ]);
            
            // Notify owners here since encoding is fully complete
            if ($video->dog) {
                foreach ($video->dog->users as $owner) {
                    $owner->notify(new \App\Notifications\NewVideoNotification($video));
                }
            }
        } elseif (str_contains($eventTypeLower, 'failed') || str_contains($eventTypeLower, 'error')) {
            $video->update([
                'status' => 'failed',
                'error_message' => $payload['message'] ?? 'Encoding failed'
            ]);
        }

        return response()->json(['message' => 'Webhook processed successfully']);
    }

    public function bunnyWebhook(Request $request)
    {
        $payload = $request->json()->all();
        \Illuminate\Support\Facades\Log::info('Bunny Webhook Received', $payload);

        $videoGuid = $payload['VideoGuid'] ?? null;
        $status = $payload['Status'] ?? null;

        if (!$videoGuid) {
            return response()->json(['message' => 'No VideoGuid found in payload'], 400);
        }

        $video = Video::withoutGlobalScopes()->where('bunny_video_id', $videoGuid)->first();

        if (!$video) {
            return response()->json(['message' => 'Video not found for this VideoGuid'], 404);
        }

        // Set tenant context based on the video's club to prevent scoping bugs in related models
        if ($video->club_id) {
            app()->instance('active_club_id', $video->club_id);
            $club = \App\Models\Club::find($video->club_id);
            if ($club) {
                app()->instance('active_club_slug', $club->slug);
            }
        }

        $libraryId = config('services.bunny.library_id');

        // Status: 3 - Finished, 4 - Resolution finished (means playable)
        if ($status == 3 || $status == 4) {
            $pullZone = config('services.bunny.pull_zone') ?: 'iframe.mediadelivery.net/play/' . $libraryId;
            $playbackUrl = "https://{$pullZone}/{$videoGuid}/playlist.m3u8";

            $video->update([
                'status' => 'completed',
                'playback_url' => $playbackUrl,
                'error_message' => null
            ]);

            // Notify owners here since encoding is fully complete
            if ($video->dog) {
                foreach ($video->dog->users as $owner) {
                    $owner->notify(new \App\Notifications\NewVideoNotification($video));
                }
            }
        } elseif ($status == 5) {
            $video->update([
                'status' => 'failed',
                'error_message' => 'Bunny.net transcoding failed'
            ]);
        }

        return response()->json(['message' => 'Webhook processed successfully']);
    }

    public function streamProxy($id, $file)
    {
        $video = Video::findOrFail($id);

        if (!$video->getRawOriginal('playback_url')) {
            return response()->json(['message' => 'Video not ready'], 404);
        }

        $baseUrl = dirname($video->getRawOriginal('playback_url')) . '/';
        $fileUrl = $baseUrl . $file;

        $response = \Illuminate\Support\Facades\Http::get($fileUrl);

        if (!$response->successful()) {
            return response()->json(['message' => 'Failed to retrieve stream file'], 500);
        }

        $contentType = 'application/octet-stream';
        if (str_ends_with($file, '.m3u8')) {
            $contentType = 'application/vnd.apple.mpegurl';
        } elseif (str_ends_with($file, '.ts')) {
            $contentType = 'video/MP2T';
        }

        return response($response->body(), 200)
            ->header('Content-Type', $contentType)
            ->header('Access-Control-Allow-Origin', '*')
            ->header('Cache-Control', 'max-age=86400');
    }

    private function callBitmovin($method, $path, $data = [])
    {
        $apiKey = config('services.bitmovin.api_key');
        $url = 'https://api.bitmovin.com/v1/' . ltrim($path, '/');
        
        $request = \Illuminate\Support\Facades\Http::withHeaders([
            'X-Api-Key' => $apiKey,
            'Content-Type' => 'application/json',
        ]);

        if (strtolower($method) === 'post') {
            $response = $request->post($url, $data);
        } else {
            $response = $request->get($url);
        }

        if (!$response->successful()) {
            \Illuminate\Support\Facades\Log::error('Bitmovin API Error', [
                'path' => $path,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \Exception('Bitmovin API error: ' . $response->body());
        }

        return $response->json();
    }

    private function startBitmovinEncoding($video)
    {
        $clubSlug = app()->bound('active_club_slug') ? app('active_club_slug') : 'default';
        $uuid = (string) \Illuminate\Support\Str::uuid();
        $outputPath = "clubs/{$clubSlug}/videos/{$uuid}/";

        // 1. Create Encoding Job
        $encodingResponse = $this->callBitmovin('post', 'encoding/encodings', [
            'name' => 'ClubAgility HLS 720p - Video ' . $video->id,
            'cloudRegion' => 'AUTO'
        ]);
        $encodingId = $encodingResponse['data']['result']['id'];

        // 2. Create H264 Video Configuration (720p, ~2500 kbps, 30fps)
        $codecResponse = $this->callBitmovin('post', 'encoding/configurations/video/h264', [
            'name' => 'H264 720p (~2500kbps)',
            'width' => 1280,
            'height' => 720,
            'bitrate' => 2500000,
            'rate' => 30.0,
            'profile' => 'MAIN'
        ]);
        $codecConfigId = $codecResponse['data']['result']['id'];

        // 3. Create Generic S3 Output for Mega S4
        $outputResponse = $this->callBitmovin('post', 'encoding/outputs/generic-s3', [
            'name' => 'Mega S4 Bucket Output',
            'bucketName' => config('services.mega_s4.bucket'),
            'host' => config('services.mega_s4.endpoint'),
            'accessKey' => config('services.mega_s4.key'),
            'secretKey' => config('services.mega_s4.secret'),
            'signatureVersion' => 'S3_V4',
            'signingRegion' => config('services.mega_s4.region')
        ]);
        $outputId = $outputResponse['data']['result']['id'];

        // 4. Create Stream under the Encoding
        $streamResponse = $this->callBitmovin('post', "encoding/encodings/{$encodingId}/streams", [
            'codecConfigId' => $codecConfigId,
            'inputStreams' => [
                [
                    'inputId' => $video->bitmovin_input_id,
                    'inputPath' => '',
                    'selectionMode' => 'AUTO'
                ]
            ]
        ]);
        $streamId = $streamResponse['data']['result']['id'];

        // 5. Create TS Muxing for the video stream
        $muxingResponse = $this->callBitmovin('post', "encoding/encodings/{$encodingId}/muxings/ts", [
            'name' => 'Video TS Muxing 720p',
            'segmentLength' => 4.0,
            'segmentNaming' => 'video_720p_%number%.ts',
            'streams' => [
                ['streamId' => $streamId]
            ],
            'outputs' => [
                [
                    'outputId' => $outputId,
                    'outputPath' => $outputPath
                ]
            ]
        ]);
        $muxingId = $muxingResponse['data']['result']['id'];

        // 6. Create HLS Manifest
        $manifestResponse = $this->callBitmovin('post', 'encoding/manifests/hls', [
            'name' => 'HLS Manifest',
            'manifestName' => 'manifest.m3u8',
            'outputs' => [
                [
                    'outputId' => $outputId,
                    'outputPath' => $outputPath
                ]
            ]
        ]);
        $manifestId = $manifestResponse['data']['result']['id'];

        // 7. Add Custom Stream Info to HLS Manifest
        $this->callBitmovin('post', "encoding/manifests/hls/{$manifestId}/streams", [
            'encodingId' => $encodingId,
            'streamId' => $streamId,
            'muxingId' => $muxingId,
            'uri' => 'video_720p.m3u8',
            'segmentPath' => ''
        ]);

        // 8. Start the encoding, referencing the manifest so it generates it on complete
        $this->callBitmovin('post', "encoding/encodings/{$encodingId}/start", [
            'hlsManifests' => [
                ['manifestId' => $manifestId]
            ]
        ]);

        $endpoint = config('services.mega_s4.endpoint');
        $bucket = config('services.mega_s4.bucket');
        $cleanEndpoint = preg_replace('/^https?:\/\//', '', $endpoint);
        $playbackUrl = "https://{$cleanEndpoint}/v1/{$bucket}/{$outputPath}manifest.m3u8";

        // Update video record
        $video->update([
            'status' => 'encoding',
            'bitmovin_encoding_id' => $encodingId,
            'playback_url' => $playbackUrl,
        ]);
    }
}

