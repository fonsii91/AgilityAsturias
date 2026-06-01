<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$videos = \App\Models\Video::orderBy('id', 'desc')->limit(5)->get();
foreach ($videos as $video) {
    echo "ID: {$video->id} | Status: {$video->status} | Playback URL: {$video->playback_url} | Local Path: {$video->local_path} | BunnyID: {$video->bunny_video_id}\n";
}
