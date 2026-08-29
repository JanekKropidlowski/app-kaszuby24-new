<?php
if (!defined('ABSPATH'))
    exit;

class Kaszuby24_MZK_Handler
{
    private $agency = 'mzk_wejherowo';
    private $gtfs_url = 'https://mkuran.pl/gtfs/wejherowo.zip';
    private $cache_dir;
    private $gtfs_manager;

    public function __construct($cache_dir, $gtfs_manager = null)
    {
        $this->cache_dir = $cache_dir;
        $this->gtfs_manager = $gtfs_manager;
    }

    /**
     * Get timetable for a specific MZK line number
     * Returns all stops with their departure times for that line
     */
    public function get_line_timetable($line_number, $day = 'today')
    {
        $path = $this->cache_dir . '/mzk_wejherowo/unzipped/';
        $routes_file = $path . 'routes.txt';
        $trips_file = $path . 'trips.txt';
        $stop_times_file = $path . 'stop_times.txt';
        $stops_file = $path . 'stops.txt';

        if (!file_exists($routes_file) || !file_exists($trips_file) || !file_exists($stop_times_file) || !file_exists($stops_file)) {
            return array('error' => 'GTFS data not found. Run sync first.');
        }

        // Load services
        $services_file = $this->cache_dir . "/mzk_wejherowo/services.json";
        $services = file_exists($services_file) ? json_decode(file_get_contents($services_file), true) : array();

        // Service day logic
        $now_ts = current_time('timestamp');
        $cutoff_hour = 3;
        $hour = (int) wp_date('G', $now_ts);
        $service_ts = ($hour < $cutoff_hour) ? ($now_ts - DAY_IN_SECONDS) : $now_ts;

        if ($day === 'tomorrow') {
            $service_ts += 86400;
        }

        $today_ymd = wp_date('Ymd', $service_ts);
        $day_of_week = (int) wp_date('w', $service_ts);
        $day_map = array(1 => 0, 2 => 1, 3 => 2, 4 => 3, 5 => 4, 6 => 5, 0 => 6);
        $current_day_idx = $day_map[$day_of_week];

        // Find route_id for this line number
        $route_id = null;
        $handle = fopen($routes_file, 'r');
        $headers = fgetcsv($handle);
        while (($row = fgetcsv($handle)) !== FALSE) {
            $data = array_combine($headers, $row);
            if ($data['route_short_name'] === $line_number) {
                $route_id = $data['route_id'];
                break;
            }
        }
        fclose($handle);

        if (!$route_id) {
            return array('error' => 'Line not found');
        }

        // Load all trips for this route
        $trip_ids = array();
        $trips_data = array();
        $handle = fopen($trips_file, 'r');
        $headers = fgetcsv($handle);
        while (($row = fgetcsv($handle)) !== FALSE) {
            $data = array_combine($headers, $row);
            if ($data['route_id'] === $route_id) {
                $trip_ids[] = $data['trip_id'];
                $trips_data[$data['trip_id']] = $data;
            }
        }
        fclose($handle);

        if (empty($trip_ids)) {
            return array('error' => 'No trips found for this line');
        }

        // Load stops
        $stops_map = array();
        $handle = fopen($stops_file, 'r');
        $headers = fgetcsv($handle);
        while (($row = fgetcsv($handle)) !== FALSE) {
            $data = array_combine($headers, $row);
            $stops_map[$data['stop_id']] = $data;
        }
        fclose($handle);

        // Load stop times for these trips
        $departures_by_stop = array();
        $handle = fopen($stop_times_file, 'r');
        $headers = fgetcsv($handle);
        while (($row = fgetcsv($handle)) !== FALSE) {
            $data = array_combine($headers, $row);
            if (in_array($data['trip_id'], $trip_ids)) {
                $stop_id = $data['stop_id'];
                $trip_id = $data['trip_id'];
                $trip = $trips_data[$trip_id];

                // Check service validity
                $service_id = $trip['service_id'];
                if (!isset($services[$service_id]))
                    continue;

                $s = $services[$service_id];
                $is_active = false;

                if ($today_ymd >= $s['start'] && $today_ymd <= $s['end']) {
                    if (in_array($current_day_idx, $s['days'])) {
                        $is_active = true;
                    }
                }

                if (in_array($today_ymd, $s['added']))
                    $is_active = true;
                if (in_array($today_ymd, $s['removed']))
                    $is_active = false;

                if (!$is_active)
                    continue;

                if (!isset($departures_by_stop[$stop_id])) {
                    $departures_by_stop[$stop_id] = array(
                        'stop_name' => $stops_map[$stop_id]['stop_name'],
                        'stop_lat' => (float) $stops_map[$stop_id]['stop_lat'],
                        'stop_lon' => (float) $stops_map[$stop_id]['stop_lon'],
                        'departures' => array()
                    );
                }

                $departures_by_stop[$stop_id]['departures'][] = array(
                    'time' => $data['departure_time'],
                    'direction' => $trip['trip_headsign'] ?? '',
                    'sequence' => (int) $data['stop_sequence']
                );
            }
        }
        fclose($handle);

        // Sort departures by time for each stop
        foreach ($departures_by_stop as &$stop_data) {
            usort($stop_data['departures'], function ($a, $b) {
                return strcmp($a['time'], $b['time']);
            });
        }

        return array(
            'line' => $line_number,
            'stops' => array_values($departures_by_stop),
            'day' => $day,
            'service_date' => $today_ymd
        );
    }

