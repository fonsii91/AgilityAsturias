<?php
$file = __DIR__ . '/app/Http/Controllers/DogController.php';
$content = file_get_contents($file);

$replacements = [
    // index
    "return \$request->user()->dogs()->with(['users:id,name,email', 'pointHistories' => function (\$query) {\n            \$query->orderBy('created_at', 'desc');\n        }])->orderBy('dogs.name', 'asc')->get();" => 
    "\$dogs = \$request->user()->dogs()->with(['users:id,name,email', 'pointHistories' => function (\$query) {\n            \$query->orderBy('created_at', 'desc');\n        }])->orderBy('dogs.name', 'asc')->get();\n        return response(json_encode(\$dogs, JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",

    // all
    "return Dog::with(['users:id,name,email', 'pointHistories' => function (\$query) {\n            \$query->orderBy('created_at', 'desc');\n        }])->orderBy('dogs.name', 'asc')->get();" =>
    "\$dogs = Dog::with(['users:id,name,email', 'pointHistories' => function (\$query) {\n            \$query->orderBy('created_at', 'desc');\n        }])->orderBy('dogs.name', 'asc')->get();\n        return response(json_encode(\$dogs, JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",

    // store
    "return response()->json(\$dog, 201);" =>
    "return response(json_encode(\$dog, JSON_INVALID_UTF8_SUBSTITUTE), 201, ['Content-Type' => 'application/json']);",

    // show
    "return Auth::user()->dogs()->with(['users:id,name,email', 'pointHistories' => function (\$query) {\n            \$query->orderBy('created_at', 'desc');\n        }])->findOrFail(\$id);" =>
    "\$dog = Auth::user()->dogs()->with(['users:id,name,email', 'pointHistories' => function (\$query) {\n            \$query->orderBy('created_at', 'desc');\n        }])->findOrFail(\$id);\n        return response(json_encode(\$dog, JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",

    // update
    "return response()->json(\$dog);" =>
    "return response(json_encode(\$dog, JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",

    // uploadPhoto
    // Wait, uploadPhoto also has "return response()->json($dog);" because the previous replacement reverted.
    // So the previous replacement will catch it too!

    // giveExtraPoints
    "return response()->json([\n            'message' => 'Puntos modificados exitosamente',\n            'dog' => \$dog\n        ]);" =>
    "return response(json_encode([\n            'message' => 'Puntos modificados exitosamente',\n            'dog' => \$dog\n        ], JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",

    // share
    "return response()->json([\n            'message' => 'Perro compartido exitosamente con ' . \$userToShareWith->name,\n            'dog' => \$dog->load(['users:id,name,email', 'pointHistories' => function (\$query) {\n                \$query->orderBy('created_at', 'desc');\n            }])\n        ]);" =>
    "return response(json_encode([\n            'message' => 'Perro compartido exitosamente con ' . \$userToShareWith->name,\n            'dog' => \$dog->load(['users:id,name,email', 'pointHistories' => function (\$query) {\n                \$query->orderBy('created_at', 'desc');\n            }])\n        ], JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",

    // unshare
    "return response()->json([\n            'message' => 'Acceso revocado exitosamente',\n            'dog' => \$dog->load(['users:id,name,email', 'pointHistories' => function (\$query) {\n                \$query->orderBy('created_at', 'desc');\n            }])\n        ]);" =>
    "return response(json_encode([\n            'message' => 'Acceso revocado exitosamente',\n            'dog' => \$dog->load(['users:id,name,email', 'pointHistories' => function (\$query) {\n                \$query->orderBy('created_at', 'desc');\n            }])\n        ], JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",

    // updateAvatarsAdmin
    "return response()->json([\n            'message' => 'Avatares actualizados exitosamente',\n            'dog' => \$dog\n        ]);" =>
    "return response(json_encode([\n            'message' => 'Avatares actualizados exitosamente',\n            'dog' => \$dog\n        ], JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",

    // generateAvatarsAdmin
    "return response()->json([\n                'message' => 'Avatares generados y guardados exitosamente',\n                'dog' => \$dog\n            ]);" =>
    "return response(json_encode([\n                'message' => 'Avatares generados y guardados exitosamente',\n                'dog' => \$dog\n            ], JSON_INVALID_UTF8_SUBSTITUTE), 200, ['Content-Type' => 'application/json']);",
];

foreach ($replacements as $search => $replace) {
    if (strpos($content, $search) !== false) {
        $content = str_replace($search, $replace, $content);
    } else {
        echo "Could not find:\n$search\n\n";
    }
}

file_put_contents($file, $content);
echo "DogController patched successfully\n";
