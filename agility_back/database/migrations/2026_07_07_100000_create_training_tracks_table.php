<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Pistas de entrenamiento por club. Además de crear el esquema, siembra la
     * pista principal ("Pista de entrenamiento") de cada club existente y le
     * asigna todos sus horarios, para que ningún horario quede sin pista tras
     * el despliegue.
     */
    public function up(): void
    {
        Schema::create('training_tracks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained()->onDelete('cascade');
            $table->string('name');
            // tierra | cesped | cesped_artificial | otro
            $table->string('surface');
            $table->string('photo_url')->nullable();
            $table->timestamps();
        });

        Schema::table('time_slots', function (Blueprint $table) {
            $table->foreignId('training_track_id')->nullable()->constrained('training_tracks')->nullOnDelete();
        });

        $now = now();
        foreach (DB::table('clubs')->pluck('id') as $clubId) {
            $trackId = DB::table('training_tracks')->insertGetId([
                'club_id' => $clubId,
                'name' => 'Pista de entrenamiento',
                'surface' => 'otro',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('time_slots')->where('club_id', $clubId)->update(['training_track_id' => $trackId]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('time_slots', function (Blueprint $table) {
            $table->dropConstrainedForeignId('training_track_id');
        });

        Schema::dropIfExists('training_tracks');
    }
};
