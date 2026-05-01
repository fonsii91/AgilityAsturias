<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiVisionService
{
    private string $apiKey;
    private string $apiUrl;

    public function __construct()
    {
        $this->apiKey = env('GEMINI_API_KEY', '');
        $this->apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$this->apiKey}";
    }

    /**
     * Analiza una imagen en base64 y devuelve una descripción concisa de los rasgos del perro.
     */
    public function analyzeDogFeatures(string $base64Image, string $mimeType = 'image/jpeg'): ?string
    {
        if (empty($this->apiKey)) {
            Log::info("Simulating Gemini Vision API because GEMINI_API_KEY is not set.");
            sleep(1);
            return "mixed breed dog, short coat, distinct markings, floppy ears";
        }

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        [
                            'text' => "Analyze this dog. Provide a highly detailed description of its physical appearance (breed, coat color, specific markings and locations, ear shape, snout, eye color) to be used as an image generation prompt. Keep it concise, comma separated, english only. Do not use full sentences, just descriptive keywords."
                        ],
                        [
                            'inline_data' => [
                                'mime_type' => $mimeType,
                                'data' => $base64Image
                            ]
                        ]
                    ]
                ]
            ],
            'generationConfig' => [
                'temperature' => 0.4, // Lower temperature for more factual, literal descriptions
                'maxOutputTokens' => 150
            ]
        ];

        try {
            $response = Http::timeout(20)->post($this->apiUrl, $payload);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
                    $text = $data['candidates'][0]['content']['parts'][0]['text'];
                    return trim(str_replace("\n", " ", $text));
                }
            }

            Log::error('Gemini Vision Error: ' . $response->body());
            return null;
        } catch (\Exception $e) {
            Log::error('Gemini Vision Exception: ' . $e->getMessage());
            return null;
        }
    }
}
