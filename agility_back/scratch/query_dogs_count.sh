cd /var/www/agilityasturias/agility_back
php artisan tinker << 'EOF'
echo "Dogs count for Xanastur (club 3): " . App\Models\Dog::where('club_id', 3)->count() . "\n";
echo "Dogs count for Agility Asturias (club 1): " . App\Models\Dog::where('club_id', 1)->count() . "\n";
EOF
