<?php

namespace App\Http\Controllers;

use App\Models\Club;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'password' => 'required|string|min:6',
            ], [
                'name.required' => 'El nombre es obligatorio.',
                'name.max' => 'El nombre no puede tener más de 255 caracteres.',
                'email.required' => 'El correo electrónico es obligatorio.',
                'email.email' => 'El formato del correo electrónico no es válido.',
                'email.unique' => 'Este correo electrónico ya está registrado.',
                'password.required' => 'La contraseña es obligatoria.',
                'password.min' => 'La contraseña debe tener al menos 6 caracteres.',
            ]);

            $role = 'user'; // Default role
            if ($request->has('invite_token')) {
                try {
                    $decrypted = decrypt(base64_decode($request->invite_token));
                    $parts = explode('|', $decrypted);
                    $activeClubId = app()->bound('active_club_id') ? app('active_club_id') : null;

                    if (count($parts) === 2 && $parts[0] === 'auto_member' && (int)$parts[1] === (int)$activeClubId) {
                        $role = 'member';
                    }
                } catch (\Exception $e) {
                    // Ignore and keep as 'user'
                }
            }

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => $role,
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Usuario registrado exitosamente',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Error de validación en los datos proporcionados.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Registration Error: ' . $e->getMessage());
            \Illuminate\Support\Facades\Log::error($e->getTraceAsString());
            return response()->json([
                'message' => 'Ocurrió un error inesperado durante el registro. Por favor, inténtalo de nuevo.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ], [
                'email.required' => 'El correo electrónico es obligatorio.',
                'email.email' => 'El formato del correo electrónico no es válido.',
                'password.required' => 'La contraseña es obligatoria.',
            ]);

            $user = User::where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                return response()->json([
                    'message' => 'Las credenciales proporcionadas son incorrectas.'
                ], 401);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Inicio de sesión exitoso',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Error de validación en los datos proporcionados.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Login Error: ' . $e->getMessage());
            \Illuminate\Support\Facades\Log::error($e->getTraceAsString());
            return response()->json([
                'message' => 'Ocurrió un error inesperado al iniciar sesión. Por favor, inténtalo de nuevo.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada correctamente']);
    }

    public function createClubHandoff(Request $request, Club $club)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'No tienes permisos para realizar esta acción.'], 403);
        }

        $handoff = Str::random(64);
        Cache::put($this->clubHandoffCacheKey($handoff), [
            'admin_id' => $user->id,
            'club_id' => $club->id,
        ], now()->addMinute());

        return response()->json([
            'handoff' => $handoff,
            'expires_in' => 60,
        ]);
    }

    public function exchangeClubHandoff(Request $request)
    {
        $validated = $request->validate([
            'handoff' => 'required|string',
        ]);

        $cacheKey = $this->clubHandoffCacheKey($validated['handoff']);
        $payload = Cache::get($cacheKey);

        if (!$payload) {
            return response()->json(['message' => 'El acceso temporal no es válido o ha caducado.'], 401);
        }

        $activeClubId = app()->bound('active_club_id') ? app('active_club_id') : null;
        if (!$activeClubId || (int) $payload['club_id'] !== (int) $activeClubId) {
            return response()->json(['message' => 'Este acceso temporal no pertenece a este club.'], 403);
        }

        $admin = User::withoutGlobalScopes()->find($payload['admin_id']);
        if (!$admin || $admin->role !== 'admin') {
            Cache::forget($cacheKey);
            return response()->json(['message' => 'El administrador ya no tiene permisos.'], 403);
        }

        Cache::forget($cacheKey);
        $token = $admin->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Acceso temporal aceptado',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $admin,
        ]);
    }

    private function clubHandoffCacheKey(string $handoff): string
    {
        return 'club_handoff:' . hash('sha256', $handoff);
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    public function index(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'staff'])) {
            return response()->json(['message' => 'No tienes permisos para ver la lista de usuarios.'], 403);
        }
        return User::all();
    }

    public function minimalIndex(Request $request)
    {
        return User::select('id', 'name', 'email')->orderBy('name')->get();
    }

    public function updateRole(Request $request, $id)
    {
        $currentUser = $request->user();

        // Allow admin, manager, or staff
        if (!in_array($currentUser->role, ['admin', 'manager', 'staff'])) {
            return response()->json(['message' => 'No tienes permisos para realizar esta acción.'], 403);
        }

        try {
            $request->validate([
                'role' => 'required|in:user,member,staff,manager,admin',
            ], [
                'role.required' => 'El rol es obligatorio.',
                'role.in' => 'El rol proporcionado no es válido.',
            ]);

            $targetUser = User::find($id);
            if (!$targetUser) {
                return response()->json(['message' => 'Usuario no encontrado.'], 404);
            }

            // Staff restrictions
            if ($currentUser->role === 'staff') {
                // Cannot change role OF an admin, manager, or another staff
                if (in_array($targetUser->role, ['admin', 'manager', 'staff'])) {
                    return response()->json(['message' => 'El personal no puede modificar a administradores, gestores u otro personal.'], 403);
                }

                // Cannot assign admin, manager, or staff role
                if (in_array($request->role, ['admin', 'manager', 'staff'])) {
                    return response()->json(['message' => 'El personal solo puede asignar roles de usuario o socio.'], 403);
                }
            }

            // Manager restrictions
            if ($currentUser->role === 'manager') {
                // Cannot change role OF an admin or manager
                if (in_array($targetUser->role, ['admin', 'manager'])) {
                    return response()->json(['message' => 'Los gestores no pueden modificar a administradores u otros gestores.'], 403);
                }

                // Cannot assign admin or manager role
                if (in_array($request->role, ['admin', 'manager'])) {
                    return response()->json(['message' => 'Los gestores solo pueden asignar roles de usuario, socio o staff.'], 403);
                }
            }

            $targetUser->role = $request->role;
            $targetUser->save();

            return response()->json([
                'message' => 'Rol actualizado correctamente',
                'user' => $targetUser
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Error de validación.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'No se pudo actualizar el rol. Por favor, inténtalo de nuevo.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        $currentUser = $request->user();

        // Allow admin, manager, or staff
        if (!in_array($currentUser->role, ['admin', 'manager', 'staff'])) {
            return response()->json(['message' => 'No tienes permisos para realizar esta acción.'], 403);
        }

        try {
            $targetUser = User::find($id);
            if (!$targetUser) {
                return response()->json(['message' => 'Usuario no encontrado.'], 404);
            }

            // Prevent self-deletion via this endpoint
            if ($currentUser->id === $targetUser->id) {
                return response()->json(['message' => 'No puedes eliminarte a ti mismo desde esta vista.'], 400);
            }

            // Staff restrictions
            if ($currentUser->role === 'staff') {
                // Cannot delete an admin, manager, or another staff
                if (in_array($targetUser->role, ['admin', 'manager', 'staff'])) {
                    return response()->json(['message' => 'El personal no puede eliminar a administradores, gestores u otro personal.'], 403);
                }
            }

            // Manager restrictions
            if ($currentUser->role === 'manager') {
                // Cannot delete an admin or another manager
                if (in_array($targetUser->role, ['admin', 'manager'])) {
                    return response()->json(['message' => 'Los gestores no pueden eliminar a administradores u otros gestores.'], 403);
                }
            }

            \Illuminate\Support\Facades\DB::transaction(function () use ($targetUser) {
                // Delete user's dogs but preserve shared ones
                $targetUser->load('dogs');
                foreach ($targetUser->dogs as $dog) {
                    // Si el perro lo tiene alguien más (co-propiedad), solo lo desvinculamos
                    $usersCount = $dog->users()->count();
                    if ($usersCount > 1) {
                        $dog->users()->detach($targetUser->id);
                        if ($dog->user_id === $targetUser->id) {
                            $nextOwner = $dog->users()->first();
                            if ($nextOwner) {
                                $dog->user_id = $nextOwner->id;
                                $dog->save();
                            }
                        }
                    } else {
                        $dog->delete();
                    }
                }

                // Delete reservations if they exist
                if (\Schema::hasTable('reservations')) {
                    $targetUser->reservations()->delete();
                }

                // Detach from competitions
                $targetUser->competitions()->detach();

                // Finally delete the user
                $targetUser->delete();
            });

            return response()->json([
                'message' => 'Usuario y sus datos asociados eliminados correctamente.'
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error deleting user: ' . $e->getMessage());
            return response()->json([
                'message' => 'Ocurrió un error al eliminar el usuario.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateProfile(Request $request)
    {
        try {
            $request->validate([
                'name' => 'nullable|string|max:255',
                'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
                'rfec_license' => 'nullable|string|max:255',
                'rfec_expiration_date' => 'nullable|date',
                'rfec_category' => 'nullable|string|max:50',
                'birth_year' => 'nullable|integer|min:1900|max:'.date('Y'),
            ], [
                'name.max' => 'El nombre no puede tener más de 255 caracteres.',
                'photo.image' => 'El archivo debe ser una imagen.',
                'photo.mimes' => 'La imagen debe ser de formato: jpeg, png, jpg, gif, svg.',
                'photo.max' => 'La imagen no puede pesar más de 2 MB.',
            ]);

            $user = $request->user();

            if ($request->has('name') && $request->name) {
                $user->name = $request->name;
            }

            if ($request->has('rfec_license')) {
                $user->rfec_license = $request->rfec_license;
            }
            if ($request->has('rfec_expiration_date')) {
                $user->rfec_expiration_date = $request->rfec_expiration_date;
            }
            if ($request->has('rfec_category')) {
                $user->rfec_category = $request->rfec_category;
            }
            if ($request->has('birth_year')) {
                $user->birth_year = $request->birth_year;

                if ($user->birth_year) {
                    $age = date('Y') - $user->birth_year;
                    $rsceCategory = '';
                    if ($age < 12) {
                        $rsceCategory = 'J12';
                    } elseif ($age >= 12 && $age <= 14) {
                        $rsceCategory = 'J15';
                    } elseif ($age >= 15 && $age <= 18) {
                        $rsceCategory = 'J19';
                    } elseif ($age >= 19 && $age <= 54) {
                        $rsceCategory = 'Absoluta';
                    } elseif ($age >= 55 && $age <= 64) {
                        $rsceCategory = 'S55';
                    } elseif ($age >= 65) {
                        $rsceCategory = 'S65';
                    }

                    if ($rsceCategory) {
                        // We use the DB facade or loop to update the pivot. 
                        // Since dogs() relationship exists, we can iterate.
                        foreach ($user->dogs as $dog) {
                            $user->dogs()->updateExistingPivot($dog->id, ['rsce_handler_category' => $rsceCategory]);
                        }
                    }
                }
            }

            if ($request->hasFile('photo')) {
                // Delete old photo if exists and is not a default/external one
                if ($user->photo_url && str_contains($user->photo_url, '/storage/')) {
                    // Extract relative path from URL
                    $oldPath = str_replace(asset('storage/'), '', $user->photo_url);
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
                }

                $path = $request->file('photo')->store('profile_photos', 'public');
                $user->photo_url = asset('storage/' . $path);
            }

            $user->save();

            return response(json_encode([
                'message' => 'Perfil actualizado correctamente',
                'user' => $user
            ], JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Error en los datos del perfil.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Ocurrió un error al actualizar el perfil.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function generateResetLink(Request $request, $id)
    {
        $currentUser = $request->user();

        if (!in_array($currentUser->role, ['admin', 'manager', 'staff'])) {
            return response()->json(['message' => 'No tienes permisos para realizar esta acción.'], 403);
        }

        $targetUser = User::find($id);
        if (!$targetUser) {
            return response()->json(['message' => 'Usuario no encontrado.'], 404);
        }

        $token = \Illuminate\Support\Str::random(60);
        $targetUser->reset_token = $token;
        $targetUser->save();

        // Usar el Origin de la petición para soportar subdominios multi-tenant automáticamente
        $origin = $request->header('origin');
        $frontendUrl = $origin ? $origin : env('FRONTEND_URL', 'https://clubagility.com');
        
        $resetLink = rtrim($frontendUrl, '/') . '/reset-password?token=' . $token;

        return response()->json([
            'message' => 'Enlace de recuperación generado',
            'link' => $resetLink
        ]);
    }

    public function generateInviteLink(Request $request)
    {
        $currentUser = $request->user();

        if (!in_array($currentUser->role, ['admin', 'manager', 'staff'])) {
            return response()->json(['message' => 'No tienes permisos para realizar esta acción.'], 403);
        }

        $activeClubId = app()->bound('active_club_id') ? app('active_club_id') : $currentUser->club_id;
        $token = base64_encode(encrypt('auto_member|' . $activeClubId));

        $origin = $request->header('origin');
        $frontendUrl = $origin ? $origin : env('FRONTEND_URL', 'https://clubagility.com');
        
        $inviteLink = rtrim($frontendUrl, '/') . '/register?invite=' . $token;

        return response()->json([
            'message' => 'Enlace de invitación generado',
            'link' => $inviteLink
        ]);
    }

    public function resetPasswordWithToken(Request $request)
    {
        try {
            $request->validate([
                'token' => 'required|string',
                'password' => 'required|string|min:6|confirmed',
            ], [
                'token.required' => 'El token es inválido o no existe.',
                'password.required' => 'La contraseña es obligatoria.',
                'password.min' => 'La contraseña debe tener al menos 6 caracteres.',
                'password.confirmed' => 'Las contraseñas no coinciden.',
            ]);

            $user = User::where('reset_token', $request->token)->first();

            if (!$user) {
                return response()->json(['message' => 'El enlace de recuperación es inválido o ya ha sido utilizado.'], 400);
            }

            $user->password = Hash::make($request->password);
            $user->reset_token = null; // Invalidate the token
            $user->save();

            return response()->json([
                'message' => 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.'
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Error de validación en los datos proporcionados.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Ocurrió un error al restablecer la contraseña.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
