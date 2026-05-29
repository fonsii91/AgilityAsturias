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
        Schema::create('bounty_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained('clubs')->onDelete('cascade');
            $table->foreignId('season_id')->constrained('gamification_seasons')->onDelete('cascade');
            $table->foreignId('hunter_dog_id')->constrained('dogs')->onDelete('cascade');
            $table->foreignId('victim_dog_id')->constrained('dogs')->onDelete('cascade');
            $table->text('action_description');
            $table->foreignId('witness_1_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('witness_2_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('witness_3_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('witness_4_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('witness_5_id')->nullable()->constrained('users')->onDelete('set null');
            $table->integer('cost');
            $table->integer('bounty');
            $table->integer('rerolls_used')->default(0);
            $table->string('cartel_type'); // 'guante_blanco', 'asalto', 'hachazo'
            $table->string('status')->default('active'); // 'active', 'claimed', 'burned', 'expired'
            $table->foreignId('witness_validated_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('expires_at');
            $table->timestamps();
        });

        Schema::create('bounty_user_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->boolean('opt_in')->default(true);
            $table->boolean('allow_anonymous_alerts')->default(true);
            $table->timestamps();
        });

        Schema::table('clubs', function (Blueprint $table) {
            $table->json('settings_ranking')->nullable()->after('settings_stickers');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clubs', function (Blueprint $table) {
            $table->dropColumn('settings_ranking');
        });
        Schema::dropIfExists('bounty_user_settings');
        Schema::dropIfExists('bounty_contracts');
    }
};
