<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Club;

class CheckSubscriptionActive
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

        // Bypass check in testing environment unless explicitly requested via header
        if (app()->environment('testing') && !$request->hasHeader('X-Test-Check-Subscription')) {
            return $next($request);
        }

        // Bypass check if subscriptions bypass is enabled via environment
        if (config('services.stripe.bypass_subscriptions')) {
            return $next($request);
        }


        // Si no hay club o el usuario es admin global, permitir el acceso libre
        if (!$club || ($request->user() && $request->user()->role === 'admin')) {
            return $next($request);
        }

        // Verificar si el club tiene la suscripción activa
        if ($club->subscribed('default')) {
            return $next($request);
        }

        // Si la suscripción no está activa:
        if ($request->user()) {
            if ($request->user()->role === 'manager') {
                // El Gestor puede pasar solo para endpoints de facturación, info de club o logout
                if ($request->is('api/billing/*') || $request->is('api/tenant/info') || $request->is('api/logout') || $request->is('api/user')) {
                    return $next($request);
                }

                return response()->json([
                    'error' => 'subscription_expired',
                    'message' => 'La suscripción del club ha expirado. Por favor, realiza el pago para reactivar el servicio.'
                ], 402);
            }
        }

        // Socios e Instructores son bloqueados con 403 Forbidden
        return response()->json([
            'error' => 'club_suspended',
            'message' => 'El acceso a la aplicación de este club está temporalmente suspendido.'
        ], 403);
    }
}
