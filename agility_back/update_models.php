<?php
$models_dir = __DIR__ . '/app/Models';
$models_to_update = [
    "Announcement.php", "Competition.php", "DailyVideoStat.php", 
    "DeletedVideoHistory.php", "Dog.php", "DogWorkload.php", 
    "GalleryImage.php", "PersonalEvent.php", "PointHistory.php", 
    "Reservation.php", "Resource.php", "RsceTrack.php", 
    "Suggestion.php", "TimeSlot.php", "TimeSlotException.php", "Video.php"
];

foreach ($models_to_update as $model_file) {
    $filepath = $models_dir . '/' . $model_file;
    if (file_exists($filepath)) {
        $content = file_get_contents($filepath);
        if (strpos($content, 'use App\Traits\HasClub;') === false) {
            $content = preg_replace('/(namespace App\\\\Models;)/', "$1\n\nuse App\\Traits\\HasClub;", $content);
            $content = preg_replace('/(class\s+\w+\s+extends\s+\w+.*?\{)/s', "$1\n    use HasClub;", $content);
            file_put_contents($filepath, $content);
            echo "Updated $model_file\n";
        } else {
            echo "Already updated $model_file\n";
        }
    } else {
        echo "File not found: $model_file\n";
    }
}
