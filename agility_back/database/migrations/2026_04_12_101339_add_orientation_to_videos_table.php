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
        Schema::table('videos', function (Blueprint $table) {
            $table->string('orientation')->default('vertical')->after('local_path');
        });

        // Asegurarse de que cualquier registro existente (especialmente en bases de datos que no rellenan el default automáticamente al añadir columna) reciba el valor.
        DB::table('videos')->whereNull('orientation')->update(['orientation' => 'vertical']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('videos', function (Blueprint $table) {
            $table->dropColumn('orientation');
        });
    }
};
