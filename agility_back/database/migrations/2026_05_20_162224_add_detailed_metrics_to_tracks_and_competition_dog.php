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
        // 1. Añadir campo dorsal en la tabla pivote de asistencia
        Schema::table('competition_dog', function (Blueprint $table) {
            $table->string('dorsal', 20)->nullable()->after('competition_id');
        });

        // 2. Añadir métricas detalladas a la bitácora RSCE
        Schema::table('rsce_tracks', function (Blueprint $table) {
            $table->decimal('time', 5, 2)->nullable()->after('speed');
            $table->unsignedTinyInteger('faults')->default(0)->after('time');
            $table->unsignedTinyInteger('refusals')->default(0)->after('faults');
            $table->decimal('time_penalty', 5, 2)->default(0.00)->after('refusals');
            $table->decimal('total_penalty', 5, 2)->default(0.00)->after('time_penalty');
            $table->boolean('is_clean')->default(false)->after('total_penalty');
            $table->unsignedSmallInteger('course_length')->nullable()->after('is_clean');
            $table->decimal('standard_time', 5, 2)->nullable()->after('course_length');
        });

        // 3. Añadir métricas detalladas a la bitácora RFEC
        Schema::table('rfec_tracks', function (Blueprint $table) {
            $table->decimal('time', 5, 2)->nullable()->after('speed');
            $table->unsignedTinyInteger('faults')->default(0)->after('time');
            $table->unsignedTinyInteger('refusals')->default(0)->after('faults');
            $table->decimal('time_penalty', 5, 2)->default(0.00)->after('refusals');
            $table->decimal('total_penalty', 5, 2)->default(0.00)->after('time_penalty');
            $table->boolean('is_clean')->default(false)->after('total_penalty');
            $table->unsignedSmallInteger('course_length')->nullable()->after('is_clean');
            $table->decimal('standard_time', 5, 2)->nullable()->after('course_length');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('competition_dog', function (Blueprint $table) {
            $table->dropColumn('dorsal');
        });

        Schema::table('rsce_tracks', function (Blueprint $table) {
            $table->dropColumn([
                'time', 'faults', 'refusals', 'time_penalty', 
                'total_penalty', 'is_clean', 'course_length', 'standard_time'
            ]);
        });

        Schema::table('rfec_tracks', function (Blueprint $table) {
            $table->dropColumn([
                'time', 'faults', 'refusals', 'time_penalty', 
                'total_penalty', 'is_clean', 'course_length', 'standard_time'
            ]);
        });
    }
};
