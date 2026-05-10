<?php

namespace App\Http\Controllers;

use App\Models\ClubLead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\ClubLeadReceived;
use App\Mail\NewClubLeadAdmin;

class ClubLeadController extends Controller
{
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

        return response()->json([
            'message' => 'Lead created successfully',
            'lead' => $lead
        ], 201);
    }
}
