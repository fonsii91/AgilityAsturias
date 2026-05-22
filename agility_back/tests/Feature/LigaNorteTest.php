<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\Dog;
use App\Models\LigaNorteImport;
use App\Models\LigaNorteStanding;
use App\Models\User;
use App\Services\GeminiVisionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LigaNorteTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $admin;
    protected $member;

    protected function setUp(): void
    {
        parent::setUp();

        // Create club
        $this->club = Club::create([
            'name' => 'Asturias Test',
            'subdomain' => 'asturias',
            'slug' => 'asturias',
            'db_connection' => 'sqlite'
        ]);

        // Create users
        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'club_id' => $this->club->id
        ]);

        $this->member = User::create([
            'name' => 'Member User',
            'email' => 'member@test.com',
            'password' => bcrypt('password'),
            'role' => 'member',
            'club_id' => $this->club->id
        ]);

        Storage::fake('public');
    }

    public function test_admin_can_list_imports()
    {
        LigaNorteImport::create([
            'telegram_message_id' => 123,
            'image_path' => 'imports/test1.jpg',
            'status' => 'pending'
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/admin/liga-norte/imports');

        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonFragment([
            'telegram_message_id' => '123',
            'status' => 'pending'
        ]);
    }

    public function test_admin_can_process_import()
    {
        // Place a fake image in storage
        Storage::disk('public')->put('imports/test1.jpg', 'fake image content');

        $import = LigaNorteImport::create([
            'telegram_message_id' => 123,
            'image_path' => 'imports/test1.jpg',
            'status' => 'pending'
        ]);

        // Create a local dog to test fuzzy-matching mapping
        $dog = new Dog([
            'name' => 'Toby',
            'club_id' => $this->club->id
        ]);
        if (\Illuminate\Support\Facades\Schema::hasColumn('dogs', 'user_id')) {
            $dog->user_id = $this->admin->id;
        }
        $dog->save();
        $dog->users()->attach($this->admin->id);

        // Mock Gemini service
        $mockGemini = $this->createMock(GeminiVisionService::class);
        $mockGemini->expects($this->once())
            ->method('extractTableFromImage')
            ->willReturn([
                'tipo' => 'excelentes',
                'clase' => 60,
                'rows' => [
                    [
                        'posicion' => 1,
                        'club_nombre' => 'ASTURIAS',
                        'guia_nombre' => 'Juan Garcia',
                        'perro_nombre' => 'Toby',
                        'puntos_total' => 100,
                        'excelentes_totales' => 3
                    ]
                ]
            ]);
        
        $this->app->instance(GeminiVisionService::class, $mockGemini);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson("/api/admin/liga-norte/imports/{$import->id}/process");

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        
        // Assert import was updated to approved with enriched suggestions
        $this->assertDatabaseHas('liga_norte_imports', [
            'id' => $import->id,
            'status' => 'approved'
        ]);

        $updatedImport = LigaNorteImport::find($import->id);
        $this->assertNotNull($updatedImport->extracted_data);
        $this->assertEquals($dog->id, $updatedImport->extracted_data[0]['dog_id']);
        $this->assertEquals('Toby', $updatedImport->extracted_data[0]['suggested_dog_name']);
    }

    public function test_admin_can_approve_import()
    {
        $import = LigaNorteImport::create([
            'telegram_message_id' => 123,
            'image_path' => 'imports/test1.jpg',
            'status' => 'processed',
            'extracted_data' => []
        ]);

        // Create some existing standings in Clase 60
        LigaNorteStanding::create([
            'clase' => 60,
            'posicion' => 1,
            'club_nombre' => 'OTHER',
            'guia_nombre' => 'Someone',
            'perro_nombre' => 'Fido',
            'puntos_total' => 50
        ]);

        Sanctum::actingAs($this->admin);

        $rowsToApprove = [
            [
                'clase' => 60,
                'posicion' => 1,
                'club_nombre' => 'ASTURIAS',
                'guia_nombre' => 'Juan Garcia',
                'perro_nombre' => 'Toby',
                'puntos_total' => 100,
                'excelentes_totales' => 3,
                'dog_id' => null
            ]
        ];

        $response = $this->postJson("/api/admin/liga-norte/imports/{$import->id}/approve", [
            'rows' => $rowsToApprove
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);

        // Check if import is marked as approved
        $this->assertDatabaseHas('liga_norte_imports', [
            'id' => $import->id,
            'status' => 'approved'
        ]);

        // Check if old standings of Clase 60 were deleted and replaced
        $this->assertDatabaseMissing('liga_norte_standings', [
            'perro_nombre' => 'Fido'
        ]);

        $this->assertDatabaseHas('liga_norte_standings', [
            'clase' => 60,
            'perro_nombre' => 'Toby',
            'club_nombre' => 'ASTURIAS',
            'puntos_total' => 100
        ]);
    }

    public function test_admin_can_delete_import()
    {
        Storage::disk('public')->put('imports/test1.jpg', 'fake image content');

        $import = LigaNorteImport::create([
            'telegram_message_id' => 123,
            'image_path' => 'imports/test1.jpg',
            'status' => 'pending'
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson("/api/admin/liga-norte/imports/{$import->id}/delete");

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);

        $this->assertDatabaseMissing('liga_norte_imports', [
            'id' => $import->id
        ]);

        // Assert file was deleted
        Storage::disk('public')->assertMissing('imports/test1.jpg');
    }

    public function test_member_can_get_standings()
    {
        LigaNorteStanding::create([
            'tipo' => 'liga',
            'clase' => 60,
            'posicion' => 1,
            'club_nombre' => 'ASTURIAS',
            'guia_nombre' => 'Juan Garcia',
            'perro_nombre' => 'Toby',
            'puntos_total' => 100
        ]);

        Sanctum::actingAs($this->member);

        $response = $this->getJson('/api/liga-norte/standings');

        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonFragment([
            'perro_nombre' => 'Toby',
            'puntos_total' => 100
        ]);
    }

    public function test_guest_cannot_get_standings()
    {
        $response = $this->getJson('/api/liga-norte/standings');
        $response->assertStatus(401);
    }

    public function test_fuzzy_matching_and_name_correction_during_enrichment()
    {
        // 1. Create a user
        $user = User::create([
            'name' => 'IVAN PEREZ',
            'email' => 'ivan@test.com',
            'password' => bcrypt('password'),
            'role' => 'member',
            'club_id' => $this->club->id
        ]);

        // 2. Create the dog "NARCEA" associated to the user and club
        $dog = new Dog([
            'name' => 'NARCEA',
            'club_id' => $this->club->id
        ]);
        if (\Illuminate\Support\Facades\Schema::hasColumn('dogs', 'user_id')) {
            $dog->user_id = $user->id;
        }
        $dog->save();
        $dog->users()->attach($user->id);

        // Setup the LigaNorteService
        /** @var \App\Services\LigaNorteService $service */
        $service = $this->app->make(\App\Services\LigaNorteService::class);

        // Input row with typo "NARCIA", correct guide "IVAN PEREZ", club "ASTURIAS TEST"
        $rows = [
            [
                'clase' => 60,
                'posicion' => 9,
                'club_nombre' => 'ASTURIAS TEST',
                'guia_nombre' => 'IVAN PEREZ',
                'perro_nombre' => 'NARCIA',
                'puntos_total' => 69
            ]
        ];

        $enriched = $service->enrichWithDogSuggestions($rows);

        $this->assertEquals($dog->id, $enriched[0]['dog_id']);
        $this->assertEquals('NARCEA', $enriched[0]['suggested_dog_name']);
        $this->assertEquals('NARCEA', $enriched[0]['perro_nombre']); // Name should be corrected!
    }

    public function test_cross_club_owner_name_visible_and_email_hidden()
    {
        // 1. Create another club
        $otherClub = Club::create([
            'name' => 'Other Club',
            'subdomain' => 'other',
            'slug' => 'other',
            'db_connection' => 'sqlite'
        ]);

        // 2. Create owner and dog in that other club
        $otherUser = User::create([
            'name' => 'John Doe',
            'email' => 'john@other.com',
            'password' => bcrypt('password'),
            'role' => 'member',
            'club_id' => $otherClub->id
        ]);

        $otherDog = new Dog([
            'name' => 'Fido',
            'club_id' => $otherClub->id
        ]);
        if (\Illuminate\Support\Facades\Schema::hasColumn('dogs', 'user_id')) {
            $otherDog->user_id = $otherUser->id;
        }
        $otherDog->save();
        $otherDog->users()->attach($otherUser->id);

        // 3. Create standing linked to this other club's dog
        LigaNorteStanding::create([
            'tipo' => 'liga',
            'clase' => 60,
            'posicion' => 1,
            'club_nombre' => 'Other Club',
            'guia_nombre' => 'John Doe',
            'perro_nombre' => 'Fido',
            'dog_id' => $otherDog->id,
            'puntos_total' => 100
        ]);

        // 4. Bind active club context to ASTURIAS (current club under test)
        app()->instance('active_club_id', $this->club->id);

        // 5. Query standings as member of Asturias club
        Sanctum::actingAs($this->member);

        $response = $this->getJson('/api/liga-norte/standings');

        $response->assertStatus(200);
        $response->assertJsonCount(1);

        // Assert dog users are loaded (not filtered out by TenantScope)
        $data = $response->json();
        $this->assertNotEmpty($data[0]['dog']['users']);
        $this->assertEquals('John Doe', $data[0]['dog']['users'][0]['name']);
        
        // Assert email is hidden/null because user belongs to another club
        $this->assertArrayNotHasKey('email', $data[0]['dog']['users'][0]);
    }
}
