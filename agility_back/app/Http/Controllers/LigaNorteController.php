<?php

namespace App\Http\Controllers;

use App\Models\LigaNorteImport;
use App\Models\LigaNorteStanding;
use App\Services\LigaNorteService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Exception;

class LigaNorteController extends Controller
{
    protected LigaNorteService $ligaNorteService;

    public function __construct(LigaNorteService $ligaNorteService)
    {
        $this->ligaNorteService = $ligaNorteService;
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
     * Process an import image using Gemini Vision AI and publish immediately.
     */
    public function processImport($id)
    {
        $import = LigaNorteImport::findOrFail($id);

        try {
            $enrichedData = $this->ligaNorteService->processAndPublish($import);

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
     * Approve and publish the standings (manual correction / override).
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
                $count = LigaNorteImport::where('image_path', $import->image_path)
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

        $query = LigaNorteStanding::with([
            'dog' => function ($q) {
                $q->withoutGlobalScopes();
            },
            'dog.users',
            'dog.club'
        ])
            ->orderBy('clase', 'desc')
            ->orderBy('puntos_total', 'desc')
            ->orderBy('excelentes_cero', 'desc');

        if ($clase) {
            $query->where('clase', $clase);
        }

        $standings = $query->get();

        return response()->json($standings);
    }
}
