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
        Schema::table('plans', function (Blueprint $table) {
            $table->decimal('promo_price', 8, 2)->nullable()->after('price');
            $table->integer('promo_duration_months')->nullable()->after('promo_price');
            $table->string('promo_label')->nullable()->after('promo_duration_months');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['promo_price', 'promo_duration_months', 'promo_label']);
        });
    }
};
