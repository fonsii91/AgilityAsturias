<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->integer('photo_storage_limit_gb')->default(5)->after('video_storage_limit_gb');
        });

        // Cuotas propuestas en docs/01_Producto/galeria-fotos.md
        DB::table('plans')->where('slug', 'basico')->update(['photo_storage_limit_gb' => 5]);
        DB::table('plans')->where('slug', 'profesional')->update(['photo_storage_limit_gb' => 25]);
        DB::table('plans')->where('slug', 'elite')->update(['photo_storage_limit_gb' => 100]);
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('photo_storage_limit_gb');
        });
    }
};
