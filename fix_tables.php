<?php
// fix_tables.php
// Este script convierte todas las tablas de MyISAM a InnoDB para Hostalia
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h1>Optimizador de Tablas a InnoDB</h1>";

try {
    $envPath = __DIR__ . '/../../agility_back_core/.env';
    $envConfig = [];
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $name = trim($parts[0]);
                $value = trim($parts[1]);
                if (preg_match('/^"(.*)"$/', $value, $matches)) { $value = $matches[1]; }
                $envConfig[$name] = $value;
            }
        }
    } else {
        die("No se encontró el archivo .env en " . $envPath);
    }
    
    $dbHost = $envConfig['DB_HOST'] ?? '127.0.0.1';
    $dbPort = $envConfig['DB_PORT'] ?? '3306';
    $dbName = $envConfig['DB_DATABASE'] ?? 'forge';
    $dbUser = $envConfig['DB_USERNAME'] ?? 'forge';
    $dbPass = $envConfig['DB_PASSWORD'] ?? '';

    $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};port={$dbPort}", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $pdo->exec("SET FOREIGN_KEY_CHECKS=0");
    
    $successCount = 0;
    foreach ($tables as $tableName) {
        try {
            $pdo->exec("ALTER TABLE `{$tableName}` ENGINE=InnoDB");
            echo "<p style='color:green;'>✅ Tabla <b>{$tableName}</b> convertida a InnoDB.</p>";
            $successCount++;
        } catch(Exception $e) {
            echo "<p style='color:red;'>❌ Error en tabla <b>{$tableName}</b>: " . $e->getMessage() . "</p>";
        }
    }

    $pdo->exec("SET FOREIGN_KEY_CHECKS=1");
    
    echo "<h2>Proceso terminado: {$successCount} tablas optimizadas.</h2>";
    echo "<p>Ya puedes volver y ejecutar el archivo <strong>run_migrations.php</strong> normal.</p>";

} catch (\Exception $e) {
    echo "<p style='color:red;'><strong>Error fatal de conexión PDO:</strong> " . $e->getMessage() . "</p>";
}
