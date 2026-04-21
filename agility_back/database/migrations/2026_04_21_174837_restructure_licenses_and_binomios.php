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
        // 1. Crear las nuevas columnas donde vamos a alojar los datos
        Schema::table('users', function (Blueprint $table) {
            $table->text('rfec_license')->nullable();
            $table->text('rfec_expiration_date')->nullable();
        });

        Schema::table('dog_user', function (Blueprint $table) {
            $table->text('rsce_license')->nullable();
            $table->text('rsce_expiration_date')->nullable();
            $table->string('rsce_grade')->nullable();
            $table->boolean('sociability_test_passed')->default(false);
        });

        // 2. SALVAR LOS DATOS (Migración de datos de la antigua tabla dogs a las nuevas ubicaciones)
        $dogs = DB::table('dogs')->get();
        foreach ($dogs as $dog) {
            // Migramos la info de la RSCE a las vinculaciones (binomios) del perro.
            if (!empty($dog->rsce_license) || !empty($dog->rsce_grade)) {
                DB::table('dog_user')
                    ->where('dog_id', $dog->id)
                    ->update([
                        'rsce_license' => $dog->rsce_license,
                        'rsce_expiration_date' => $dog->rsce_expiration_date,
                        'rsce_grade' => $dog->rsce_grade,
                    ]);
            }

            // Migramos la info de la RFEC al usuario.
            // Para ello, la pondremos en todos los dueños del perro (ya que originalmente existía en el perro).
            if (!empty($dog->rfec_license)) {
                $owners = DB::table('dog_user')->where('dog_id', $dog->id)->get();
                foreach($owners as $owner) {
                    $user = DB::table('users')->where('id', $owner->user_id)->first();
                    if ($user && empty($user->rfec_license)) {
                        DB::table('users')
                            ->where('id', $user->id)
                            ->update([
                                'rfec_license' => $dog->rfec_license,
                                'rfec_expiration_date' => $dog->rfec_expiration_date,
                            ]);
                    }
                }
            }
        }

        // 3. Eliminar limpiamente las columnas antiguas de los perros
        Schema::table('dogs', function (Blueprint $table) {
            $table->dropColumn([
                'rsce_license',
                'rsce_expiration_date',
                'rsce_grade',
                'rfec_license',
                'rfec_expiration_date',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Al revertir, primero volvemos a crear las columnas en el perro.
        Schema::table('dogs', function (Blueprint $table) {
            $table->text('rsce_license')->nullable();
            $table->text('rsce_expiration_date')->nullable();
            $table->string('rsce_grade')->nullable();
            $table->text('rfec_license')->nullable();
            $table->text('rfec_expiration_date')->nullable();
        });

        // Intentamos restaurar algo de datos de forma inversa (best-effort)
        $dogs = DB::table('dogs')->get();
        foreach ($dogs as $dog) {
            $primaryPivot = DB::table('dog_user')
                ->where('dog_id', $dog->id)
                ->where('is_primary_owner', true)
                ->first();
                
            if (!$primaryPivot) {
                $primaryPivot = DB::table('dog_user')->where('dog_id', $dog->id)->first();
            }

            if ($primaryPivot) {
                // Devolvemos los datos del pivote al perro
                $updates = [];
                if (!empty($primaryPivot->rsce_license)) {
                    $updates['rsce_license'] = $primaryPivot->rsce_license;
                    $updates['rsce_expiration_date'] = $primaryPivot->rsce_expiration_date;
                    $updates['rsce_grade'] = $primaryPivot->rsce_grade;
                }

                // Devolvemos la RFEC del dueño al perro
                $user = DB::table('users')->where('id', $primaryPivot->user_id)->first();
                if ($user && !empty($user->rfec_license)) {
                    $updates['rfec_license'] = $user->rfec_license;
                    $updates['rfec_expiration_date'] = $user->rfec_expiration_date;
                }

                if (!empty($updates)) {
                    DB::table('dogs')->where('id', $dog->id)->update($updates);
                }
            }
        }

        // Finalmente, destruimos las columnas nuevas
        Schema::table('dog_user', function (Blueprint $table) {
            $table->dropColumn([
                'rsce_license',
                'rsce_expiration_date',
                'rsce_grade',
                'sociability_test_passed',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['rfec_license', 'rfec_expiration_date']);
        });
    }
};
