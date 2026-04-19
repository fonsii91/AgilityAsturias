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
        Schema::create('deleted_videos_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('original_video_id')->nullable();
            $table->string('dog_name')->nullable();
            $table->unsignedBigInteger('dog_id')->nullable();
            $table->string('uploader_name')->nullable();
            $table->unsignedBigInteger('uploader_id')->nullable();
            $table->string('deleted_by_name')->nullable();
            $table->unsignedBigInteger('deleted_by_id')->nullable();
            $table->string('video_title')->nullable();
            $table->string('competition_name')->nullable();
            $table->unsignedBigInteger('competition_id')->nullable();
            $table->date('video_date')->nullable();
            $table->string('manga_type')->nullable();
            $table->string('status_before_deletion')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deleted_videos_history');
    }
};
