<?php
while (ob_get_level()) ob_end_clean();
header('Content-Type: text/plain');
header('X-Debug: True');

$wp_load_path = dirname(dirname(dirname(dirname(dirname(__FILE__))))) . '/wp-load.php';
require_once($wp_load_path);

$stop_id = '4705';
$agency = 'skm';
$cache_dir = WP_CONTENT_DIR . '/uploads/gtfs-cache';
$file = $cache_dir . "/{$agency}/departures/{$stop_id}.json";
$services_file = $cache_dir . "/{$agency}/services.json";

echo "DEBUG SKM DATA\n";
echo "Date: " . current_time('Ymd') . "\n";

if (file_exists($services_file)) {
    $services = json_decode(file_get_contents($services_file), true);
    echo "Services count: " . count($services) . "\n";
    $first = reset($services);
    echo "Sample Service Range: " . ($first['start'] ?? 'N/A') . " to " . ($first['end'] ?? 'N/A') . "\n";
} else {
    echo "ERROR: services.json not found!\n";
}

if (file_exists($file)) {
    $deps = json_decode(file_get_contents($file), true);
    echo "Total departures for stop $stop_id: " . count($deps) . "\n";
}

die("\nEND\n");
