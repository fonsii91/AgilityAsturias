<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Club;

class CheckRsceTrackerEnabled
{
    /**
     * Bitácora Canina (RSCE). Activada por defecto: los clubes anteriores a la
     * clave no la tienen en settings y solo un false explícito (guardado por el
     * gestor en Funcionalidades) bloquea el acceso.
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

        if ($club && isset($club->settings['rsce_tracker_enabled']) && $club->settings['rsce_tracker_enabled'] === false) {
            return response()->json(['message' => 'La bitácora Canina (RSCE) está desactivada para este club.'], 403);
        }

        return $next($request);
    }
}
