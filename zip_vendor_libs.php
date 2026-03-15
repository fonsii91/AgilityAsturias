<?php

function createLinuxCompatibleZip($sourceDirs, $zipFile) {
    if (file_exists($zipFile)) {
        unlink($zipFile);
    }
    
    $zip = new ZipArchive();
    if ($zip->open($zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        die("Failed to create zip file: $zipFile\n");
    }

    foreach ($sourceDirs as $sourceDir) {
        if (!is_dir($sourceDir)) continue;
        
        $sourceDirReal = realpath($sourceDir);
        $baseName = basename($sourceDirReal);

        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($sourceDirReal),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $name => $file) {
            if (!$file->isDir()) {
                $filePath = $file->getRealPath();
                // Get path relative to the specific vendor folder
                $relativePath = substr($filePath, strlen($sourceDirReal) + 1);
                $relativePath = str_replace('\\', '/', $relativePath);
                // Prepend the vendor/ folder name so it extracts correctly inside vendor/
                $zip->addFile($filePath, 'vendor/' . $baseName . '/' . $relativePath);
            }
        }
    }
    $zip->close();
    echo "Zip created successfully: $zipFile\n";
}

$vendorPath = 'c:\\Users\\Usuario\\Desktop\\AgilityAsturiass\\agility_back\\vendor';
$dirsToZip = [
    $vendorPath . '\\google',
    $vendorPath . '\\firebase',
    $vendorPath . '\\composer',
    $vendorPath . '\\guzzlehttp',
    $vendorPath . '\\psr',
    $vendorPath . '\\monolog'
];

$zipFile = 'c:\\Users\\Usuario\\Desktop\\AgilityAsturiass\\agility_back\\nuevas_librerias.zip';
createLinuxCompatibleZip($dirsToZip, $zipFile);
