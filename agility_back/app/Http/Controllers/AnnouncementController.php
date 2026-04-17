<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\User;
use App\Notifications\NewAnnouncementNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $query = Announcement::with('user:id,name,role')->withCount('reads');
        $announcements = $query->orderBy('is_pinned', 'desc')->orderBy('created_at', 'desc')->get();
        return response()->json($announcements, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string|max:10000',
            'is_pinned' => 'boolean',
            'category' => 'required|string|in:Importante,Competición,Entrenamientos,Organización,Social,General',
            'notify_all' => 'boolean|nullable',
            'notify_users' => 'array|nullable',
            'notify_users.*' => 'exists:users,id'
        ]);

        $announcement = Announcement::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'content' => $validated['content'],
            'is_pinned' => $validated['is_pinned'] ?? false,
            'category' => $validated['category'],
        ]);

        if (isset($validated['notify_all']) && $validated['notify_all']) {
            $users = User::all();
            Notification::send($users, new NewAnnouncementNotification($announcement));
        } elseif (!empty($validated['notify_users'])) {
            $users = User::whereIn('id', $validated['notify_users'])->get();
            Notification::send($users, new NewAnnouncementNotification($announcement));
        }

        return response()->json($announcement->load('user:id,name'), 201);
    }

    public function destroy($id)
    {
        $announcement = Announcement::findOrFail($id);
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted successfully'], 200);
    }

    public function markAsRead(Request $request, $id)
    {
        $announcement = Announcement::findOrFail($id);
        $announcement->reads()->syncWithoutDetaching([$request->user()->id]);

        return response()->json(['message' => 'Marked as read'], 200);
    }
}
