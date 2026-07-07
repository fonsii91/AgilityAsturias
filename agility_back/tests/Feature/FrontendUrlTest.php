<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Support\FrontendUrl;

/**
 * El host de retorno tras Stripe Checkout debe apuntar al FRONTEND, nunca al
 * backend: en local el API vive en agility_back.test, que no tiene las rutas
 * Angular y devolvía 404 al volver del pago.
 */
class FrontendUrlTest extends TestCase
{
    public function test_origin_header_wins_and_preserves_tenant_subdomain()
    {
        $host = FrontendUrl::returnHost('http://agilityasturias.localhost:4200');

        $this->assertEquals('http://agilityasturias.localhost:4200', $host);
    }

    public function test_origin_trailing_slash_is_stripped()
    {
        $host = FrontendUrl::returnHost('https://miclub.clubagility.com/');

        $this->assertEquals('https://miclub.clubagility.com', $host);
    }

    public function test_without_origin_in_production_falls_back_to_platform_domain()
    {
        config(['app.env' => 'production']);

        $this->assertEquals('https://clubagility.com', FrontendUrl::returnHost(null));
    }

    public function test_without_origin_in_local_uses_frontend_url_config()
    {
        config([
            'app.env' => 'local',
            'services.frontend_url' => 'http://localhost:4200',
        ]);

        $this->assertEquals('http://localhost:4200', FrontendUrl::returnHost(null));
    }

    public function test_never_returns_the_backend_host()
    {
        // El caso del bug: la petición llega a agility_back.test pero el
        // redirect de Stripe debe ir al frontend configurado.
        config([
            'app.env' => 'local',
            'services.frontend_url' => 'http://localhost:4200',
        ]);

        $host = FrontendUrl::returnHost(null);

        $this->assertStringNotContainsString('agility_back.test', $host);
    }
}
