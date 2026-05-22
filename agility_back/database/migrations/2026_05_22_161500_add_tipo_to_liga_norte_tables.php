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
            $table->string('tipo')->default('excelentes')->after('id');
        });

        Schema::table('liga_norte_standings', function (Blueprint $table) {
            $table->string('tipo')->default('excelentes')->after('id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('liga_norte_imports', function (Blueprint $table) {
            $table->dropColumn('tipo');
        });

        Schema::table('liga_norte_standings', function (Blueprint $table) {
            $table->dropColumn('tipo');
        });
    }
};
