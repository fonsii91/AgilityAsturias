<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class GeminiVisionService
{
    protected string $apiKey;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.key') ?? '';
    }

    /**
     * Extracts table data from an image using Gemini 1.5 Flash Vision model.
     *
     * @param string $imagePath
     * @return array
     * @throws Exception
     */
    public function extractTableFromImage(string $imagePath): array
    {
        if (empty($this->apiKey)) {
            throw new Exception("Gemini API key is not configured in .env file.");
        }

        if (!file_exists($imagePath)) {
            throw new Exception("Image file not found: {$imagePath}");
        }

        $imageData = base64_encode(file_get_contents($imagePath));
        $mimeType = mime_content_type($imagePath) ?: 'image/png';

        $prompt = "Actúa como un extractor de datos OCR de alta precisión. Analiza esta imagen que contiene la tabla de clasificación de agility (Liga Norte).\n" .
            "Extrae la tabla completa de resultados en formato JSON.\n" .
            "El JSON de salida debe ser estrictamente un array de objetos con las siguientes propiedades:\n" .
            "- clase: número entero de la altura (ej: 60, 50, 40, 30, 20). Si no está claro, deduce por el título de la sección de la tabla (ej. CLASE 60 o CLASE 20).\n" .
            "- club_nombre: nombre del club en mayúsculas (ej: ASTURIAS, OVIEDO, CANTABRIA).\n" .
            "- guia_nombre: nombre completo del guía (ej: IVAN PEREZ, ALFREDO SANTAMARIA).\n" .
            "- perro_nombre: nombre del perro en mayúsculas (ej: NARCEA, VALKYRIA).\n" .
            "- agility_ex_0: número de excelentes a cero en agility.\n" .
            "- agility_ex_5: número de excelentes a 5 en agility.\n" .
            "- jumping_ex_0: número de excelentes a cero en jumping.\n" .
            "- jumping_ex_5: número de excelentes a 5 en jumping.\n" .
            "- total_agility: puntos totales en agility.\n" .
            "- total_jumping: puntos totales en jumping.\n" .
            "- puntos_total: puntos totales acumulados.\n" .
            "- excelentes_totales: número total de excelentes.\n" .
            "- excelentes_cero: número total de excelentes a cero.\n" .
            "- excelentes_cinco: número total de excelentes a 5.\n\n" .
            "Asegúrate de ignorar el texto explicativo exterior y céntrate únicamente en las filas de la clasificación. Si algún valor numérico está vacío, guárdalo como 0.";

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $this->apiKey;

        try {
            $response = Http::timeout(60)->post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                            [
                                'inlineData' => [
                                    'mimeType' => $mimeType,
                                    'data' => $imageData
                                ]
                            ]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json'
                ]
            ]);

            if ($response->failed()) {
                Log::error("Gemini API request failed", [
                    'status' => $response->status(),
                    'error' => $response->body()
                ]);
                throw new Exception("Gemini API error: Status " . $response->status() . " - " . $response->body());
            }

            $responseJson = $response->json();
            
            if (!isset($responseJson['candidates'][0]['content']['parts'][0]['text'])) {
                Log::error("Unexpected Gemini API response structure", ['response' => $responseJson]);
                throw new Exception("Invalid response structure from Gemini API.");
            }

            $rawText = $responseJson['candidates'][0]['content']['parts'][0]['text'];
            
            // Clean up backticks just in case the model ignored responseMimeType
            $cleanedJson = trim($rawText);
            if (str_starts_with($cleanedJson, '```json')) {
                $cleanedJson = substr($cleanedJson, 7);
            }
            if (str_starts_with($cleanedJson, '```')) {
                $cleanedJson = substr($cleanedJson, 3);
            }
            if (str_ends_with($cleanedJson, '```')) {
                $cleanedJson = substr($cleanedJson, 0, -3);
            }
            $cleanedJson = trim($cleanedJson);

            $extractedData = json_decode($cleanedJson, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error("Failed to decode JSON from Gemini response", [
                    'raw_text' => $rawText,
                    'json_error' => json_last_error_msg()
                ]);
                throw new Exception("Gemini returned invalid JSON: " . json_last_error_msg());
            }

            if (!is_array($extractedData)) {
                throw new Exception("Gemini response is not a valid JSON array.");
            }

            return $extractedData;

        } catch (Exception $e) {
            Log::error("Error in GeminiVisionService: " . $e->getMessage());
            throw $e;
        }
    }
}
