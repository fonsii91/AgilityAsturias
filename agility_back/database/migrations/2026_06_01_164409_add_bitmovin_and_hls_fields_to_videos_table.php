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
        Schema::table('videos', function (Blueprint $table) {
            $table->string('playback_url')->nullable()->after('youtube_id');
            $table->string('bitmovin_input_id')->nullable()->after('playback_url');
            $table->string('bitmovin_encoding_id')->nullable()->after('bitmovin_input_id');
            $table->text('error_message')->nullable()->after('bitmovin_encoding_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('videos', function (Blueprint $table) {
            $table->dropColumn(['playback_url', 'bitmovin_input_id', 'bitmovin_encoding_id', 'error_message']);
        });
    }
};
