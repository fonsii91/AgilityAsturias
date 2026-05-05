<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = \App\Models\User::find(1);
$dog = $user->dogs()->findOrFail(10);
$dog->load(['users:id,name,email', 'pointHistories' => function ($query) {
    $query->orderBy('created_at', 'desc');
}]);

$json = json_encode($dog);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "JSON Encode Error: " . json_last_error_msg() . "\n";
    $array = $dog->toArray();
    array_walk_recursive($array, function(&$item, $key) {
        if (is_string($item) && !mb_check_encoding($item, 'UTF-8')) {
            echo "Bad string in key: $key\n";
        }
    });
} else {
    echo "JSON OK\n";
}
