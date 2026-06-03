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
        // 1. Create the unified 'tracks' table
        Schema::create('tracks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dog_id')->constrained()->onDelete('cascade');
            $table->foreignId('club_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->string('manga_type');
            $table->string('qualification');
            $table->string('grade')->nullable(); // From RFEC
            $table->decimal('speed', 5, 2)->nullable();
            $table->decimal('time', 5, 2)->nullable();
            $table->unsignedTinyInteger('faults')->default(0);
            $table->unsignedTinyInteger('refusals')->default(0);
            $table->decimal('time_penalty', 5, 2)->default(0.00);
            $table->decimal('total_penalty', 5, 2)->default(0.00);
            $table->boolean('is_clean')->default(false);
            $table->unsignedSmallInteger('course_length')->nullable();
            $table->decimal('standard_time', 5, 2)->nullable();
            $table->string('judge_name')->nullable();
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->string('federation', 10); // 'RFEC' or 'RSCE'
            $table->timestamps();

            // Indexes for faster lookups
            $table->index(['dog_id', 'date', 'federation']);
        });

        // 2. Migrate RFEC tracks
        if (Schema::hasTable('rfec_tracks')) {
            $rfecTracks = DB::table('rfec_tracks')->get();
            foreach ($rfecTracks as $track) {
                $data = (array)$track;
                unset($data['id']);
                $data['federation'] = 'RFEC';
                DB::table('tracks')->insert($data);
            }
        }

        // 3. Migrate RSCE tracks
        if (Schema::hasTable('rsce_tracks')) {
            $rsceTracks = DB::table('rsce_tracks')->get();
            foreach ($rsceTracks as $track) {
                $data = (array)$track;
                unset($data['id']);
                $data['federation'] = 'RSCE';
                $data['grade'] = null; // rsce_tracks table doesn't have grade
                DB::table('tracks')->insert($data);
            }
        }

        // 4. Drop the old tables
        Schema::dropIfExists('rfec_tracks');
        Schema::dropIfExists('rsce_tracks');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Recreate 'rsce_tracks' table
        Schema::create('rsce_tracks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dog_id')->constrained()->onDelete('cascade');
            $table->foreignId('club_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->string('manga_type');
            $table->string('qualification');
            $table->decimal('speed', 5, 2)->nullable();
            $table->decimal('time', 5, 2)->nullable();
            $table->unsignedTinyInteger('faults')->default(0);
            $table->unsignedTinyInteger('refusals')->default(0);
            $table->decimal('time_penalty', 5, 2)->default(0.00);
            $table->decimal('total_penalty', 5, 2)->default(0.00);
            $table->boolean('is_clean')->default(false);
            $table->unsignedSmallInteger('course_length')->nullable();
            $table->decimal('standard_time', 5, 2)->nullable();
            $table->string('judge_name')->nullable();
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 2. Recreate 'rfec_tracks' table
        Schema::create('rfec_tracks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dog_id')->constrained()->onDelete('cascade');
            $table->foreignId('club_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->string('manga_type');
            $table->string('qualification');
            $table->string('grade')->nullable();
            $table->decimal('speed', 5, 2)->nullable();
            $table->decimal('time', 5, 2)->nullable();
            $table->unsignedTinyInteger('faults')->default(0);
            $table->unsignedTinyInteger('refusals')->default(0);
            $table->decimal('time_penalty', 5, 2)->default(0.00);
            $table->decimal('total_penalty', 5, 2)->default(0.00);
            $table->boolean('is_clean')->default(false);
            $table->unsignedSmallInteger('course_length')->nullable();
            $table->decimal('standard_time', 5, 2)->nullable();
            $table->string('judge_name')->nullable();
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 3. Rollback RSCE tracks
        $rsceTracks = DB::table('tracks')->where('federation', 'RSCE')->get();
        foreach ($rsceTracks as $track) {
            $data = (array)$track;
            unset($data['id']);
            unset($data['federation']);
            unset($data['grade']); // RSCE doesn't have grade
            DB::table('rsce_tracks')->insert($data);
        }

        // 4. Rollback RFEC tracks
        $rfecTracks = DB::table('tracks')->where('federation', 'RFEC')->get();
        foreach ($rfecTracks as $track) {
            $data = (array)$track;
            unset($data['id']);
            unset($data['federation']);
            DB::table('rfec_tracks')->insert($data);
        }

        // 5. Drop 'tracks' table
        Schema::dropIfExists('tracks');
    }
};
