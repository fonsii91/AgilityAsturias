<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
// CORE PATH: Adjusted to point to ../../agility_back_core/storage
if (file_exists($maintenance = __DIR__ . '/../../agility_back_core/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
// CORE PATH: Adjusted to point to ../../agility_back_core/vendor
require __DIR__ . '/../../agility_back_core/vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
// CORE PATH: Adjusted to point to ../../agility_back_core/bootstrap
$app = require_once __DIR__ . '/../../agility_back_core/bootstrap/app.php';

$app->handleRequest(Request::capture());
