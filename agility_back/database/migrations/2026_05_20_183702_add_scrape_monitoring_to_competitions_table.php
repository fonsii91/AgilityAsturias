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
        Schema::table('competitions', function (Blueprint $table) {
            $table->string('scrape_status')->default('pending')->after('results_scraped');
            $table->text('scrape_error')->nullable()->after('scrape_status');
            $table->timestamp('scraped_at')->nullable()->after('scrape_error');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('competitions', function (Blueprint $table) {
            $table->dropColumn(['scrape_status', 'scrape_error', 'scraped_at']);
        });
    }
};
