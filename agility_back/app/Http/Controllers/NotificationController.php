<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get the latest 10 notifications for the authenticated user and clean up older ones.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Keep only the most recent 10 notifications
        $notificationsToKeep = $user->notifications()->latest()->take(10)->pluck('id');
        $user->notifications()->whereNotIn('id', $notificationsToKeep)->delete();

        // Return up to 10 notifications
        return response()->json($user->notifications()->latest()->get());
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->find($id);

        if ($notification) {
            $notification->markAsRead();
            return response()->json(['message' => 'Notification marked as read']);
        }

        return response()->json(['message' => 'Notification not found'], 404);
    }

    /**
     * Mark all notifications as read for the authenticated user.
     */
    public function markAllAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'All notifications marked as read']);
    }
}
