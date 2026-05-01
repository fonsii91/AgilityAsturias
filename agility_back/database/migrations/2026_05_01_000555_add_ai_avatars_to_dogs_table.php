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
        Schema::table('dogs', function (Blueprint $table) {
            $table->string('avatar_blue_url')->nullable()->after('photo_url');
            $table->string('avatar_green_url')->nullable()->after('avatar_blue_url');
            $table->string('avatar_yellow_url')->nullable()->after('avatar_green_url');
            $table->string('avatar_red_url')->nullable()->after('avatar_yellow_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dogs', function (Blueprint $table) {
            $table->dropColumn([
                'avatar_blue_url',
                'avatar_green_url',
                'avatar_yellow_url',
                'avatar_red_url'
            ]);
        });
    }
};
