<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;
// Using Schedule::call to avoid proc_open restrictions on shared hosting
Schedule::call(function () {
    $clubs = \App\Models\Club::all();
    
    foreach ($clubs as $club) {
        // 1. Guardar estado actual de videos ANTES de subir para ESTE club
        $statusCounts = \App\Models\Video::withoutGlobalScopes()
            ->where('club_id', $club->id)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $local = $statusCounts['local'] ?? 0;
        $youtube = $statusCounts['on_youtube'] ?? 0;
        $queue = $statusCounts['in_queue'] ?? 0;
        $failed = $statusCounts['failed'] ?? 0;
        $total = $local + $youtube + $queue + $failed;

        \App\Models\DailyVideoStat::withoutGlobalScopes()->updateOrCreate(
            ['date' => now()->toDateString(), 'club_id' => $club->id],
            [
                'local_count' => $local,
                'youtube_count' => $youtube,
                'in_queue_count' => $queue,
                'failed_count' => $failed,
                'total_count' => $total
            ]
        );
    }

    // 2. Ejecutar la subida
    Artisan::call('youtube:upload-videos');
})->dailyAt('03:10')->timezone('Europe/Madrid');

// Auto-calibrate pending workloads (after 7 days pending if staff verified)
Schedule::call(function () {
    $threshold = \Carbon\Carbon::now()->subDays(7)->toDateString();
    
    $workloads = \App\Models\DogWorkload::with('dog.users')
        ->where('status', 'pending_review')
        ->where('is_staff_verified', true)
        ->where('date', '<=', $threshold)
        ->get();
        
    $count = 0;
    foreach ($workloads as $p) {
        $duration = $p->duration_min;
        $intensity = $p->intensity_rpe;
        
        if ($p->source_type === 'auto_competition') {
            $duration = 5;
            $intensity = 9;
        } else if ($p->source_type === 'auto_attendance' && $p->source_id) {
            $res = \App\Models\Reservation::with('timeSlot')->find($p->source_id);
            if ($res && $res->timeSlot) {
                $start = \Carbon\Carbon::parse($res->timeSlot->start_time);
                $end = \Carbon\Carbon::parse($res->timeSlot->end_time);
                $classLength = $start->diffInMinutes($end);
                $duration = max(1, (int) round($classLength * (8 / 60)));
            } else {
                $duration = 8;
            }
            $intensity = 6;
        }
        
        $userId = $p->user_id;
        if (!$userId && $p->dog && $p->dog->users->isNotEmpty()) {
            $userId = $p->dog->users->first()->id;
        }
        
        $p->update([
            'duration_min' => $duration,
            'intensity_rpe' => $intensity,
            'user_id' => $userId,
            'status' => 'confirmed'
        ]);
        $count++;
    }
    
    if ($count > 0) {
        \Illuminate\Support\Facades\Log::info("Auto-calibrated {$count} pending dog workloads.");
    }
})->dailyAt('04:00')->timezone('Europe/Madrid');

// Database Backups (Local via Spatie)
Schedule::command('backup:clean')->dailyAt('04:30')->timezone('Europe/Madrid');
Schedule::command('backup:run --only-db')->dailyAt('05:00')->timezone('Europe/Madrid');

// Scrape FlowAgility results for closed/finished events
Schedule::command('flowagility:scrape')->dailyAt('04:00')->timezone('Europe/Madrid');

// Scrape FlowAgility calendar for upcoming events (RSCE/RFEC)
Schedule::command('flowagility:scrape-calendar')->dailyAt('03:00')->timezone('Europe/Madrid');

// Scrape Telegram Liga Norte channel for classification images
Schedule::command('liganorte:scrape-telegram')->dailyAt('03:15')->timezone('Europe/Madrid');

Artisan::command('videos:register-bitmovin-webhooks {url}', function ($url) {
    $apiKey = config('services.bitmovin.api_key');
    if (empty($apiKey)) {
        $this->error('Bitmovin API key is not configured in .env (BITMOVIN_API_KEY).');
        return 1;
    }

    $this->info("Registering webhooks for URL: {$url}");

    // 1. Finished webhook
    $responseFinished = \Illuminate\Support\Facades\Http::withHeaders([
        'X-Api-Key' => $apiKey,
        'Content-Type' => 'application/json',
    ])->post('https://api.bitmovin.com/v1/notifications/webhooks/encoding/encodings/finished', [
        'url' => $url,
        'method' => 'POST'
    ]);

    if ($responseFinished->successful()) {
        $this->info('Successfully registered finished encoding webhook!');
    } else {
        $this->error('Failed to register finished encoding webhook: ' . $responseFinished->body());
    }

    // 2. Error webhook
    $responseError = \Illuminate\Support\Facades\Http::withHeaders([
        'X-Api-Key' => $apiKey,
        'Content-Type' => 'application/json',
    ])->post('https://api.bitmovin.com/v1/notifications/webhooks/encoding/encodings/error', [
        'url' => $url,
        'method' => 'POST'
    ]);

    if ($responseError->successful()) {
        $this->info('Successfully registered error encoding webhook!');
    } else {
        $this->error('Failed to register error encoding webhook: ' . $responseError->body());
    }

    return 0;
})->purpose('Register global finished and failed encoding webhooks in Bitmovin');

