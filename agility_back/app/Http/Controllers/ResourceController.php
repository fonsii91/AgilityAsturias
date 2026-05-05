<?php

namespace App\Http\Controllers;

use App\Models\Resource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class ResourceController extends Controller
{
    public function index(Request $request)
    {
        $query = Resource::with('uploader:id,name,role');
        
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }
        
        if ($request->has('level') && $request->level !== 'all') {
            $query->where('level', $request->level);
        }
        
        $resources = $query->orderBy('created_at', 'desc')->get();

        $user = $request->user();
        if ($user && in_array($user->role, ['staff', 'manager', 'admin'])) {
            $clubId = $user->club_id;
            if ($user->role === 'admin' && app()->bound('active_club_id')) {
                $clubId = app('active_club_id');
            }

            if ($clubId) {
                $resources->load(['hiddenByClubs' => function($q) use ($clubId) {
                    $q->where('club_hidden_resources.club_id', $clubId);
                }]);

                $resources->each(function($resource) {
                    $resource->is_hidden_for_club = $resource->hiddenByClubs->isNotEmpty();
                    unset($resource->hiddenByClubs);
                });
            }
        }

        return response()->json($resources);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!in_array($user->role, ['staff', 'admin', 'manager'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:document,video,link',
            'category' => 'required|string',
            'level' => 'required|string',
            'url' => 'nullable|string|required_if:type,video,link',
            'file' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,txt,jpg,jpeg,png|max:102400|required_if:type,document'
        ]);

        $data = [
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'category' => $validated['category'],
            'level' => $validated['level'],
            'uploaded_by' => $user->id,
        ];

        if ($validated['type'] === 'document' && $request->hasFile('file')) {
            $clubSlug = app()->bound('active_club_slug') ? app('active_club_slug') : 'default';
            $path = $request->file('file')->store("clubs/{$clubSlug}/resources", 'public');
            $data['file_path'] = $path;
        } else {
            $data['url'] = $validated['url'];
        }

        $resource = Resource::create($data);

        return response()->json($resource->load('uploader:id,name,role'), 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        if (!in_array($user->role, ['staff', 'admin', 'manager'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $resource = Resource::findOrFail($id);

        if ($resource->is_global && $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Solo los administradores pueden modificar recursos globales.'], 403);
        }

        if (!$resource->is_global && $user->role !== 'admin' && $resource->club_id !== $user->club_id) {
            return response()->json(['message' => 'Unauthorized. No puedes modificar recursos de otros clubes.'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|required|in:document,video,link',
            'category' => 'sometimes|required|string',
            'level' => 'sometimes|required|string',
            'url' => 'nullable|string|required_if:type,video,link',
            'file' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,txt,jpg,jpeg,png|max:102400'
        ]);

        $data = $request->only(['title', 'description', 'type', 'category', 'level']);

        // Handle type specific fields
        if (isset($validated['type'])) {
            if ($validated['type'] === 'document') {
                if ($request->hasFile('file')) {
                    // Delete old file if exists
                    if ($resource->file_path) {
                        Storage::disk('public')->delete($resource->file_path);
                    }
                    $clubSlug = app()->bound('active_club_slug') ? app('active_club_slug') : 'default';
                    $path = $request->file('file')->store("clubs/{$clubSlug}/resources", 'public');
                    $data['file_path'] = $path;
                    $data['url'] = null;
                }
            } else {
                $data['url'] = $validated['url'] ?? $resource->url;
                $data['file_path'] = null; // Clear file path if changing to video/link
                // Delete old file if changing type from document to url
                if ($resource->file_path) {
                    Storage::disk('public')->delete($resource->file_path);
                }
            }
        } else {
            // Type not updated, but maybe file or url updated
            if ($resource->type === 'document' && $request->hasFile('file')) {
                 if ($resource->file_path) {
                    Storage::disk('public')->delete($resource->file_path);
                 }
                 $clubSlug = app()->bound('active_club_slug') ? app('active_club_slug') : 'default';
                 $path = $request->file('file')->store("clubs/{$clubSlug}/resources", 'public');
                 $data['file_path'] = $path;
            } elseif ($resource->type !== 'document' && isset($validated['url'])) {
                 $data['url'] = $validated['url'];
            }
        }

        $resource->update($data);

        return response()->json($resource->load('uploader:id,name,role'));
    }

    public function destroy($id)
    {
        $user = Auth::user();
        if (!in_array($user->role, ['staff', 'admin', 'manager'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $resource = Resource::findOrFail($id);

        if ($resource->is_global && $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Solo los administradores pueden eliminar recursos globales.'], 403);
        }

        if (!$resource->is_global && $user->role !== 'admin' && $resource->club_id !== $user->club_id) {
            return response()->json(['message' => 'Unauthorized. No puedes eliminar recursos de otros clubes.'], 403);
        }

        if ($resource->file_path) {
            Storage::disk('public')->delete($resource->file_path);
        }

        $resource->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
    public function toggleGlobal($id)
    {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $resource = Resource::findOrFail($id);
        $resource->is_global = !$resource->is_global;
        $resource->save();

        return response()->json($resource->load('uploader:id,name,role'));
    }

    public function toggleHideForClub(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['staff', 'admin', 'manager'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $resource = Resource::findOrFail($id);

        if (!$resource->is_global) {
            return response()->json(['message' => 'Solo se pueden ocultar recursos globales.'], 400);
        }

        $clubId = $user->club_id;
        if ($user->role === 'admin' && app()->bound('active_club_id')) {
            $clubId = app('active_club_id');
        }

        if (!$clubId) {
            return response()->json(['message' => 'No estás asociado a ningún club.'], 400);
        }

        if ($resource->hiddenByClubs()->where('club_hidden_resources.club_id', $clubId)->exists()) {
            $resource->hiddenByClubs()->detach($clubId);
            $isHidden = false;
        } else {
            $resource->hiddenByClubs()->attach($clubId);
            $isHidden = true;
        }

        $resource->load('uploader:id,name,role');
        $resource->is_hidden_for_club = $isHidden;

        return response()->json($resource);
    }
}
