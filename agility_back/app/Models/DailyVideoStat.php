<?php

namespace App\Models;

use App\Traits\HasClub;

use Illuminate\Database\Eloquent\Model;

class DailyVideoStat extends Model
{
    use HasClub;
    protected $fillable = [
        'date',
        'local_count',
        'youtube_count',
        'in_queue_count',
        'failed_count',
        'total_count'
    ];
}
