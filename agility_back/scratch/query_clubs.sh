cd /var/www/agilityasturias/agility_back
php artisan tinker << 'EOF'
print_r(App\Models\Club::pluck('name', 'id')->toArray());
EOF
