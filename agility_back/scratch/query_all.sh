cd /var/www/agilityasturias/agility_back
php artisan tinker << 'EOF'
print_r(App\Models\Competition::whereIn('id', [37, 50])->get(['id', 'nombre', 'scrape_status', 'scrape_error', 'updated_at'])->toArray());
EOF
