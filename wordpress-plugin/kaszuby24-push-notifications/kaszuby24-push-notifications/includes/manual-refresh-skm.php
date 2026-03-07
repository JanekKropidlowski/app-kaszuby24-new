<?php
/**
 * Manual SKM GTFS Refresh Script
 * Run this file directly: php manual-refresh-skm.php
 * Or visit it in browser: https://kaszuby24.pl/wp-content/plugins/.../manual-refresh-skm.php
 */

// Load WordPress
$wp_load_path = dirname(dirname(dirname(dirname(dirname(__FILE__))))) . '/wp-load.php';
if (!file_exists($wp_load_path)) {
    die("ERROR: Cannot find wp-load.php at: $wp_load_path\n");
}
require_once($wp_load_path);

echo "Starting SKM GTFS refresh...\n";
echo str_repeat('=', 50) . "\n";

if (class_exists('Kaszuby24_Transport')) {
    $transport = new Kaszuby24_Transport();
    
    // Create a mock request object
    $request = new WP_REST_Request('POST', '/kaszuby24/v1/transport/refresh');
    $request->set_param('agency', 'skm');
    
    echo "Calling refresh_gtfs for SKM...\n";
    $start = microtime(true);
    
    $response = $transport->refresh_gtfs($request);
    
    $elapsed = round(microtime(true) - $start, 2);
    echo "\nCompleted in {$elapsed} seconds\n";
    echo str_repeat('=', 50) . "\n";
    
    if (is_wp_error($response)) {
        echo "ERROR: " . $response->get_error_message() . "\n";
    } else {
        $data = $response->get_data();
        echo "Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
        
        // Check if files were created
        $cache_dir = WP_CONTENT_DIR . '/uploads/gtfs-cache';
        $stops_file = $cache_dir . '/skm_stops.json';
        
        if (file_exists($stops_file)) {
            $size = filesize($stops_file);
            echo "\n✓ SUCCESS! SKM stops file created: " . number_format($size) . " bytes\n";
            
            $stops = json_decode(file_get_contents($stops_file), true);
            echo "✓ Total SKM stops: " . count($stops) . "\n";
        } else {
            echo "\n✗ WARNING: SKM stops file not found at: $stops_file\n";
        }
    }
} else {
    die("ERROR: Kaszuby24_Transport class not found!\n");
}

echo "\nDone!\n";
