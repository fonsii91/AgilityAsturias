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
        Schema::create('time_slot_exceptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('slot_id')->constrained('time_slots')->onDelete('cascade');
            $table->date('date');
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->unique(['slot_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_slot_exceptions');
    }
};
