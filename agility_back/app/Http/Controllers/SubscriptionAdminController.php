<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Plan;
use App\Models\Feature;
use App\Models\Club;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

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
            'is_active' => 'boolean',
            'video_storage_limit_gb' => 'nullable|integer|min:0',
            'photo_storage_limit_gb' => 'nullable|integer|min:0',
            'promo_price' => 'nullable|numeric|min:0',
            'promo_duration_months' => 'nullable|integer|min:0',
            'promo_label' => 'nullable|string|max:255',
            'is_featured' => 'boolean',
            'marketing_features' => 'nullable|string'
        ]);

        $plan = Plan::create($validated);
        
        if ($plan->is_featured) {
            Plan::where('id', '!=', $plan->id)->update(['is_featured' => false]);
        }

        return response()->json($plan->load('features'), 201);
    }

    public function updatePlan(Request $request, Plan $plan)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:plans,slug,' . $plan->id,
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'video_storage_limit_gb' => 'nullable|integer|min:0',
            'photo_storage_limit_gb' => 'nullable|integer|min:0',
            'promo_price' => 'nullable|numeric|min:0',
            'promo_duration_months' => 'nullable|integer|min:0',
            'promo_label' => 'nullable|string|max:255',
            'is_featured' => 'boolean',
            'marketing_features' => 'nullable|string'
        ]);

        $plan->update($validated);

        if ($plan->is_featured) {
            Plan::where('id', '!=', $plan->id)->update(['is_featured' => false]);
        }

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
            'plan_id' => 'nullable|exists:plans,id',
            // Opcional: fija el plan para que el webhook de Stripe no lo sobrescriba.
            'plan_locked' => 'sometimes|boolean',
        ]);

        $update = ['plan_id' => $validated['plan_id'] ?? null];
        if ($request->has('plan_locked')) {
            $update['plan_locked'] = $request->boolean('plan_locked');
        }

        $club->update($update);
        return response()->json($club->load('plan.features'));
    }

    /**
     * Configura (o limpia) el periodo de cortesía de un club desde el panel de admin.
     * Con courtesy_until en el futuro, el club mantiene acceso aunque no tenga
     * suscripción de Stripe. Enviar null o vacío lo desactiva.
     */
    public function setClubCourtesy(Request $request, Club $club)
    {
        $validated = $request->validate([
            'courtesy_until' => 'nullable|date',
        ]);

        $until = !empty($validated['courtesy_until'])
            ? Carbon::parse($validated['courtesy_until'])->endOfDay()
            : null;

        $club->courtesy_until = $until;
        $club->save();

        Log::info('Periodo de cortesía actualizado desde admin', [
            'club_id' => $club->id,
            'slug' => $club->slug,
            'courtesy_until' => $until?->toIso8601String(),
        ]);

        return response()->json($club);
    }
}
