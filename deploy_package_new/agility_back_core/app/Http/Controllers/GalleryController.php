<?php

namespace App\Http\Controllers;

use App\Models\GalleryImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class GalleryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return GalleryImage::orderBy('created_at', 'desc')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:5120',
            'alt' => 'nullable|string'
        ]);

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('gallery_photos', 'public');
            $url = asset('storage/' . $path);

            $image = GalleryImage::create([
                'url' => $url,
                'alt' => $request->input('alt', 'Gallery Image'),
            ]);

            return response()->json($image, 201);
        }

        return response()->json(['error' => 'No photo provided'], 400);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $image = GalleryImage::findOrFail($id);

        if ($image->url && str_contains($image->url, '/storage/')) {
            $path = str_replace(asset('storage/'), '', $image->url);
            Storage::disk('public')->delete($path);
        }

        $image->delete();

        return response()->noContent();
    }
}
