<?php
// Load WordPress environment
require_once('d:\Nowy folder (7)\app-kaszuby24\wp-load.php');

if (class_exists('Kaszuby24_PKS_Gdynia_Proxy')) {
    $proxy = new Kaszuby24_PKS_Gdynia_Proxy();
    
    echo "Fetching all lines...\n";
    $lines = $proxy->fetch_all_lines();
    
    echo "Found " . count($lines) . " lines.\n";
    if (!empty($lines)) {
        echo "First line example:\n";
        print_r($lines[0]);
    } else {
        echo "No lines found. Checking error log might be needed.\n";
    }
} else {
    echo "Proxy class not found.\n";
}
