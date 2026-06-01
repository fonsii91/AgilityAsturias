<?php

namespace App\Models;

use App\Traits\HasClub;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Video extends Model
{
    use HasClub;
    use HasFactory;

    protected $fillable = [
        'dog_id',
        'user_id',
        'competition_id',
        'date',
        'local_path',
        'youtube_id',
        'youtube_error',
        'status',
        'title',
        'is_public',
        'in_public_gallery',
        'orientation',
        'manga_type',
        'club_id',
        'playback_url',
        'bitmovin_input_id',
        'bitmovin_encoding_id',
        'error_message',
        'bunny_video_id'
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'in_public_gallery' => 'boolean',
    ];

    public function dog()
    {
        return $this->belongsTo(Dog::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function competition()
    {
        return $this->belongsTo(Competition::class);
    }

    public function likes()
    {
        return $this->hasMany(VideoLike::class);
    }

    protected static function booted()
    {
        static::deleting(function ($video) {
            // Delete from Bunny Stream if it has a Bunny Video ID
            if ($video->bunny_video_id) {
                try {
                    $libraryId = config('services.bunny.library_id');
                    $apiKey = config('services.bunny.api_key');
                    if ($libraryId && $apiKey) {
                        \Illuminate\Support\Facades\Http::withHeaders([
                            'AccessKey' => $apiKey
                        ])->delete("https://video.bunnycdn.com/library/{$libraryId}/videos/{$video->bunny_video_id}");
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Failed to delete video {$video->bunny_video_id} from Bunny.net: " . $e->getMessage());
                }
            }

            // Delete local storage file if exists
            if ($video->local_path && \Illuminate\Support\Facades\Storage::disk('public')->exists($video->local_path)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($video->local_path);
            }
        });
    }

    public function getPlaybackUrlAttribute($value)
    {
        if (empty($value)) {
            return $value;
        }

        if (!empty($this->bunny_video_id)) {
            return $value;
        }

        return url("/api/videos/{$this->id}/stream/manifest.m3u8");
    }
}
