<?php
$files = [
    __DIR__ . '/app/Http/Controllers/DogController.php',
    __DIR__ . '/app/Http/Controllers/AuthController.php',
];

foreach ($files as $file) {
    $content = file_get_contents($file);
    
    // First, restore webp if it's missing in AuthController
    if (strpos($file, 'AuthController.php') !== false) {
        $content = str_replace(
            "'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',",
            "'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',",
            $content
        );
    }
    
    // Pattern to match response()->json(...) without breaking multiline arrays.
    // It's safer to just replace specific lines or use a callback.
    // Let's use preg_replace_callback.
    $content = preg_replace_callback(
        '/return response\(\)->json\((.+?)(?:,\s*(\d+))?\);/s',
        function ($matches) {
            $data = trim($matches[1]);
            $status = isset($matches[2]) && $matches[2] ? $matches[2] : 200;
            return "return response(json_encode($data, JSON_INVALID_UTF8_SUBSTITUTE), $status, ['Content-Type' => 'application/json']);";
        },
        $content
    );

    // We also need to find implicit returns like "return Dog::get()" and wrap them!
    // No, index methods already did "return $dogs;" and Laravel converted them.
    // Wait, the error happened on api/dogs which uses index.
    if (strpos($file, 'DogController.php') !== false) {
        $content = str_replace(
            "return \$request->user()->dogs()->with(['users:id,name,email', 'pointHistories' => function (\$query) {\n            \$query->orderBy('created_at', 'desc');\n        }])->orderBy('dogs.name', 'asc')->get();",
            "\$dogs = \$request->user()->dogs()->with(['users:id,name,email', 'pointHistories' => function (\$query) {\n            \$query->orderBy('created_at', 'desc');\n        }])->orderBy('dogs.name', 'asc')->get();\n        return response(json_encode(\$dogs, JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",
            $content
        );
        
        $content = str_replace(
            "return Dog::with(['users:id,name,email', 'pointHistories' => function (\$query) {\n            \$query->orderBy('created_at', 'desc');\n        }])->orderBy('dogs.name', 'asc')->get();",
            "\$dogs = Dog::with(['users:id,name,email', 'pointHistories' => function (\$query) {\n            \$query->orderBy('created_at', 'desc');\n        }])->orderBy('dogs.name', 'asc')->get();\n        return response(json_encode(\$dogs, JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",
            $content
        );
        
        $content = str_replace(
            "return Auth::user()->dogs()->with(['users:id,name,email', 'pointHistories' => function (\$query) {\n            \$query->orderBy('created_at', 'desc');\n        }])->findOrFail(\$id);",
            "\$dog = Auth::user()->dogs()->with(['users:id,name,email', 'pointHistories' => function (\$query) {\n            \$query->orderBy('created_at', 'desc');\n        }])->findOrFail(\$id);\n        return response(json_encode(\$dog, JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",
            $content
        );
    }

    file_put_contents($file, $content);
}
echo "Patched successfully\n";
