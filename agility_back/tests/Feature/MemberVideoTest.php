<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Dog;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MemberVideoTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $dog;
    protected $otherUser;
    protected $otherDog;
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

        Notification::fake();
        
        $this->user = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $this->dog = Dog::factory()->create(['user_id' => $this->user->id, 'club_id' => $this->club->id]);
        $this->dog->users()->attach($this->user->id, ['is_primary_owner' => true]);
        
        $this->otherUser = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $this->otherDog = Dog::factory()->create(['user_id' => $this->otherUser->id, 'club_id' => $this->club->id]);
        $this->otherDog->users()->attach($this->otherUser->id, ['is_primary_owner' => true]);
    }

    public function test_permite_a_un_miembro_ver_la_lista_de_videos()
    {
        Video::factory()->count(3)->create([
            'is_public' => true,
            'user_id' => $this->user->id,
            'dog_id' => $this->dog->id,
            'club_id' => $this->club->id
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/videos');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'data' => [
                         '*' => ['id', 'title', 'local_path', 'dog_id', 'user_id', 'is_liked_by_user']
                     ],
                     'counts' => ['vertical', 'horizontal']
                 ]);
    }

    public function test_permite_a_un_miembro_filtrar_sus_propios_videos()
    {
        Video::factory()->count(2)->create(['user_id' => $this->user->id, 'dog_id' => $this->dog->id, 'club_id' => $this->club->id]);
        Video::factory()->count(3)->create(['user_id' => $this->otherUser->id, 'dog_id' => $this->otherDog->id, 'club_id' => $this->club->id]);

        $response = $this->actingAs($this->user)->getJson('/api/videos?category=my_videos');

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $this->assertCount(2, $data);
        foreach ($data as $video) {
            $this->assertEquals($this->user->id, $video['user_id']);
        }
    }

    public function test_permite_a_un_miembro_subir_un_video()
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->create('video.mp4', 1000, 'video/mp4');

        $response = $this->actingAs($this->user)->postJson('/api/videos', [
            'dog_id' => $this->dog->id,
            'date' => now()->format('Y-m-d'),
            'video' => $file,
            'title' => 'Mi super carrera',
            'orientation' => 'vertical',
            'manga_type' => 'Agility 1'
        ]);

        $response->assertStatus(201);
        
        $video = Video::first();
        $this->assertNotNull($video);
        $this->assertEquals('Mi super carrera', $video->title);
        $this->assertEquals('local', $video->status);
        
        Storage::disk('public')->assertExists($video->local_path);
    }

    public function test_permite_al_propietario_editar_la_informacion_del_video()
    {
        $video = Video::factory()->create([
            'user_id' => $this->user->id,
            'dog_id' => $this->dog->id,
            'club_id' => $this->club->id,
            'title' => 'Titulo original'
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/videos/{$video->id}", [
            'title' => 'Titulo actualizado',
            'dog_id' => $this->dog->id,
            'date' => now()->format('Y-m-d'),
            'manga_type' => 'Jumping 2'
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Titulo actualizado', $video->fresh()->title);
        $this->assertEquals('Jumping 2', $video->fresh()->manga_type);
    }

    public function test_no_permite_a_un_usuario_editar_el_video_de_otro_sin_ser_el_dueno()
    {
        $video = Video::factory()->create([
            'user_id' => $this->otherUser->id,
            'dog_id' => $this->otherDog->id,
            'club_id' => $this->club->id
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/videos/{$video->id}", [
            'title' => 'Hackeado',
            'dog_id' => $this->otherDog->id,
            'date' => now()->format('Y-m-d')
        ]);

        $response->assertStatus(403);
        $this->assertNotEquals('Hackeado', $video->fresh()->title);
    }

    public function test_permite_al_dueno_del_perro_editar_el_video_aunque_no_lo_haya_subido()
    {
        // Un usuario distinto (otherUser) sube un vídeo de NUESTRO perro (dog)
        $video = Video::factory()->create([
            'user_id' => $this->otherUser->id,
            'dog_id' => $this->dog->id,
            'club_id' => $this->club->id,
            'title' => 'Video original'
        ]);

        // Nosotros (dueños del perro) intentamos editar el vídeo que subió otherUser
        $response = $this->actingAs($this->user)->postJson("/api/videos/{$video->id}", [
            'title' => 'Editado por el dueño',
            'dog_id' => $this->dog->id,
            'date' => now()->format('Y-m-d')
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Editado por el dueño', $video->fresh()->title);
    }

    public function test_permite_al_propietario_borrar_su_video()
    {
        Storage::fake('public');
        
        $file = UploadedFile::fake()->create('video.mp4', 100, 'video/mp4');
        $path = $file->store('clubs/default/videos', 'public');

        $video = Video::factory()->create([
            'user_id' => $this->user->id,
            'dog_id' => $this->dog->id,
            'club_id' => $this->club->id,
            'local_path' => $path
        ]);

        Storage::disk('public')->assertExists($video->local_path);

        $response = $this->actingAs($this->user)->postJson("/api/videos/{$video->id}/delete");

        $response->assertStatus(200);
        
        $this->assertNull(Video::find($video->id));
        Storage::disk('public')->assertMissing($video->local_path);
        
        $this->assertDatabaseHas('deleted_videos_history', [
            'original_video_id' => $video->id,
            'deleted_by_id' => $this->user->id
        ]);
    }

    public function test_permite_a_un_miembro_dar_y_quitar_like_a_un_video()
    {
        $video = Video::factory()->create([
            'user_id' => $this->otherUser->id,
            'dog_id' => $this->otherDog->id,
            'club_id' => $this->club->id
        ]);

        $responseLike = $this->actingAs($this->user)->postJson("/api/videos/{$video->id}/toggle-like");
        $responseLike->assertStatus(200)->assertJson(['liked' => true]);
        $this->assertDatabaseHas('video_likes', [
            'video_id' => $video->id,
            'user_id' => $this->user->id
        ]);

        $responseUnlike = $this->actingAs($this->user)->postJson("/api/videos/{$video->id}/toggle-like");
        $responseUnlike->assertStatus(200)->assertJson(['liked' => false]);
        $this->assertDatabaseMissing('video_likes', [
            'video_id' => $video->id,
            'user_id' => $this->user->id
        ]);
    }

    public function test_permite_descargar_un_video()
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->create('test_video.mp4', 100, 'video/mp4');
        $path = $file->store('clubs/default/videos', 'public');

        $video = Video::factory()->create([
            'user_id' => $this->user->id,
            'dog_id' => $this->dog->id,
            'club_id' => $this->club->id,
            'local_path' => $path,
            'title' => 'Test Video'
        ]);

        $response = $this->actingAs($this->user)->get("/api/videos/{$video->id}/download");

        $response->assertStatus(200);
        $response->assertHeader('Content-Disposition');
    }

    public function test_no_permite_descargar_un_video_sin_autenticacion()
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->create('test_video.mp4', 100, 'video/mp4');
        $path = $file->store('clubs/default/videos', 'public');

        $video = Video::factory()->create([
            'user_id' => $this->user->id,
            'dog_id' => $this->dog->id,
            'club_id' => $this->club->id,
            'local_path' => $path,
            'is_public' => true,
        ]);

        $response = $this->getJson("/api/videos/{$video->id}/download");

        $response->assertStatus(401);
    }
}
