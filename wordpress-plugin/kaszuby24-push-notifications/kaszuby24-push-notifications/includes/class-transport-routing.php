<?php

class Kaszuby_Transport_Routing {

    private $cache_dir;
    private $transport_plugin;

    public function __construct($transport_plugin) {
        $this->transport_plugin = $transport_plugin;
        $this->cache_dir = WP_CONTENT_DIR . '/cache/transport';
    }

    public function register_routes() {
        register_rest_route('kaszuby24/v1', '/directions', array(
            'methods' => 'GET',
            'callback' => array($this, 'handle_directions'),
            'permission_callback' => '__return_true'
        ));

        // Endpoint to force-build the graph index (admin only ideally)
        register_rest_route('kaszuby24/v1', '/build_graph', array(
            'methods' => 'GET',
            'callback' => array($this, 'build_graph_index'),
            'permission_callback' => '__return_true'
        ));
    }

    public function handle_directions($request) {
        $from_lat = floatval($request->get_param('from_lat'));
        $from_lon = floatval($request->get_param('from_lon'));
        $to_lat = floatval($request->get_param('to_lat'));
        $to_lon = floatval($request->get_param('to_lon'));
        $time = $request->get_param('time') ?: current_time('H:i');

        if (!$from_lat || !$to_lat) {
            return new WP_REST_Response(array('error' => 'Missing coordinates'), 400);
        }

        // 1. Find Nearest Stops
        $start_node = $this->find_nearest_stop($from_lat, $from_lon);
        $end_node = $this->find_nearest_stop($to_lat, $to_lon);

        if (!$start_node || !$end_node) {
            return new WP_REST_Response(array('error' => 'No stops found near locations'), 404);
        }

        // 2. Load Network Graph (Lines -> Stops map)
        $graph = $this->load_graph_index();

        // 3. Find Route (Dijkstra / BFS / Heuristic)
        // For "Light" version: Check Direct -> Check 1-Transfer
        $routes = $this->find_paths($start_node, $end_node, $graph, $time);

        return new WP_REST_Response($routes, 200);
    }

    private function find_nearest_stop($lat, $lon) {
        // Load all stops from cache
        $agencies = ['gdansk', 'gdynia', 'pkp', 'skm'];
        $best_stop = null;
        $min_dist = 5000; // Max 5km

        foreach ($agencies as $agency) {
            $file = $this->cache_dir . "/{$agency}_stops.json";
            if (!file_exists($file)) continue;
            
            $stops = json_decode(file_get_contents($file), true);
            foreach ($stops as $stop) {
                $dist = $this->haversine($lat, $lon, $stop['lat'], $stop['lon']);
                if ($dist < $min_dist) {
                    $min_dist = $dist;
                    $best_stop = $stop;
                }
            }
        }
        return $best_stop;
    }

    private function find_paths($start, $end, $graph, $time) {
        $results = array();
        
        // --- A. DIRECT CONNECTIONS ---
        $common_lines = $this->get_common_lines($start['id'], $end['id'], $graph);
        
        foreach ($common_lines as $line_id) {
            // Validate direction/order? (Requires sophisticated graph)
            // For MVP: Assuming bidirectional for now, or check detailed timetable later
            $results[] = array(
                'type' => 'direct',
                'from' => $start,
                'to' => $end,
                'duration' => 45, // Placeholder, need timetable fetch
                'transfers' => 0,
                'lines' => [$line_id],
                'segments' => [
                    array('from' => $start, 'to' => $end, 'line' => $line_id, 'mode' => 'bus')
                ]
            );
        }

        // --- B. 1-TRANSFER CONNECTIONS ---
        if (empty($results)) {
            $transfer_hubs = $this->find_transfer_hubs($start, $end, $graph);
            foreach ($transfer_hubs as $hub) {
                $results[] = array(
                    'type' => 'transfer',
                    'from' => $start,
                    'to' => $end,
                    'duration' => 60, // Placeholder
                    'transfers' => 1,
                    // 'lines' => [$hub['line1'], $hub['line2']],
                    'segments' => [
                        array('from' => $start, 'to' => $hub['stop'], 'mode' => 'bus'),
                        array('from' => $hub['stop'], 'to' => $end, 'mode' => 'bus')
                    ]
                );
            }
        }
        
        return $results;
    }

