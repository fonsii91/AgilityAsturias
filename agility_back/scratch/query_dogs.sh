cd /var/www/agilityasturias/agility_back
php artisan tinker << 'EOF'
print_r(App\Models\Dog::whereIn('name', ['Draco', 'Yaco', 'Ticket', 'Fits', 'Kéfir', 'Boo'])->get(['id', 'name', 'club_id'])->toArray());
EOF
