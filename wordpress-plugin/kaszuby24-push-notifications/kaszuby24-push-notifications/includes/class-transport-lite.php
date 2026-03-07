<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Lightweight transport stops endpoint - optimized for mobile performance
 * Only returns essential fields with smart bbox filtering and sorting
 */
class Kaszuby24_Transport_Lite
{

    private $namespace = 'kaszuby24/v1';
    private $cache_dir;

    public function __construct()
    {
        $upload_dir = wp_upload_dir();
        $this->cache_dir = $upload_dir['basedir'] . '/gtfs-cache';

        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes()
    {
        // Lightweight stops endpoint
        register_rest_route($this->namespace, '/transport/stops_lite', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_stops_lite'),
            'permission_callback' => '__return_true',
            'args' => array(
                'agency' => array(
                    'required' => true,
                    'type' => 'string',
                    'enum' => array('polregio', 'pkp', 'pks', 'bus', 'tram', 'wejherowo', 'all', 'all_rail', 'skm', 'pksgdynia', 'gdansk', 'gdynia', 'intercity', 'mevo', 'all_static')
                ),
                'min_lat' => array('required' => false, 'type' => 'number'),
                'max_lat' => array('required' => false, 'type' => 'number'),
                'min_lon' => array('required' => false, 'type' => 'number'),
                'max_lon' => array('required' => false, 'type' => 'number'),
                'limit' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 5000,
                    'minimum' => 10,
                    'maximum' => 10000
                )
            )
        ));
    }

    public function get_stops_lite($request)
    {
        @error_reporting(0);
        @ini_set('display_errors', '0');
        ob_start();

        $agency = strtolower($request->get_param('agency'));
        $min_lat = $request->get_param('min_lat');
        $max_lat = $request->get_param('max_lat');
        $min_lon = $request->get_param('min_lon');
        $max_lon = $request->get_param('max_lon');
        $limit = (int) $request->get_param('limit');
        if (!$limit)
            $limit = 150;

        // Get stops from cache
        $all_stops = $this->get_stops_from_cache($agency);

        // SYNC MODE: If all_static and no bbox, return everything (limited by heavy cap)
        if ($agency === 'all_static') {
            // Return only essential fields (ultra lightweight)
            $lite = array_map(function ($s) {
                return array(
                    'id' => $s['id'],
                    'n' => $s['name'], // Shortened keys for smaller payload
                    'lat' => floatval($s['lat']),
                    'lon' => floatval($s['lon']),
                    'a' => $s['agency'] // Shortened agency
                );
            }, $all_stops); // No filtering, return all

            ob_end_clean();
            return new WP_REST_Response($lite, 200);
        }

        // --- NORMAL BBOX MODE ---

        $bbox = array(
            'min_lat' => floatval($min_lat),
            'max_lat' => floatval($max_lat),
            'min_lon' => floatval($min_lon),
            'max_lon' => floatval($max_lon)
        );

        // Calculate bbox center for smart sorting
        $center_lat = ($bbox['min_lat'] + $bbox['max_lat']) / 2;
        $center_lon = ($bbox['min_lon'] + $bbox['max_lon']) / 2;

        // Filter by bbox
        $filtered = array_filter($all_stops, function ($s) use ($bbox) {
            return isset($s['lat']) && isset($s['lon']) &&
                $s['lat'] >= $bbox['min_lat'] &&
                $s['lat'] <= $bbox['max_lat'] &&
                $s['lon'] >= $bbox['min_lon'] &&
                $s['lon'] <= $bbox['max_lon'];
        });

        // Smart sorting: distance from center, then priority
        usort($filtered, function ($a, $b) use ($center_lat, $center_lon) {
            // Priority score (rail > PKS > bus > mevo)
            $a_priority = $this->get_agency_priority($a['agency']);
            $b_priority = $this->get_agency_priority($b['agency']);

            // If priority differs significantly, use priority
            $priority_diff = $b_priority - $a_priority;
            if (abs($priority_diff) > 5) {
                return $priority_diff;
            }

            // Otherwise sort by distance from center (closer first)
            $a_dist = $this->calculate_distance($a['lat'], $a['lon'], $center_lat, $center_lon);
            $b_dist = $this->calculate_distance($b['lat'], $b['lon'], $center_lat, $center_lon);

            if ($a_dist < $b_dist)
                return -1;
            if ($a_dist > $b_dist)
                return 1;
            return 0;
        });

        // Apply limit
        $limited = array_slice($filtered, 0, $limit);

        // Return only essential fields (lightweight)
        $lite = array_map(function ($s) {
            return array(
                'id' => $s['id'],
                'name' => $s['name'],
                'lat' => floatval($s['lat']),
                'lon' => floatval($s['lon']),
                'agency' => $s['agency']
            );
        }, $limited);

        ob_end_clean();
        return new WP_REST_Response($lite, 200);
    }

    /**
     * Get agency priority for sorting (higher = more important)
     * Priority: SKM (110) > POLREGIO (100) > MZK Wejherowo (90) > PKS (80) > other buses (50)
     */
    private function get_agency_priority($agency)
    {
        $agency_lower = strtolower($agency ?? '');

        // SKM gets highest priority
        if (strpos($agency_lower, 'skm') !== false) {
            return 110;
        }

        // POLREGIO gets second priority
        if (strpos($agency_lower, 'polregio') !== false || strpos($agency_lower, 'regio') !== false) {
            return 100;
        }

        // MZK Wejherowo gets third priority
        if (strpos($agency_lower, 'mzk') !== false || strpos($agency_lower, 'wejherowo') !== false) {
            return 90;
        }

        // PKS gets good priority (only ~85 stops, need visibility)
        if (strpos($agency_lower, 'pks') !== false) {
            return 80;
        }

        // Other rail systems
        if (
            strpos($agency_lower, 'rail') !== false ||
            strpos($agency_lower, 'intercity') !== false ||
            strpos($agency_lower, 'pkp') !== false
        ) {
            return 70;
        }

        // Urban bus systems
        if (
            strpos($agency_lower, 'ztm') !== false ||
            strpos($agency_lower, 'zkm') !== false ||
            strpos($agency_lower, 'gdansk') !== false ||
            strpos($agency_lower, 'gdynia') !== false
        ) {
            return 50;
        }

        // MEVO gets lowest priority (many stations)
        if (strpos($agency_lower, 'mevo') !== false) {
            return 10;
        }

        return 30; // Default
    }

    /**
     * Calculate distance between two points (Haversine formula)
     */
    private function calculate_distance($lat1, $lon1, $lat2, $lon2)
    {
        $earth_radius = 6371; // km

        $dlat = deg2rad($lat2 - $lat1);
        $dlon = deg2rad($lon2 - $lon1);

        $a = sin($dlat / 2) * sin($dlat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dlon / 2) * sin($dlon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earth_radius * $c;
    }

    /**
     * Get stops from cache file(s)
     */
    private function get_stops_from_cache($agency)
    {
        $all_stops = array();

        if ($agency === 'all' || $agency === 'all_rail' || $agency === 'all_static') {
            // Aggregate multiple agencies
            if ($agency === 'all_rail') {
                $agencies = array('polregio', 'pkp', 'skm', 'intercity');
            } elseif ($agency === 'all_static') {
                // EXCLUDING heavy agencies like ZTM Gdansk and MEVO for sync
                $agencies = array('polregio', 'wejherowo', 'pkp', 'skm', 'gdynia', 'intercity', 'pksgdynia');
            } else {
                $agencies = array('polregio', 'wejherowo', 'pkp', 'skm', 'gdynia', 'intercity', 'gdansk', 'mevo', 'pksgdynia');
            }

            foreach ($agencies as $ag) {
                $file = $this->cache_dir . "/{$ag}_stops.json";
                if (file_exists($file)) {
                    $stops = json_decode(file_get_contents($file), true);
                    if (is_array($stops)) {
                        // Ensure agency field
                        foreach ($stops as &$s) {
                            if (!isset($s['agency'])) {
                                $s['agency'] = $ag;
                            }
                        }
                        $all_stops = array_merge($all_stops, $stops);
                    }
                }
            }
        } else {
            // Single agency
            $file = $this->cache_dir . "/{$agency}_stops.json";
            if (file_exists($file)) {
                $stops = json_decode(file_get_contents($file), true);
                if (is_array($stops)) {
                    $all_stops = $stops;
                }
            }
        }

        return $all_stops;
    }
}

// Initialize the lite endpoint
new Kaszuby24_Transport_Lite();
