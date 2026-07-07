<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

/**
 * Gestión de bonos de clases (staff): añadir clases al contador de un socio.
 * El consumo/devolución automático vive en el flujo de reservas
 * (ClassBonusService). Solo accesible con la funcionalidad activada
 * (middleware class_bonuses.enabled).
 */
class ClassBonusController extends Controller
{
    /**
     * Añade (o corrige con valores negativos) clases al bono de un socio.
     * El saldo nunca baja de 0.
     */
    public function add(Request $request, string $id)
    {
        $validated = $request->validate([
            'classes' => 'required|integer|between:-500,500|not_in:0',
        ]);

        $actor = $request->user();
        $clubId = app()->bound('active_club_id') ? app('active_club_id') : $actor->club_id;

        $member = User::where('club_id', $clubId)->findOrFail($id);

        $member->class_bonus_balance = max(0, $member->class_bonus_balance + $validated['classes']);
        $member->save();

        return response()->json([
            'id' => $member->id,
            'name' => $member->name,
            'class_bonus_balance' => $member->class_bonus_balance,
        ]);
    }
}
