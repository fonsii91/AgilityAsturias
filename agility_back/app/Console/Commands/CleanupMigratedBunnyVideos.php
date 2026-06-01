<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Video;
use Illuminate\Support\Facades\Storage;

class CleanupMigratedBunnyVideos extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'video:cleanup-migrated-bunny-videos 
                            {--limit= : Limit the number of videos to clean up} 
                            {--video-id= : Clean up a specific video by ID}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely deletes local video files for videos that have successfully finished transcoding on Bunny.net Stream';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $query = Video::withoutGlobalScopes()
            ->where('status', 'completed')
            ->whereNotNull('bunny_video_id')
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
            $this->info('No completed Bunny videos with local files found to clean up.');
            return 0;
        }

        $this->info("Found {$total} completed Bunny videos that still have local files.");

        if (!$this->confirm("Do you want to proceed with deleting local files for {$total} videos?")) {
            $this->info('Cleanup cancelled.');
            return 0;
        }

        $successCount = 0;
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        foreach ($videos as $video) {
            $bar->clear();
            $this->info(" Cleaning Up Video ID: {$video->id} | Title: {$video->title}");

            $localPath = $video->local_path;

            if (Storage::disk('public')->exists($localPath)) {
                Storage::disk('public')->delete($localPath);
                $this->info("Deleted local file: {$localPath}");
            } else {
                $this->warn("Local file not found on disk, but clearing database reference: {$localPath}");
            }

            $video->update([
                'local_path' => null,
            ]);

            $successCount++;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Finished! Successfully cleaned up local storage for {$successCount} out of {$total} videos.");

        return 0;
    }
}
