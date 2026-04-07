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
        Schema::table('competition_dog', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('dog_id')->constrained()->cascadeOnDelete();
        });

        // Assign the first known owner of the dog to existing records
        $records = \Illuminate\Support\Facades\DB::table('competition_dog')->whereNull('user_id')->get();
        foreach ($records as $record) {
            $firstOwner = \Illuminate\Support\Facades\DB::table('dog_user')->where('dog_id', $record->dog_id)->first();
            if ($firstOwner) {
                \Illuminate\Support\Facades\DB::table('competition_dog')
                    ->where('id', $record->id)
                    ->update(['user_id' => $firstOwner->user_id]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('competition_dog', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};
