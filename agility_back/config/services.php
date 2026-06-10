<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'youtube' => [
        'client_id' => env('YOUTUBE_CLIENT_ID'),
        'client_secret' => env('YOUTUBE_CLIENT_SECRET'),
        'refresh_token' => env('YOUTUBE_REFRESH_TOKEN'),
    ],

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
    ],

    'bitmovin' => [
        'api_key' => env('BITMOVIN_API_KEY'),
    ],

    'mega_s4' => [
        'bucket' => env('MEGA_S4_BUCKET'),
        'endpoint' => env('MEGA_S4_ENDPOINT'),
        'key' => env('MEGA_S4_KEY'),
        'secret' => env('MEGA_S4_SECRET'),
        'region' => env('MEGA_S4_REGION', 'us-east-1'),
    ],

    'videos' => [
        'driver' => env('VIDEO_UPLOAD_DRIVER', 'legacy'),
    ],

    'photos' => [
        // Disco de Flysystem donde se guardan las fotos de la galería interna.
        // En producción: 'mega_s4'. En local sin credenciales: 'public'.
        'disk' => env('PHOTO_UPLOAD_DISK', 'public'),
    ],

    'bunny' => [
        'library_id' => env('BUNNY_LIBRARY_ID'),
        'api_key' => env('BUNNY_API_KEY'),
        'pull_zone' => env('BUNNY_STREAM_PULL_ZONE'),
    ],

];
