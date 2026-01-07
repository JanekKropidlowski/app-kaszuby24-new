<?php
$wp_load_path = dirname(dirname(dirname(dirname(dirname(__FILE__))))) . '/wp-load.php';
require_once($wp_load_path);

$agency = 'skm';
$cache_dir = WP_CONTENT_DIR . '/uploads/gtfs-cache/skm';
$services_file = $cache_dir . '/services.json';

$output = "SKM GLOBAL DATE CHECK\n";
$output .= "Today: " . current_time('Ymd') . "\n";

if (file_exists($services_file)) {
    $services = json_decode(file_get_contents($services_file), true);
    $valid_ids = [];
    $overlap_ranges = [];
    
    foreach ($services as $id => $s) {
        if (current_time('Ymd') >= $s['start'] && current_time('Ymd') <= $s['end']) {
            $valid_ids[] = $id;
        }
        $overlap_ranges[] = "{$s['start']}-{$s['end']}";
    }
    
    $output .= "Services in range: " . count($valid_ids) . "\n";
    if (count($valid_ids) > 0) {
        $output .= "Example valid IDs: " . implode(', ', array_slice($valid_ids, 0, 5)) . "\n";
    } else {
        $output .= "WARNING: NO services found for today's date range!\n";
        $output .= "Found ranges like: " . implode(', ', array_unique(array_slice($overlap_ranges, 0, 10))) . "\n";
    }
} else {
    $output .= "ERROR: services.json not found!\n";
}

wp_die("<pre>$output</pre>");
