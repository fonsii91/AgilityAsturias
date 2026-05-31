cd /var/www/agilityasturias/agility_back
php artisan tinker << 'EOF'
print_r(App\Models\RsceTrack::withoutGlobalScopes()->where('notes', 'like', '%FlowAgility%')->where('date', '>=', '2026-05-25')->get()->toArray());
print_r(App\Models\RfecTrack::withoutGlobalScopes()->where('notes', 'like', '%FlowAgility%')->where('date', '>=', '2026-05-25')->get()->toArray());
EOF
