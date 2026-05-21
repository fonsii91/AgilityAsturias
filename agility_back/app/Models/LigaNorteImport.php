<?php

namespace App\Models;

use App\Traits\HasClub;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LigaNorteImport extends Model
{
    use HasClub, HasFactory;

    protected $fillable = [
        'club_id',
        'telegram_message_id',
        'image_path',
        'status', // pending, processed, approved
        'extracted_data',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'extracted_data' => 'array',
        ];
    }
}
