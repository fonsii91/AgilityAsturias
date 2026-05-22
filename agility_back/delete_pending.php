<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
App\Models\LigaNorteImport::where('status', 'pending')->delete();
echo "Deleted pending imports successfully\n";
