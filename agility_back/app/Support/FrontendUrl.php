<?php

namespace App\Support;

class FrontendUrl
{
    /**
     * Resuelve el host del frontend al que debe volver el usuario tras un
     * flujo externo (Stripe Checkout, etc.).
     *
     * Nunca debe usarse el host de la petición al backend: en local el API se
     * sirve en agility_back.test, que no tiene las rutas Angular y devuelve 404.
     *
     * Prioridad:
     *  1. El header Origin de la petición — respeta el subdominio del tenant
     *     (agilityasturias.localhost:4200 en local, miclub.clubagility.com en prod).
     *  2. En producción, el dominio raíz de la plataforma.
     *  3. En desarrollo, services.frontend_url (FRONTEND_URL en .env).
     */
    public static function returnHost(?string $origin = null): string
    {
        if ($origin) {
            return rtrim($origin, '/');
        }

        if (config('app.env') === 'production') {
            return 'https://clubagility.com';
        }

        $parsedUrl = parse_url(config('services.frontend_url'));
        $scheme = $parsedUrl['scheme'] ?? 'http';
        $hostOnly = $parsedUrl['host'] ?? 'localhost';
        $portOnly = isset($parsedUrl['port']) ? ':' . $parsedUrl['port'] : '';

        return "{$scheme}://{$hostOnly}{$portOnly}";
    }
}
