<?php
/**
 * Debug Script: Verify Robust GTFS Logic
 * Run this to check if Reda Rekowo (6882) has valid departures for today.
 */

require_once(dirname(__FILE__) . '/../../../../wp-load.php');

$agency = 'polregio';
$stop_id = '6882';

$transport = new Kaszuby24_Transport();
$request = new WP_REST_Request('GET', '/kaszuby24/v1/transport/timetable');
$request->set_param('agency', $agency);
$request->set_param('stop_id', $stop_id);

$response = $transport->get_timetable($request);
$data = $response->get_data();

echo "--- TIMETABLE FOR REDA REKOWO (" . current_time('Y-m-d H:i') . ") ---\n";

if (empty($data)) {
    echo "❌ No departures found. Check if GTFS is indexed and today's services are active.\n";
} else {
    foreach ($data as $dep) {
        $next_day = isset($dep['attributes']['is_next_day']) && $dep['attributes']['is_next_day'] ? " (+1day)" : "";
        printf("[%s%s] %s -> %s (Trip: %s)\n", 
            $dep['time'], 
            $next_day,
            $dep['line'], 
            $dep['destination'], 
            $dep['trip_id']
        );
        
        // Check for orphaned
        if (empty($dep['destination'])) {
            echo "   ⚠️ ORPHANED DETECTED!\n";
        }
    }
}

echo "--- END ---\n";
