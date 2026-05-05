<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Dog;
use App\Models\Video;
use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VideoModerationTest extends TestCase
{
    use RefreshDatabase;

    protected $club;

    protected function setUp(): void
    {
        parent::setUp();
        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);
    }

    public function test_permite_a_un_administrador_anadir_o_quitar_un_video_de_la_galeria_publica()
    {
        $admin = User::factory()->create(['role' => 'admin', 'club_id' => $this->club->id]);
        $user = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['user_id' => $user->id, 'club_id' => $this->club->id]);
        
        $video = Video::factory()->create([
            'user_id' => $user->id,
            'dog_id' => $dog->id,
            'club_id' => $this->club->id,
            'in_public_gallery' => false,
            'is_public' => true,
            'status' => 'local'
        ]);

        $response = $this->actingAs($admin)->postJson("/api/videos/{$video->id}/toggle-public-gallery");

        $response->assertStatus(200)
                 ->assertJsonFragment([
                     'message' => 'Video gallery visibility updated',
                     'in_public_gallery' => true
                 ]);

        $this->assertDatabaseHas('videos', [
            'id' => $video->id,
            'in_public_gallery' => 1
        ]);

        // Volver a quitarlo
        $response2 = $this->actingAs($admin)->postJson("/api/videos/{$video->id}/toggle-public-gallery");
        
        $response2->assertStatus(200)
                  ->assertJsonFragment([
                      'in_public_gallery' => false
                  ]);

        $this->assertDatabaseHas('videos', [
            'id' => $video->id,
            'in_public_gallery' => 0
        ]);
    }

    public function test_permite_a_un_staff_anadir_o_quitar_un_video_de_la_galeria_publica()
    {
        $staff = User::factory()->create(['role' => 'staff', 'club_id' => $this->club->id]);
        $user = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['user_id' => $user->id, 'club_id' => $this->club->id]);
        
        $video = Video::factory()->create([
            'user_id' => $user->id,
            'dog_id' => $dog->id,
            'club_id' => $this->club->id,
            'in_public_gallery' => false,
            'is_public' => true
        ]);

        $response = $this->actingAs($staff)->postJson("/api/videos/{$video->id}/toggle-public-gallery");

        $response->assertStatus(200)
                 ->assertJsonFragment([
                     'in_public_gallery' => true
                 ]);
    }

    public function test_no_permite_a_un_miembro_regular_anadir_o_quitar_un_video_de_la_galeria_publica()
    {
        $member = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $owner = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['user_id' => $owner->id, 'club_id' => $this->club->id]);
        
        $video = Video::factory()->create([
            'user_id' => $owner->id,
            'dog_id' => $dog->id,
            'club_id' => $this->club->id,
            'in_public_gallery' => false,
            'is_public' => true
        ]);

        $response = $this->actingAs($member)->postJson("/api/videos/{$video->id}/toggle-public-gallery");

        $response->assertStatus(403);
    }

    public function test_permite_al_staff_editar_y_borrar_cualquier_video_sin_ser_propietario()
    {
        $staff = User::factory()->create(['role' => 'staff', 'club_id' => $this->club->id]);
        
        $uploader = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $dogOwner = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $dog = Dog::factory()->create(['user_id' => $dogOwner->id, 'club_id' => $this->club->id]);
        
        // Un miembro cualquiera sube un vídeo del perro de otro miembro
        $video = Video::factory()->create([
            'user_id' => $uploader->id,
            'dog_id' => $dog->id,
            'club_id' => $this->club->id,
            'title' => 'Video original'
        ]);

        // El staff (que no lo subió ni es dueño del perro) intenta editarlo
        $responseEdit = $this->actingAs($staff)->postJson("/api/videos/{$video->id}", [
            'title' => 'Editado por moderación',
            'dog_id' => $dog->id,
            'date' => now()->format('Y-m-d')
        ]);

        $responseEdit->assertStatus(200);
        $this->assertEquals('Editado por moderación', $video->fresh()->title);

        // El staff intenta borrarlo
        $responseDelete = $this->actingAs($staff)->postJson("/api/videos/{$video->id}/delete");
        
        $responseDelete->assertStatus(200);
        $this->assertDatabaseMissing('videos', ['id' => $video->id]);
    }
}
