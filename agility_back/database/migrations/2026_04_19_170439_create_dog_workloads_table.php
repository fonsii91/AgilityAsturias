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
        Schema::create('dog_workloads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dog_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // Who logged/confirmed it
            
            $table->enum('source_type', ['manual', 'auto_attendance', 'auto_competition'])->default('manual');
            $table->unsignedBigInteger('source_id')->nullable(); // ID of the reservation or competition
            
            $table->date('date');
            $table->integer('duration_min')->default(60);
            $table->integer('intensity_rpe')->default(5); // 1-10 scale
            
            $table->enum('status', ['confirmed', 'pending_review'])->default('confirmed');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dog_workloads');
    }
};
