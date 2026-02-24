<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// Fallback route to serve storage files directly without symlink on Hostalia
Route::get('/storage/{folder}/{filename}', function ($folder, $filename) {
    if (!in_array($folder, ['profile_photos', 'dog_photos', 'competition_posters', 'competitions'])) {
        abort(404);
    }

    $path = $folder . '/' . $filename;

    // Check if it exists in the storage directory
    if (!file_exists(storage_path('app/public/' . $path))) {
        abort(404);
    }

    return response()->file(storage_path('app/public/' . $path));
});
