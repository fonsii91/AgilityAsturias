<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Reservas individuales de pista (entrenamientos libres, sin monitor):
     * franjas de una hora por pista. El índice único evita que dos socios
     * reserven la misma pista/fecha/hora en una condición de carrera.
     */
    public function up(): void
    {
        Schema::create('track_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained()->onDelete('cascade');
            $table->foreignId('training_track_id')->constrained('training_tracks')->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->string('start_time', 5);
            $table->string('end_time', 5);
            $table->timestamps();

            $table->unique(['training_track_id', 'date', 'start_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('track_reservations');
    }
};
