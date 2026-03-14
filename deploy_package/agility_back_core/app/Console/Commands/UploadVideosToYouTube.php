<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Video;
use Illuminate\Support\Facades\Storage;
use Google_Client;
use Google_Service_YouTube;
use Google_Service_YouTube_VideoSnippet;
use Google_Service_YouTube_VideoStatus;
use Google_Service_YouTube_Video;
use Google_Http_MediaFileUpload;

class UploadVideosToYouTube extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'youtube:upload-videos';

    protected $description = 'Upload local videos to YouTube to save space';

    public function handle()
    {
        $videos = Video::whereIn('status', ['local', 'in_queue'])
            ->where('created_at', '<=', now()->subDays(5))
            ->take(6)
            ->get();

        if ($videos->isEmpty()) {
            $this->info('No videos to upload.');
            return;
        }

        // Check if credentials are set
        if (!config('services.youtube.client_id') || !config('services.youtube.client_secret') || !config('services.youtube.refresh_token')) {
            $this->error('YouTube credentials are not configured in .env. Skipping upload.');
            return;
        }

        $client = new Google_Client();
        $client->setClientId(config('services.youtube.client_id'));
        $client->setClientSecret(config('services.youtube.client_secret'));
        $client->refreshToken(config('services.youtube.refresh_token'));

        $youtube = new Google_Service_YouTube($client);

        foreach ($videos as $video) {
            $this->info("Processing video ID: {$video->id}");
            $video->update(['status' => 'in_queue']);

            try {
                // Ensure file exists
                if (!$video->local_path || !Storage::disk('public')->exists($video->local_path)) {
                    $this->error("File not found for video ID: {$video->id}");
                    $video->update(['status' => 'failed']);
                    continue;
                }

                $filePath = Storage::disk('public')->path($video->local_path);

                $snippet = new Google_Service_YouTube_VideoSnippet();
                $dogName = $video->dog ? $video->dog->name : 'Unknown';
                $compName = $video->competition ? $video->competition->name : '';
                $title = "{$dogName} - Agility {$video->date}";
                if ($compName) {
                    $title .= " - {$compName}";
                }

                $snippet->setTitle($title);
                $snippet->setDescription("AgilityAsturias - Video uploaded automatically.");
                // Category 15 is "Pets & Animals"
                $snippet->setCategoryId("15");

                $status = new Google_Service_YouTube_VideoStatus();
                $status->privacyStatus = "unlisted";

                $ytVideo = new Google_Service_YouTube_Video();
                $ytVideo->setSnippet($snippet);
                $ytVideo->setStatus($status);

                $chunkSizeBytes = 1 * 1024 * 1024;
                $client->setDefer(true);

                $insertRequest = $youtube->videos->insert("status,snippet", $ytVideo);
                $media = new Google_Http_MediaFileUpload(
                    $client,
                    $insertRequest,
                    'video/*',
                    null,
                    true,
                    $chunkSizeBytes
                );
                $media->setFileSize(filesize($filePath));

                $status = false;
                $handle = fopen($filePath, "rb");
                while (!$status && !feof($handle)) {
                    $chunk = fread($handle, $chunkSizeBytes);
                    $status = $media->nextChunk($chunk);
                }
                fclose($handle);
                $client->setDefer(false);

                if ($status && isset($status['id'])) {
                    $this->info("Uploaded to YouTube with ID: {$status['id']}");

                    Storage::disk('public')->delete($video->local_path);

                    $video->update([
                        'youtube_id' => $status['id'],
                        'status' => 'on_youtube'
                    ]);
                }
            } catch (\Exception $e) {
                $this->error("Failed to upload video ID: {$video->id}. Error: " . $e->getMessage());
                $video->update(['status' => 'failed']);
            }
        }
    }
}
