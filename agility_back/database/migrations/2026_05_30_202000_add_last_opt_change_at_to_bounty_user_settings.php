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
        Schema::table('bounty_user_settings', function (Blueprint $table) {
            $table->timestamp('last_opt_change_at')->nullable()->after('opt_in');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bounty_user_settings', function (Blueprint $table) {
            $table->dropColumn('last_opt_change_at');
        });
    }
};
