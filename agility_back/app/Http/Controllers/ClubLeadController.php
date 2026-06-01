<?php

namespace App\Http\Controllers;

use App\Models\ClubLead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\ClubLeadReceived;
use App\Mail\NewClubLeadAdmin;

class ClubLeadController extends Controller
{
    public function index()
    {
        return response()->json(ClubLead::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|regex:/^[a-z0-9-]+$/',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'plan_selected' => 'required|string|max:50',
        ]);

        $lead = ClubLead::create($validated);

        try {
            Mail::to($lead->email)->send(new ClubLeadReceived($lead));
            Mail::to('fonsii@clubagility.com')->send(new NewClubLeadAdmin($lead)); // or a configured admin email
        } catch (\Exception $e) {
            \Log::error('Error sending club lead emails: ' . $e->getMessage());
        }

        // Send database notification to admin users
        try {
            $admins = \App\Models\User::where('role', 'admin')->get();
            \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\NewClubLeadNotification($lead));
        } catch (\Exception $e) {
            \Log::error('Error sending database notification to admins: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Lead created successfully',
            'lead' => $lead
        ], 201);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,approved,rejected',
        ]);

        $lead = ClubLead::findOrFail($id);
        $lead->update(['status' => $validated['status']]);

        return response()->json($lead);
    }

    public function destroy($id)
    {
        $lead = ClubLead::findOrFail($id);
        $lead->delete();

        return response()->json(['message' => 'Lead deleted successfully']);
    }
}
