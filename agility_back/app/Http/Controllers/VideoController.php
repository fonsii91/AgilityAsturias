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

        // Filtro de privacidad
        if (auth()->check()) {
            $userId = auth()->id();
            $userRole = auth()->user()->role;
            
            if (!in_array($userRole, ['admin', 'staff'])) {
                $query->where(function ($q) use ($userId) {
                    $q->where('is_public', true)
                      ->orWhereHas('dog.users', function ($qDogUser) use ($userId) {
                          $qDogUser->where('users.id', $userId);
                      });
                });
            }
        } else {
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

        $query->withCount('likes');

        if (auth()->check()) {
            $query->withExists([
                'likes as is_liked_by_user' => function ($q) {
                    $q->where('user_id', auth()->id());
                }
            ]);
        }

        if ($request->has('sort') && $request->sort === 'popular') {
            $query->orderByDesc('likes_count')->latest();
        } else {
            $query->latest();
        }

        $videos = $query->paginate(10);
        return response()->json($videos);
    }

    public function store(Request $request)
    {
        $request->validate([
            'dog_id' => 'required|exists:dogs,id',
            'competition_id' => 'nullable|exists:competitions,id',
            'date' => 'required|date',
            'video' => 'required|file|mimes:mp4,mov,avi,wmv,webm|max:512000', // 500MB
            'title' => 'nullable|string|max:255',
            'is_public' => 'nullable|boolean',
            'orientation' => 'nullable|in:horizontal,vertical'
        ]);

        $path = $request->file('video')->store('videos', 'public');

        $video = Video::create([
            'dog_id' => $request->dog_id,
            'user_id' => $request->user()->id,
            'competition_id' => $request->competition_id,
            'date' => $request->date,
            'title' => $request->title,
            'local_path' => $path,
            'status' => 'local',
            'orientation' => $request->orientation ?? 'vertical',
            'is_public' => $request->has('is_public') ? filter_var($request->is_public, FILTER_VALIDATE_BOOLEAN) : true
        ]);

        return response()->json($video->load(['dog.users:id,name', 'user', 'competition']), 201);
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
            'is_public' => 'nullable|boolean'
        ]);

        $updateData = [
            'dog_id' => $request->dog_id,
            'competition_id' => $request->competition_id,
            'date' => $request->date,
            'title' => $request->title,
        ];

        if ($request->has('is_public')) {
            if ($isDogOwner || in_array($user->role, ['admin', 'staff'])) {
                $updateData['is_public'] = filter_var($request->is_public, FILTER_VALIDATE_BOOLEAN);
            }
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

        if ($video->local_path && Storage::disk('public')->exists($video->local_path)) {
            Storage::disk('public')->delete($video->local_path);
        }

        $video->delete();

        return response()->json(['message' => 'Video deleted successfully']);
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

        return response()->download(storage_path("app/public/{$video->local_path}"), $filename);
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
