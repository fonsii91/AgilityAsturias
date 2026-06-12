<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('clubs', function (Blueprint $table) {
            // Periodo de cortesía: mientras esté en el futuro, el club mantiene acceso
            // aunque no tenga suscripción de Stripe activa. Se usa para no bloquear a los
            // clubes existentes al desactivar el bypass (migración escalonada a pago real).
            $table->timestamp('courtesy_until')->nullable()->after('pm_last_four');
        });
    }

    public function down()
    {
        Schema::table('clubs', function (Blueprint $table) {
            $table->dropColumn('courtesy_until');
        });
    }
};
