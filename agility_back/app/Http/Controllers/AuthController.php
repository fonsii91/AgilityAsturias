<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
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

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => 'user', // Default role
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

    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    public function index(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'staff'])) {
            return response()->json(['message' => 'No tienes permisos para ver la lista de usuarios.'], 403);
        }
        return User::all();
    }

    public function updateRole(Request $request, $id)
    {
        $currentUser = $request->user();

        // Allow admin or staff
        if (!in_array($currentUser->role, ['admin', 'staff'])) {
            return response()->json(['message' => 'No tienes permisos para realizar esta acción.'], 403);
        }

        try {
            $request->validate([
                'role' => 'required|in:user,member,staff,admin',
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
                // Cannot change role OF an admin or another staff
                if (in_array($targetUser->role, ['admin', 'staff'])) {
                    return response()->json(['message' => 'El personal no puede modificar a administradores u otro personal.'], 403);
                }

                // Cannot assign admin or staff role
                if (in_array($request->role, ['admin', 'staff'])) {
                    return response()->json(['message' => 'El personal solo puede asignar roles de usuario o socio.'], 403);
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

    public function updateProfile(Request $request)
    {
        try {
            $request->validate([
                'name' => 'nullable|string|max:255',
                'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
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

            return response()->json([
                'message' => 'Perfil actualizado correctamente',
                'user' => $user
            ]);
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
}
