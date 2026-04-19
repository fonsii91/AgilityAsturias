<?php
$videos = \App\Models\Video::with('dog', 'user')->whereHas('user', function($q) {
    $q->where('name', 'like', '%Paula%');
})->get();

foreach ($videos as $v) {
    echo "ID: {$v->id} | Title: {$v->title} | Status: {$v->status} | Youtube ID: {$v->youtube_id} | Dog: " . ($v->dog ? $v->dog->name : 'None') . "\n";
}
