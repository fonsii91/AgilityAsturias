<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$videos = \App\Models\Video::withoutGlobalScopes()
    ->with('dog')
    ->get();

echo "All Videos in Database:\n";
foreach ($videos as $v) {
    echo "ID: {$v->id} | Title: {$v->title} | Dog: " . ($v->dog ? $v->dog->name : 'None') . " | Status: {$v->status} | Bunny ID: {$v->bunny_video_id} | Raw playback_url: " . $v->getRawOriginal('playback_url') . "\n";
}
