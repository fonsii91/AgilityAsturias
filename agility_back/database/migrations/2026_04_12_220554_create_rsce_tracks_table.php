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
        Schema::create('rsce_tracks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dog_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->string('manga_type'); // 'agility' or 'jumping'
            $table->string('qualification'); // 'excelente-a-0', 'excelente', 'muy-bueno', 'eliminado', etc.
            $table->decimal('speed', 5, 2)->nullable();
            $table->string('judge_name')->nullable();
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rsce_tracks');
    }
};
