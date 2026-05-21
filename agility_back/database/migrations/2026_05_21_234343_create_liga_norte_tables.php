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
        Schema::create('liga_norte_imports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('club_id');
            $table->string('telegram_message_id')->nullable();
            $table->string('image_path');
            $table->string('status')->default('pending'); // pending, processed, approved
            $table->longText('extracted_data')->nullable(); // JSON raw returned by Gemini
            $table->timestamps();

            $table->foreign('club_id')->references('id')->on('clubs')->onDelete('cascade');
        });

        Schema::create('liga_norte_standings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('club_id');
            $table->integer('clase'); // 30, 40, 50, 60
            $table->integer('posicion')->nullable();
            $table->string('club_nombre');
            $table->string('guia_nombre');
            $table->string('perro_nombre');
            $table->unsignedBigInteger('dog_id')->nullable(); // linked dog if from our club
            $table->integer('agility_ex_0')->default(0);
            $table->integer('agility_ex_5')->default(0);
            $table->integer('jumping_ex_0')->default(0);
            $table->integer('jumping_ex_5')->default(0);
            $table->integer('total_agility')->default(0);
            $table->integer('total_jumping')->default(0);
            $table->integer('puntos_total')->default(0);
            $table->integer('excelentes_totales')->default(0);
            $table->integer('excelentes_cero')->default(0);
            $table->integer('excelentes_cinco')->default(0);
            $table->timestamps();

            $table->foreign('club_id')->references('id')->on('clubs')->onDelete('cascade');
            $table->foreign('dog_id')->references('id')->on('dogs')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('liga_norte_standings');
        Schema::dropIfExists('liga_norte_imports');
    }
};
