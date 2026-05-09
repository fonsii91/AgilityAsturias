<?php

namespace App\Http\Controllers;

use App\Models\ClubLead;
use Illuminate\Http\Request;

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

        return response()->json([
            'message' => 'Lead created successfully',
            'lead' => $lead
        ], 201);
    }
}
