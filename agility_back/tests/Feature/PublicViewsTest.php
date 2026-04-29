<?php

namespace Tests\Feature;

use App\Models\GalleryImage;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicViewsTest extends TestCase
{
    use RefreshDatabase;

    protected $club;

    protected function setUp(): void
    {
        parent::setUp();
        $this->club = \App\Models\Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);
    }

    public function test_permite_a_cualquier_usuario_obtener_las_imagenes_de_la_galeria_publica()
    {
        // Arrange
        GalleryImage::factory()->create([
            'club_id' => $this->club->id,
            'created_at' => now()->subDays(2),
        ]);
        GalleryImage::factory()->create([
            'club_id' => $this->club->id,
            'created_at' => now(),
        ]);

        // Act
        $response = $this->getJson('/api/gallery');

        // Assert
        $response->assertStatus(200)
                 ->assertJsonCount(2);

        // Verify ordering by descending created_at
        $data = $response->json();
        $this->assertGreaterThan(strtotime($data[1]['created_at']), strtotime($data[0]['created_at']));
    }

    public function test_permite_a_cualquier_usuario_obtener_los_videos_de_la_galeria_publica()
    {
        // Arrange
        $user = \App\Models\User::factory()->create(['club_id' => $this->club->id]);
        $dog = \App\Models\Dog::factory()->create(['user_id' => $user->id, 'club_id' => $this->club->id]);

        // Public video for gallery
        Video::factory()->create([
            'club_id' => $this->club->id,
            'user_id' => $user->id,
            'dog_id' => $dog->id,
            'is_public' => true,
            'in_public_gallery' => true,
        ]);

        // Public video NOT for gallery
        Video::factory()->create([
            'club_id' => $this->club->id,
            'user_id' => $user->id,
            'dog_id' => $dog->id,
            'is_public' => true,
            'in_public_gallery' => false,
        ]);

        // Private video (just in case)
        Video::factory()->create([
            'club_id' => $this->club->id,
            'user_id' => $user->id,
            'dog_id' => $dog->id,
            'is_public' => false,
            'in_public_gallery' => true,
        ]);

        // Act
        $response = $this->getJson('/api/public-videos');

        // Assert
        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'data' => [
                         '*' => ['id', 'title', 'is_public', 'in_public_gallery']
                     ],
                     'current_page',
                     'last_page',
                 ]);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertTrue($data[0]['is_public']);
        $this->assertTrue($data[0]['in_public_gallery']);
    }
}
