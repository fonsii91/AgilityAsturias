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
        Schema::table('liga_norte_imports', function (Blueprint $table) {
            $table->dropForeign(['club_id']);
            $table->dropColumn('club_id');
        });

        Schema::table('liga_norte_standings', function (Blueprint $table) {
            $table->dropForeign(['club_id']);
            $table->dropColumn('club_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('liga_norte_imports', function (Blueprint $table) {
            $table->unsignedBigInteger('club_id')->nullable();
            $table->foreign('club_id')->references('id')->on('clubs')->onDelete('cascade');
        });

        Schema::table('liga_norte_standings', function (Blueprint $table) {
            $table->unsignedBigInteger('club_id')->nullable();
            $table->foreign('club_id')->references('id')->on('clubs')->onDelete('cascade');
        });
    }
};
