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
            $table->string('rsce_handler_category', 50)->nullable()->after('rsce_grade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dog_user', function (Blueprint $table) {
            $table->dropColumn('rsce_handler_category');
        });
    }
};
