cmd /c "powershell -ExecutionPolicy Bypass -File .\prepare_deploy.ps1"

Remove-Item -Path "deploy_package\*.zip" -Force -ErrorAction SilentlyContinue

$phpScript = @"
<?php
function createLinuxCompatibleZip(`$sourceDir, `$zipFile) {
    if (file_exists(`$zipFile)) {
        unlink(`$zipFile);
    }
    
    `$zip = new ZipArchive();
    if (`$zip->open(`$zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        die("Failed to create zip file: `$zipFile\n");
    }

    `$sourceDirReal = realpath(`$sourceDir);

    `$files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator(`$sourceDirReal),
        RecursiveIteratorIterator::LEAVES_ONLY
    );

    foreach (`$files as `$name => `$file) {
        if (!`$file->isDir()) {
            `$filePath = `$file->getRealPath();
            `$relativePath = substr(`$filePath, strlen(`$sourceDirReal) + 1);
            `$relativePath = str_replace('\\', '/', `$relativePath);
            `$zip->addFile(`$filePath, `$relativePath);
        }
    }
    `$zip->close();
    echo "Zip created successfully: `$zipFile\n";
}

// Zip httpdocs -> agilityasturias_com.zip
`$httpdocsSource = 'c:\\Users\\Fonsi\\Desktop\\AgilityAsturias\\deploy_package\\httpdocs';
`$httpdocsZip = 'c:\\Users\\Fonsi\\Desktop\\AgilityAsturias\\deploy_package\\agilityasturias_com.zip';
if (is_dir(`$httpdocsSource)) {
    createLinuxCompatibleZip(`$httpdocsSource, `$httpdocsZip);
}

// Zip backend core -> agility_back_core.zip
`$coreSource = 'c:\\Users\\Fonsi\\Desktop\\AgilityAsturias\\deploy_package\\agility_back_core';
`$coreZip = 'c:\\Users\\Fonsi\\Desktop\\AgilityAsturias\\deploy_package\\agility_back_core.zip';
if (is_dir(`$coreSource)) {
    // Excluir .env si se ha colado
    if (file_exists(`$coreSource . '\\.env')) {
        unlink(`$coreSource . '\\.env');
    }
    if (file_exists(`$coreSource . '\\.env.example')) {
        unlink(`$coreSource . '\\.env.example');
    }
    createLinuxCompatibleZip(`$coreSource, `$coreZip);
}
"@

Set-Content -Path "c:\Users\Fonsi\Desktop\AgilityAsturias\create_final_zips.php" -Value $phpScript
php c:\Users\Fonsi\Desktop\AgilityAsturias\create_final_zips.php

Remove-Item -Path "c:\Users\Fonsi\Desktop\AgilityAsturias\create_final_zips.php" -Force
Write-Host "Paquetes de despliegue listos en la carpeta deploy_package."
