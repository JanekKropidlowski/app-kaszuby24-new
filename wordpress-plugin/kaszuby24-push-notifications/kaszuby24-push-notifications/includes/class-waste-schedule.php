<?php

if (!defined('ABSPATH')) {
    exit;
}

class Kaszuby24_Waste_Schedule {

    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes() {
        register_rest_route('kaszuby24/v1', '/waste-schedule', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_waste_schedule'),
            'permission_callback' => '__return_true',
            'args' => array(
                'city' => array(
                    'required' => false,
                    'type' => 'string'
                )
            )
        ));
    }

    public function get_waste_schedule($request) {
        $city = $request->get_param('city');
        if (empty($city)) {
            $city = 'reda';
        }
        
        $json_filename = 'waste-data-' . sanitize_text_field($city) . '.json';
        $json_path = dirname(__FILE__) . '/' . $json_filename;
        
        // Fallback to reda if specific city not found (for development/demo)
        if (!file_exists($json_path) && $city !== 'reda') {
             $json_path = dirname(__FILE__) . '/waste-data-reda.json';
        }

        if (!file_exists($json_path)) {
            return new WP_Error('no_data', 'Waste schedule data not found for ' . $city, array('status' => 404));
        }

        $json_data = file_get_contents($json_path);
        $data = json_decode($json_data, true);

        if (!$data) {
            return new WP_Error('invalid_data', 'Invalid waste schedule data', array('status' => 500));
        }

        // --- MERGE MANUAL EVENTS / OVERRIDES ---
        // This allows adding extra events like "Gabaryty" manually without re-parsing XLSX.
        // We look for a file named `manual-waste-data-{city}.json` in uploads directory
        $manual_json_path = WP_CONTENT_DIR . '/uploads/waste-schedules/manual-waste-data-' . sanitize_text_field($city) . '.json';
        
        if (file_exists($manual_json_path)) {
            $manual_content = file_get_contents($manual_json_path);
            $manual_data = json_decode($manual_content, true);

            if ($manual_data && is_array($manual_data)) {
                foreach ($data['regions'] as &$region) {
                    $region_id = $region['id'];
                    
                    // Check if we have manual data for this region
                    if (isset($manual_data[$region_id]) && is_array($manual_data[$region_id])) {
                        // For each manual entry, either replace or add to the schedule
                        foreach ($manual_data[$region_id] as $manual_entry) {
                            $manual_date = $manual_entry['date'];
                            $manual_types = $manual_entry['types'];
                            
                            $found = false;
                            foreach ($region['schedule'] as &$schedule_item) {
                                if ($schedule_item['date'] === $manual_date) {
                                    // Found matching date - merge types, ensuring no duplicates
                                    $combined_types = array_unique(array_merge($schedule_item['types'], $manual_types));
                                    $schedule_item['types'] = array_values($combined_types);
                                    $found = true;
                                    break;
                                }
                            }
                            
                            if (!$found) {
                                // Date not found in original schedule - add it
                                $region['schedule'][] = array(
                                    'date' => $manual_date,
                                    'types' => $manual_types
                                );
                            }
                        }
                        
                        // Re-sort schedule by date
                        usort($region['schedule'], function($a, $b) {
                            return strcmp($a['date'], $b['date']);
                        });
                    }
                }
            }
        }

        return new WP_REST_Response($data, 200);
    }
}
