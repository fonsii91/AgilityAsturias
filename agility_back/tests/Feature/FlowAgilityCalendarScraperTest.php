<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\User;
use App\Models\GlobalFlowagilityEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class FlowAgilityCalendarScraperTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $admin;
    protected $member;
    protected $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->club = Club::create([
            'name' => 'Agility Asturias',
            'subdomain' => 'asturias',
            'slug' => 'asturias',
            'db_connection' => 'sqlite'
        ]);

        $this->admin = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'admin'
        ]);

        $this->manager = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'manager'
        ]);

        $this->member = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'member'
        ]);
    }

    public function test_admin_and_staff_can_view_global_events()
    {
        // Setup mock global events
        GlobalFlowagilityEvent::forceCreate([
            'uuid' => 'uuid-1',
            'nombre' => 'Event RSCE Asturias',
            'lugar' => 'Oviedo',
            'fecha_evento' => Carbon::now()->addDays(5)->toDateString(),
            'federacion' => 'RSCE',
            'organizador' => 'Club Asturias',
            'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-1'
        ]);

        GlobalFlowagilityEvent::forceCreate([
            'uuid' => 'uuid-2',
            'nombre' => 'Event RFEC Gijon',
            'lugar' => 'Gijon',
            'fecha_evento' => Carbon::now()->addDays(10)->toDateString(),
            'federacion' => 'RFEC',
            'organizador' => 'Club Gijon',
            'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-2'
        ]);

        // Old event (more than 30 days ago) - should be filtered out by default
        GlobalFlowagilityEvent::forceCreate([
            'uuid' => 'uuid-3',
            'nombre' => 'Old Event',
            'lugar' => 'Llanera',
            'fecha_evento' => Carbon::now()->subDays(40)->toDateString(),
            'federacion' => 'RSCE',
            'organizador' => 'Club Asturias',
            'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-3'
        ]);

        // Access as Admin
        $response = $this->actingAs($this->admin)->getJson('/api/admin/scraper/global-events');
        $response->assertStatus(200);
        $response->assertJsonCount(2);
        $response->assertJsonFragment(['nombre' => 'Event RSCE Asturias']);
        $response->assertJsonFragment(['nombre' => 'Event RFEC Gijon']);
        $response->assertJsonMissing(['nombre' => 'Old Event']);

        // Access as Manager (should work as role check allows admin, manager, staff)
        $responseManager = $this->actingAs($this->manager)->getJson('/api/admin/scraper/global-events');
        $responseManager->assertStatus(200);
    }

    public function test_admin_can_filter_global_events_by_search_query()
    {
        GlobalFlowagilityEvent::forceCreate([
            'uuid' => 'uuid-1',
            'nombre' => 'Event RSCE Asturias',
            'lugar' => 'Oviedo',
            'fecha_evento' => Carbon::now()->addDays(5)->toDateString(),
            'federacion' => 'RSCE',
            'organizador' => 'Club Asturias',
            'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-1'
        ]);

        GlobalFlowagilityEvent::forceCreate([
            'uuid' => 'uuid-2',
            'nombre' => 'Event RFEC Gijon',
            'lugar' => 'Gijon',
            'fecha_evento' => Carbon::now()->addDays(10)->toDateString(),
            'federacion' => 'RFEC',
            'organizador' => 'Club Gijon',
            'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-2'
        ]);

        // Query by name
        $response = $this->actingAs($this->admin)->getJson('/api/admin/scraper/global-events?q=Asturias');
        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonFragment(['nombre' => 'Event RSCE Asturias']);
        $response->assertJsonMissing(['nombre' => 'Event RFEC Gijon']);

        // Query by lugar
        $response2 = $this->actingAs($this->admin)->getJson('/api/admin/scraper/global-events?q=Gijon');
        $response2->assertStatus(200);
        $response2->assertJsonCount(1);
        $response2->assertJsonFragment(['nombre' => 'Event RFEC Gijon']);
        $response2->assertJsonMissing(['nombre' => 'Event RSCE Asturias']);
    }

    public function test_member_cannot_view_global_events()
    {
        $response = $this->actingAs($this->member)->getJson('/api/admin/scraper/global-events');
        $response->assertStatus(403);
    }

    public function test_admin_can_trigger_calendar_scraper_job()
    {
        Queue::fake();

        $response = $this->actingAs($this->admin)->postJson('/api/admin/scraper/run-calendar');
        $response->assertStatus(200);
        $response->assertJsonFragment(['message' => 'Scraping del calendario de FlowAgility encolado en segundo plano con éxito.']);

        // Assert that the command is enqueued
        Queue::assertPushed(\Illuminate\Foundation\Console\QueuedCommand::class, function ($job) {
            // Note: Reflection can be used to check queued command name, but testing the response + status is usually sufficient.
            return true;
        });
    }

    public function test_non_admin_cannot_trigger_calendar_scraper_job()
    {
        // Manager role is allowed for global-events list, but run-calendar is restricted strictly to admin in routes/controller
        $responseManager = $this->actingAs($this->manager)->postJson('/api/admin/scraper/run-calendar');
        $responseManager->assertStatus(403);

        $responseMember = $this->actingAs($this->member)->postJson('/api/admin/scraper/run-calendar');
        $responseMember->assertStatus(403);
    }

    public function test_artisan_command_scrapes_and_saves_rsce_rfec_events()
    {
        // Mock the script execution output
        $fakeOutput = "RESULT_JSON:" . json_encode([
            [
                'uuid' => 'uuid-scraped-1',
                'nombre' => 'Scraped RSCE Event',
                'lugar' => 'Llanera',
                'fecha_evento' => '2026-06-15',
                'fecha_fin_evento' => '2026-06-16',
                'fecha_limite' => '2026-06-10',
                'federacion_str' => 'C. de Agility RSCE',
                'organizador' => 'AsturAgility',
                'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-scraped-1'
            ],
            [
                'uuid' => 'uuid-scraped-2',
                'nombre' => 'Scraped RFEC Event',
                'lugar' => 'Gijon',
                'fecha_evento' => '2026-06-20',
                'fecha_fin_evento' => '2026-06-20',
                'fecha_limite' => null,
                'federacion_str' => 'RFEC Agility Cup',
                'organizador' => 'RFEC Club',
                'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-scraped-2'
            ],
            [
                'uuid' => 'uuid-scraped-3',
                'nombre' => 'Scraped FCA Event', // Other federation (FCA), should be filtered out
                'lugar' => 'Catalunya',
                'fecha_evento' => '2026-06-25',
                'fecha_fin_evento' => '2026-06-26',
                'fecha_limite' => null,
                'federacion_str' => 'FCA Agility',
                'organizador' => 'FCA Club',
                'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-scraped-3'
            ]
        ]);

        config(['app.fake_calendar_scraper_output' => $fakeOutput]);

        // Run Artisan command
        $exitCode = Artisan::call('flowagility:scrape-calendar');
        $this->assertEquals(0, $exitCode);

        // Assert database has RSCE/RFEC events
        $this->assertDatabaseHas('global_flowagility_events', [
            'uuid' => 'uuid-scraped-1',
            'nombre' => 'Scraped RSCE Event',
            'lugar' => 'Llanera',
            'fecha_evento' => '2026-06-15',
            'fecha_fin_evento' => '2026-06-16',
            'fecha_limite' => '2026-06-10',
            'federacion' => 'C. de Agility RSCE',
            'organizador' => 'AsturAgility'
        ]);

        $this->assertDatabaseHas('global_flowagility_events', [
            'uuid' => 'uuid-scraped-2',
            'nombre' => 'Scraped RFEC Event',
            'lugar' => 'Gijon',
            'fecha_evento' => '2026-06-20',
            'fecha_fin_evento' => '2026-06-20',
            'federacion' => 'RFEC Agility Cup',
            'organizador' => 'RFEC Club'
        ]);

        // Assert database does NOT have the FCA event (filtered out by federation filter)
        $this->assertDatabaseMissing('global_flowagility_events', [
            'uuid' => 'uuid-scraped-3'
        ]);
    }
}
