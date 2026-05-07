<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Plan;
use App\Models\Feature;
use App\Models\Club;

class SubscriptionAdminController extends Controller
{
    public function getPlans()
    {
        return response()->json(Plan::with('features')->get());
    }

    public function getFeatures()
    {
        return response()->json(Feature::all());
    }

    public function createPlan(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:plans,slug',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $plan = Plan::create($validated);
        return response()->json($plan->load('features'), 201);
    }

    public function updatePlan(Request $request, Plan $plan)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:plans,slug,' . $plan->id,
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $plan->update($validated);
        return response()->json($plan->load('features'));
    }

    public function syncFeatures(Request $request, Plan $plan)
    {
        $validated = $request->validate([
            'feature_ids' => 'array',
            'feature_ids.*' => 'exists:features,id'
        ]);

        $plan->features()->sync($validated['feature_ids']);
        return response()->json($plan->load('features'));
    }

    public function assignPlanToClub(Request $request, Club $club)
    {
        $validated = $request->validate([
            'plan_id' => 'nullable|exists:plans,id'
        ]);

        $club->update(['plan_id' => $validated['plan_id']]);
        return response()->json($club->load('plan.features'));
    }
}
