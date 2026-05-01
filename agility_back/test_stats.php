<?php



try {
    $clubs = \App\Models\Club::all();
    foreach ($clubs as $club) {
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
    echo "SUCCESS\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
