<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;
// Using Schedule::call to avoid proc_open restrictions on Hostalia shared hosting
Schedule::call(function () {
    Artisan::call('youtube:upload-videos');
})->dailyAt('03:00')->timezone('Europe/Madrid');
