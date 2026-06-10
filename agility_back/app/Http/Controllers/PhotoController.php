<?php

namespace App\Http\Controllers;

use App\Models\Club;
use App\Models\ClubPhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PhotoController extends Controller
{
    public function index(Request $request)
    {
        $query = ClubPhoto::query()->with([
            'user:id,name',
            'competition:id,nombre,fechaEvento',
            'dogs:id,name',
            'taggedUsers:id,name',
        ]);

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('photo_type')) {
            $query->where('photo_type', $request->photo_type);
        }

        if ($request->filled('competition_id')) {
            $query->where('competition_id', $request->competition_id);
        }

        if ($request->filled('dog_id')) {
            $query->whereHas('dogs', function ($q) use ($request) {
                $q->where('dogs.id', $request->dog_id);
            });
        }

        if ($request->filled('tagged_user_id')) {
            $query->whereHas('taggedUsers', function ($q) use ($request) {
                $q->where('users.id', $request->tagged_user_id);
            });
        }

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                    ->orWhereHas('dogs', function ($qDog) use ($searchTerm) {
                        $qDog->where('name', 'like', "%{$searchTerm}%");
                    })
                    ->orWhereHas('competition', function ($qComp) use ($searchTerm) {
                        $qComp->where('nombre', 'like', "%{$searchTerm}%");
                    });
            });
        }

        $query->orderByDesc('taken_at')->orderByDesc('id');

        $perPage = $request->has('per_page') ? min((int) $request->per_page, 100) : 24;
        $photos = $query->paginate($perPage);

        $responseArray = $photos->toArray();
        $responseArray['storage'] = $this->getClubPhotoStorageStats();

        return response()->json($responseArray);
    }

    public function store(Request $request)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,webp|max:4096', // ya comprimida en cliente
            'thumb' => 'required|image|mimes:jpeg,png,webp|max:1024',
            'category' => ['required', Rule::in(ClubPhoto::CATEGORIES)],
            'competition_id' => 'required_if:category,competicion|nullable|exists:competitions,id',
            'photo_type' => ['nullable', Rule::in(ClubPhoto::PHOTO_TYPES)],
            'title' => 'nullable|string|max:255',
            'taken_at' => 'required|date',
            'dog_ids' => 'nullable|array',
            'dog_ids.*' => 'exists:dogs,id',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $sizeBytes = $request->file('photo')->getSize() + $request->file('thumb')->getSize();

        $storageStats = $this->getClubPhotoStorageStats();
        if ($storageStats['limit_bytes'] > 0 && $storageStats['used_bytes'] + $sizeBytes > $storageStats['limit_bytes']) {
            return response()->json([
                'message' => 'Límite de almacenamiento de fotos excedido. Por favor, actualiza tu plan o borra fotos antiguas.',
                'storage' => $storageStats,
            ], 403);
        }

        $club = $this->activeClub();
        $slug = $club?->slug ?? 'default';
        $uuid = (string) Str::uuid();
        $ext = $request->file('photo')->getClientOriginalExtension() ?: 'webp';
        $thumbExt = $request->file('thumb')->getClientOriginalExtension() ?: 'webp';

        $disk = ClubPhoto::storageDisk();
        $path = $request->file('photo')->storeAs("clubs/{$slug}/photos", "{$uuid}.{$ext}", $disk);
        $thumbPath = $request->file('thumb')->storeAs("clubs/{$slug}/photos", "{$uuid}_thumb.{$thumbExt}", $disk);

        if (!$path || !$thumbPath) {
            if ($path) {
                Storage::disk($disk)->delete($path);
            }
            return response()->json(['message' => 'Error guardando la foto en el almacenamiento.'], 500);
        }

        $photo = ClubPhoto::create([
            'user_id' => $request->user()->id,
            'competition_id' => $request->category === 'competicion' ? $request->competition_id : null,
            'category' => $request->category,
            'photo_type' => $request->photo_type,
            'title' => $request->title,
            'taken_at' => $request->taken_at,
            'path' => $path,
            'thumb_path' => $thumbPath,
            'size_bytes' => $sizeBytes,
        ]);

        if ($request->filled('dog_ids')) {
            $photo->dogs()->sync($request->dog_ids);
        }
        if ($request->filled('user_ids')) {
            $photo->taggedUsers()->sync($request->user_ids);
        }

        return response()->json($photo->load(['user:id,name', 'competition:id,nombre', 'dogs:id,name', 'taggedUsers:id,name']), 201);
    }

    public function update(Request $request, $id)
    {
        $photo = ClubPhoto::findOrFail($id);

        $request->validate([
            'category' => ['sometimes', Rule::in(ClubPhoto::CATEGORIES)],
            'competition_id' => 'nullable|exists:competitions,id',
            'photo_type' => ['nullable', Rule::in(ClubPhoto::PHOTO_TYPES)],
            'title' => 'nullable|string|max:255',
            'taken_at' => 'sometimes|date',
            'dog_ids' => 'nullable|array',
            'dog_ids.*' => 'exists:dogs,id',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        // El etiquetado es colaborativo: cualquier socio puede etiquetar perros y miembros.
        if ($request->has('dog_ids')) {
            $photo->dogs()->sync($request->dog_ids ?? []);
        }
        if ($request->has('user_ids')) {
            $photo->taggedUsers()->sync($request->user_ids ?? []);
        }

        // El resto de metadatos solo los edita el autor o el staff.
        $metadataFields = collect(['category', 'competition_id', 'photo_type', 'title', 'taken_at'])
            ->filter(fn ($field) => $request->has($field));

        if ($metadataFields->isNotEmpty()) {
            if (!$this->canManage($request, $photo)) {
                return response()->json(['message' => 'No tienes permiso para editar esta foto.'], 403);
            }

            $photo->fill($request->only($metadataFields->all()));

            if ($photo->category !== 'competicion') {
                $photo->competition_id = null;
            }

            $photo->save();
        }

        return response()->json($photo->fresh()->load(['user:id,name', 'competition:id,nombre', 'dogs:id,name', 'taggedUsers:id,name']));
    }

    public function destroy(Request $request, $id)
    {
        $photo = ClubPhoto::findOrFail($id);

        if (!$this->canManage($request, $photo)) {
            return response()->json(['message' => 'No tienes permiso para borrar esta foto.'], 403);
        }

        $photo->delete();

        return response()->json(['message' => 'Foto eliminada correctamente.']);
    }

    /**
     * Un miembro etiquetado puede quitarse a sí mismo de una foto (privacidad).
     */
    public function untagSelf(Request $request, $id)
    {
        $photo = ClubPhoto::findOrFail($id);
        $photo->taggedUsers()->detach($request->user()->id);

        return response()->json(['message' => 'Etiqueta eliminada.']);
    }

    public function storageStats()
    {
        return response()->json($this->getClubPhotoStorageStats());
    }

    protected function canManage(Request $request, ClubPhoto $photo): bool
    {
        $user = $request->user();

        return $photo->user_id === $user->id
            || in_array($user->role, ['admin', 'manager', 'staff']);
    }

    protected function activeClub(): ?Club
    {
        $clubId = app()->bound('active_club_id') ? app('active_club_id') : auth()->user()?->club_id;

        return $clubId ? Club::find($clubId) : null;
    }

    protected function getClubPhotoStorageStats(): array
    {
        $club = $this->activeClub();

        $limitGb = 5; // Fallback por defecto
        if ($club && $club->plan) {
            $limitGb = $club->plan->photo_storage_limit_gb ?? 5;
        }
        $limitBytes = $limitGb * 1024 * 1024 * 1024;

        $usedBytes = (int) ClubPhoto::query()->sum('size_bytes');

        return [
            'used_bytes' => $usedBytes,
            'limit_bytes' => $limitBytes,
            'limit_gb' => $limitGb,
            'percentage' => $limitBytes > 0 ? round(($usedBytes / $limitBytes) * 100, 2) : 0,
        ];
    }
}
