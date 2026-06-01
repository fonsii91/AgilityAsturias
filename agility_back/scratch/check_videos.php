<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$statusCounts = \App\Models\Video::withoutGlobalScopes()
    ->selectRaw('status, count(*) as count')
    ->groupBy('status')
    ->pluck('count', 'status');

$totalCount = \App\Models\Video::withoutGlobalScopes()->count();

echo "=== DATABASE STATUS BREAKDOWN ===\n";
echo "Total Videos in DB: {$totalCount}\n";
foreach ($statusCounts as $status => $count) {
    echo "- Status '{$status}': {$count} videos\n";
}

$localWithPathCount = \App\Models\Video::withoutGlobalScopes()
    ->whereNotNull('local_path')
    ->count();
echo "\nVideos with 'local_path' filled in DB: {$localWithPathCount}\n";

if ($localWithPathCount > 0) {
    echo "\n--- Remaining Local Path Videos ---\n";
    $rem = \App\Models\Video::withoutGlobalScopes()->whereNotNull('local_path')->get();
    foreach ($rem as $r) {
        echo "ID: {$r->id} | Status: {$r->status} | Path: {$r->local_path} | BunnyID: {$r->bunny_video_id}\n";
    }
}
