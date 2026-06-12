<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Video;
use App\Models\Club;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UploadLocalVideosToBunny extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'video:upload-local-to-bunny 
                            {--limit= : Limit the number of videos to upload} 
                            {--video-id= : Upload a specific video by ID}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely uploads local videos to Bunny.net Stream sequentially';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $libraryId = config('services.bunny.library_id');
        $apiKey = config('services.bunny.api_key');

        if (empty($libraryId) || empty($apiKey)) {
            $this->error('Bunny.net Stream API credentials not configured in services/env.');
            return 1;
        }

        $query = Video::withoutGlobalScopes()
            ->where('status', 'local')
            ->whereNotNull('local_path');

        if ($this->option('video-id')) {
            $query->where('id', $this->option('video-id'));
        }

        if ($this->option('limit')) {
            $query->limit((int) $this->option('limit'));
        }

        $videos = $query->get();
        $total = $videos->count();

        if ($total === 0) {
            $this->info('No local videos found to upload.');
            return 0;
        }

        $this->info("Found {$total} videos to upload to Bunny.net Stream.");

        if (!$this->confirm("Do you want to proceed with the sequential upload of {$total} videos?")) {
            $this->info('Upload cancelled.');
            return 0;
        }

        $successCount = 0;
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        foreach ($videos as $video) {
            $bar->clear();
            $this->info(" Processing Video ID: {$video->id} | Title: {$video->title}");

            if (!Storage::disk('public')->exists($video->local_path)) {
                $this->error("Local file does not exist for video {$video->id} at path: {$video->local_path}");
                $bar->advance();
                continue;
            }

            $filePath = Storage::disk('public')->path($video->local_path);
            $club = Club::find($video->club_id);

            // Bind tenant context
            if ($club) {
                app()->instance('active_club_id', $club->id);
                app()->instance('active_club_slug', $club->slug);
            } else {
                app()->forgetInstance('active_club_id');
                app()->forgetInstance('active_club_slug');
            }

            // Resolve Bunny collection
            $collectionId = null;
            if ($club && $club->slug) {
                $collectionId = app(\App\Services\BunnyCollectionService::class)
                    ->resolveCollectionId($club, $libraryId, $apiKey, true);
            }

            // Create Video placeholder in Bunny
            $title = $video->title ?? ($video->date . ' Video Upload');
            $videoPayload = ['title' => $title];
            if ($collectionId) {
                $videoPayload['collectionId'] = $collectionId;
            }

            try {
                $createResponse = Http::withHeaders([
                    'AccessKey' => $apiKey,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])->post("https://video.bunnycdn.com/library/{$libraryId}/videos", $videoPayload);

                if (!$createResponse->successful()) {
                    $this->error("Failed to create video object in Bunny: " . $createResponse->body());
                    $bar->advance();
                    continue;
                }

                $bunnyData = $createResponse->json();
                $bunnyVideoId = $bunnyData['guid'] ?? null;

                if (!$bunnyVideoId) {
                    $this->error("No GUID returned from Bunny for video {$video->id}");
                    $bar->advance();
                    continue;
                }

                // Upload file using resource stream (memory efficient)
                $fileStream = fopen($filePath, 'r');
                if (!$fileStream) {
                    $this->error("Could not open file stream for video {$video->id} at {$filePath}");
                    $bar->advance();
                    continue;
                }

                $uploadUrl = "https://video.bunnycdn.com/library/{$libraryId}/videos/{$bunnyVideoId}";
                $uploadResponse = Http::withHeaders([
                    'AccessKey' => $apiKey,
                    'Content-Type' => 'application/octet-stream',
                ])->withBody($fileStream, 'application/octet-stream')
                  ->put($uploadUrl);

                fclose($fileStream);

                if (!$uploadResponse->successful()) {
                    $this->error("Failed to upload video file to Bunny: " . $uploadResponse->body());
                    $bar->advance();
                    continue;
                }

                // Update database record to 'encoding' but KEEP local_path intact
                $video->update([
                    'status' => 'encoding',
                    'bunny_video_id' => $bunnyVideoId,
                ]);

                $successCount++;
                $this->info("Successfully uploaded Video ID {$video->id} to Bunny! Status updated to 'encoding'. Local file preserved.");
            } catch (\Exception $e) {
                $this->error("Exception occurred processing Video ID {$video->id}: " . $e->getMessage());
                Log::error("Artisan Upload: Exception processing video {$video->id}: " . $e->getMessage());
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Finished! Successfully uploaded {$successCount} out of {$total} videos to Bunny Stream.");

        return 0;
    }
}
