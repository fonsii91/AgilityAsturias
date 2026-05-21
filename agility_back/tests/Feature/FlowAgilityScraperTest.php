<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\Dog;
use App\Models\User;
use App\Models\Competition;
use App\Models\DogWorkload;
use App\Models\RsceTrack;
use App\Models\RfecTrack;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FlowAgilityScraperTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $admin;
    protected $member;

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

        $this->member = User::factory()->create([
            'club_id' => $this->club->id,
            'role' => 'member'
        ]);
    }

    public function test_admin_can_view_scraper_status()
    {
        // Past competition
        $pastComp = Competition::forceCreate([
            'club_id' => $this->club->id,
            'nombre' => 'Past Event',
            'fecha_evento' => Carbon::now()->subDays(5)->toDateString(),
            'fecha_fin_evento' => Carbon::now()->subDays(4)->toDateString(),
            'tipo' => 'competicion',
            'federacion' => 'RSCE',
            'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-past'
        ]);

        // Future competition
        $futureComp = Competition::forceCreate([
            'club_id' => $this->club->id,
            'nombre' => 'Future Event',
            'fecha_evento' => Carbon::now()->addDays(5)->toDateString(),
            'tipo' => 'competicion',
            'federacion' => 'RSCE',
            'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-future'
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/scraper/status');

        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonFragment(['nombre' => 'Past Event']);
        $response->assertJsonMissing(['nombre' => 'Future Event']);
    }

    public function test_non_admin_cannot_view_scraper_status()
    {
        $response = $this->actingAs($this->member)->getJson('/api/admin/scraper/status');
        $response->assertStatus(403);
    }

    public function test_admin_run_scraper_validations()
    {
        // Future/ongoing event (invalid)
        $futureComp = Competition::forceCreate([
            'club_id' => $this->club->id,
            'nombre' => 'Future Event',
            'fecha_evento' => Carbon::now()->addDays(5)->toDateString(),
            'tipo' => 'competicion',
            'federacion' => 'RSCE',
            'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-future'
        ]);

        // Past event but invalid link (invalid)
        $invalidLinkComp = Competition::forceCreate([
            'club_id' => $this->club->id,
            'nombre' => 'Invalid Link Event',
            'fecha_evento' => Carbon::now()->subDays(5)->toDateString(),
            'tipo' => 'competicion',
            'federacion' => 'RSCE',
            'enlace' => 'https://www.otherlink.com/event'
        ]);

        // Future event request
        $response = $this->actingAs($this->admin)->postJson('/api/admin/scraper/run', [
            'competition_id' => $futureComp->id
        ]);
        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'No se puede realizar el scraping de una competición que aún no ha finalizado.'
        ]);

        // Invalid link request
        $response = $this->actingAs($this->admin)->postJson('/api/admin/scraper/run', [
            'competition_id' => $invalidLinkComp->id
        ]);
        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'Esta competición no tiene un enlace válido de FlowAgility.'
        ]);
    }

    public function test_admin_can_run_scraper_successfully()
    {
        // Past competition
        $comp = Competition::forceCreate([
            'club_id' => $this->club->id,
            'nombre' => 'Past Event',
            'fecha_evento' => Carbon::now()->subDays(5)->toDateString(),
            'tipo' => 'competicion',
            'federacion' => 'RSCE',
            'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-past'
        ]);

        $user = User::factory()->create(['name' => 'John Doe', 'club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['name' => 'Luna', 'club_id' => $this->club->id, 'user_id' => $user->id]);
        $dog->users()->attach($user->id, ['is_primary_owner' => true]);

        $fakeScraperOutput = "RESULT_JSON:" . json_encode([
            [
                'eventId' => $comp->id,
                'dogName' => 'Luna',
                'handlerName' => 'John Doe',
                'license' => 'RSCE123',
                'clubName' => 'Agility Asturias',
                'position' => '1',
                'runs' => [
                    [
                        'mangaType' => 'Agility',
                        'time' => '30.22',
                        'speed' => '5.10',
                        'faults' => '0',
                        'refusals' => '0',
                        'timePenalty' => '0.00',
                        'totalPenalty' => '0.00',
                        'qualification' => 'EXC_0',
                        'judge' => 'Mr. Judge',
                        'courseLength' => '150',
                        'standardTime' => '40.00'
                    ]
                ]
            ]
        ]);

        config(['app.fake_scraper_output' => $fakeScraperOutput]);

        $response = $this->actingAs($this->admin)->postJson('/api/admin/scraper/run', [
            'competition_id' => $comp->id
        ]);

        $response->assertStatus(200);
        $response->assertJsonFragment(['message' => 'Scraping iniciado en segundo plano.']);

        $comp->refresh();
        $this->assertEquals('success', $comp->scrape_status);

        $this->assertDatabaseHas('rsce_tracks', [
            'dog_id' => $dog->id,
            'manga_type' => 'Agility',
            'qualification' => 'EXC_0'
        ]);
    }

    public function test_artisan_command_syncs_and_enriches_data()
    {
        // 1. Create a past competition
        $comp = Competition::forceCreate([
            'club_id' => $this->club->id,
            'nombre' => 'Valladolid Agility Trial',
            'lugar' => 'Valladolid',
            'fecha_evento' => '2026-05-09',
            'fecha_fin_evento' => '2026-05-10',
            'tipo' => 'competicion',
            'federacion' => 'RSCE',
            'enlace' => 'https://www.flowagility.com/zone/events/info/b6a5b896-93bb-4b12-9344-cfb41c52fe65',
            'results_scraped' => false,
            'scrape_status' => 'pending'
        ]);

        // 2. Create dog and attach to owner
        $user = User::factory()->create([
            'name' => 'John Doe',
            'club_id' => $this->club->id,
        ]);
        $dog = Dog::factory()->create([
            'name' => 'Luna',
            'club_id' => $this->club->id,
            'user_id' => $user->id
        ]);
        $dog->users()->attach($user->id, ['is_primary_owner' => true]);

        // 3. Create pre-existing workload
        $workload = DogWorkload::create([
            'dog_id' => $dog->id,
            'club_id' => $this->club->id,
            'date' => '2026-05-09',
            'source_type' => 'auto_competition',
            'source_id' => $comp->id,
            'duration_min' => 0,
            'number_of_runs' => 0,
            'intensity_rpe' => 5,
            'status' => 'pending_review',
            'is_staff_verified' => false
        ]);

        // 4. Prepare Mock Scraper JSON output
        $fakeScraperOutput = "RESULT_JSON:" . json_encode([
            [
                'eventId' => $comp->id,
                'dogName' => 'Luna',
                'handlerName' => 'John Doe',
                'license' => 'RSCE123',
                'clubName' => 'Agility Asturias',
                'position' => '3',
                'dorsal' => 'D20',
                'runDate' => '2026-05-09',
                'runs' => [
                    [
                        'mangaType' => 'Jumping 1',
                        'time' => '35.50',
                        'speed' => '4.50 m/s',
                        'faults' => '0',
                        'refusals' => '1',
                        'timePenalty' => '0.00',
                        'totalPenalty' => '5.00',
                        'qualification' => 'EXC',
                        'judge' => 'Mr. Judge',
                        'courseLength' => '160',
                        'standardTime' => '45.00'
                    ]
                ]
            ]
        ]);

        // 5. Config fake scraper output
        config(['app.fake_scraper_output' => $fakeScraperOutput]);

        // 6. Run the Artisan command
        $this->artisan('flowagility:scrape', ['--force' => true]);

        // 7. Assertions
        $comp->refresh();
        $this->assertEquals('success', $comp->scrape_status);
        $this->assertEquals(1, $comp->results_scraped);

        // Check RsceTrack creation
        $this->assertDatabaseHas('rsce_tracks', [
            'dog_id' => $dog->id,
            'date' => '2026-05-09',
            'manga_type' => 'Jumping 1',
            'qualification' => 'EXC',
            'speed' => 4.50,
            'time' => 35.50,
            'faults' => 0,
            'refusals' => 1,
            'time_penalty' => 0.00,
            'total_penalty' => 5.00,
            'is_clean' => 0, // False due to refusal
            'club_id' => $this->club->id,
            'location' => 'Valladolid Agility Trial - Valladolid'
        ]);

        // Check license updated in dog_user pivot table
        $dog->refresh();
        $pivotUser = $dog->users()->find($user->id);
        $this->assertEquals('RSCE123', $pivotUser->pivot->rsce_license);

        // Check workload enrichment (it should reuse the pre-existing workload and update counts)
        $workload->refresh();
        $this->assertEquals(1, $workload->duration_min);
        $this->assertEquals(1, $workload->number_of_runs);
        $this->assertTrue((bool)$workload->is_staff_verified);
    }

    public function test_scraper_does_not_set_results_scraped_for_ongoing_events()
    {
        // 1. Ongoing competition (starts today, ends in 2 days)
        $comp = Competition::forceCreate([
            'club_id' => $this->club->id,
            'nombre' => 'Ongoing Event',
            'fecha_evento' => Carbon::now()->toDateString(),
            'fecha_fin_evento' => Carbon::now()->addDays(2)->toDateString(),
            'tipo' => 'competicion',
            'federacion' => 'RSCE',
            'enlace' => 'https://www.flowagility.com/zone/events/info/uuid-ongoing',
            'results_scraped' => false,
            'scrape_status' => 'pending'
        ]);

        $user = User::factory()->create(['name' => 'John Doe', 'club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['name' => 'Luna', 'club_id' => $this->club->id, 'user_id' => $user->id]);
        $dog->users()->attach($user->id, ['is_primary_owner' => true]);

        // Fake output with runDate of today (which is not the last day of ongoing event)
        $fakeScraperOutput = "RESULT_JSON:" . json_encode([
            [
                'eventId' => $comp->id,
                'dogName' => 'Luna',
                'handlerName' => 'John Doe',
                'license' => 'RSCE123',
                'clubName' => 'Agility Asturias',
                'position' => '1',
                'runs' => [
                    [
                        'mangaType' => 'Agility',
                        'time' => '30.22',
                        'speed' => '5.10',
                        'qualification' => 'EXC_0'
                    ]
                ]
            ]
        ]);

        config(['app.fake_scraper_output' => $fakeScraperOutput]);

        // Run with --force (since it's ongoing, normal query won't pick it up)
        $this->artisan('flowagility:scrape', ['--force' => true]);

        $comp->refresh();
        $this->assertFalse((bool)$comp->results_scraped);

        // 2. Past competition (ended yesterday) but fake results do NOT include the last day (yesterday)
        // Let's set the event to end yesterday
        $comp->fecha_evento = Carbon::now()->subDays(2)->toDateString();
        $comp->fecha_fin_evento = Carbon::now()->subDay()->toDateString();
        $comp->save();

        // The fake result runDate will fall back to fecha_evento (2 days ago), so it doesn't match the last day (yesterday).
        $this->artisan('flowagility:scrape', ['--force' => true]);

        $comp->refresh();
        $this->assertFalse((bool)$comp->results_scraped); // False because yesterday is not > 3 days ago, and last day results are missing.

        // 3. Past competition (ended yesterday) AND fake results include the last day (yesterday)
        // Let's make the fake output return runDate as yesterday
        $fakeScraperOutputWithLastDay = "RESULT_JSON:" . json_encode([
            [
                'eventId' => $comp->id,
                'runDate' => Carbon::now()->subDay()->toDateString(), // Matches endDate
                'dogName' => 'Luna',
                'handlerName' => 'John Doe',
                'license' => 'RSCE123',
                'clubName' => 'Agility Asturias',
                'position' => '1',
                'runs' => [
                    [
                        'mangaType' => 'Agility',
                        'time' => '30.22',
                        'speed' => '5.10',
                        'qualification' => 'EXC_0'
                    ]
                ]
            ]
        ]);
        config(['app.fake_scraper_output' => $fakeScraperOutputWithLastDay]);

        $this->artisan('flowagility:scrape', ['--force' => true]);

        $comp->refresh();
        $this->assertTrue((bool)$comp->results_scraped); // True because it has results for the last day

        // 4. Past competition (ended 4 days ago) but NO results for the last day.
        // It should be marked as true anyway because the 3 days grace period has passed.
        $comp->results_scraped = false;
        $comp->fecha_evento = Carbon::now()->subDays(5)->toDateString();
        $comp->fecha_fin_evento = Carbon::now()->subDays(4)->toDateString();
        $comp->save();

        config(['app.fake_scraper_output' => $fakeScraperOutput]); // No last day results (falls back to 5 days ago)

        $this->artisan('flowagility:scrape', ['--force' => true]);

        $comp->refresh();
        $this->assertTrue((bool)$comp->results_scraped); // True because 4 days ago > 3 days ago
    }
}
