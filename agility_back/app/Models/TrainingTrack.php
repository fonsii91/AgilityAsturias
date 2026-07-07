<?php

namespace App\Models;

use App\Traits\HasClub;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainingTrack extends Model
{
    use HasFactory, HasClub;

    public const DEFAULT_NAME = 'Pista de entrenamiento';

    public const SURFACES = ['tierra', 'cesped', 'cesped_artificial', 'otro'];

    protected $fillable = [
        'name',
        'surface',
        'photo_url',
        'club_id',
    ];

    protected static function booted()
    {
        // Limpieza del fichero de la foto al borrar la pista (borrado individual
        // desde el CRUD o en cascada al eliminar un club vía Eloquent).
        static::deleting(function ($track) {
            if ($track->photo_url && str_contains($track->photo_url, '/storage/')) {
                $path = str_replace(asset('storage/'), '', $track->photo_url);
                \Illuminate\Support\Facades\Storage::disk('public')->delete($path);
            }
        });
    }

    public function timeSlots()
    {
        return $this->hasMany(TimeSlot::class);
    }
}
