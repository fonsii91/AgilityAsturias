<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('club_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('competition_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category')->index();
            $table->string('photo_type')->nullable()->index();
            $table->string('title')->nullable();
            $table->date('taken_at')->index();
            $table->string('path');
            $table->string('thumb_path');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->boolean('is_public')->default(false);
            $table->timestamps();
        });

        Schema::create('club_photo_dog', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_photo_id')->constrained()->cascadeOnDelete();
            $table->foreignId('dog_id')->constrained()->cascadeOnDelete();
            $table->unique(['club_photo_id', 'dog_id']);
        });

        Schema::create('club_photo_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_photo_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unique(['club_photo_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('club_photo_user');
        Schema::dropIfExists('club_photo_dog');
        Schema::dropIfExists('club_photos');
    }
};
