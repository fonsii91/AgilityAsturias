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

        if ($resource->file_path) {
            Storage::disk('public')->delete($resource->file_path);
        }

        $resource->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
}
