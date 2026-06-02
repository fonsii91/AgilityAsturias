<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
$updated = \App\Models\Video::withoutGlobalScopes()->whereIn('id', [326, 327])->update(['club_id' => 2]);
echo "Updated {$updated} videos!\n";
