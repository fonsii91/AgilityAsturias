<?php

namespace App\Services;

use App\Models\Club;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BunnyCollectionService
{
    /**
     * Devuelve el ID de la colección Bunny del club. Si no está en settings,
     * la busca por slug en Bunny Stream (y opcionalmente la crea) y la persiste.
     */
    public function resolveCollectionId(Club $club, string $libraryId, string $apiKey, bool $createIfMissing = false): ?string
    {
        $settings = $club->settings ?? [];

        if (!empty($settings['bunny_collection_id'])) {
            return $settings['bunny_collection_id'];
        }

        if (empty($club->slug)) {
            return null;
        }

        $clubSlug = $club->slug;
        $collectionId = null;

        try {
            // Search for existing collection in Bunny Stream
            $searchResponse = Http::withHeaders([
                'AccessKey' => $apiKey,
                'Accept' => 'application/json',
            ])->get("https://video.bunnycdn.com/library/{$libraryId}/collections", [
                'search' => $clubSlug,
                'perPage' => 100,
            ]);

            if ($searchResponse->successful()) {
                $collections = $searchResponse->json()['items'] ?? [];
                foreach ($collections as $col) {
                    if (isset($col['name']) && strtolower($col['name']) === strtolower($clubSlug)) {
                        $collectionId = $col['guid'];
                        break;
                    }
                }
            }

            // If not found, create a new collection in Bunny Stream
            if (!$collectionId && $createIfMissing) {
                $createResponse = Http::withHeaders([
                    'AccessKey' => $apiKey,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])->post("https://video.bunnycdn.com/library/{$libraryId}/collections", [
                    'name' => $clubSlug,
                ]);

                if ($createResponse->successful()) {
                    $createdCol = $createResponse->json();
                    $collectionId = $createdCol['guid'] ?? null;
                } else {
                    Log::warning("Failed to create Bunny Stream collection for club {$clubSlug}", [
                        'response' => $createResponse->body()
                    ]);
                }
            }

            // Save the found or created collection ID in club settings.
            // Update atómico de la clave JSON: no reescribe el objeto completo,
            // así no pisa cambios concurrentes hechos durante las llamadas a Bunny.
            // Con settings NULL o '[]' el JSON_SET de MySQL no puede crear la clave
            // (dejaría el update sin efecto), pero ahí no hay nada que pisar:
            // se asigna el objeto completo.
            if ($collectionId) {
                $club->refresh();
                if (empty($club->settings)) {
                    $club->settings = ['bunny_collection_id' => $collectionId];
                    $club->save();
                } else {
                    Club::whereKey($club->id)
                        ->update(['settings->bunny_collection_id' => $collectionId]);
                    $club->refresh();
                }
            }
        } catch (\Exception $e) {
            Log::error("Error handling Bunny Stream collection for club {$clubSlug}: " . $e->getMessage());
        }

        return $collectionId;
    }
}
