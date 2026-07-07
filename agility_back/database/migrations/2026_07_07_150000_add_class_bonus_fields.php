<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Bonos de clases: contador de clases disponibles por socio (sin caducidad)
     * y marca por reserva de si consumió una clase del bono, para devolver
     * exactamente lo consumido al cancelar (aunque el gestor active/desactive
     * la funcionalidad entre medias).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('class_bonus_balance')->default(0);
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->boolean('bonus_consumed')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('class_bonus_balance');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn('bonus_consumed');
        });
    }
};
