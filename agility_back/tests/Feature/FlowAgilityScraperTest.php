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
        // Future event (invalid)
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
            'message' => 'No se puede realizar el scraping de una competición que aún no ha comenzado.'
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

        $this->assertDatabaseHas('tracks', [
            'dog_id' => $dog->id,
            'manga_type' => 'Agility',
            'qualification' => 'EXC_0',
            'federation' => 'RSCE'
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
        $comp->attendingDogs()->attach($dog->id, ['user_id' => $user->id]);

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
        $this->assertTrue((bool)$comp->attendance_verified);

        // Check RsceTrack creation
        $this->assertDatabaseHas('tracks', [
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
            'location' => 'Valladolid Agility Trial - Valladolid',
            'federation' => 'RSCE'
        ]);

        // Check license updated in dog_user pivot table
        $dog->refresh();
        $pivotUser = $dog->users()->find($user->id);
        $this->assertEquals('RSCE123', $pivotUser->pivot->rsce_license);
        $this->assertEquals(2, $dog->points); // 2 points for 3rd place!

        // Check Point History creation
        $this->assertDatabaseHas('point_histories', [
            'dog_id' => $dog->id,
            'points' => 2,
            'category' => 'Tercero en ' . $comp->nombre
        ]);

        // Check workload enrichment (it should reuse the pre-existing workload and update counts)
        $workload->refresh();
        $this->assertEquals(2, $workload->duration_min); // 2 min por manga scrapeada
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

        // 2. Past competition (ended yesterday) but fake results do NOT include all days (missing yesterday)
        // Let's set the event to end yesterday
        $comp->fecha_evento = Carbon::now()->subDays(2)->toDateString();
        $comp->fecha_fin_evento = Carbon::now()->subDay()->toDateString();
        $comp->save();

        // The fake result runDate will fall back to fecha_evento (2 days ago), so it is missing yesterday's results.
        $this->artisan('flowagility:scrape', ['--force' => true]);

        $comp->refresh();
        $this->assertFalse((bool)$comp->results_scraped); // False because yesterday is not > 5 days ago, and yesterday's results are missing.

        // 3. Past competition (ended yesterday) AND fake results include all days (2 days ago AND yesterday)
        $fakeScraperOutputWithAllDays = "RESULT_JSON:" . json_encode([
            [
                'eventId' => $comp->id,
                'runDate' => Carbon::now()->subDays(2)->toDateString(), // Day 1
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
            ],
            [
                'eventId' => $comp->id,
                'runDate' => Carbon::now()->subDay()->toDateString(), // Day 2 (last day)
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
        config(['app.fake_scraper_output' => $fakeScraperOutputWithAllDays]);

        $this->artisan('flowagility:scrape', ['--force' => true]);

        $comp->refresh();
        $this->assertTrue((bool)$comp->results_scraped); // True because it has results for all days

        // 4. Past competition (ended 6 days ago) but NO results for all days.
        // It should be marked as true anyway because the 5 days grace period has passed.
        $comp->results_scraped = false;
        $comp->fecha_evento = Carbon::now()->subDays(7)->toDateString();
        $comp->fecha_fin_evento = Carbon::now()->subDays(6)->toDateString();
        $comp->save();

        config(['app.fake_scraper_output' => $fakeScraperOutput]); // No results for all days (only 7 days ago, missing 6 days ago)

        $this->artisan('flowagility:scrape', ['--force' => true]);

        $comp->refresh();
        $this->assertTrue((bool)$comp->results_scraped); // True because 6 days ago + 5 days grace < today
    }

    public function test_scraper_does_not_auto_register_or_award_points_to_non_registered_dogs()
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
            'scrape_status' => 'pending',
            'attendance_verified' => false
        ]);

        // 2. Create the registered dog
        $userReg = User::factory()->create(['name' => 'Registered Owner', 'club_id' => $this->club->id]);
        $dogReg = Dog::factory()->create(['name' => 'Reggie', 'club_id' => $this->club->id, 'user_id' => $userReg->id]);
        $dogReg->users()->attach($userReg->id, ['is_primary_owner' => true]);
        
        // Attach registered dog to the competition
        $comp->attendingDogs()->attach($dogReg->id, ['user_id' => $userReg->id]);

        // 3. Create the non-registered dog
        $userUnreg = User::factory()->create(['name' => 'Unregistered Owner', 'club_id' => $this->club->id]);
        $dogUnreg = Dog::factory()->create(['name' => 'UnregisteredDog', 'club_id' => $this->club->id, 'user_id' => $userUnreg->id]);
        $dogUnreg->users()->attach($userUnreg->id, ['is_primary_owner' => true]);

        // 4. Create a dog from another club (tenant isolation testing)
        $clubB = Club::create(['name' => 'Club B', 'slug' => 'club-b', 'subdomain' => 'clubb', 'db_connection' => 'sqlite']);
        $userB = User::factory()->create(['name' => 'Owner Club B', 'club_id' => $clubB->id]);
        $dogB = Dog::factory()->create(['name' => 'DogClubB', 'club_id' => $clubB->id, 'user_id' => $userB->id]);
        $dogB->users()->attach($userB->id, ['is_primary_owner' => true]);

        // Mock scraper output
        $fakeScraperOutput = "RESULT_JSON:" . json_encode([
            [
                'eventId' => $comp->id,
                'dogName' => 'Reggie',
                'handlerName' => 'Registered Owner',
                'license' => 'RSCE111',
                'clubName' => 'Agility Asturias',
                'position' => '1',
                'dorsal' => 'D01',
                'runDate' => '2026-05-09',
                'runs' => [
                    [
                        'mangaType' => 'Agility',
                        'time' => '30.00',
                        'speed' => '5.00',
                        'faults' => '0',
                        'refusals' => '0',
                        'timePenalty' => '0.00',
                        'totalPenalty' => '0.00',
                        'qualification' => 'EXC_0',
                    ]
                ]
            ],
            [
                'eventId' => $comp->id,
                'dogName' => 'UnregisteredDog',
                'handlerName' => 'Unregistered Owner',
                'license' => 'RSCE222',
                'clubName' => 'Agility Asturias',
                'position' => '2',
                'dorsal' => 'D02',
                'runDate' => '2026-05-09',
                'runs' => [
                    [
                        'mangaType' => 'Agility',
                        'time' => '31.00',
                        'speed' => '4.80',
                        'faults' => '0',
                        'refusals' => '0',
                        'timePenalty' => '0.00',
                        'totalPenalty' => '0.00',
                        'qualification' => 'EXC_0',
                    ]
                ]
            ],
            [
                'eventId' => $comp->id,
                'dogName' => 'DogClubB',
                'handlerName' => 'Owner Club B',
                'license' => 'RSCE333',
                'clubName' => 'Club B',
                'position' => '3',
                'dorsal' => 'D03',
                'runDate' => '2026-05-09',
                'runs' => [
                    [
                        'mangaType' => 'Agility',
                        'time' => '32.00',
                        'speed' => '4.60',
                        'faults' => '0',
                        'refusals' => '0',
                        'timePenalty' => '0.00',
                        'totalPenalty' => '0.00',
                        'qualification' => 'EXC_0',
                    ]
                ]
            ]
        ]);

        config(['app.fake_scraper_output' => $fakeScraperOutput]);

        // Run the Artisan command
        $this->artisan('flowagility:scrape', ['--force' => true]);

        $comp->refresh();
        $this->assertTrue((bool)$comp->attendance_verified);

        // Assert 1: Registered dog is updated, has position and points
        $this->assertDatabaseHas('competition_dog', [
            'competition_id' => $comp->id,
            'dog_id' => $dogReg->id,
            'position' => '1',
            'dorsal' => 'D01'
        ]);
        $dogReg->refresh();
        $this->assertEquals(4, $dogReg->points); // 4 points for 1st place!

        // Assert 2: Unregistered dog is NOT in competition_dog and has NO points in points field
        $this->assertDatabaseMissing('competition_dog', [
            'competition_id' => $comp->id,
            'dog_id' => $dogUnreg->id
        ]);
        $dogUnreg->refresh();
        $this->assertEquals(0, $dogUnreg->points);

        // Assert 3: Dog from Club B is NOT in competition_dog (since Club B has no competition for this event)
        $this->assertDatabaseMissing('competition_dog', [
            'competition_id' => $comp->id,
            'dog_id' => $dogB->id
        ]);
        $dogB->refresh();
        $this->assertEquals(0, $dogB->points);

        // Assert 4: But tracks are successfully imported for ALL dogs!
        $this->assertDatabaseHas('tracks', [
            'dog_id' => $dogReg->id,
            'manga_type' => 'Agility',
            'qualification' => 'EXC_0',
            'federation' => 'RSCE'
        ]);
        $this->assertDatabaseHas('tracks', [
            'dog_id' => $dogUnreg->id,
            'manga_type' => 'Agility',
            'qualification' => 'EXC_0',
            'federation' => 'RSCE'
        ]);
        $this->assertDatabaseHas('tracks', [
            'dog_id' => $dogB->id,
            'manga_type' => 'Agility',
            'qualification' => 'EXC_0',
            'club_id' => $clubB->id,
            'location' => 'Valladolid Agility Trial - Valladolid', // Verified fallback to scraped comp meta
            'federation' => 'RSCE'
        ]);
    }
}
