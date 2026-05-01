<?php

namespace App\Http\Controllers;

use App\Models\Dog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Notifications\DogExtraPointNotification;
use App\Models\PointHistory;
use App\Services\CloudflareAiService;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;

class DogController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        return $request->user()->dogs()->with(['users:id,name,email', 'pointHistories' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }])->orderBy('dogs.name', 'asc')->get();
    }

    /**
     * Display a listing of all dogs in the system.
     */
    public function all()
    {
        return Dog::with(['users:id,name,email', 'pointHistories' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }])->orderBy('dogs.name', 'asc')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'breed' => 'nullable|string',
            'birth_date' => 'nullable|date',
            'rsce_license' => 'nullable|string',
            'rsce_expiration_date' => 'nullable|date',
            'rsce_grade' => 'nullable|string|max:10',
            'rsce_category' => 'nullable|string|max:10',
            'microchip' => 'nullable|string|max:30',
            'pedigree' => 'nullable|string',
            'has_previous_injuries' => 'boolean',
            'sterilized_at' => 'nullable|date',
            'weight_kg' => 'nullable|numeric|min:1',
            'height_cm' => 'nullable|numeric|min:10',
        ]);

        $dogData = collect($validated)->except(['rsce_license', 'rsce_expiration_date', 'rsce_grade'])->toArray();
        $pivotData = [
            'is_primary_owner' => true,
            'rsce_license' => collect($validated)->get('rsce_license'),
            'rsce_expiration_date' => collect($validated)->get('rsce_expiration_date'),
            'rsce_grade' => collect($validated)->get('rsce_grade'),
        ];

        $dog = new Dog($dogData);
        if (\Illuminate\Support\Facades\Schema::hasColumn('dogs', 'user_id')) {
            $dog->user_id = Auth::id();
        }
        $dog->save();
        
        $request->user()->dogs()->attach($dog->id, $pivotData);
        $dog->load('users:id,name,email');

        return response()->json($dog, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return Auth::user()->dogs()->with(['users:id,name,email', 'pointHistories' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }])->findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $dog = Auth::user()->dogs()->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string',
            'breed' => 'nullable|string',
            'birth_date' => 'nullable|date',
            'rsce_license' => 'nullable|string',
            'rsce_expiration_date' => 'nullable|date',
            'rsce_grade' => 'nullable|string|max:10',
            'rsce_category' => 'nullable|string|max:10',
            'microchip' => 'nullable|string|max:30',
            'pedigree' => 'nullable|string',
            'has_previous_injuries' => 'boolean',
            'sterilized_at' => 'nullable|date',
            'weight_kg' => 'nullable|numeric|min:1',
            'height_cm' => 'nullable|numeric|min:10',
            'avatar_blue_url' => 'nullable|url',
            'avatar_green_url' => 'nullable|url',
            'avatar_yellow_url' => 'nullable|url',
            'avatar_red_url' => 'nullable|url',
        ]);

        $dogData = collect($validated)->except(['rsce_license', 'rsce_expiration_date', 'rsce_grade'])->toArray();
        $dog->update($dogData);

        // Update pivot for current user only for fields present in request
        $pivotUpdates = [];
        if (array_key_exists('rsce_license', $validated)) {
            $pivotUpdates['rsce_license'] = $validated['rsce_license'];
        }
        if (array_key_exists('rsce_expiration_date', $validated)) {
            $pivotUpdates['rsce_expiration_date'] = $validated['rsce_expiration_date'];
        }
        if (array_key_exists('rsce_grade', $validated)) {
            $pivotUpdates['rsce_grade'] = $validated['rsce_grade'];
        }

        if (!empty($pivotUpdates)) {
            $dog->users()->updateExistingPivot(Auth::id(), $pivotUpdates);
        }

        // Reload the dog from the relationship to get the fresh pivot object
        $dog = Auth::user()->dogs()->findOrFail($id);

        $dog->load(['users:id,name,email', 'pointHistories' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }]);

        return response()->json($dog);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $dog = Auth::user()->dogs()->withCount('users')->findOrFail($id);

        // Si el usuario actual no es el dueño primario, solo se desvincula
        if (!$dog->pivot->is_primary_owner) {
            $dog->users()->detach(Auth::id());
            return response()->noContent();
        }

        // Si es el dueño primario pero hay otros dueños (opcional: podríamos forzar a que desvincule a todos primero, 
        // pero como es dueño primario, borrará el perro para todos).
        $dog->delete();

        return response()->noContent();
    }

    /**
     * Upload a photo for the dog.
     */
    public function uploadPhoto(Request $request, string $id)
    {
        $dog = Auth::user()->dogs()->findOrFail($id);

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
        ]);

        if ($request->hasFile('photo')) {
            // Delete old photo if exists
            if ($dog->photo_url && str_contains($dog->photo_url, '/storage/')) {
                $oldPath = str_replace(asset('storage/'), '', $dog->photo_url);
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
            }

            $clubSlug = app()->bound('active_club_slug') ? app('active_club_slug') : 'default';
            $path = $request->file('photo')->store("clubs/{$clubSlug}/dog_photos", 'public');
            $dog->photo_url = asset('storage/' . $path);
            $dog->save();
        }

        $dog->load(['users:id,name,email', 'pointHistories' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }]);

        return response()->json($dog);
    }

    /**
     * Give extra points to a dog (Staff/Admin only).
     */
    public function giveExtraPoints(Request $request, string $id)
    {
        $request->validate([
            'points' => 'required|integer|min:-3|max:3|not_in:0',
            'category' => 'required|string|max:50',
        ]);

        $dog = Dog::findOrFail($id);
        $dog->points += $request->points;
        $dog->save();

        PointHistory::create([
            'dog_id' => $dog->id,
            'points' => $request->points,
            'category' => $request->category
        ]);

        foreach ($dog->users as $owner) {
            $owner->notify(new DogExtraPointNotification($dog, $request->points, $request->category));
        }

        $dog->load(['users:id,name,email', 'pointHistories' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }]);

        return response()->json([
            'message' => 'Puntos modificados exitosamente',
            'dog' => $dog
        ]);
    }

    /**
     * Share a dog with another user via email.
     */
    public function share(Request $request, string $id)
    {
        $dog = Auth::user()->dogs()->findOrFail($id);

        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $userToShareWith = \App\Models\User::where('email', $validated['email'])->first();

        // Check if the user is the same as the authenticated user
        if ($userToShareWith->id === Auth::id()) {
            return response()->json(['message' => 'No puedes compartir el perro contigo mismo.'], 422);
        }

        if ($dog->users()->where('users.id', $userToShareWith->id)->exists()) {
            return response()->json(['message' => 'Este usuario ya es co-dueño del perro.'], 422);
        }

        $dog->users()->attach($userToShareWith->id, ['is_primary_owner' => false]);

        return response()->json([
            'message' => 'Perro compartido exitosamente con ' . $userToShareWith->name,
            'dog' => $dog->load(['users:id,name,email', 'pointHistories' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }])
        ]);
    }

    /**
     * Unshare a dog from a user.
     */
    public function unshare(Request $request, string $id)
    {
        $dog = Auth::user()->dogs()->findOrFail($id);

        // Solo el dueño principal puede expulsar a otros
        if (!$dog->pivot->is_primary_owner) {
            return response()->json(['message' => 'Solo el dueño principal puede revocar accesos.'], 403);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $userIdToRemove = $validated['user_id'];

        // No puede expulsarse a sí mismo por aquí (para eso está destroy)
        if ($userIdToRemove == Auth::id()) {
            return response()->json(['message' => 'No puedes revocar tu propio acceso. Usa Eliminar en su lugar.'], 422);
        }

        $dog->users()->detach($userIdToRemove);

        return response()->json([
            'message' => 'Acceso revocado exitosamente',
            'dog' => $dog->load(['users:id,name,email', 'pointHistories' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }])
        ]);
    }

    /**
     * Update AI Avatars for a dog (Admin only).
     */
    public function updateAvatarsAdmin(Request $request, string $id)
    {
        $dog = Dog::findOrFail($id);

        $request->validate([
            'avatar_blue' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'avatar_green' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'avatar_yellow' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'avatar_red' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        $clubSlug = app()->bound('active_club_slug') ? app('active_club_slug') : 'default';

        $colors = ['blue', 'green', 'yellow', 'red'];

        foreach ($colors as $color) {
            $field = "avatar_{$color}";
            $urlField = "avatar_{$color}_url";

            // If the user wants to clear the image (e.g., they clicked the trash can)
            if ($request->boolean("clear_{$color}")) {
                if ($dog->$urlField && str_contains($dog->$urlField, '/storage/')) {
                    $oldPath = str_replace(asset('storage/'), '', $dog->$urlField);
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
                }
                $dog->$urlField = null;
            }

            // If a new file is uploaded
            if ($request->hasFile($field)) {
                if ($dog->$urlField && str_contains($dog->$urlField, '/storage/')) {
                    $oldPath = str_replace(asset('storage/'), '', $dog->$urlField);
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
                }

                $path = $request->file($field)->store("clubs/{$clubSlug}/ai_avatars", 'public');
                $dog->$urlField = asset('storage/' . $path);
            }
        }

        $dog->save();

        return response()->json([
            'message' => 'Avatares actualizados exitosamente',
            'dog' => $dog
        ]);
    }
    /**
     * Generate AI avatars via Cloudflare.
     */
    public function generateAvatarsAdmin(Request $request, $id, CloudflareAiService $aiService, \App\Services\GeminiVisionService $geminiService)
    {
        $currentUser = $request->user();

        if (!in_array($currentUser->role, ['admin'])) {
            return response()->json(['message' => 'No tienes permisos para realizar esta acción.'], 403);
        }

        $dog = Dog::findOrFail($id);

        // Rate limiting
        $limit = env('CLOUDFLARE_AI_DAILY_LIMIT', 10);
        $key = 'cf-ai-generation-admin-' . $request->user()->id;

        if (RateLimiter::tooManyAttempts($key, $limit)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Has alcanzado el límite diario de generación gratuita. Inténtalo de nuevo en " . ceil($seconds / 3600) . " horas."
            ], 429);
        }

        $clubSlug = app()->bound('active_club_slug') ? app('active_club_slug') : 'default';
        $breed = $dog->breed ?: 'mixed breed';
        $customDetails = $request->input('prompt_details', '');

        // DESHABILITADO TEMPORALMENTE (A petición del usuario: resultados no deseados)
        /*
        // Si no hay detalles manuales y el perro tiene foto, usar Gemini Vision para extraer los detalles
        if (empty($customDetails) && $dog->photo_url) {
            // Extraer ruta relativa asumiendo que la URL apunta a /storage/
            $relativePath = str_replace(asset('storage/'), '', $dog->photo_url);
            $localPath = storage_path('app/public/' . ltrim($relativePath, '/'));

            if (file_exists($localPath)) {
                $base64Image = base64_encode(file_get_contents($localPath));
                $mimeType = mime_content_type($localPath);
                
                $geminiDetails = $geminiService->analyzeDogFeatures($base64Image, $mimeType);
                if ($geminiDetails) {
                    $customDetails = $geminiDetails;
                }
            }
        }
        */

        // Construir la base del prompt asegurando que se aplique el estilo y la descripción
        $baseDescription = $customDetails ? "A $breed dog, $customDetails" : "A $breed dog";

        $prompts = [
            'blue' => "A high quality 3D Disney Pixar style cartoon illustration of $baseDescription. The dog is looking very relaxed, resting peacefully, happy. Beautiful bright lighting, solid clean background.",
            'green' => "A high quality 3D Disney Pixar style cartoon illustration of $baseDescription. The dog is looking very energetic, active, happy, athletic pose. Beautiful bright lighting, solid clean background.",
            'yellow' => "A high quality 3D Disney Pixar style cartoon illustration of $baseDescription. The dog is looking tired, panting, sweating slightly, resting after exercise. Beautiful lighting, solid clean background.",
            'red' => "A high quality 3D Disney Pixar style cartoon illustration of $baseDescription. The dog is looking extremely exhausted, tongue out, heavily panting, struggling. Beautiful lighting, solid clean background.",
        ];

        try {
            foreach ($prompts as $color => $prompt) {
                $imageBinary = $aiService->generateImage($prompt);
                
                $filename = "{$dog->id}_avatar_{$color}_" . time() . ".png";
                $path = "clubs/{$clubSlug}/ai_avatars/{$filename}";
                
                Storage::disk('public')->put($path, $imageBinary);

                $urlField = "avatar_{$color}_url";
                
                if ($dog->$urlField && str_contains($dog->$urlField, '/storage/')) {
                    $oldPath = str_replace(asset('storage/'), '', $dog->$urlField);
                    Storage::disk('public')->delete($oldPath);
                }

                $dog->$urlField = asset('storage/' . $path);
            }

            $dog->save();
            
            RateLimiter::hit($key, 86400); // 24 hours

            return response()->json([
                'message' => 'Avatares generados y guardados exitosamente',
                'dog' => $dog
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al generar avatares con IA: ' . $e->getMessage()
            ], 500);
        }
    }
}
