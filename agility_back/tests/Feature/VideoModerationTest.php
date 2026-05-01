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
}
