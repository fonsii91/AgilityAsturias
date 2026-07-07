<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Club;

class CheckClassBonusesEnabled
{
    /**
     * Bonos de clases: opt-in del gestor. Con la funcionalidad desactivada la
     * gestión de bonos queda bloqueada (y las reservas no consumen bono, pero
     * eso se decide en el flujo de reservas, no aquí).
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $club = null;
        if (app()->bound('active_club_id')) {
            $club = Club::find(app('active_club_id'));
        } elseif ($request->user()) {
            $club = $request->user()->club;
        }

        if (!$club || ($club->settings['class_bonuses_enabled'] ?? false) !== true) {
            return response()->json(['message' => 'Los bonos de clases están desactivados para este club.'], 403);
        }

        return $next($request);
    }
}
