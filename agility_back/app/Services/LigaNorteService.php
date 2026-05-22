<?php

namespace App\Services;

use App\Models\Dog;
use App\Models\LigaNorteImport;
use App\Models\LigaNorteStanding;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Exception;

class LigaNorteService
{
    protected GeminiVisionService $geminiService;

    public function __construct(GeminiVisionService $geminiService)
    {
        $this->geminiService = $geminiService;
    }

    /**
     * Process a LigaNorte import image, run Gemini OCR, fuzzy-match dogs,
     * and automatically publish/save standings.
     *
     * @param LigaNorteImport $import
     * @param array|null $rawExtractedData
     * @return array
     * @throws Exception
     */
    public function processAndPublish(LigaNorteImport $import, ?array $rawExtractedData = null): array
    {
        // 1. Extract raw data using Gemini Vision (or use pre-extracted data)
        $extractedData = $rawExtractedData ?? $this->geminiService->extractTableFromImage(
            Storage::disk('public')->path($import->image_path)
        );

        // 2. Enrich rows with dog suggestions using fuzzy matching
        $enrichedData = $this->enrichWithDogSuggestions($extractedData);

        // 3. Save standings in a database transaction
        DB::transaction(function () use ($import, $enrichedData) {
            // Delete previous standings for the height classes present in the data
            $classesToUpdate = collect($enrichedData)->pluck('clase')->unique()->filter()->toArray();
            
            if (!empty($classesToUpdate)) {
                LigaNorteStanding::whereIn('clase', $classesToUpdate)->delete();
            }

            // Insert new standings
            foreach ($enrichedData as $index => $row) {
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

            // Mark import as approved/published
            $import->update([
                'status' => 'approved',
                'extracted_data' => $enrichedData
            ]);
        });

        return $enrichedData;
    }

    /**
     * Helper: Enrich extracted table rows with dog_id suggestions using fuzzy matching.
     *
     * @param array $rows
     * @return array
     */
    public function enrichWithDogSuggestions(array $rows): array
    {
        $clubDogs = Dog::withoutGlobalScopes()->with(['users', 'club'])->get();

        return array_map(function ($row) use ($clubDogs) {
            $row['dog_id'] = null;
            $row['suggested_dog_name'] = null;

            $normalizedRowPerro = $this->normalize($row['perro_nombre'] ?? '');
            $normalizedRowGuia = $this->normalize($row['guia_nombre'] ?? '');
            $normalizedRowClub = $this->normalize($row['club_nombre'] ?? '');
            $rowGuiaWords = $this->getWords($row['guia_nombre'] ?? '');

            if (empty($normalizedRowPerro)) {
                return $row;
            }

            $bestDog = null;
            $bestScore = 0;

            foreach ($clubDogs as $dog) {
                $normalizedDogName = $this->normalize($dog->name);
                
                if ($normalizedDogName === $normalizedRowPerro) {
                    $score = 1;

                    // 1. Club match check
                    if ($dog->club) {
                        $normalizedDogClubName = $this->normalize($dog->club->name);
                        $normalizedDogClubSlug = $this->normalize($dog->club->slug);
                        if (
                            $normalizedRowClub !== '' && (
                                str_contains($normalizedDogClubName, $normalizedRowClub) ||
                                str_contains($normalizedRowClub, $normalizedDogClubName) ||
                                str_contains($normalizedDogClubSlug, $normalizedRowClub) ||
                                str_contains($normalizedRowClub, $normalizedDogClubSlug)
                            )
                        ) {
                            $score += 10;
                        }
                    }

                    // 2. Owner match check
                    if ($dog->users->isEmpty()) {
                        $score += 5;
                    } else {
                        foreach ($dog->users as $user) {
                            $normalizedUser = $this->normalize($user->name);
                            
                            // Direct containment
                            if (
                                str_contains($normalizedRowGuia, $normalizedUser) ||
                                str_contains($normalizedUser, $normalizedRowGuia)
                            ) {
                                $score += 20;
                                break;
                            }
                            
                            // Word overlap
                            $userWords = $this->getWords($user->name);
                            $overlap = array_intersect($rowGuiaWords, $userWords);
                            $hasWordOverlap = false;
                            foreach ($overlap as $w) {
                                if (strlen($w) >= 4) {
                                    $hasWordOverlap = true;
                                    break;
                                }
                            }
                            if ($hasWordOverlap) {
                                $score += 15;
                                break;
                            }
                        }
                    }

                    // Minimum score requirement: score >= 11 (club or owner matches) or dog has no owners (score >= 6)
                    if ($score >= 6) {
                        if ($score > $bestScore) {
                            $bestScore = $score;
                            $bestDog = $dog;
                        }
                    }
                }
            }

            if ($bestDog) {
                $row['dog_id'] = $bestDog->id;
                $row['suggested_dog_name'] = $bestDog->name;
            }

            return $row;
        }, $rows);
    }

    /**
     * Helper to get word tokens from a name.
     *
     * @param string $str
     * @return array
     */
    protected function getWords(string $str): array
    {
        $str = mb_strtolower($str, 'UTF-8');
        $replacements = [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
            'ü' => 'u', 'ñ' => 'n', 'à' => 'a', 'è' => 'e', 'ì' => 'i',
            'ò' => 'o', 'ù' => 'u'
        ];
        $str = str_replace(array_keys($replacements), array_values($replacements), $str);
        $str = preg_replace('/[^a-z0-9]/', ' ', $str);
        return array_filter(explode(' ', $str), function ($word) {
            return strlen($word) >= 3;
        });
    }

    /**
     * Clean text strings for name comparisons.
     *
     * @param string $str
     * @return string
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
