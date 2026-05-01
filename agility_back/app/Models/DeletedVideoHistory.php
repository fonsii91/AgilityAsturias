<?php

namespace App\Models;

use App\Traits\HasClub;

use Illuminate\Database\Eloquent\Model;

class DeletedVideoHistory extends Model
{
    use HasClub;
    protected $table = 'deleted_videos_history';

    protected $fillable = [
        'original_video_id',
        'dog_name',
        'dog_id',
        'uploader_name',
        'uploader_id',
        'deleted_by_name',
        'deleted_by_id',
        'video_title',
        'competition_name',
        'competition_id',
        'video_date',
        'manga_type',
        'status_before_deletion',
        'club_id'
    ];
}
