<?php
$file = __DIR__ . '/app/Http/Controllers/AuthController.php';
$content = file_get_contents($file);

$replacements = [
    // webp addition
    "'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048'," =>
    "'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',",

    // updateProfile response
    "return response()->json([\n                'message' => 'Perfil actualizado correctamente',\n                'user' => \$user\n            ]);" =>
    "return response(json_encode([\n                'message' => 'Perfil actualizado correctamente',\n                'user' => \$user\n            ], JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",
];

foreach ($replacements as $search => $replace) {
    if (strpos($content, $search) !== false) {
        $content = str_replace($search, $replace, $content);
    } else {
        echo "Could not find:\n$search\n\n";
    }
}

file_put_contents($file, $content);
echo "AuthController patched successfully\n";