Artisan::command('mega:configure-cors', function () {
    $bucket = config('services.mega_s4.bucket');
    $endpoint = config('services.mega_s4.endpoint');
    $key = config('services.mega_s4.key');
    $secret = config('services.mega_s4.secret');
    $region = config('services.mega_s4.region', 'us-east-1');

    if (empty($bucket) || empty($endpoint) || empty($key) || empty($secret)) {
        $this->error('Mega S4 configuration in .env is incomplete. Ensure BUCKET, ENDPOINT, KEY, and SECRET are set.');
        return 1;
    }

    $cleanEndpoint = preg_replace('/^https?:\/\//', '', $endpoint);
    if (!str_starts_with($cleanEndpoint, 's3.')) {
        $s3Endpoint = "https://s3.{$region}.{$cleanEndpoint}";
    } else {
        $s3Endpoint = 'https://' . $cleanEndpoint;
    }

    $this->info("Connecting to Mega S4 S3 API at {$s3Endpoint}...");
    $this->info("Target bucket: {$bucket}");

    try {
        $s3 = new \Aws\S3\S3Client([
            'version' => 'latest',
            'region'  => $region,
            'endpoint' => $s3Endpoint,
            'use_path_style_endpoint' => true,
            'credentials' => [
                'key'    => $key,
                'secret' => $secret,
            ],
        ]);

        $this->info("Setting CORS policy...");

        $s3->putBucketCors([
            'Bucket' => $bucket,
            'CORSConfiguration' => [
                'CORSRules' => [
                    [
                        'AllowedHeaders' => ['*'],
                        'AllowedMethods' => ['GET', 'HEAD', 'OPTIONS'],
                        'AllowedOrigins' => [
                            'http://localhost:4200',
                            'https://app.clubagility.com',
                            'https://clubagility.com',
                        ],
                        'ExposeHeaders' => ['Access-Control-Allow-Origin'],
                        'MaxAgeSeconds' => 3000,
                    ],
                ],
            ],
        ]);

        $this->info("CORS policy successfully configured for bucket: {$bucket}!");
        return 0;
    } catch (\Exception $e) {
        $this->error("Failed to configure CORS: " . $e->getMessage());
        return 1;
    }
})->purpose('Configure CORS policy for Mega S4 bucket to allow video streaming playbacks');

Artisan::command('video:complete-bunny {id}', function ($id) {
    $video = \App\Models\Video::find($id);
    if (!$video) {
        $this->error("Video with ID {$id} not found.");
        return 1;
    }
    if (!$video->bunny_video_id) {
        $this->error("Video does not have a Bunny Video ID.");
        return 1;
    }

    $libraryId = config('services.bunny.library_id') ?: 'local-library';
    $pullZone = config('services.bunny.pull_zone') ?: 'iframe.mediadelivery.net/play/' . $libraryId;
    $playbackUrl = "https://{$pullZone}/{$video->bunny_video_id}/playlist.m3u8";

    $video->update([
        'status' => 'completed',
        'playback_url' => $playbackUrl,
        'error_message' => null
    ]);

    $this->info("Successfully completed video {$video->id} (Bunny GUID: {$video->bunny_video_id}) locally.");
    return 0;
})->purpose('Simulates Bunny webhook callback to mark a video as completed in local development');

Artisan::command('video:reencode-all-bunny', function () {
    $libraryId = config('services.bunny.library_id');
    $apiKey = config('services.bunny.api_key');

    if (empty($libraryId) || empty($apiKey)) {
        $this->error('Bunny library ID or API key is not configured in .env.');
        return 1;
    }

    $videos = \App\Models\Video::withoutGlobalScopes()
        ->whereNotNull('bunny_video_id')
        ->where('status', 'completed')
        ->get();

    $total = $videos->count();
    if ($total === 0) {
        $this->info('No videos found with a Bunny video ID.');
        return 0;
    }

    $this->info("Found {$total} videos to reencode on Bunny Stream.");
    if (!$this->confirm("Do you want to send re-encode requests to Bunny Stream for all {$total} videos?")) {
        $this->info('Cancelled.');
        return 0;
    }

    $bar = $this->output->createProgressBar($total);
    $bar->start();

    $successCount = 0;
    $failCount = 0;

    foreach ($videos as $video) {
        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'AccessKey' => $apiKey,
                'accept' => 'application/json',
            ])->post("https://video.bunnycdn.com/library/{$libraryId}/videos/{$video->bunny_video_id}/reencode");

            if ($response->successful()) {
                $successCount++;
            } else {
                $failCount++;
                \Illuminate\Support\Facades\Log::warning("Failed to trigger reencode for video {$video->id} (Bunny GUID: {$video->bunny_video_id}): " . $response->body());
            }
        } catch (\Exception $e) {
            $failCount++;
            \Illuminate\Support\Facades\Log::error("Error triggering reencode for video {$video->id}: " . $e->getMessage());
        }
        $bar->advance();
    }

    $bar->finish();
    $this->newLine();
    $this->info("Done! Successfully queued {$successCount} videos for reencoding. Failed: {$failCount}.");
    return 0;
})->purpose('Bulk trigger re-encode for all Bunny Stream videos to generate new resolutions and fallbacks');


