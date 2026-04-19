<?php
$videos = \App\Models\Video::with('dog', 'user')->whereHas('dog', function($q) {
    $q->where('name', 'like', '%narcea%');
})->get();

foreach ($videos as $v) {
    echo "ID: {$v->id} | Title: {$v->title} | Status: {$v->status} | Youtube ID: {$v->youtube_id} | Dog: " . ($v->dog ? $v->dog->name : 'None') . " | User: " . ($v->user ? $v->user->name : 'None') . "\n";
}
