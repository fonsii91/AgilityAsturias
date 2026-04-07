<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create the pivot table
        Schema::create('dog_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dog_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });

        // 2. Migrate existing data (owner -> dog_user pivot)
        DB::statement('INSERT INTO dog_user (dog_id, user_id, created_at, updated_at) SELECT id, user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM dogs WHERE user_id IS NOT NULL');

        // 3. Drop user_id from dogs table
        Schema::table('dogs', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Re-add user_id to dogs table
        Schema::table('dogs', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
        });

        // 2. Migrate data back (take the first owner as the primary owner)
        // Using a basic update with subquery for MySQL
        DB::statement('
            UPDATE dogs d
            SET user_id = (
                SELECT user_id FROM dog_user du WHERE du.dog_id = d.id LIMIT 1
            )
        ');

        // 3. Drop the pivot table
        Schema::dropIfExists('dog_user');
    }
};
