<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(append: [
            \App\Http\Middleware\TenantMiddleware::class,
        ]);
        
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'gamification.enabled' => \App\Http\Middleware\CheckGamificationEnabled::class,
            'provision_fondos.enabled' => \App\Http\Middleware\CheckProvisionFondosEnabled::class,
            'liga_norte.enabled' => \App\Http\Middleware\CheckLigaNorteEnabled::class,
            'track_booking.enabled' => \App\Http\Middleware\CheckTrackBookingEnabled::class,
            'class_bonuses.enabled' => \App\Http\Middleware\CheckClassBonusesEnabled::class,
            'subscription.active' => \App\Http\Middleware\CheckSubscriptionActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