    public function get_timetable($stop_id, $day = 'today')
    {
        $dep_file = $this->cache_dir . "/mzk_wejherowo/departures/" . sanitize_file_name($stop_id) . ".json";
        if (!file_exists($dep_file)) {
            return new WP_REST_Response(array(), 200);
        }

        $departures = json_decode(file_get_contents($dep_file), true);
        $services_file = $this->cache_dir . "/mzk_wejherowo/services.json";
        $services = file_exists($services_file) ? json_decode(file_get_contents($services_file), true) : array();

        $now_ts = current_time('timestamp');
        $cutoff_hour = 3;
        $hour = (int) wp_date('G', $now_ts);

        // Service Day Logic
        $service_ts = $now_ts;
        if ($hour < $cutoff_hour) {
            $service_ts = $now_ts - DAY_IN_SECONDS;
        }

        if ($day === 'tomorrow') {
            $service_ts += 86400;
        }

        $today_ymd = wp_date('Ymd', $service_ts);
        $day_of_week = (int) wp_date('w', $service_ts);
        $day_map = array(1 => 0, 2 => 1, 3 => 2, 4 => 3, 5 => 4, 6 => 5, 0 => 6);
        $current_day_idx = $day_map[$day_of_week];

        if ($day === 'tomorrow') {
            $now_time_str = "00:00";
        } else {
            $now_time_str = wp_date('H:i', $now_ts);
            if ($hour < $cutoff_hour) {
                $now_time_str = sprintf("%02d:%s", $hour + 24, wp_date('i', $now_ts));
            }
        }

        $valid = array();
        foreach ($departures as $dep) {
            $sid = $dep['service_id'];
            if (!isset($services[$sid]))
                continue;

            $s = $services[$sid];
            $is_active = false;

            if ($today_ymd >= $s['start'] && $today_ymd <= $s['end']) {
                if (in_array($current_day_idx, $s['days'])) {
                    $is_active = true;
                }
            }

            if (in_array($today_ymd, $s['added']))
                $is_active = true;
            if (in_array($today_ymd, $s['removed']))
                $is_active = false;

            if ($is_active && $dep['time'] >= $now_time_str) {
                $valid[] = $dep;
            }
        }

        usort($valid, function ($a, $b) {
            return strcmp($a['time'], $b['time']);
        });

        error_log('[MZK Timetable] Stop: ' . $stop_id . ', Departures count: ' . count($valid));
        if (count($valid) > 0) {
            error_log('[MZK Timetable] First departure: ' . json_encode($valid[0]));
        }

        return new WP_REST_Response($valid, 200);
    }

