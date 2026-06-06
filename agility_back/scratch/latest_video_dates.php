<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$latest = \App\Models\Video::withoutGlobalScopes()
    ->orderBy('created_at', 'desc')
    ->take(5)
    ->get();

echo "Latest 5 videos in DB:\n";
foreach ($latest as $v) {
    echo "ID: {$v->id} | Created At: {$v->created_at} | Date: {$v->date} | Title: {$v->title} | Dog: " . ($v->dog ? $v->dog->name : 'None') . " | Status: {$v->status} | Bunny ID: {$v->bunny_video_id}\n";
}
