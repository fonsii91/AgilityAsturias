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
        Schema::create('global_flowagility_events', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->string('nombre');
            $table->string('lugar')->nullable();
            $table->date('fecha_evento');
            $table->date('fecha_fin_evento')->nullable();
            $table->date('fecha_limite')->nullable();
            $table->text('enlace');
            $table->string('federacion')->nullable();
            $table->string('organizador')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('global_flowagility_events');
    }
};
