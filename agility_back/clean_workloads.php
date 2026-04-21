<?php
\App\Models\DogWorkload::where('source_type', 'auto_competition')->whereNotIn('source_id', function($q) {
    $q->select('id')->from('competitions')->where('tipo', 'competicion');
})->delete();
echo "Cleanup done\n";
