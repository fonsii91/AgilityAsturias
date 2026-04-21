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
        Schema::create('daily_video_stats', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->integer('local_count')->default(0);
            $table->integer('youtube_count')->default(0);
            $table->integer('in_queue_count')->default(0);
            $table->integer('failed_count')->default(0);
            $table->integer('total_count')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_video_stats');
    }
};
