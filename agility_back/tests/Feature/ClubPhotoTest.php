<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\ClubPhoto;
use App\Models\Dog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ClubPhotoTest extends TestCase
{
    use RefreshDatabase;

    protected $club;
    protected $user;
    protected $otherUser;
    protected $staff;
    protected $dog;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->club = Club::create([
            'name' => 'Test Club',
            'subdomain' => 'testclub',
            'slug' => 'testclub',
            'db_connection' => 'sqlite'
        ]);

        $this->user = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $this->otherUser = User::factory()->create(['role' => 'member', 'club_id' => $this->club->id]);
        $this->staff = User::factory()->create(['role' => 'staff', 'club_id' => $this->club->id]);
        $this->dog = Dog::factory()->create(['user_id' => $this->user->id, 'club_id' => $this->club->id]);
        $this->dog->users()->attach($this->user->id, ['is_primary_owner' => true]);
    }

    protected function uploadPayload(array $overrides = []): array
    {
        return array_merge([
            'photo' => UploadedFile::fake()->image('foto.jpg', 1920, 1080),
            'thumb' => UploadedFile::fake()->image('foto_thumb.jpg', 400, 225),
            'category' => 'entrenamiento',
            'taken_at' => now()->format('Y-m-d'),
        ], $overrides);
    }

    public function test_un_miembro_puede_subir_una_foto()
    {
        $response = $this->actingAs($this->user)->postJson('/api/photos', $this->uploadPayload([
            'title' => 'Sesión de slalom',
            'photo_type' => 'perro_en_accion',
            'dog_ids' => [$this->dog->id],
        ]));

        $response->assertStatus(201);

        $photo = ClubPhoto::withoutGlobalScopes()->first();
        $this->assertNotNull($photo);
        $this->assertEquals($this->user->id, $photo->user_id);
        $this->assertEquals($this->club->id, $photo->club_id);
        $this->assertGreaterThan(0, $photo->size_bytes);
        $this->assertEquals([$this->dog->id], $photo->dogs->pluck('id')->all());

        Storage::disk('public')->assertExists($photo->path);
        Storage::disk('public')->assertExists($photo->thumb_path);
    }

    public function test_la_categoria_competicion_exige_competition_id()
    {
        $response = $this->actingAs($this->user)->postJson('/api/photos', $this->uploadPayload([
            'category' => 'competicion',
        ]));

        $response->assertStatus(422)->assertJsonValidationErrors(['competition_id']);
    }

    public function test_rechaza_la_subida_cuando_se_supera_la_cuota()
    {
        // Sin plan asignado, el límite por defecto es 5GB: simulamos cuota agotada
        ClubPhoto::create([
            'club_id' => $this->club->id,
            'user_id' => $this->user->id,
            'category' => 'otros',
            'taken_at' => now()->format('Y-m-d'),
            'path' => 'clubs/testclub/photos/fake.webp',
            'thumb_path' => 'clubs/testclub/photos/fake_thumb.webp',
            'size_bytes' => 5 * 1024 * 1024 * 1024,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/photos', $this->uploadPayload());

        $response->assertStatus(403);
        $this->assertEquals(1, ClubPhoto::withoutGlobalScopes()->count());
    }

    public function test_rechaza_la_subida_cuando_se_supera_la_cuota_personalizada_de_plan()
    {
        // 1. Crear un plan con límite de 1GB
        $plan = \App\Models\Plan::create([
            'name' => 'Plan Personalizado',
            'slug' => 'personalizado',
            'price' => 10.00,
            'photo_storage_limit_gb' => 1,
        ]);

        // 2. Asignar el plan al club
        $this->club->update(['plan_id' => $plan->id]);

        // 3. Crear una foto que llena exactamente el límite de 1GB (1 * 1024 * 1024 * 1024 bytes)
        ClubPhoto::create([
            'club_id' => $this->club->id,
            'user_id' => $this->user->id,
            'category' => 'otros',
            'taken_at' => now()->format('Y-m-d'),
            'path' => 'clubs/testclub/photos/fake.webp',
            'thumb_path' => 'clubs/testclub/photos/fake_thumb.webp',
            'size_bytes' => 1 * 1024 * 1024 * 1024,
        ]);

        // 4. Intentar subir otra foto, debería ser rechazada (403)
        $response = $this->actingAs($this->user)->postJson('/api/photos', $this->uploadPayload());
        $response->assertStatus(403);

        // 5. Aumentar el límite del plan a 5GB
        $plan->update(['photo_storage_limit_gb' => 5]);

        // 6. Intentar subir de nuevo, ahora debería tener éxito (201)
        $response2 = $this->actingAs($this->user)->postJson('/api/photos', $this->uploadPayload());
        $response2->assertStatus(201);
    }

    public function test_el_index_devuelve_fotos_con_estadisticas_de_almacenamiento_y_filtra_por_categoria()
    {
        $this->actingAs($this->user)->postJson('/api/photos', $this->uploadPayload());
        $this->actingAs($this->user)->postJson('/api/photos', $this->uploadPayload(['category' => 'evento_social']));

        $response = $this->actingAs($this->user)->getJson('/api/photos?category=evento_social');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonStructure(['data', 'storage' => ['used_bytes', 'limit_bytes', 'limit_gb', 'percentage']]);

        $this->assertEquals('evento_social', $response->json('data.0.category'));
    }

    public function test_cualquier_miembro_puede_etiquetar_pero_no_editar_metadatos_ajenos()
    {
        $this->actingAs($this->user)->postJson('/api/photos', $this->uploadPayload());
        $photo = ClubPhoto::withoutGlobalScopes()->first();

        // Otro miembro puede etiquetar (colaborativo)
        $tagResponse = $this->actingAs($this->otherUser)->postJson("/api/photos/{$photo->id}", [
            'dog_ids' => [$this->dog->id],
            'user_ids' => [$this->otherUser->id],
        ]);
        $tagResponse->assertStatus(200);
        $this->assertCount(1, $photo->fresh()->dogs);
        $this->assertCount(1, $photo->fresh()->taggedUsers);

        // Pero no puede cambiar el título de una foto que no es suya
        $metaResponse = $this->actingAs($this->otherUser)->postJson("/api/photos/{$photo->id}", [
            'title' => 'Título hackeado',
        ]);
        $metaResponse->assertStatus(403);

        // El autor sí puede
        $authorResponse = $this->actingAs($this->user)->postJson("/api/photos/{$photo->id}", [
            'title' => 'Mi título',
        ]);
        $authorResponse->assertStatus(200);
        $this->assertEquals('Mi título', $photo->fresh()->title);
    }

    public function test_un_miembro_etiquetado_puede_quitarse_de_la_foto()
    {
        $this->actingAs($this->user)->postJson('/api/photos', $this->uploadPayload([
            'user_ids' => [$this->otherUser->id],
        ]));
        $photo = ClubPhoto::withoutGlobalScopes()->first();
        $this->assertCount(1, $photo->taggedUsers);

        $response = $this->actingAs($this->otherUser)->postJson("/api/photos/{$photo->id}/untag-self");

        $response->assertStatus(200);
        $this->assertCount(0, $photo->fresh()->taggedUsers);
    }

    public function test_solo_el_autor_o_el_staff_pueden_borrar_una_foto()
    {
        $this->actingAs($this->user)->postJson('/api/photos', $this->uploadPayload());
        $photo = ClubPhoto::withoutGlobalScopes()->first();
        $path = $photo->path;

        // Otro miembro no puede borrarla
        $this->actingAs($this->otherUser)->postJson("/api/photos/{$photo->id}/delete")
            ->assertStatus(403);

        // El staff sí, y el fichero desaparece del disco
        $this->actingAs($this->staff)->postJson("/api/photos/{$photo->id}/delete")
            ->assertStatus(200);

        $this->assertEquals(0, ClubPhoto::withoutGlobalScopes()->count());
        Storage::disk('public')->assertMissing($path);
    }
}
