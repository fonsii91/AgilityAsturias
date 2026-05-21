<?php

namespace App\Http\Controllers;

use App\Models\Dog;
use App\Models\LigaNorteImport;
use App\Models\LigaNorteStanding;
use App\Services\GeminiVisionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Exception;

class LigaNorteController extends Controller
{
    protected GeminiVisionService $geminiService;

    public function __construct(GeminiVisionService $geminiService)
    {
        $this->geminiService = $geminiService;
    }

    /**
     * List all Liga Norte imports for the club.
     */
    public function listImports()
    {
        $imports = LigaNorteImport::orderBy('created_at', 'desc')->get();
        
        // Return imports with full URLs for the images
        $imports->transform(function ($import) {
            $import->image_url = asset('storage/' . $import->image_path);
            return $import;
        });

        return response()->json($imports);
    }

    /**
     * Process an import image using Gemini Vision AI.
     */
    public function processImport($id)
    {
        $import = LigaNorteImport::findOrFail($id);

        try {
            $imagePath = Storage::disk('public')->path($import->image_path);
            
            $extractedData = $this->geminiService->extractTableFromImage($imagePath);

            // Add suggestions for dog_id using fuzzy matching
            $enrichedData = $this->enrichWithDogSuggestions($extractedData);

            $import->update([
                'status' => 'processed',
                'extracted_data' => $enrichedData
            ]);

            return response()->json([
                'success' => true,
                'import' => $import,
                'data' => $enrichedData
            ]);

        } catch (Exception $e) {
            Log::error("Failed to process Liga Norte import ID {$id}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve and publish the standings.
     */
    public function approveImport(Request $request, $id)
    {
        $import = LigaNorteImport::findOrFail($id);
        $rows = $request->input('rows');

        if (empty($rows) || !is_array($rows)) {
            return response()->json([
                'success' => false,
                'message' => 'No rows provided for approval.'
            ], 400);
        }

        try {
            DB::transaction(function () use ($import, $rows) {
                // Delete previous standings for the height classes that are present in the approved data
                $classesToUpdate = collect($rows)->pluck('clase')->unique()->filter()->toArray();
                
                if (!empty($classesToUpdate)) {
                    LigaNorteStanding::whereIn('clase', $classesToUpdate)->delete();
                }

                // Insert the new standings
                foreach ($rows as $index => $row) {
                    LigaNorteStanding::create([
                        'clase' => $row['clase'],
                        'posicion' => $row['posicion'] ?? ($index + 1),
                        'club_nombre' => $row['club_nombre'],
                        'guia_nombre' => $row['guia_nombre'],
                        'perro_nombre' => $row['perro_nombre'],
                        'dog_id' => $row['dog_id'] ?? null,
                        'agility_ex_0' => $row['agility_ex_0'] ?? 0,
                        'agility_ex_5' => $row['agility_ex_5'] ?? 0,
                        'jumping_ex_0' => $row['jumping_ex_0'] ?? 0,
                        'jumping_ex_5' => $row['jumping_ex_5'] ?? 0,
                        'total_agility' => $row['total_agility'] ?? 0,
                        'total_jumping' => $row['total_jumping'] ?? 0,
                        'puntos_total' => $row['puntos_total'] ?? 0,
                        'excelentes_totales' => $row['excelentes_totales'] ?? 0,
                        'excelentes_cero' => $row['excelentes_cero'] ?? 0,
                        'excelentes_cinco' => $row['excelentes_cinco'] ?? 0,
                    ]);
                }

                // Update the import status to approved
                $import->update([
                    'status' => 'approved',
                    'extracted_data' => $rows // Save the final approved version
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Standings approved and published successfully.'
            ]);

        } catch (Exception $e) {
            Log::error("Failed to approve Liga Norte import ID {$id}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an import and its image.
     */
    public function deleteImport($id)
    {
        $import = LigaNorteImport::findOrFail($id);

        try {
            if (Storage::disk('public')->exists($import->image_path)) {
                // Check if other imports use this image (unlikely but safe)
                $count = LigaNorteImport::withoutGlobalScopes()
                    ->where('image_path', $import->image_path)
                    ->count();
                if ($count <= 1) {
                    Storage::disk('public')->delete($import->image_path);
                }
            }

            $import->delete();

            return response()->json([
                'success' => true,
                'message' => 'Import deleted successfully.'
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active standings.
     */
    public function getStandings(Request $request)
    {
        $clase = $request->query('clase');

        $query = LigaNorteStanding::with(['dog.users', 'dog.club'])
            ->orderBy('clase', 'desc')
            ->orderBy('puntos_total', 'desc')
            ->orderBy('excelentes_cero', 'desc');

        if ($clase) {
            $query->where('clase', $clase);
        }

        $standings = $query->get();

        return response()->json($standings);
    }

    /**
     * Helper: Enrich extracted table rows with dog_id suggestions using fuzzy matching.
     */
    protected function enrichWithDogSuggestions(array $rows): array
    {
        $clubDogs = Dog::with('users')->get();

        return array_map(function ($row) use ($clubDogs) {
            $row['dog_id'] = null;
            $row['suggested_dog_name'] = null;

            $normalizedRowPerro = $this->normalize($row['perro_nombre'] ?? '');
            $normalizedRowGuia = $this->normalize($row['guia_nombre'] ?? '');

            if (empty($normalizedRowPerro)) {
                return $row;
            }

            foreach ($clubDogs as $dog) {
                $normalizedDogName = $this->normalize($dog->name);
                
                // 1. Check if dog name matches
                if ($normalizedDogName === $normalizedRowPerro) {
                    // 2. Check if owner name matches or overlaps
                    $ownerMatches = false;
                    foreach ($dog->users as $user) {
                        $normalizedUser = $this->normalize($user->name);
                        // Check if guide name contains user name or vice versa, or if they are very close
                        if (
                            str_contains($normalizedRowGuia, $normalizedUser) ||
                            str_contains($normalizedUser, $normalizedRowGuia)
                        ) {
                            $ownerMatches = true;
                            break;
                        }
                    }

                    // If we match both dog and handler, or if the dog name is unique enough in our club
                    if ($ownerMatches || $dog->users->isEmpty()) {
                        $row['dog_id'] = $dog->id;
                        $row['suggested_dog_name'] = $dog->name;
                        break;
                    }
                }
            }

            return $row;
        }, $rows);
    }

    /**
     * Clean text strings for name comparisons.
     */
    protected function normalize(string $str): string
    {
        $str = mb_strtolower($str, 'UTF-8');
        $replacements = [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
            'ü' => 'u', 'ñ' => 'n', 'à' => 'a', 'è' => 'e', 'ì' => 'i',
            'ò' => 'o', 'ù' => 'u'
        ];
        $str = str_replace(array_keys($replacements), array_values($replacements), $str);
        return preg_replace('/[^a-z0-9]/', '', $str); // Remove spaces and punctuation
    }
}
