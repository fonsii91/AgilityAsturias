cd /var/www/agilityasturias/agility_back
php artisan tinker << 'EOF'
$count = App\Models\Competition::where('scraped_at', '2026-05-20 22:53:17')->update([
    'results_scraped' => 0,
    'scrape_status' => 'pending',
    'scraped_at' => null,
    'scrape_error' => null
]);
echo "Reset $count competitions on production.\n";
EOF
