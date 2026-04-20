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
        Schema::table('dog_workloads', function (Blueprint $table) {
            $table->boolean('is_staff_verified')->default(false)->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dog_workloads', function (Blueprint $table) {
            $table->dropColumn('is_staff_verified');
        });
    }
};
