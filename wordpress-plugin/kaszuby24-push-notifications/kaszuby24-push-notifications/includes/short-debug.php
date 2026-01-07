<?php
$wp_load_path = dirname(dirname(dirname(dirname(dirname(__FILE__))))) . '/wp-load.php';
require_once($wp_load_path);
$agency = 'skm';
$cache_dir = WP_CONTENT_DIR . '/uploads/gtfs-cache/skm';
$services_file = $cache_dir . '/services.json';
if (file_exists($services_file)) {
    $services = json_decode(file_get_contents($services_file), true);
    foreach ($services as $s) {
        $today = date('Ymd');
        if ($today >= $s['start'] && $today <= $s['end']) {
            error_log("SKM DEBUG: Found valid service for today! ID: " . array_search($s, $services));
            header('X-SKM-Valid: Yes');
            echo "VALID_SERVICE_FOUND";
            die();
        }
    }
    error_log("SKM DEBUG: NO VALID SERVICES FOR TODAY!");
    header('X-SKM-Valid: No');
    echo "NO_VALID_SERVICE";
} else {
    echo "NO_SERVICES_FILE";
}
die();
