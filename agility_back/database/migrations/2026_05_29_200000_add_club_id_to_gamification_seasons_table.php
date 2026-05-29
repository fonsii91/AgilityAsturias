<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('gamification_seasons', function (Blueprint $table) {
            $table->unsignedBigInteger('club_id')->nullable()->after('id');
        });

        // Fetch default club ID to associate with existing global seasons
        $defaultClubId = DB::table('clubs')->first()->id ?? 1;
        DB::table('gamification_seasons')->update(['club_id' => $defaultClubId]);

        Schema::table('gamification_seasons', function (Blueprint $table) {
            $table->unsignedBigInteger('club_id')->nullable(false)->change();
            $table->foreign('club_id')->references('id')->on('clubs')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gamification_seasons', function (Blueprint $table) {
            $table->dropForeign(['club_id']);
            $table->dropColumn('club_id');
        });
    }
};
