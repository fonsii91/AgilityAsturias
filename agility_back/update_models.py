import os
import re

models_dir = r"c:\Users\Fonsi\Desktop\AgilityAsturias\agility_back\app\Models"
models_to_update = [
    "Announcement.php", "Competition.php", "DailyVideoStat.php", 
    "DeletedVideoHistory.php", "Dog.php", "DogWorkload.php", 
    "GalleryImage.php", "PersonalEvent.php", "PointHistory.php", 
    "Reservation.php", "Resource.php", "RsceTrack.php", 
    "Suggestion.php", "TimeSlot.php", "TimeSlotException.php", "Video.php"
]

for model_file in models_to_update:
    filepath = os.path.join(models_dir, model_file)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if "use App\\Traits\\HasClub;" not in content:
            # Insert import after namespace
            content = re.sub(r'(namespace App\\Models;)', r'\1\n\nuse App\\Traits\\HasClub;', content)
            
            # Insert trait inside class definition
            # Find class XXX extends YYY\n{
            # Replace with class XXX extends YYY\n{\n    use HasClub;
            content = re.sub(r'(class\s+\w+\s+extends\s+\w+\s*\{)', r'\1\n    use HasClub;', content)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
        print(f"Updated {model_file}")
    else:
        print(f"File not found: {model_file}")
