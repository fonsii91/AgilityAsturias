<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Club;

class CheckTrackBookingEnabled
{
    /**
     * Módulo de reserva individual de pistas (entrenamientos libres). A
     * diferencia de gamificación, es opt-in: se bloquea salvo que el gestor lo
     * haya activado explícitamente en Funcionalidades del club.
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

        if (!$club || ($club->settings['track_booking_enabled'] ?? false) !== true) {
            return response()->json(['message' => 'La reserva individual de pistas está desactivada para este club.'], 403);
        }

        return $next($request);
    }
}
