<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Video;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class RecoverVideosFromBunny extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'video:recover-from-bunny {--limit= : Limit the number of videos to recover}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recover all transcoded videos from Bunny Stream back to the local storage as MP4 files';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $query = Video::withoutGlobalScopes()
            ->where('status', 'completed')
            ->whereNotNull('bunny_video_id')
            ->whereNull('local_path');

        if ($this->option('limit')) {
            $query->limit((int) $this->option('limit'));
        }

        $videos = $query->get();
        $total = $videos->count();

        if ($total === 0) {
            $this->info('No completed Bunny videos with null local files found to recover.');
            return 0;
        }

        $this->info("Found {$total} completed Bunny videos to recover from Bunny Stream.");

        if (!$this->confirm("Do you want to proceed with downloading and converting HLS streams back to local MP4 files for {$total} videos?")) {
            $this->info('Recovery cancelled.');
            return 0;
        }

        $successCount = 0;
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $libraryId = config('services.bunny.library_id');
        $pullZone = config('services.bunny.pull_zone') ?: 'iframe.mediadelivery.net/play/' . $libraryId;

        foreach ($videos as $video) {
            $bar->clear();
            $this->info(" Recovering Video ID: {$video->id} | Title: {$video->title}");

            $club = $video->club_id ? \App\Models\Club::find($video->club_id) : null;
            $clubSlug = $club ? $club->slug : 'default';

            // Ensure destination directory exists
            $relativeDir = "clubs/{$clubSlug}/videos";
            if (!Storage::disk('public')->exists($relativeDir)) {
                Storage::disk('public')->makeDirectory($relativeDir);
            }

            $filename = "{$video->bunny_video_id}.mp4";
            $relativeFilePath = "{$relativeDir}/{$filename}";
            $absoluteOutputPath = Storage::disk('public')->path($relativeFilePath);

            // Construct HLS playlist URL
            $playlistUrl = "https://{$pullZone}/{$video->bunny_video_id}/playlist.m3u8";

            $this->info("Downloading HLS stream: {$playlistUrl}");
            $this->info("Saving to: {$absoluteOutputPath}");

            // Run FFmpeg to download and merge segments into a single MP4
            $command = "ffmpeg -y -i " . escapeshellarg($playlistUrl) . " -c copy " . escapeshellarg($absoluteOutputPath) . " 2>&1";
            exec($command, $output, $returnVar);

            if ($returnVar === 0 && file_exists($absoluteOutputPath) && filesize($absoluteOutputPath) > 0) {
                // Update DB to reflect it is local again
                $video->update([
                    'local_path' => $relativeFilePath,
                    'status' => 'local',
                    'playback_url' => null,
                    'bunny_video_id' => null,
                ]);

                $this->info("Successfully recovered Video ID: {$video->id}");
                $successCount++;
            } else {
                $this->error("Failed to recover Video ID: {$video->id}. FFmpeg output:");
                $this->error(implode("\n", $output));
                Log::error("Failed to recover Bunny video ID {$video->id} from HLS stream. Output: " . implode("\n", $output));
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Finished! Successfully recovered {$successCount} out of {$total} videos back to local storage.");

        return 0;
    }
}