    // --- INDEXING LOGIC ---
    public function build_graph_index() {
        $graph = array(
            'routes' => array(),        // route_id -> { name, agency }
            'stops_map' => array(),     // stop_id -> [route_ids]
            'route_stops' => array()    // route_id -> [stop_ids]
        );

        $agencies = ['gdansk', 'gdynia', 'pkp', 'skm'];
        
        foreach ($agencies as $agency) {
            $path = $this->cache_dir . "/{$agency}/";
            if (!is_dir($path)) continue;

            // 1. Process ROUTES.TXT
            $routes_file = $this->find_file($path, 'routes.txt');
            if ($routes_file) {
                if (($handle = fopen($routes_file, "r")) !== FALSE) {
                    $headers = fgetcsv($handle);
                    $id_idx = array_search('route_id', $headers);
                    $name_idx = array_search('route_short_name', $headers);
                    while (($data = fgetcsv($handle)) !== FALSE) {
                        $rid = $agency . '_' . $data[$id_idx];
                        $graph['routes'][$rid] = array(
                            'name' => $data[$name_idx],
                            'agency' => $agency
                        );
                    }
                    fclose($handle);
                }
            }

            // 2. Process STOP_TIMES.TXT (Heavy!)
            // We map Route -> Stops via Trips.
            // Simplified: We assume all trips of a route serve similar stops. We collect ALL unique stops for a route.
            
            // First, map Trip -> Route
            $trip_to_route = array();
            $trips_file = $this->find_file($path, 'trips.txt');
            if ($trips_file) {
                if (($handle = fopen($trips_file, "r")) !== FALSE) {
                    $headers = fgetcsv($handle);
                    $tid_idx = array_search('trip_id', $headers);
                    $rid_idx = array_search('route_id', $headers);
                    while (($data = fgetcsv($handle)) !== FALSE) {
                        $trip_to_route[$data[$tid_idx]] = $agency . '_' . $data[$rid_idx];
                    }
                    fclose($handle);
                }
            }

            // Now, scan Stop Times
            $stoptimes_file = $this->find_file($path, 'stop_times.txt');
            if ($stoptimes_file) {
                if (($handle = fopen($stoptimes_file, "r")) !== FALSE) {
                    $headers = fgetcsv($handle);
                    $tid_idx = array_search('trip_id', $headers);
                    $sid_idx = array_search('stop_id', $headers);
                    
                    while (($data = fgetcsv($handle)) !== FALSE) {
                        $tid = $data[$tid_idx];
                        if (!isset($trip_to_route[$tid])) continue;
                        
                        $rid = $trip_to_route[$tid];
                        $sid = $data[$sid_idx];
                        
                        // Add to Route->Stops
                        if (!isset($graph['route_stops'][$rid])) {
                            $graph['route_stops'][$rid] = array();
                        }
                        if (!in_array($sid, $graph['route_stops'][$rid])) {
                            $graph['route_stops'][$rid][] = $sid;
                        }

                        // Add to Stop->Routes
                        if (!isset($graph['stops_map'][$sid])) {
                            $graph['stops_map'][$sid] = array();
                        }
                        if (!in_array($rid, $graph['stops_map'][$sid])) {
                            $graph['stops_map'][$sid][] = $rid; // Store full Route ID
                        }
                    }
                    fclose($handle);
                }
            }
        }

        // Save Graph
        file_put_contents($this->cache_dir . '/network_graph.json', json_encode($graph));
        return new WP_REST_Response(array('status' => 'Graph built', 'routes' => count($graph['routes'])), 200);
    }

    private function find_file($dir, $name) {
        if (file_exists($dir . $name)) return $dir . $name;
        // Search recursive (some zips extract to subfolder)
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
        foreach ($files as $file) {
            if ($file->getFilename() === $name) return $file->getPathname();
        }
        return false;
    }
    
     private function get_common_lines($stop_a_id, $stop_b_id, $graph) {
        if (!isset($graph['stops_map'][$stop_a_id]) || !isset($graph['stops_map'][$stop_b_id])) {
            return [];
        }
        $routes_a = $graph['stops_map'][$stop_a_id];
        $routes_b = $graph['stops_map'][$stop_b_id];
        
        return array_intersect($routes_a, $routes_b);
    }
    
    private function find_transfer_hubs($start, $end, $graph) {
        // Find a stop C that is reachable from A and can reach B
        // Intersection of (Routes from A -> Stops) AND (Routes from B -> Stops)
        // This is computationally expensive (O(N^2)). 
        // Optimization: Only check "Hub" stops (stops with > 5 routes).
        
        $routes_a = $graph['stops_map'][$start['id']] ?? [];
        $routes_b = $graph['stops_map'][$end['id']] ?? [];
        
        $hubs = [];
        
        // Scan reachable stops from A via Direct Routes
        // Actually, let's reverse: Find intersection of Routes reachable from A and Routes reaching B?
        // No, we need a Stop C.
        
        // Simplified approach: Limit iteration.
        // Get all stops reachable from A (Layer 1)
        // Check if any of them connects to B (Layer 2)
        
        return []; // Placeholder for now to avoid timeout
    }
}
?>
