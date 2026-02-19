<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('competitions', function (Blueprint $table) {
            $table->string('lugar')->nullable()->change();
            $table->date('fecha_limite')->nullable()->change();
            $table->string('forma_pago')->nullable()->change();
            $table->string('enlace')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('competitions', function (Blueprint $table) {
            $table->string('lugar')->nullable(false)->change();
            $table->date('fecha_limite')->nullable(false)->change();
            $table->string('forma_pago')->nullable(false)->change();
            $table->string('enlace')->nullable(false)->change();
        });
    }
};
