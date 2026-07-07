<?php

namespace App\Http\Controllers;

use App\Models\TrainingTrack;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class TrainingTrackController extends Controller
{
    /**
     * Listado de pistas del club (orden de creación: la primera es la principal).
     */
    public function index()
    {
        return TrainingTrack::orderBy('id')->get();
    }

    /**
     * Crear una pista nueva (gestor del club).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'surface' => ['required', Rule::in(TrainingTrack::SURFACES)],
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
        ]);

        $track = new TrainingTrack([
            'name' => $validated['name'],
            'surface' => $validated['surface'],
        ]);
        $track->club_id = $request->user()->club_id;

        if ($request->hasFile('photo')) {
            $track->photo_url = $this->storePhoto($request);
        }

        $track->save();

        return response()->json($track, 201);
    }

    /**
     * Actualizar una pista. Acepta foto nueva (reemplaza la anterior) o
     * `remove_photo` para quitarla sin sustituirla.
     */
    public function update(Request $request, string $id)
    {
        $track = TrainingTrack::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'surface' => ['sometimes', 'required', Rule::in(TrainingTrack::SURFACES)],
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
            'remove_photo' => 'nullable|boolean',
        ]);

        if ($request->hasFile('photo')) {
            $this->deletePhoto($track);
            $track->photo_url = $this->storePhoto($request);
        } elseif ($request->boolean('remove_photo')) {
            $this->deletePhoto($track);
            $track->photo_url = null;
        }

        $track->fill(collect($validated)->only(['name', 'surface'])->all());
        $track->save();

        return response()->json($track);
    }

    /**
     * Eliminar una pista. Nunca puede quedar un club sin pistas: si es la
     * última se bloquea. Los horarios asignados pasan a la pista más antigua
     * restante (la principal): las clases y sus reservas se conservan.
     */
    public function destroy(string $id)
    {
        $track = TrainingTrack::findOrFail($id);

        if (TrainingTrack::count() <= 1) {
            return response()->json([
                'message' => 'No se puede eliminar la única pista del club. Debe existir al menos una pista.',
            ], 422);
        }

        $fallback = TrainingTrack::where('id', '!=', $track->id)->orderBy('id')->first();
        $track->timeSlots()->update(['training_track_id' => $fallback->id]);

        // La foto se limpia en el hook deleting del modelo.
        $track->delete();

        return response()->noContent();
    }

    private function storePhoto(Request $request): string
    {
        $clubSlug = app()->bound('active_club_slug') ? app('active_club_slug') : 'default';
        $path = $request->file('photo')->store("clubs/{$clubSlug}/track_photos", 'public');

        return asset('storage/' . $path);
    }

    private function deletePhoto(TrainingTrack $track): void
    {
        if ($track->photo_url && str_contains($track->photo_url, '/storage/')) {
            $oldPath = str_replace(asset('storage/'), '', $track->photo_url);
            Storage::disk('public')->delete($oldPath);
        }
    }
}
