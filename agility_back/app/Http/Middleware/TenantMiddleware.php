<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Club;

class TenantMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $clubDomain = $request->header('X-Club-Domain') ?: $request->query('domain');
        $clubSlug = $request->header('X-Club-Slug') ?: $request->query('slug');

        if (!$clubDomain && !$clubSlug) {
            $host = $request->getHost();
            if (str_starts_with($host, 'www.')) {
                $host = substr($host, 4);
            }
            
            $mainDomains = ['clubagility.com', 'localhost'];
            if (!in_array($host, $mainDomains)) {
                if (str_ends_with($host, '.clubagility.com')) {
                    $clubSlug = explode('.', $host)[0];
                } elseif (str_ends_with($host, '.localhost') && $host !== 'localhost') {
                    $clubSlug = explode('.', $host)[0];
                } else {
                    $clubDomain = $host;
                }
            }
        }
        
        $club = null;
        if ($clubDomain) {
            $club = Club::where('domain', $clubDomain)->first();
        }
        if (!$club && $clubSlug) {
            $club = Club::where('slug', $clubSlug)->first();
        }
        
        if ($club) {
            app()->instance('active_club_id', $club->id);
            app()->instance('active_club_slug', $club->slug);

                // If user is logged in, ensure they belong to this club (unless they are admin)
                if (auth('sanctum')->check()) {
                    $user = auth('sanctum')->user();
                    if ($user->role !== 'admin' && $user->club_id !== $club->id) {
                        return response()->json(['message' => 'No perteneces a este club.'], 403);
                    }
                }
        }

        return $next($request);
    }
}
