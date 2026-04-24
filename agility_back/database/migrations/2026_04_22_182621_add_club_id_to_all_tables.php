<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    protected $tables = [
        'announcements',
        'competitions',
        'daily_video_stats',
        'deleted_videos_history',
        'dogs',
        'dog_workloads',
        'gallery_images',
        'personal_events',
        'point_histories',
        'reservations',
        'resources',
        'rsce_tracks',
        'suggestions',
        'time_slots',
        'time_slot_exceptions',
        'videos'
    ];

    public function up(): void
    {
        $defaultClubId = 1;

        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->unsignedBigInteger('club_id')->nullable()->after('id');
            });

            DB::table($tableName)->update(['club_id' => $defaultClubId]);

            Schema::table($tableName, function (Blueprint $table) {
                $table->unsignedBigInteger('club_id')->nullable(false)->change();
                $table->foreign('club_id')->references('id')->on('clubs')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['club_id']);
                $table->dropColumn('club_id');
            });
        }
    }
};
