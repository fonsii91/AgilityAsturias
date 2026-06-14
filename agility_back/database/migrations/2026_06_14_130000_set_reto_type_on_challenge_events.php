<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * El evento "Límite para conseguir la recompensa por completar el tutorial" se
 * creaba con tipo 'otros'. Pasa a tipo 'reto' para que el calendario abra el
 * modal de progreso del Reto de Activación en lugar del detalle de evento normal.
 */
return new class extends Migration
{
    private string $nombre = 'Límite para conseguir la recompensa por completar el tutorial';

    public function up(): void
    {
        DB::table('competitions')
            ->where('nombre', $this->nombre)
            ->update(['tipo' => 'reto']);
    }

    public function down(): void
    {
        DB::table('competitions')
            ->where('nombre', $this->nombre)
            ->update(['tipo' => 'otros']);
    }
};
