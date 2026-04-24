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
        // First, create the default club if it doesn't exist
        $defaultClubId = DB::table('clubs')->insertGetId([
            'name' => 'Agility Asturias',
            'slug' => 'agility-asturias',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::table('users', function (Blueprint $table) use ($defaultClubId) {
            $table->unsignedBigInteger('club_id')->nullable()->after('id');
        });

        // Update all existing users to belong to the default club
        DB::table('users')->update(['club_id' => $defaultClubId]);

        // Now that all users have a club_id, make the column non-nullable and add foreign key
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('club_id')->nullable(false)->change();
            $table->foreign('club_id')->references('id')->on('clubs')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['club_id']);
            $table->dropColumn('club_id');
        });
        
        DB::table('clubs')->where('slug', 'agility-asturias')->delete();
    }
};
