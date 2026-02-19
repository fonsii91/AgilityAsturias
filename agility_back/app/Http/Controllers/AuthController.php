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
                'password' => 'required|string|min:8',
            ]);

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => 'user', // Default role
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
            ], 201);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Registration Error: ' . $e->getMessage());
            \Illuminate\Support\Facades\Log::error($e->getTraceAsString());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            $user = User::where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                throw ValidationException::withMessages([
                    'email' => ['Las credenciales proporcionadas son incorrectas.'],
                ]);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Login Error: ' . $e->getMessage());
            \Illuminate\Support\Facades\Log::error($e->getTraceAsString());
            return response()->json(['error' => $e->getMessage()], 500);
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
            abort(403, 'Unauthorized action.');
        }
        return User::all();
    }

    public function updateRole(Request $request, $id)
    {
        $currentUser = $request->user();

        // Allow admin or staff
        if (!in_array($currentUser->role, ['admin', 'staff'])) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'role' => 'required|in:user,member,staff,admin',
        ]);

        $targetUser = User::findOrFail($id);

        // Staff restrictions
        if ($currentUser->role === 'staff') {
            // Cannot change role OF an admin or another staff
            if (in_array($targetUser->role, ['admin', 'staff'])) {
                abort(403, 'Staff cannot modify admins or other staff.');
            }

            // Cannot assign admin or staff role
            if (in_array($request->role, ['admin', 'staff'])) {
                abort(403, 'Staff can only assign user or member roles.');
            }
        }

        $targetUser->role = $request->role;
        $targetUser->save();

        return response()->json($targetUser);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'name' => 'nullable|string|max:255',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
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

        return response()->json($user);
    }
}
