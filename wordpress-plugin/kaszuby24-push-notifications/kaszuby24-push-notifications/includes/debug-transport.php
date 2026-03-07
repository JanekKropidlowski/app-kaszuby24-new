<?php
// Ten plik służy do debugowania ścieżek GTFS
require_once('../../../wp-load.php');
require_once('class-transport.php');

$transport = new Kaszuby24_Transport();
$upload_dir = wp_upload_dir();
$cache_dir = $upload_dir['basedir'] . '/gtfs-cache';

echo "Cache Dir Path: " . $cache_dir . "\n";
echo "Cache Dir Exists: " . (file_exists($cache_dir) ? 'YES' : 'NO') . "\n";

$agencies = ['polregio', 'pkp', 'wejherowo'];
foreach ($agencies as $agency) {
    $stops_file = $cache_dir . "/{$agency}_stops.json";
    echo "Agency: {$agency}\n";
    echo "  Stops JSON exists: " . (file_exists($stops_file) ? 'YES' : 'NO') . "\n";
    if (file_exists($stops_file)) {
        $data = json_decode(file_get_contents($stops_file), true);
        echo "  Stop count: " . count($data) . "\n";
    }
}
?>