    public function sync()
    {
        error_log("[MZK] Starting sync for MZK Wejherowo");

        $temp_file = download_url($this->gtfs_url);
        if (is_wp_error($temp_file)) {
            error_log("[MZK] Download failed: " . $temp_file->get_error_message());
            return array('success' => false, 'error' => $temp_file->get_error_message());
        }

        // Ingest to GTFS Manager
        if ($this->gtfs_manager) {
            $result = $this->gtfs_manager->ingest_feed($this->agency, $temp_file, $this->gtfs_url);

            if (!$result['success']) {
                @unlink($temp_file);
                error_log("[MZK] Ingestion failed: " . $result['error']);
                return $result;
            }
        }

        // Process GTFS
        $this->process_gtfs($temp_file);
        @unlink($temp_file);

        error_log("[MZK] Sync completed successfully");
        return array('success' => true);
    }

    private function process_gtfs($zip_path)
    {
        $extract_path = $this->cache_dir . '/mzk_wejherowo/unzipped/';

        if (!file_exists($extract_path)) {
            wp_mkdir_p($extract_path);
        }

        $zip = new ZipArchive();
        if ($zip->open($zip_path) === TRUE) {
            $zip->extractTo($extract_path);
            $zip->close();
        }

        $this->build_services_index($extract_path);
        $this->build_departures_index($extract_path);
        $this->build_stops_index($extract_path);
    }

