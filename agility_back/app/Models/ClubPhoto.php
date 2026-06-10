<?php

namespace App\Models;

use App\Traits\HasClub;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ClubPhoto extends Model
{
    use HasClub;
    use HasFactory;

    public const CATEGORIES = [
        'entrenamiento',
        'competicion',
        'seminario',
        'evento_social',
        'cachorros',
        'instalaciones',
        'otros',
    ];

    public const PHOTO_TYPES = [
        'podio',
        'perro_en_accion',
        'binomio',
        'grupo',
        'retrato',
        'ambiente',
        'otras',
    ];

    protected $fillable = [
        'club_id',
        'user_id',
        'competition_id',
        'category',
        'photo_type',
        'title',
        'taken_at',
        'path',
        'thumb_path',
        'size_bytes',
        'is_public',
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'taken_at' => 'date:Y-m-d',
    ];

    protected $appends = ['url', 'thumb_url'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function competition()
    {
        return $this->belongsTo(Competition::class);
    }

    public function dogs()
    {
        return $this->belongsToMany(Dog::class, 'club_photo_dog');
    }

    public function taggedUsers()
    {
        return $this->belongsToMany(User::class, 'club_photo_user');
    }

    public static function storageDisk(): string
    {
        return config('services.photos.disk', 'public');
    }

    protected static function booted()
    {
        static::deleting(function ($photo) {
            $disk = Storage::disk(self::storageDisk());
            foreach ([$photo->path, $photo->thumb_path] as $path) {
                if (!$path) {
                    continue;
                }
                try {
                    $disk->delete($path);
                } catch (\Exception $e) {
                    Log::error("Failed to delete photo file {$path}: " . $e->getMessage());
                }
            }
        });
    }

    public function getUrlAttribute()
    {
        return $this->resolveFileUrl($this->path);
    }

    public function getThumbUrlAttribute()
    {
        return $this->resolveFileUrl($this->thumb_path);
    }

    /**
     * Mega S4 no soporta ACLs públicas ni CORS configurable, por lo que los
     * objetos en discos S3 se sirven con URLs prefirmadas de corta duración.
     */
    protected function resolveFileUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $diskName = self::storageDisk();

        if (config("filesystems.disks.{$diskName}.driver") === 's3') {
            try {
                return Storage::disk($diskName)->temporaryUrl($path, now()->addHour());
            } catch (\Exception $e) {
                Log::error("Failed to generate presigned URL for {$path}: " . $e->getMessage());
                return null;
            }
        }

        return Storage::disk($diskName)->url($path);
    }
}
