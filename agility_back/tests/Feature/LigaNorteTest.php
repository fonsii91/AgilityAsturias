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
            'status' => 'pending',
            'club_id' => $this->club->id
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
            'status' => 'pending',
            'club_id' => $this->club->id
        ]);

        // Create a local dog to test fuzzy-matching mapping
        $dog = Dog::create([
            'name' => 'Toby',
            'user_id' => $this->admin->id,
            'club_id' => $this->club->id
        ]);

        // Mock Gemini service
        $mockGemini = $this->createMock(GeminiVisionService::class);
        $mockGemini->expects($this->once())
            ->method('extractTableFromImage')
            ->willReturn([
                [
                    'clase' => 60,
                    'posicion' => 1,
                    'club_nombre' => 'ASTURIAS',
                    'guia_nombre' => 'Juan Garcia',
                    'perro_nombre' => 'Toby',
                    'puntos_total' => 100,
                    'excelentes_totales' => 3
                ]
            ]);
        
        $this->app->instance(GeminiVisionService::class, $mockGemini);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson("/api/admin/liga-norte/imports/{$import->id}/process");

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        
        // Assert import was updated to processed with enriched suggestions
        $this->assertDatabaseHas('liga_norte_imports', [
            'id' => $import->id,
            'status' => 'processed'
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
            'club_id' => $this->club->id,
            'extracted_data' => []
        ]);

        // Create some existing standings in Clase 60
        LigaNorteStanding::create([
            'clase' => 60,
            'posicion' => 1,
            'club_nombre' => 'OTHER',
            'guia_nombre' => 'Someone',
            'perro_nombre' => 'Fido',
            'puntos_total' => 50,
            'club_id' => $this->club->id
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
            'puntos_total' => 100,
            'club_id' => $this->club->id
        ]);
    }

    public function test_admin_can_delete_import()
    {
        Storage::disk('public')->put('imports/test1.jpg', 'fake image content');

        $import = LigaNorteImport::create([
            'telegram_message_id' => 123,
            'image_path' => 'imports/test1.jpg',
            'status' => 'pending',
            'club_id' => $this->club->id
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
            'clase' => 60,
            'posicion' => 1,
            'club_nombre' => 'ASTURIAS',
            'guia_nombre' => 'Juan Garcia',
            'perro_nombre' => 'Toby',
            'puntos_total' => 100,
            'club_id' => $this->club->id
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
}
