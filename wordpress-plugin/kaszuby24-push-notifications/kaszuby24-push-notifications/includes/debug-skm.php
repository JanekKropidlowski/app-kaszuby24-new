<?php
header('Content-Type: text/plain');
define('DONOTCACHEPAGE', true);

$wp_load_path = dirname(dirname(dirname(dirname(dirname(__FILE__))))) . '/wp-load.php';
require_once($wp_load_path);

$stop_id = '4705';
$agency = 'skm';
$cache_dir = WP_CONTENT_DIR . '/uploads/gtfs-cache';
$file = $cache_dir . "/{$agency}/departures/{$stop_id}.json";
$services_file = $cache_dir . "/{$agency}/services.json";

echo "DEBUG SKM STOP {$stop_id}\n";
echo str_repeat('=', 50) . "\n";

if (!file_exists($file)) {
    die("ERROR: Departure file not found: $file\n");
}

$data = json_decode(file_get_contents($file), true);
echo "Total departures in file: " . count($data) . "\n";

$now = current_time('H:i');
$today = current_time('Ymd');
$day_of_week = (int)current_time('w');
$day_map = array(1=>0, 2=>1, 3=>2, 4=>3, 5=>4, 6=>5, 0=>6);
$current_day_idx = $day_map[$day_of_week];

echo "Current server time: $now\n";
echo "Current Date: $today\n";
echo "Current Day Index: $current_day_idx (0=Mon, 6=Sun)\n";

$services = array();
if (file_exists($services_file)) {
    $services = json_decode(file_get_contents($services_file), true);
    echo "Services loaded: " . count($services) . "\n";
}

echo "\nSample departures (first 5):\n";
foreach (array_slice($data, 0, 5) as $dep) {
    echo "- Time: {$dep['time']} | Service: {$dep['service_id']} | Destination: {$dep['destination']}\n";
    if (isset($services[$dep['service_id']])) {
        $s = $services[$dep['service_id']];
        echo "  [Service OK] Range: {$s['start']}-{$s['end']} | Days: " . implode(',', $s['days']) . "\n";
        
        // Manual validation
        $in_range = ($today >= $s['start'] && $today <= $s['end']);
        $day_match = in_array($current_day_idx, $s['days']);
        $added = in_array($today, $s['added'] ?? []);
        $removed = in_array($today, $s['removed'] ?? []);
        
        echo "  VALIDATION: InRange=" . ($in_range ? 'Y':'N') . " | DayMatch=" . ($day_match ? 'Y':'N') . " | Added=" . ($added ? 'Y':'N') . " | Removed=" . ($removed ? 'Y':'N') . "\n";
        
        $valid = ($in_range && !$removed && $day_match) || $added;
        echo "  FINAL VALID: " . ($valid ? 'YES' : 'NO') . "\n";
    } else {
        echo "  [Service MISSING!]\n";
    }
}

die("\nDEBUG END\n");
