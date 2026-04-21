<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyVideoStat extends Model
{
    protected $fillable = [
        'date',
        'local_count',
        'youtube_count',
        'in_queue_count',
        'failed_count',
        'total_count'
    ];
}
