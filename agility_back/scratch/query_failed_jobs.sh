cd /var/www/agilityasturias/agility_back
php artisan tinker << 'EOF'
print_r(DB::table('failed_jobs')->get()->toArray());
EOF
