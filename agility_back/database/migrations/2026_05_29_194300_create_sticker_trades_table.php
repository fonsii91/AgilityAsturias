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
        Schema::create('sticker_trades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('receiver_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('season_id')->constrained('gamification_seasons')->onDelete('cascade');
            $table->foreignId('offered_dog_id')->constrained('dogs')->onDelete('cascade');
            $table->foreignId('requested_dog_id')->constrained('dogs')->onDelete('cascade');
            $table->string('status')->default('pending'); // 'pending', 'accepted', 'rejected', 'cancelled', 'expired'
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sticker_trades');
    }
};
