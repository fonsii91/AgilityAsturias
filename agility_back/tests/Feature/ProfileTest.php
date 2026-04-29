<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileTest extends TestCase
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

    protected function createUser($attributes = [])
    {
        return User::factory()->create(array_merge(['club_id' => $this->club->id], $attributes));
    }

    public function test_permite_a_un_usuario_autenticado_actualizar_su_nombre()
    {
        $user = $this->createUser(['name' => 'Old Name']);

        $response = $this->actingAs($user)->postJson('/api/user/profile', [
            'name' => 'New Name'
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Perfil actualizado correctamente')
                 ->assertJsonPath('user.name', 'New Name');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name'
        ]);
    }

    public function test_permite_a_un_usuario_autenticado_actualizar_su_licencia_rfec_y_fecha_de_caducidad()
    {
        $user = $this->createUser();

        $response = $this->actingAs($user)->postJson('/api/user/profile', [
            'rfec_license' => 'LIC-12345',
            'rfec_expiration_date' => '2025-12-31'
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('user.rfec_license', 'LIC-12345')
                 ->assertJsonPath('user.rfec_expiration_date', '2025-12-31');

        $user->refresh();
        $this->assertEquals('LIC-12345', $user->rfec_license);
        $this->assertEquals('2025-12-31', $user->rfec_expiration_date);
    }

    public function test_permite_a_un_usuario_subir_una_foto_de_perfil()
    {
        Storage::fake('public');

        $user = $this->createUser();

        $file = UploadedFile::fake()->image('avatar.jpg');

        $response = $this->actingAs($user)->postJson('/api/user/profile', [
            'photo' => $file
        ]);

        $response->assertStatus(200);

        // Verify file is stored
        Storage::disk('public')->assertExists('profile_photos/' . $file->hashName());
        
        // Verify DB update
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'photo_url' => asset('storage/profile_photos/' . $file->hashName())
        ]);
    }

    public function test_falla_la_validacion_si_la_foto_no_es_una_imagen_o_supera_el_tamano()
    {
        Storage::fake('public');

        $user = $this->createUser();
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->actingAs($user)->postJson('/api/user/profile', [
            'photo' => $file
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['photo']);
    }

    public function test_falla_la_validacion_si_el_nombre_supera_los_255_caracteres()
    {
        $user = $this->createUser();

        $response = $this->actingAs($user)->postJson('/api/user/profile', [
            'name' => str_repeat('a', 256)
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['name']);
    }

    public function test_no_permite_a_un_usuario_no_autenticado_actualizar_perfil()
    {
        $response = $this->postJson('/api/user/profile', [
            'name' => 'New Name'
        ]);

        $response->assertStatus(401);
    }
}
