<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('clubs', function (Blueprint $table) {
            // Si está activo, el plan (funciones) del club queda FIJADO por el admin y el
            // webhook de Stripe NO lo sincroniza desde el precio facturado. Permite ofrecer
            // a un club las funciones de un plan superior al que paga (ej. clubes fundadores).
            $table->boolean('plan_locked')->default(false)->after('plan_id');
        });
    }

    public function down()
    {
        Schema::table('clubs', function (Blueprint $table) {
            $table->dropColumn('plan_locked');
        });
    }
};
