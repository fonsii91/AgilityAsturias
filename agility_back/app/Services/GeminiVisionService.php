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
    public function extractTableFromImage(string $imagePath, array $context = []): array
    {
        if (empty($this->apiKey)) {
            throw new Exception("Gemini API key is not configured in .env file.");
        }

        if (!file_exists($imagePath)) {
            throw new Exception("Image file not found: {$imagePath}");
        }

        $imageData = base64_encode(file_get_contents($imagePath));
        $mimeType = mime_content_type($imagePath) ?: 'image/png';

        $contextPrompt = "";
        if (!empty($context)) {
            $contextPrompt .= "\n--- CONTEXTO DE REFERENCIA (DICCIONARIO DE DATOS) ---\n";
            $contextPrompt .= "Usa las siguientes listas de valores válidos/conocidos como referencia para resolver cualquier ambigüedad de transcripción OCR (ej. si una palabra es parcialmente borrosa o tiene erratas, compárala con esta lista para transcribirla correctamente):\n";
            if (!empty($context['clubs'])) {
                $contextPrompt .= "- CLUBES CONOCIDOS: " . implode(', ', $context['clubs']) . "\n";
            }
            if (!empty($context['dogs'])) {
                $contextPrompt .= "- PERROS CONOCIDOS: " . implode(', ', $context['dogs']) . "\n";
            }
            if (!empty($context['guides'])) {
                $contextPrompt .= "- GUÍAS CONOCIDOS: " . implode(', ', $context['guides']) . "\n";
            }
            $contextPrompt .= "Si el nombre en la imagen es muy similar a uno de la lista (por ejemplo, 'LEONIDOG' o 'LEONIDOGS', o 'LION' frente a un club registrado), usa la versión canónica de la lista.\n\n";
        }

        $prompt = "Actúa como un extractor de datos OCR de alta precisión. Analiza esta imagen que contiene una clasificación de agility de la Liga Norte.\n" .
            $contextPrompt .
            "Primero, clasifica la tabla en uno de estos dos tipos:\n" .
            "1. 'liga': si es la clasificación general/guía (contiene columnas con meses/fechas de pruebas, columna 'Total' y columna 'pos.').\n" .
            "2. 'excelentes': si es la clasificación de excelentes para el campeonato de España (contiene columnas de Agility/Jumping, excelentes, 'Nº TOTAL EXCELENTES' y 'PUNTOS TOTAL').\n\n" .
            "El JSON de salida debe ser un objeto con las siguientes propiedades de primer nivel:\n" .
            "- tipo: string ('liga' o 'excelentes') según corresponda.\n" .
            "- clase: número entero de la altura (ej: 60, 50, 40, 30, 20) deducido por el título de la sección de la tabla (ej. CLASE 60 o CLASE 20).\n" .
            "- rows: un array de objetos (las filas de la clasificación) con las siguientes propiedades:\n" .
            "  - posicion: número entero con la posición (ej: 1, 2, 3...).\n" .
            "  - club_nombre: nombre del club en mayúsculas.\n" .
            "  - guia_nombre: nombre completo del guía.\n" .
            "  - perro_nombre: nombre del perro en mayúsculas.\n" .
            "  - puntos_total: puntos totales acumulados (para tipo 'liga' es el valor de la columna 'Total'; para tipo 'excelentes' es el valor de 'PUNTOS TOTAL').\n" .
            "  - agility_ex_0: (solo para tipo 'excelentes') número de excelentes a cero en agility.\n" .
            "  - agility_ex_5: (solo para tipo 'excelentes') número de excelentes a 5 en agility.\n" .
            "  - jumping_ex_0: (solo para tipo 'excelentes') número de excelentes a cero en jumping.\n" .
            "  - jumping_ex_5: (solo para tipo 'excelentes') número de excelentes a 5 en jumping.\n" .
            "  - total_agility: (solo para tipo 'excelentes') puntos totales en agility.\n" .
            "  - total_jumping: (solo para tipo 'excelentes') puntos totales en jumping.\n" .
            "  - excelentes_totales: (solo para tipo 'excelentes') número total de excelentes (columna TOTALES).\n" .
            "  - excelentes_cero: (solo para tipo 'excelentes') número total de excelentes a cero (columna EXCELENTES 0).\n" .
            "  - excelentes_cinco: (solo para tipo 'excelentes') número total de excelentes a 5 (columna EX 5).\n\n" .
            "Asegúrate de ignorar el texto explicativo exterior y céntrate únicamente en las filas de la clasificación. Pon especial atención en los números de puntos y posiciones: distingue perfectamente dígitos visualmente similares (como el 1, el 3 y el 0) comparando con las celdas de la misma columna para evitar errores numéricos. Si algún valor numérico está vacío, guárdalo como 0.";

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $this->apiKey;

        $maxRetries = 3;
        $retryDelay = 5; // seconds
        $response = null;

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
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

                if ($response->status() === 429 || $response->status() === 503) {
                    $errorBody = $response->body();
                    $errorJson = json_decode($errorBody, true);
                    $waitSecs = $retryDelay * $attempt; // exponential backoff: 5s, 10s...
                    
                    // If the API tells us exactly how long to wait, we use it
                    if ($response->status() === 429 && isset($errorJson['error']['message']) && preg_match('/retry in ([\d\.]+)s/i', $errorJson['error']['message'], $matches)) {
                        $waitSecs = (int)ceil((float)$matches[1]);
                    }
                    
                    Log::warning("Gemini API returned status {$response->status()}. Attempt {$attempt} of {$maxRetries}. Retrying in {$waitSecs} seconds...");
                    sleep($waitSecs);
                    continue;
                }

                if ($response->failed()) {
                    Log::error("Gemini API request failed", [
                        'status' => $response->status(),
                        'error' => $response->body()
                    ]);
                    throw new Exception("Gemini API error: Status " . $response->status() . " - " . $response->body());
                }
                
                break; // Success! Break out of retry loop

            } catch (Exception $e) {
                if ($attempt === $maxRetries) {
                    throw $e;
                }
                Log::warning("Gemini API request failed with exception: " . $e->getMessage() . ". Attempt {$attempt} of {$maxRetries}. Retrying in {$retryDelay} seconds...");
                sleep($retryDelay);
            }
        }

        if (!$response || $response->failed()) {
            $status = $response ? $response->status() : 'unknown';
            $body = $response ? $response->body() : 'No response';
            throw new Exception("Gemini API request failed after {$maxRetries} attempts. Status: {$status} - {$body}");
        }

        try {
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
