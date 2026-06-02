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
        // 1. Asegurarse de que la competición de Teverga en la BD esté marcada como RFEC si no lo está ya
        DB::table('competitions')
            ->where('nombre', 'Teverga')
            ->orWhere('enlace', 'like', '%a07f7fdc-8fc0-46c7-add7-b57dea746fe8%')
            ->update(['federacion' => 'RFEC']);

        // 2. Buscar todas las pistas de RSCE importadas para Teverga
        $tracks = DB::table('rsce_tracks')
            ->where('location', 'like', '%Teverga%')
            ->where('notes', 'like', '%FlowAgility%')
            ->get();

        foreach ($tracks as $track) {
            // Obtener el grado RFEC del perro para guardarlo en la pista RFEC
            $dog = DB::table('dogs')->where('id', $track->dog_id)->first();
            $rfecGrade = $dog ? $dog->rfec_grade : null;

            // Mapear calificación de RSCE a RFEC
            $rawQual = strtoupper(trim($track->qualification));
            $qual = match ($rawQual) {
                'EXC_0', 'EXC' => 'Excelente',
                'MB' => 'Muy Bueno',
                'B' => 'Bueno',
                'SUF' => 'Suficiente',
                'ELIM' => 'Eliminado',
                'NP' => 'No Presentado',
                default => $track->qualification,
            };

            // Insertar o actualizar en rfec_tracks
            DB::table('rfec_tracks')->updateOrInsert(
                [
                    'dog_id' => $track->dog_id,
                    'date' => $track->date,
                    'manga_type' => $track->manga_type,
                ],
                [
                    'club_id' => $track->club_id,
                    'qualification' => $qual,
                    'speed' => $track->speed,
                    'time' => $track->time,
                    'faults' => $track->faults,
                    'refusals' => $track->refusals,
                    'time_penalty' => $track->time_penalty,
                    'total_penalty' => $track->total_penalty,
                    'is_clean' => $track->is_clean,
                    'course_length' => $track->course_length,
                    'standard_time' => $track->standard_time,
                    'judge_name' => $track->judge_name,
                    'location' => $track->location,
                    'grade' => $rfecGrade,
                    'notes' => $track->notes,
                    'created_at' => $track->created_at,
                    'updated_at' => $track->updated_at,
                ]
            );

            // Eliminar de rsce_tracks para que no aparezca duplicado en RSCE
            DB::table('rsce_tracks')->where('id', $track->id)->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Restaurar la federación a RSCE
        DB::table('competitions')
            ->where('nombre', 'Teverga')
            ->orWhere('enlace', 'like', '%a07f7fdc-8fc0-46c7-add7-b57dea746fe8%')
            ->update(['federacion' => 'RSCE']);

        // 2. Buscar todas las pistas de RFEC importadas para Teverga
        $tracks = DB::table('rfec_tracks')
            ->where('location', 'like', '%Teverga%')
            ->where('notes', 'like', '%FlowAgility%')
            ->get();

        foreach ($tracks as $track) {
            // Mapear calificación de RFEC a RSCE
            $rawQual = trim($track->qualification);
            $qual = match ($rawQual) {
                'Excelente' => $track->is_clean ? 'EXC_0' : 'EXC',
                'Muy Bueno' => 'MB',
                'Bueno' => 'B',
                'Suficiente' => 'SUF',
                'Eliminado' => 'ELIM',
                'No Presentado' => 'NP',
                default => $track->qualification,
            };

            // Insertar o actualizar en rsce_tracks
            DB::table('rsce_tracks')->updateOrInsert(
                [
                    'dog_id' => $track->dog_id,
                    'date' => $track->date,
                    'manga_type' => $track->manga_type,
                ],
                [
                    'club_id' => $track->club_id,
                    'qualification' => $qual,
                    'speed' => $track->speed,
                    'time' => $track->time,
                    'faults' => $track->faults,
                    'refusals' => $track->refusals,
                    'time_penalty' => $track->time_penalty,
                    'total_penalty' => $track->total_penalty,
                    'is_clean' => $track->is_clean,
                    'course_length' => $track->course_length,
                    'standard_time' => $track->standard_time,
                    'judge_name' => $track->judge_name,
                    'location' => $track->location,
                    'notes' => $track->notes,
                    'created_at' => $track->created_at,
                    'updated_at' => $track->updated_at,
                ]
            );

            // Eliminar de rfec_tracks
            DB::table('rfec_tracks')->where('id', $track->id)->delete();
        }
    }
};
