<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Punto focal (en %) para el encuadre con object-fit: cover.
     * Por defecto el centro (50/50); cualquier socio puede ajustarlo,
     * igual que el etiquetado y los metadatos.
     */
    public function up(): void
    {
        Schema::table('club_photos', function (Blueprint $table) {
            $table->unsignedTinyInteger('focal_x')->default(50)->after('thumb_path');
            $table->unsignedTinyInteger('focal_y')->default(50)->after('focal_x');
        });
    }

    public function down(): void
    {
        Schema::table('club_photos', function (Blueprint $table) {
            $table->dropColumn(['focal_x', 'focal_y']);
        });
    }
};
