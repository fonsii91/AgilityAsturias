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
        if (config('database.default') !== 'sqlite') {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE suggestions MODIFY COLUMN type ENUM('bug', 'suggestion', 'landing_page') DEFAULT 'suggestion'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (config('database.default') !== 'sqlite') {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE suggestions MODIFY COLUMN type ENUM('bug', 'suggestion') DEFAULT 'suggestion'");
        }
    }
};
