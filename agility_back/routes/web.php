<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// Fallback route to serve storage files directly without symlink on Hostalia
Route::get('/storage/{folder}/{filename}', function ($folder, $filename) {
    if (!in_array($folder, ['profile_photos', 'dog_photos', 'competition_posters', 'competitions', 'gallery_photos', 'videos'])) {
        abort(404);
    }

    $path = $folder . '/' . $filename;
    $fullPath = storage_path('app/public/' . $path);

    // Check if it exists in the storage directory
    if (!file_exists($fullPath)) {
        abort(404);
    }

    // Determine MIME type
    $mimeType = mime_content_type($fullPath) ?: 'application/octet-stream';
    
    // For videos, use stream to allow seeking and prevent memory exhaustion
    if ($folder === 'videos') {
        $size = filesize($fullPath);
        $time = date('r', filemtime($fullPath));
        $fm = @fopen($fullPath, 'rb');
        
        if (!$fm) abort(500);
        
        $begin = 0;
        $end = $size - 1;

        if (isset($_SERVER['HTTP_RANGE'])) {
            if (preg_match('/bytes=\h*(\d+)-(\d*)[\D.*]?/i', $_SERVER['HTTP_RANGE'], $matches)) {
                $begin = intval($matches[1]);
                $end = !empty($matches[2]) ? intval($matches[2]) : $end;
            }
        }

        if ($begin > 0 || $end < ($size - 1)) {
            header('HTTP/1.1 206 Partial Content');
        } else {
            header('HTTP/1.1 200 OK');
        }

        header("Content-Type: $mimeType");
        header('Cache-Control: public, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Accept-Ranges: bytes');
        header('Content-Length:' . (($end - $begin) + 1));
        header("Content-Range: bytes $begin-$end/$size");
        header("Content-Disposition: inline; filename=$filename");
        header("Content-Transfer-Encoding: binary");
        header("Last-Modified: $time");

        $cur = $begin;
        fseek($fm, $begin, 0);

        while (!feof($fm) && $cur <= $end && (connection_status() == 0)) {
            print fread($fm, min(1024 * 16, ($end - $cur) + 1));
            $cur += 1024 * 16;
            flush();
        }
        fclose($fm);
        exit;
    }

    // Normal images
    return response()->file($fullPath);
});

