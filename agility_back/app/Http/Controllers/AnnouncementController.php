<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index()
    {
        $announcements = Announcement::with('user:id,name,role')->orderBy('is_pinned', 'desc')->orderBy('created_at', 'desc')->get();
        return response()->json($announcements, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string|max:10000',
            'is_pinned' => 'boolean',
        ]);

        $announcement = Announcement::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'content' => $validated['content'],
            'is_pinned' => $validated['is_pinned'] ?? false,
        ]);

        return response()->json($announcement->load('user:id,name'), 201);
    }

    public function destroy($id)
    {
        $announcement = Announcement::findOrFail($id);
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted successfully'], 200);
    }
}
