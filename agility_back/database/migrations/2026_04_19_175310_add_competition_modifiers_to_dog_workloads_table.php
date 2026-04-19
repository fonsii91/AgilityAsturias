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
            $table->boolean('jumped_max_height')->default(false);
            $table->integer('number_of_runs')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dog_workloads', function (Blueprint $table) {
            $table->dropColumn(['jumped_max_height', 'number_of_runs']);
        });
    }
};
