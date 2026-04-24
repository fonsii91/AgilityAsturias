<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();

\App\Models\Club::where('id', 1)->update(['domain' => 'agilityasturias.com']);
echo "Updated production DB!\n";
