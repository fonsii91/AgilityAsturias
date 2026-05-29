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
        Schema::create('gamification_seasons', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('gamification_type'); // 'ranking' or 'stickers'
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('status')->default('active'); // 'active' or 'finished'
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gamification_seasons');
    }
};
