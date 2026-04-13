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
        Schema::table('dogs', function (Blueprint $table) {
            $table->dropColumn('license_expiration_date');
            
            $table->text('rsce_license')->nullable();
            $table->text('rsce_expiration_date')->nullable();
            $table->text('rfec_license')->nullable();
            $table->text('rfec_expiration_date')->nullable();

            $table->text('microchip')->nullable()->change();
            $table->text('pedigree')->nullable()->change();
        });

        // Encrypt existing microchip and pedigree data
        $dogs = \Illuminate\Support\Facades\DB::table('dogs')->get();
        foreach ($dogs as $dog) {
            $updateData = [];
            if (!empty($dog->microchip)) {
                try {
                    \Illuminate\Support\Facades\Crypt::decryptString($dog->microchip);
                    // If it succeeds, it's already encrypted
                } catch (\Illuminate\Contracts\Encryption\DecryptException $e) {
                    $updateData['microchip'] = \Illuminate\Support\Facades\Crypt::encryptString($dog->microchip);
                }
            }
            if (!empty($dog->pedigree)) {
                try {
                    \Illuminate\Support\Facades\Crypt::decryptString($dog->pedigree);
                } catch (\Illuminate\Contracts\Encryption\DecryptException $e) {
                    $updateData['pedigree'] = \Illuminate\Support\Facades\Crypt::encryptString($dog->pedigree);
                }
            }
            if (!empty($updateData)) {
                \Illuminate\Support\Facades\DB::table('dogs')->where('id', $dog->id)->update($updateData);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dogs', function (Blueprint $table) {
            $table->string('license_expiration_date')->nullable();
            
            $table->dropColumn([
                'rsce_license',
                'rsce_expiration_date',
                'rfec_license',
                'rfec_expiration_date'
            ]);

            $table->string('microchip', 15)->nullable()->change();
            $table->string('pedigree')->nullable()->change();
        });
    }
};
