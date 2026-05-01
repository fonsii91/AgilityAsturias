<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Resource;
use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResourceControllerTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $admin;
    protected $member;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);
        
        $this->admin = User::factory()->create([
            'role' => 'admin',
            'club_id' => $this->club->id,
        ]);
        
        $this->member = User::factory()->create([
            'role' => 'member',
            'club_id' => $this->club->id,
        ]);
    }

    public function test_allows_members_to_list_resources_with_filters()
    {
        Resource::create([
            'title' => 'Agility Rules',
            'type' => 'link',
            'category' => 'Reglamentos',
            'level' => 'all',
            'url' => 'https://example.com',
            'uploaded_by' => $this->admin->id,
            'club_id' => $this->club->id,
        ]);

        $response = $this->actingAs($this->member)
                         ->withHeader('X-Tenant-Club', 'test-club')
                         ->getJson('/api/resources?category=Reglamentos');

        $response->assertStatus(200)
                 ->assertJsonCount(1)
                 ->assertJsonPath('0.title', 'Agility Rules');
    }

    public function test_prevents_members_from_creating_resources()
    {
        $response = $this->actingAs($this->member)
                         ->withHeader('X-Tenant-Club', 'test-club')
                         ->postJson('/api/resources', [
                             'title' => 'Hacked Document',
                             'type' => 'link',
                             'category' => 'General',
                             'level' => 'all',
                             'url' => 'https://hack.com',
                         ]);

        $response->assertStatus(403);
    }

    public function test_allows_admin_to_create_a_resource_document_with_file_upload()
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->create('document.pdf', 100);

        $response = $this->actingAs($this->admin)
                         ->withHeader('X-Tenant-Club', 'test-club')
                         ->postJson('/api/resources', [
                             'title' => 'Training Guide',
                             'type' => 'document',
                             'category' => 'Guías',
                             'level' => 'all',
                             'file' => $file,
                         ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('resources', [
            'title' => 'Training Guide',
            'type' => 'document',
        ]);

        $resource = Resource::first();
        Storage::disk('public')->assertExists($resource->file_path);
    }

    public function test_allows_admin_to_delete_a_resource_and_removes_file()
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->create('test.pdf', 100);
        $path = $file->store('clubs/test-club/resources', 'public');

        $resource = Resource::create([
            'title' => 'To Delete',
            'type' => 'document',
            'category' => 'General',
            'level' => 'all',
            'file_path' => $path,
            'uploaded_by' => $this->admin->id,
            'club_id' => $this->club->id,
        ]);

        $response = $this->actingAs($this->admin)
                         ->withHeader('X-Tenant-Club', 'test-club')
                         ->postJson("/api/resources/{$resource->id}/delete");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('resources', ['id' => $resource->id]);
        Storage::disk('public')->assertMissing($path);
    }
}
