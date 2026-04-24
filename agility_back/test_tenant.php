<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$request = Illuminate\Http\Request::create('/api/tenant/info', 'GET');
$request->headers->set('X-Club-Domain', 'cluba.localhost');
$request->headers->set('X-Club-Slug', 'cluba');
$request->headers->set('Accept', 'application/json');

try {
    $response = $kernel->handle($request);
    echo "STATUS: " . $response->getStatusCode() . "\n";
    if ($response->getStatusCode() !== 200) {
        $content = json_decode($response->getContent(), true);
        echo "ERROR: " . ($content['message'] ?? 'Unknown') . "\n";
        echo "EXCEPTION: " . ($content['exception'] ?? 'Unknown') . "\n";
        echo "FILE: " . ($content['file'] ?? 'Unknown') . ":" . ($content['line'] ?? 'Unknown') . "\n";
    }
} catch (\Throwable $e) {
    echo "FATAL ERROR MESSAGE: " . $e->getMessage() . "\n";
}
