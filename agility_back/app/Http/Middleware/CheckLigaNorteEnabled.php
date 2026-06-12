<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Club;

class CheckLigaNorteEnabled
{
    /**
     * Handle an incoming request.
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

        if ($club && isset($club->settings['liga_norte_enabled']) && $club->settings['liga_norte_enabled'] === false) {
            return response()->json(['message' => 'La sección de Liga Norte está desactivada para este club.'], 403);
        }

        return $next($request);
    }
}
