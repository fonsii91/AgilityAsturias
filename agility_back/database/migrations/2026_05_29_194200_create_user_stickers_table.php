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
        Schema::create('user_stickers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_sticker_profile_id')->constrained('user_sticker_profiles')->onDelete('cascade');
            $table->foreignId('dog_id')->constrained('dogs')->onDelete('cascade');
            $table->integer('level')->default(1); // 1 = Pixelado fuerte, 2 = Pixelado suave, 3 = Nítido completo
            $table->integer('duplicates_count')->default(0);
            $table->timestamps();

            $table->unique(['user_sticker_profile_id', 'dog_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_stickers');
    }
};
