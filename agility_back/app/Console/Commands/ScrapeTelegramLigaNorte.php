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

            if (empty($posts)) {
                return 0;
            }

            // Get all clubs to support multi-tenancy
            $clubs = Club::all();
            if ($clubs->isEmpty()) {
                $this->warn("No clubs registered in the system.");
                return 0;
            }

            $importedCount = 0;

            foreach ($posts as $post) {
                $telegramMessageId = $post['id'];
                $imageUrl = $post['image_url'];

                // Check if this post has already been imported for ANY club
                // (to avoid downloading the same image multiple times, we can use a shared local file name based on the post ID)
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

                // Check and import for each club individually (maintaining isolation)
                foreach ($clubs as $club) {
                    $exists = LigaNorteImport::withoutGlobalScopes()
                        ->where('club_id', $club->id)
                        ->where('telegram_message_id', $telegramMessageId)
                        ->exists();

                    if (!$exists) {
                        LigaNorteImport::create([
                            'club_id' => $club->id,
                            'telegram_message_id' => $telegramMessageId,
                            'image_path' => $fileName,
                            'status' => 'pending',
                        ]);
                        $importedCount++;
                    }
                }
            }

            $this->info("Scrape finished. Imported {$importedCount} new pending items across " . $clubs->count() . " clubs.");
            Log::info("Scrape finished. Imported {$importedCount} new pending items.");
            return 0;

        } catch (Exception $e) {
            $this->error("Error in scraping command: " . $e->getMessage());
            Log::error("Error in ScrapeTelegramLigaNorte command: " . $e->getMessage());
            return 1;
        }
    }
}
