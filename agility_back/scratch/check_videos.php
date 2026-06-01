<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$encodingCount = \App\Models\Video::withoutGlobalScopes()->where('status', 'encoding')->count();
$completedWithLocalCount = \App\Models\Video::withoutGlobalScopes()
    ->where('status', 'completed')
    ->whereNotNull('bunny_video_id')
    ->whereNotNull('local_path')
    ->count();
$totalCount = \App\Models\Video::withoutGlobalScopes()->count();

echo "=== VIDEO MIGRATION STATUS ===\n";
echo "Total Videos in Database: {$totalCount}\n";
echo "Videos currently in 'encoding' (transcoding on Bunny): {$encodingCount}\n";
echo "Videos in 'completed' with local files (ready for cleanup): {$completedWithLocalCount}\n";

if ($encodingCount > 0) {
    echo "\n--- Encoding Video Details (showing first 10) ---\n";
    $encodingVideos = \App\Models\Video::withoutGlobalScopes()->where('status', 'encoding')->limit(10)->get();
    foreach ($encodingVideos as $v) {
        echo "ID: {$v->id} | Title: {$v->title} | BunnyID: {$v->bunny_video_id}\n";
    }
}
