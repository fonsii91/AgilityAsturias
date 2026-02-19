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
        Schema::create('competitions', function (Blueprint $table) {
            $table->id();
            $table->string('lugar');
            $table->date('fecha_evento');
            $table->date('fecha_fin_evento')->nullable();
            $table->date('fecha_limite');
            $table->string('forma_pago');
            $table->string('cartel')->nullable();
            $table->string('enlace');
            $table->enum('tipo', ['competicion', 'otros']);
            $table->string('nombre')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('competitions');
    }
};
