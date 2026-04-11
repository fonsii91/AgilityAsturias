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
        Schema::table('dog_user', function (Blueprint $table) {
            $table->boolean('is_primary_owner')->default(false)->after('user_id');
        });

        // Asegurarse de que cada perro tenga al menos 1 dueño principal (el más antiguo de la tabla)
        \Illuminate\Support\Facades\DB::statement('
            UPDATE dog_user du1
            JOIN (
                SELECT MIN(id) as first_id
                FROM dog_user
                GROUP BY dog_id
            ) du2 ON du1.id = du2.first_id
            SET du1.is_primary_owner = true
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dog_user', function (Blueprint $table) {
            $table->dropColumn('is_primary_owner');
        });
    }
};
