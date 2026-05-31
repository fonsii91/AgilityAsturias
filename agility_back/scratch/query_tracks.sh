cd /var/www/agilityasturias/agility_back
php artisan tinker << 'EOF'
$rsceCount = App\Models\RsceTrack::withoutGlobalScopes()->where('notes', 'like', '%FlowAgility%')->where('date', '>=', '2026-05-25')->count();
echo "Imported RSCE tracks count: $rsceCount\n";
EOF
