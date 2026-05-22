<?php

namespace App\Console\Commands;

use App\Models\Club;
use App\Models\LigaNorteImport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Exception;

class ScrapeTelegramLigaNorte extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'liganorte:scrape-telegram';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scrapes the public Telegram channel for Liga Norte classification images and imports them';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Starting Telegram scrape for Liga Norte...");
        Log::info("Starting Telegram scrape for Liga Norte...");

        try {
            $url = "https://t.me/s/liganorte";
            $response = Http::get($url);

            if ($response->failed()) {
                $this->error("Failed to fetch Telegram channel web preview.");
                return 1;
            }

            $html = $response->body();
            
            // Find all data-post="liganorte/XXXX" offsets
            preg_match_all('/data-post="liganorte\/(\d+)"/i', $html, $matches, PREG_OFFSET_CAPTURE);

            if (empty($matches[0])) {
                $this->warn("No posts found in Telegram preview HTML.");
                return 0;
            }

            $posts = [];
            $matchCount = count($matches[0]);

            for ($i = 0; $i < $matchCount; $i++) {
                $postId = $matches[1][$i][0];
                $startOffset = $matches[0][$i][1];
                $endOffset = ($i + 1 < $matchCount) ? $matches[0][$i + 1][1] : strlen($html);
                $postHtml = substr($html, $startOffset, $endOffset - $startOffset);

                // Search for photo URL inside the post HTML block
                // Match tgme_widget_message_photo_wrap and extract the background-image URL
                if (preg_match('/class="[^"]*tgme_widget_message_photo_wrap[^"]*".*?background-image:\s*url\((?:\'|"|&quot;)?([^\'"\s&)]+)(?:\'|"|&quot;)?\)/i', $postHtml, $imgMatch)) {
                    $imageUrl = $imgMatch[1];
                    $posts[] = [
                        'id' => "liganorte/{$postId}",
                        'image_url' => $imageUrl
                    ];
                }
            }

            $this->info("Found " . count($posts) . " posts with images.");
            Log::info("Found " . count($posts) . " posts with images in Liga Norte channel.");

            // Limit to the 10 most recent posts with images (newest are at the end)
            $posts = array_slice($posts, -10);
            $this->info("Limiting to the " . count($posts) . " most recent posts.");
            Log::info("Limiting to the " . count($posts) . " most recent posts.");

            if (empty($posts)) {
                return 0;
            }

            // Clean up old pending imports that are not in the latest 3
            $latestPostIds = collect($posts)->pluck('id')->toArray();
            $pendingImportsToDelete = LigaNorteImport::where('status', 'pending')
                ->whereNotIn('telegram_message_id', $latestPostIds)
                ->get();

            foreach ($pendingImportsToDelete as $importToDelete) {
                $imagePath = $importToDelete->image_path;
                $importToDelete->delete();

                $stillReferenced = LigaNorteImport::where('image_path', $imagePath)
                    ->exists();

                if (!$stillReferenced && Storage::disk('public')->exists($imagePath)) {
                    Storage::disk('public')->delete($imagePath);
                }
            }

            $importedCount = 0;

            foreach ($posts as $post) {
                $telegramMessageId = $post['id'];
                $imageUrl = $post['image_url'];

                // Check if this post has already been imported
                $exists = LigaNorteImport::where('telegram_message_id', $telegramMessageId)->exists();

                if ($exists) {
                    continue;
                }

                $cleanPostId = str_replace('/', '_', $telegramMessageId);
                $fileName = "liganorte/{$cleanPostId}.jpg";

                // We download the image only if we don't have it locally
                if (!Storage::disk('public')->exists($fileName)) {
                    $this->info("Downloading image for post {$telegramMessageId}...");
                    $imgResponse = Http::get($imageUrl);
                    if ($imgResponse->successful()) {
                        Storage::disk('public')->put($fileName, $imgResponse->body());
                    } else {
                        Log::error("Failed to download image from {$imageUrl} for post {$telegramMessageId}");
                        continue;
                    }
                }

                // Call Gemini Vision ONCE per post to get raw classifications
                $rawExtractedData = null;
                try {
                    $this->info("Calling Gemini Vision OCR for post {$telegramMessageId}...");
                    Log::info("Calling Gemini Vision OCR for post {$telegramMessageId}...");
                    
                    $imagePath = Storage::disk('public')->path($fileName);
                    $geminiService = app(\App\Services\GeminiVisionService::class);
                    $rawExtractedData = $geminiService->extractTableFromImage($imagePath);
                } catch (Exception $e) {
                    $this->error("Gemini extraction failed for post {$telegramMessageId}: " . $e->getMessage());
                    Log::error("Gemini extraction failed for post {$telegramMessageId}: " . $e->getMessage());
                    // Skip and try again next run, since user wants 100% automated flow without admin review fallback
                    continue;
                }

                // Create the single global import record as approved directly
                $import = LigaNorteImport::create([
                    'telegram_message_id' => $telegramMessageId,
                    'image_path' => $fileName,
                    'status' => 'approved',
                ]);

                // Automatically process and publish using pre-extracted raw data
                try {
                    $this->info("Automatically processing and publishing post {$telegramMessageId}...");
                    Log::info("Automatically processing and publishing post {$telegramMessageId}...");
                    
                    $service = app(\App\Services\LigaNorteService::class);
                    $service->processAndPublish($import, $rawExtractedData);
                    
                    $this->info("Successfully published standings.");
                    Log::info("Successfully published standings.");
                    $importedCount++;
                } catch (Exception $e) {
                    $this->error("Failed auto-publishing post {$telegramMessageId}: " . $e->getMessage());
                    Log::error("Failed auto-publishing post {$telegramMessageId}: " . $e->getMessage());
                    // Clean up import so it can be retried next time
                    $import->delete();
                }
            }

            $this->info("Scrape finished. Imported {$importedCount} new items globally.");
            Log::info("Scrape finished. Imported {$importedCount} new items.");
            return 0;

        } catch (Exception $e) {
            $this->error("Error in scraping command: " . $e->getMessage());
            Log::error("Error in ScrapeTelegramLigaNorte command: " . $e->getMessage());
            return 1;
        }
    }
}
