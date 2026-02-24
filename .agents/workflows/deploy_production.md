---
description: Prepare Hostalia Production Deployment
---

# Preparar Despliegue en Hostalia

Este workflow automatiza la preparación de los archivos para subirlos a producción en Hostalia. 
Utiliza un script en PowerShell para organizar las carpetas y un script en PHP para generar archivos `.zip` con paths de Linux para evitar el `filemng error`.

// turbo-all
1. Ejecutar el script maestro de preparación y empaquetado:
```powershell
# Bypassing execution policy and executing the preparation scripts

# 1. Ejecutamos el script de preparación de carpetas (crea deploy_package/httpdocs y deploy_package/agility_back_core)
cmd /c "powershell -ExecutionPolicy Bypass -File .\prepare_deploy.ps1"

# 2. Borramos zips antiguos por si acaso
Remove-Item -Path "deploy_package\*.zip" -Force -ErrorAction SilentlyContinue

# 3. Creamos un script PHP temporal para generar ZIPs cien por cien compatibles con el extractor de Hostalia
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
`$httpdocsSource = 'c:\\Users\\Usuario\\Desktop\\AgilityAsturiass\\deploy_package\\httpdocs';
`$httpdocsZip = 'c:\\Users\\Usuario\\Desktop\\AgilityAsturiass\\deploy_package\\agilityasturias_com.zip';
if (is_dir(`$httpdocsSource)) {
    createLinuxCompatibleZip(`$httpdocsSource, `$httpdocsZip);
}

// Zip backend core -> agility_back_core.zip
`$coreSource = 'c:\\Users\\Usuario\\Desktop\\AgilityAsturiass\\deploy_package\\agility_back_core';
`$coreZip = 'c:\\Users\\Usuario\\Desktop\\AgilityAsturiass\\deploy_package\\agility_back_core.zip';
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

# 4. Ejecutamos el script PHP
Set-Content -Path "c:\Users\Usuario\Desktop\AgilityAsturiass\create_final_zips.php" -Value $phpScript
php c:\Users\Usuario\Desktop\AgilityAsturiass\create_final_zips.php

# 5. Limpiamos
Remove-Item -Path "c:\Users\Usuario\Desktop\AgilityAsturiass\create_final_zips.php" -Force
Write-Host "Paquetes de despliegue listos en la carpeta deploy_package."
```
