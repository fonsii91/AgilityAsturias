<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('club_leads', function (Blueprint $table) {
            // Hash de la contraseña elegida por el gestor: se copia al usuario manager al aprovisionar tras el pago
            $table->string('password')->nullable()->after('plan_selected');
            $table->string('stripe_session_id')->nullable()->after('status');
            $table->unsignedBigInteger('club_id')->nullable()->after('stripe_session_id');
            $table->timestamp('provisioned_at')->nullable()->after('club_id');
        });
    }

    public function down()
    {
        Schema::table('club_leads', function (Blueprint $table) {
            $table->dropColumn(['password', 'stripe_session_id', 'club_id', 'provisioned_at']);
        });
    }
};
