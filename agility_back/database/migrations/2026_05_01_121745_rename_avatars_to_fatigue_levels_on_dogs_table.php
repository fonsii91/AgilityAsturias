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
        Schema::table('dogs', function (Blueprint $table) {
            if (Schema::hasColumn('dogs', 'avatar_blue_url')) {
                $table->renameColumn('avatar_blue_url', 'avatar_cansancio_1_url');
                $table->renameColumn('avatar_green_url', 'avatar_cansancio_2_url');
                $table->renameColumn('avatar_yellow_url', 'avatar_cansancio_3_url');
                $table->renameColumn('avatar_red_url', 'avatar_cansancio_4_url');
            }
            
            if (!Schema::hasColumn('dogs', 'avatar_cansancio_5_url')) {
                $table->string('avatar_cansancio_5_url')->nullable()->after('avatar_cansancio_4_url');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dogs', function (Blueprint $table) {
            $table->dropColumn('avatar_cansancio_5_url');
            
            $table->renameColumn('avatar_cansancio_1_url', 'avatar_blue_url');
            $table->renameColumn('avatar_cansancio_2_url', 'avatar_green_url');
            $table->renameColumn('avatar_cansancio_3_url', 'avatar_yellow_url');
            $table->renameColumn('avatar_cansancio_4_url', 'avatar_red_url');
        });
    }
};