    private function build_services_index($path)
    {
        $calendar_file = $path . 'calendar.txt';
        $calendar_dates_file = $path . 'calendar_dates.txt';

        $services = array();

        // Parse calendar.txt
        if (file_exists($calendar_file)) {
            $handle = fopen($calendar_file, 'r');
            $headers = fgetcsv($handle);

            while (($row = fgetcsv($handle)) !== FALSE) {
                $data = array_combine($headers, $row);
                $service_id = $data['service_id'];

                $days = array();
                $day_names = array('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
                foreach ($day_names as $idx => $day) {
                    if ($data[$day] == '1') {
                        $days[] = $idx;
                    }
                }

                $services[$service_id] = array(
                    'start' => $data['start_date'],
                    'end' => $data['end_date'],
                    'days' => $days,
                    'added' => array(),
                    'removed' => array()
                );
            }
            fclose($handle);
        }

        // Parse calendar_dates.txt
        if (file_exists($calendar_dates_file)) {
            $handle = fopen($calendar_dates_file, 'r');
            $headers = fgetcsv($handle);

            while (($row = fgetcsv($handle)) !== FALSE) {
                $data = array_combine($headers, $row);
                $service_id = $data['service_id'];

                if (!isset($services[$service_id])) {
                    $services[$service_id] = array(
                        'start' => $data['date'],
                        'end' => $data['date'],
                        'days' => array(),
                        'added' => array(),
                        'removed' => array()
                    );
                }

                if ($data['exception_type'] == '1') {
                    $services[$service_id]['added'][] = $data['date'];
                } else {
                    $services[$service_id]['removed'][] = $data['date'];
                }
            }
            fclose($handle);
        }

        $output_file = $this->cache_dir . '/mzk_wejherowo/services.json';
        file_put_contents($output_file, json_encode($services));
    }

    private function build_departures_index($path)
    {
        $stop_times_file = $path . 'stop_times.txt';
        $trips_file = $path . 'trips.txt';
        $routes_file = $path . 'routes.txt';

        // Load trips
        $trips = array();
        $handle = fopen($trips_file, 'r');
        $headers = fgetcsv($handle);
        while (($row = fgetcsv($handle)) !== FALSE) {
            $data = array_combine($headers, $row);
            $trips[$data['trip_id']] = $data;
        }
        fclose($handle);

        // Load routes
        $routes = array();
        $handle = fopen($routes_file, 'r');
        $headers = fgetcsv($handle);
        while (($row = fgetcsv($handle)) !== FALSE) {
            $data = array_combine($headers, $row);
            $routes[$data['route_id']] = $data;
        }
        fclose($handle);

        // Build departures per stop
        $departures_by_stop = array();
        $handle = fopen($stop_times_file, 'r');
        $headers = fgetcsv($handle);

        while (($row = fgetcsv($handle)) !== FALSE) {
            $data = array_combine($headers, $row);
            $stop_id = $data['stop_id'];
            $trip_id = $data['trip_id'];

            if (!isset($trips[$trip_id]))
                continue;

            $trip = $trips[$trip_id];
            $route = $routes[$trip['route_id']] ?? array();

            if (!isset($departures_by_stop[$stop_id])) {
                $departures_by_stop[$stop_id] = array();
            }

            $departures_by_stop[$stop_id][] = array(
                'time' => $data['departure_time'],
                'trip_id' => $trip_id,
                'service_id' => $trip['service_id'],
                'line' => $route['route_short_name'] ?? '',
                'direction' => $trip['trip_headsign'] ?? '',
                'destination' => $trip['trip_headsign'] ?? ''
            );
        }
        fclose($handle);

        // Save per-stop files
        $dep_dir = $this->cache_dir . '/mzk_wejherowo/departures/';
        if (!file_exists($dep_dir)) {
            wp_mkdir_p($dep_dir);
        }

        foreach ($departures_by_stop as $stop_id => $deps) {
            $filename = $dep_dir . sanitize_file_name($stop_id) . '.json';
            file_put_contents($filename, json_encode($deps));
        }
    }

    private function build_stops_index($path)
    {
        $stops_file = $path . 'stops.txt';
        if (!file_exists($stops_file)) {
            return;
        }

        $stops = array();
        $handle = fopen($stops_file, 'r');
        $headers = fgetcsv($handle);

        while (($row = fgetcsv($handle)) !== FALSE) {
            $data = array_combine($headers, $row);
            $lat = floatval($data['stop_lat'] ?? 0);
            $lon = floatval($data['stop_lon'] ?? 0);

            $stops[] = array(
                'uid' => $this->agency . ':' . $data['stop_id'],
                'id' => $data['stop_id'],
                'name' => $data['stop_name'],
                'lat' => $lat,
                'lon' => $lon,
                'kind' => 'stop',
                'agency' => $this->agency,
                'cluster' => false
            );
        }
        fclose($handle);

        $output_file = $this->cache_dir . '/mzk_wejherowo_stops.json';
        file_put_contents($output_file, json_encode($stops));
    }

    public function get_stops()
    {
        $stops_file = $this->cache_dir . '/mzk_wejherowo/unzipped/stops.txt';
        if (!file_exists($stops_file)) {
            return array();
        }

        $stops = array();
        $handle = fopen($stops_file, 'r');
        $headers = fgetcsv($handle);

        while (($row = fgetcsv($handle)) !== FALSE) {
            $data = array_combine($headers, $row);
            $stops[] = array(
                'id' => $data['stop_id'],
                'name' => $data['stop_name'],
                'lat' => (float) $data['stop_lat'],
                'lon' => (float) $data['stop_lon'],
                'agency' => 'mzk_wejherowo'
            );
        }
        fclose($handle);

        return $stops;
    }

    public function get_shapes()
    {
        $shapes_file = $this->cache_dir . '/mzk_wejherowo/unzipped/shapes.txt';
        error_log('[MZK] Looking for shapes file: ' . $shapes_file);
        
        if (!file_exists($shapes_file)) {
            error_log('[MZK] Shapes file not found at: ' . $shapes_file);
            return new WP_REST_Response(array(), 200);
        }

        $shapes = array();
        $handle = @fopen($shapes_file, 'r');
        if (!$handle) {
            error_log('[MZK] Could not open shapes file');
            return new WP_REST_Response(array(), 200);
        }
        
        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            return new WP_REST_Response(array(), 200);
        }

        while (($row = fgetcsv($handle)) !== FALSE) {
            $data = array_combine($headers, $row);
            $shape_id = $data['shape_id'];
            $pt_lat = floatval($data['shape_pt_lat']);
            $pt_lon = floatval($data['shape_pt_lon']);
            $seq = intval($data['shape_pt_sequence']);

            // Co 3 punkt żeby zmniejszyć rozmiar
            if ($seq % 3 === 0) {
                if (!isset($shapes[$shape_id])) {
                    $shapes[$shape_id] = array();
                }
                $shapes[$shape_id][$seq] = array('lat' => $pt_lat, 'lon' => $pt_lon);
            }
        }
        fclose($handle);

        // Sortuj i formatuj
        $result = array();
        foreach ($shapes as $sid => $points) {
            ksort($points);
            if (count($points) > 1) {
                $result[] = array(
                    'id' => $sid,
                    'points' => array_values($points)
                );
            }
        }

        error_log('[MZK] Shapes count: ' . count($result));
        return new WP_REST_Response($result, 200);
    }
}
