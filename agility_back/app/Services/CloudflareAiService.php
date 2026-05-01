<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CloudflareAiService
{
    private string $accountId;
    private string $apiToken;
    private string $modelUrl;

    public function __construct()
    {
        $this->accountId = env('CLOUDFLARE_ACCOUNT_ID', '');
        $this->apiToken = env('CLOUDFLARE_API_TOKEN', '');
        $this->modelUrl = "https://api.cloudflare.com/client/v4/accounts/{$this->accountId}/ai/run/@cf/bytedance/stable-diffusion-xl-lightning";
    }

    /**
     * Generates an image using Cloudflare Workers AI.
     * Returns the binary image data or throws an exception.
     */
    public function generateImage(string $prompt): ?string
    {
        // Si no hay claves API, operamos en modo simulación para que la app no falle.
        if (empty($this->accountId) || empty($this->apiToken)) {
            Log::info("Simulating Cloudflare AI generation for prompt: $prompt");
            sleep(2); // Simular tiempo de carga de red
            // Retornamos un pixel transparente base64 como imagen falsa
            return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
        }

        $response = Http::withToken($this->apiToken)
            ->timeout(30)
            ->post($this->modelUrl, [
                'prompt' => $prompt
            ]);

        if ($response->successful()) {
            return $response->body();
        }

        Log::error('Cloudflare AI Error: ' . $response->body());
        throw new \Exception('Error generating image via Cloudflare AI: ' . $response->status());
    }
}
