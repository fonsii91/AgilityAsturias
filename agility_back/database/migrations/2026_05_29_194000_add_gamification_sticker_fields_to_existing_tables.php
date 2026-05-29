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
            $table->integer('club_entry_year')->nullable()->after('photo_url');
        });

        Schema::table('clubs', function (Blueprint $table) {
            $table->json('settings_stickers')->nullable()->after('domain');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dogs', function (Blueprint $table) {
            $table->dropColumn('club_entry_year');
        });

        Schema::table('clubs', function (Blueprint $table) {
            $table->dropColumn('settings_stickers');
        });
    }
};
