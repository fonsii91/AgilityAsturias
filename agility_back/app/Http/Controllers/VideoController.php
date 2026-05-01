<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Video;
use Illuminate\Support\Facades\Storage;

class VideoController extends Controller
{
    public function index(Request $request)
    {
        $query = Video::query()->with(['dog.users:id,name', 'user', 'competition']);

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

        $perPage = $request->has('per_page') ? min((int) $request->per_page, 100) : 10;
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

        if ($video->user_id !== $user->id && !$isDogOwner && !in_array($user->role, ['admin', 'staff'])) {
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

        if ($video->user_id !== $user->id && !$isDogOwner && !in_array($user->role, ['admin', 'staff'])) {
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

        if ($video->local_path && Storage::disk('public')->exists($video->local_path)) {
            Storage::disk('public')->delete($video->local_path);
        }

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
                     ->where('is_public', true); // Must be explicitly public

        $videos = $query->latest()->paginate(20);
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
}
