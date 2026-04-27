<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('daily_video_stats', function (Blueprint $table) {
            $table->dropUnique('daily_video_stats_date_unique');
            $table->unique(['date', 'club_id'], 'daily_video_stats_date_club_id_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('daily_video_stats', function (Blueprint $table) {
            $table->dropUnique('daily_video_stats_date_club_id_unique');
            $table->unique('date', 'daily_video_stats_date_unique');
        });
    }
};
