<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;
// Using Schedule::call to avoid proc_open restrictions on shared hosting
Schedule::call(function () {
    $clubs = \App\Models\Club::all();
    
    foreach ($clubs as $club) {
        // 1. Guardar estado actual de videos ANTES de subir para ESTE club
        $statusCounts = \App\Models\Video::withoutGlobalScopes()
            ->where('club_id', $club->id)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $local = $statusCounts['local'] ?? 0;
        $youtube = $statusCounts['on_youtube'] ?? 0;
        $queue = $statusCounts['in_queue'] ?? 0;
        $failed = $statusCounts['failed'] ?? 0;
        $total = $local + $youtube + $queue + $failed;

        \App\Models\DailyVideoStat::withoutGlobalScopes()->updateOrCreate(
            ['date' => now()->toDateString(), 'club_id' => $club->id],
            [
                'local_count' => $local,
                'youtube_count' => $youtube,
                'in_queue_count' => $queue,
                'failed_count' => $failed,
                'total_count' => $total
            ]
        );
    }

    // 2. Ejecutar la subida
    Artisan::call('youtube:upload-videos');
})->dailyAt('03:00')->timezone('Europe/Madrid');

// Auto-calibrate pending workloads (after 7 days pending if staff verified)
Schedule::call(function () {
    $threshold = \Carbon\Carbon::now()->subDays(7)->toDateString();
    
    $workloads = \App\Models\DogWorkload::with('dog.users')
        ->where('status', 'pending_review')
        ->where('is_staff_verified', true)
        ->where('date', '<=', $threshold)
        ->get();
        
    $count = 0;
    foreach ($workloads as $p) {
        $duration = $p->duration_min;
        $intensity = $p->intensity_rpe;
        
        if ($p->source_type === 'auto_competition') {
            $duration = 5;
            $intensity = 9;
        } else if ($p->source_type === 'auto_attendance' && $p->source_id) {
            $res = \App\Models\Reservation::with('timeSlot')->find($p->source_id);
            if ($res && $res->timeSlot) {
                $start = \Carbon\Carbon::parse($res->timeSlot->start_time);
                $end = \Carbon\Carbon::parse($res->timeSlot->end_time);
                $classLength = $start->diffInMinutes($end);
                $duration = max(1, (int) round($classLength * (8 / 60)));
            } else {
                $duration = 8;
            }
            $intensity = 6;
        }
        
        $userId = $p->user_id;
        if (!$userId && $p->dog && $p->dog->users->isNotEmpty()) {
            $userId = $p->dog->users->first()->id;
        }
        
        $p->update([
            'duration_min' => $duration,
            'intensity_rpe' => $intensity,
            'user_id' => $userId,
            'status' => 'confirmed'
        ]);
        $count++;
    }
    
    if ($count > 0) {
        \Illuminate\Support\Facades\Log::info("Auto-calibrated {$count} pending dog workloads.");
    }
})->dailyAt('04:00')->timezone('Europe/Madrid');

// Database Backups (Local via Spatie)
Schedule::command('backup:clean')->dailyAt('04:30')->timezone('Europe/Madrid');
Schedule::command('backup:run --only-db')->dailyAt('05:00')->timezone('Europe/Madrid');
