cd /var/www/agilityasturias/agility_back
php artisan tinker << 'EOF'
$boo = App\Models\Dog::where('name', 'Boo')->first();
if ($boo) {
    echo "Boo owners:\n";
    print_r($boo->users->toArray());
}
$fits = App\Models\Dog::where('name', 'FITS')->first();
if ($fits) {
    echo "Fits owners:\n";
    print_r($fits->users->toArray());
}
EOF
