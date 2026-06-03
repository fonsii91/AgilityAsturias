<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasClub;

class FundTransaction extends Model
{
    use HasClub;

    protected $fillable = [
        'club_id',
        'user_id',
        'amount',
        'type', // 'ingreso' or 'gasto'
        'concept',
        'payment_method', // 'transferencia', 'bizum', 'efectivo', 'tarjeta', 'otro'
        'attachment_path',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
