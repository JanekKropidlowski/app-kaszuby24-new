<?php
if (!defined('ABSPATH'))
    exit;

class Kaszuby24_SKM_Handler
{
    private $agency = 'skm';
    private $gtfs_url = 'https://www.skm.pkp.pl/gtfs-mi-kpd.zip';
    private $gtfs_manager;

    public function __construct($cache_dir, $gtfs_manager = null)
    {
        $this->cache_dir = $cache_dir;
        $this->gtfs_manager = $gtfs_manager;
    }

    public function get_timetable($stop_id, $day = 'today')
    {
        $dep_file = $this->cache_dir . "/skm/departures/" . sanitize_file_name($stop_id) . ".json";
        if (!file_exists($dep_file)) {
            return new WP_REST_Response(array(), 200);
        }

        $departures = json_decode(file_get_contents($dep_file), true);
        $services_file = $this->cache_dir . "/skm/services.json";
        $services = file_exists($services_file) ? json_decode(file_get_contents($services_file), true) : array();

        $now_ts = current_time('timestamp');
        $cutoff_hour = 3;
        $hour = (int) wp_date('G', $now_ts);

        // Service Day Logic: if before 03:00, use yesterday as service date
        $service_ts = $now_ts;
        if ($hour < $cutoff_hour) {
            $service_ts = $now_ts - DAY_IN_SECONDS;
        }

        // Handle YYYY-MM-DD format
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $day)) {
            $service_ts = strtotime($day);
        } else if ($day === 'tomorrow') {
            $service_ts += 86400; // DAY_IN_SECONDS
        }

        $today_ymd = wp_date('Ymd', $service_ts);
        $day_of_week = (int) wp_date('w', $service_ts);
        $day_map = array(1 => 0, 2 => 1, 3 => 2, 4 => 3, 5 => 4, 6 => 5, 0 => 6); // 0=Mon, 6=Sun
        $current_day_idx = $day_map[$day_of_week];

        // Format current time for comparison
        $is_today = (wp_date('Ymd', $service_ts) === wp_date('Ymd', current_time('timestamp')));
        
        if (!$is_today) {
            $now_time_str = "00:00"; // Show all for future/past dates
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

            if ($is_active) {
                $dep_time = $dep['time'];
                // Handle various GTFS midnight formats (00:30 vs 24:30)
                $is_after_now = ($dep_time >= $now_time_str);

                // If we are in the "overlapping" night period (after 24:00)
                // and the departure is stored as 00:xx, consider it valid if $now_time_str is also 24:xx
                if (!$is_after_now && substr($now_time_str, 0, 2) >= "24" && substr($dep_time, 0, 2) < "03") {
                    $shifted_time = sprintf("%02d:%s", (int) substr($dep_time, 0, 2) + 24, substr($dep_time, 3));
                    if ($shifted_time >= $now_time_str)
                        $is_after_now = true;
                }

                if ($is_after_now) {
                    $valid[] = $dep;
                }
            }
        }

        usort($valid, function ($a, $b) {
            return strcmp($a['time'], $b['time']);
        });

        $result = array_slice($valid, 0, 15);
        error_log('[SKM Timetable] Stop: ' . $stop_id . ', Departures count: ' . count($result));
        if (count($result) > 0) {
            error_log('[SKM Timetable] First departure: ' . json_encode($result[0]));
        }

        return new WP_REST_Response($result, 200);
    }

    public function get_shapes()
    {
        $file = $this->cache_dir . "/skm_shapes.json";
        if (!file_exists($file))
            return new WP_REST_Response(array(), 200);
        return new WP_REST_Response(json_decode(file_get_contents($file), true), 200);
    }

    /**
     * Get stops and shapes for a specific SKM route (line number)
     */
    public function get_route_stops($route_number, $day = 'today', $direction = null)
    {
        // For now, return simple stop list - shapes are loaded separately via get_shapes()
        // This is a simplified version - full implementation would need trip filtering by date/direction
        return array(
            'route' => $route_number,
            'stops' => array(),
            'message' => 'SKM route stops - use shapes endpoint for track data'
        );
    }

    /**
     * Get all stops for a specific trip_id with coordinates and times
     */
    public function get_trip_stops($trip_id)
    {
        $dir = $this->cache_dir . "/skm_temp/";
        
        if (!file_exists($dir . "stop_times.txt") || !file_exists($dir . "stops.txt") || !file_exists($dir . "trips.txt")) {
            return array('error' => 'GTFS files not found', 'stops' => array());
        }

        // 1. Get trip info (for direction/headsign)
        $trip_info = null;
        foreach (Kaszuby24_GTFS_Engine::stream_csv($dir . "trips.txt") as $trip) {
            if ($trip['trip_id'] === $trip_id) {
                $trip_info = $trip;
                break;
            }
        }

        if (!$trip_info) {
            return array('error' => 'Trip not found', 'stops' => array());
        }

        // 2. Get all stops for this trip from stop_times.txt
        $stop_times = array();
        foreach (Kaszuby24_GTFS_Engine::stream_csv($dir . "stop_times.txt") as $st) {
            if ($st['trip_id'] === $trip_id) {
                $stop_times[] = array(
                    'stop_id' => $st['stop_id'],
                    'arrival_time' => $st['arrival_time'],
                    'departure_time' => $st['departure_time'],
                    'stop_sequence' => isset($st['stop_sequence']) ? (int)$st['stop_sequence'] : 0
                );
            }
        }

        // Sort by sequence
        usort($stop_times, function($a, $b) {
            return $a['stop_sequence'] - $b['stop_sequence'];
        });

        // 3. Load stop coordinates
        $stops_data = array();
        foreach (Kaszuby24_GTFS_Engine::stream_csv($dir . "stops.txt") as $stop) {
            $stops_data[$stop['stop_id']] = array(
                'stop_name' => $stop['stop_name'],
                'stop_lat' => (float)$stop['stop_lat'],
                'stop_lon' => (float)$stop['stop_lon']
            );
        }

        // 4. Build final stops array
        $result_stops = array();
        foreach ($stop_times as $st) {
            $stop_id = $st['stop_id'];
            if (isset($stops_data[$stop_id])) {
                $result_stops[] = array(
                    'stop_id' => $stop_id,
                    'stop_name' => $stops_data[$stop_id]['stop_name'],
                    'stop_lat' => $stops_data[$stop_id]['stop_lat'],
                    'stop_lon' => $stops_data[$stop_id]['stop_lon'],
                    'departures' => array(
                        array(
                            'time' => $st['departure_time'],
                            'direction' => isset($trip_info['trip_headsign']) ? $trip_info['trip_headsign'] : '',
                            'trip_id' => $trip_id
                        )
                    )
                );
            }
        }

        return array(
            'stops' => $result_stops,
            'direction' => isset($trip_info['trip_headsign']) ? $trip_info['trip_headsign'] : 'Nieznany kierunek',
            'trip_id' => $trip_id
        );
    }

    public function get_agency_slug()
    {
        return $this->agency;
    }

    /**
     * Główny proces synchronizacji SKM
     */
    public function sync()
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(600);

        $temp_path = $this->cache_dir . "/skm_temp/";
        error_log("[K24 V2] Starting SKM Sync...");
        
        // 1. Download RAW zip
        $tmp_zip = wp_tempnam($this->gtfs_url);
        $download_response = wp_remote_get($this->gtfs_url, array('timeout' => 300));
        
        if (is_wp_error($download_response)) {
             error_log("[K24 V2] Download Error: " . $download_response->get_error_message());
             return $download_response->get_error_message();
        }
        file_put_contents($tmp_zip, wp_remote_retrieve_body($download_response));

        // 2. Ingest via Manager (if available)
        if ($this->gtfs_manager) {
            $ingest = $this->gtfs_manager->ingest_feed('skm', $tmp_zip, $this->gtfs_url);
            if (!$ingest['success']) {
                error_log("[K24 V2] Ingestion Failed: " . $ingest['error']);
                return "GTFS Manager Validation Failed: " . $ingest['error'];
            }
            // Use the validated/archived file for processing
            $zip_to_process = $ingest['path'];
        } else {
            $zip_to_process = $tmp_zip;
        }

        // 3. Unzip for Legacy Processing
        if (!file_exists($temp_path)) wp_mkdir_p($temp_path);
        
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        $unzip_status = unzip_file($zip_to_process, $temp_path);
        
        // Clean up temp download
        if ($zip_to_process === $tmp_zip) @unlink($tmp_zip);
        
        if (is_wp_error($unzip_status)) {
            return "Unzip Failed: " . $unzip_status->get_error_message();
        }

        // 4. Continue Legacy Processing...

        // Find stops.txt
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($temp_path));
        $stops_file = "";
        foreach ($files as $file) {
            if (basename($file) === 'stops.txt') {
                $stops_file = $file->getPathname();
                break;
            }
        }

        if (!$stops_file) {
            return "stops.txt not found in ZIP";
        }

        $stops = Kaszuby24_GTFS_Engine::parse_csv($stops_file);
        if (empty($stops))
            return "stops.txt is empty";

        $processed_stops = array();
        foreach ($stops as $s) {
            $lat = floatval($s['stop_lat'] ?? 0);
            $lon = floatval($s['stop_lon'] ?? 0);
            if ($lat > 53.0 && $lat < 56.0) {
                // Exclude Southern line (Kościerzyna/Żukowo) - user request
                // Wejherowo (North) is Lat ~54.6, so it stays.
                // Żukowo is Lat 54.34, Lon 18.35 -> Removed.
                if ($lat < 54.40 && $lon < 18.42)
                    continue;

                $processed_stops[] = array(
                    'uid' => $this->agency . ':' . $s['stop_id'],
                    'id' => $s['stop_id'],
                    'name' => $s['stop_name'],
                    'lat' => $lat,
                    'lon' => $lon,
                    'kind' => 'station',
                    'agency' => $this->agency,
                    'platform' => $s['platform_code'] ?? '',
                    'cluster' => false // Explicitly set for frontend
                );
            }
        }

        file_put_contents($this->cache_dir . "/skm_stops.json", json_encode($processed_stops));

        $base_data_path = dirname($stops_file) . "/";
        $this->process_calendar($base_data_path);
        $this->process_departures($base_data_path);
        $this->process_shapes($base_data_path);

        return true;
    }

    private function process_shapes($path)
    {
        $file = $path . 'shapes.txt';
        if (!file_exists($file))
            return;

        $handle = fopen($file, 'r');
        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            return;
        }

        $tracks = array();
        while (($data = fgetcsv($handle)) !== false) {
            if (count($headers) !== count($data))
                continue;
            $s = array_combine($headers, $data);

            $sid = $s['shape_id'];
            $pt_lat = floatval($s['shape_pt_lat']);
            $pt_lon = floatval($s['shape_pt_lon']);
            $seq = intval($s['shape_pt_sequence']);

            // Filter for region and ONLY every 4th point to save memory even during processing
            if ($pt_lat > 53.0 && $pt_lat < 56.0 && ($seq % 5 === 0)) {
                $tracks[$sid][$seq] = array('lat' => $pt_lat, 'lon' => $pt_lon);
            }
        }
        fclose($handle);

        $processed_tracks = array();
        foreach ($tracks as $sid => $points) {
            ksort($points);
            if (count($points) > 1) {
                $processed_tracks[] = array(
                    'id' => $sid,
                    'points' => array_values($points)
                );
            }
        }

        file_put_contents($this->cache_dir . "/skm_shapes.json", json_encode($processed_tracks));
    }

    private function process_calendar($path)
    {
        $calendar = Kaszuby24_GTFS_Engine::parse_csv($path . 'calendar.txt');
        $dates = Kaszuby24_GTFS_Engine::parse_csv($path . 'calendar_dates.txt');
        $services = array();
        $days_map = array('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

        foreach ($calendar as $c) {
            $active_days = array();
            foreach ($days_map as $idx => $day) {
                if (($c[$day] ?? '0') === '1')
                    $active_days[] = $idx;
            }
            $services[$c['service_id']] = array(
                'start' => $c['start_date'],
                'end' => $c['end_date'],
                'days' => $active_days,
                'added' => array(),
                'removed' => array()
            );
        }

        foreach ($dates as $d) {
            $sid = $d['service_id'];
            if (!isset($services[$sid])) {
                $services[$sid] = array('start' => '20000101', 'end' => '20991231', 'days' => array(), 'added' => array(), 'removed' => array());
            }
            if ($d['exception_type'] === '1')
                $services[$sid]['added'][] = $d['date'];
            else
                $services[$sid]['removed'][] = $d['date'];
        }

        if (!file_exists($this->cache_dir . "/skm"))
            wp_mkdir_p($this->cache_dir . "/skm");
        file_put_contents($this->cache_dir . "/skm/services.json", json_encode($services));
    }

    private function process_departures($path)
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(600);

        // 1. Map trips to services (Stream)
        $trip_map = array();
        foreach (Kaszuby24_GTFS_Engine::stream_csv($path . 'trips.txt') as $t) {
            $trip_map[$t['trip_id']] = array(
                'sid' => $t['service_id'],
                'head' => $t['trip_headsign'] ?? '',
                'num' => $t['trip_short_name'] ?? ''
            );
        }

        // 2. Map stops to platforms (Small file, can parse)
        $stops_csv = Kaszuby24_GTFS_Engine::parse_csv($path . 'stops.txt');
        $valid_stops = array();
        $platforms = array();
        foreach ($stops_csv as $s) {
            $valid_stops[$s['stop_id']] = true;
            $platforms[$s['stop_id']] = $s['platform_code'] ?? '';
        }

        // 3. Process stop_times (Huge file, Stream) - STREAM TO FILES
        // Instead of holding $deps in RAM, append to temporary files
        $temp_dir = $this->cache_dir . "/skm/temp_deps/";
        if (!file_exists($temp_dir)) {
            wp_mkdir_p($temp_dir);
        } else {
            // Clean previous temp
            array_map('unlink', glob($temp_dir . "*"));
        }

        $open_handles = array();
        $MAX_HANDLES = 100; // Safety limit

        foreach (Kaszuby24_GTFS_Engine::stream_csv($path . 'stop_times.txt') as $st) {
            $tid = $st['trip_id'];
            $stop_id = $st['stop_id'];

            if (!isset($valid_stops[$stop_id]))
                continue;
            if (!isset($trip_map[$tid]))
                continue;

            $item = array(
                'time' => substr($st['departure_time'], 0, 5),
                'line' => $trip_map[$tid]['num'] ?: 'SKM',
                'direction' => $trip_map[$tid]['head'],
                'service_id' => $trip_map[$tid]['sid'],
                'platform' => $platforms[$stop_id] ?? '',
                'trip_id' => $tid
            );

            // Append to file
            // We use file handles for performance, but manage limits
            $safe_id = sanitize_file_name($stop_id);
            $file = $temp_dir . $safe_id . ".jsonl";
            
            file_put_contents($file, json_encode($item) . ",\n", FILE_APPEND);
        }

        // 4. Finalize files: Wrap in JSON array and move to final dir
        $final_dir = $this->cache_dir . "/skm/departures/";
        if (!file_exists($final_dir))
            wp_mkdir_p($final_dir);

        $temp_files = glob($temp_dir . "*.jsonl");
        foreach ($temp_files as $tf) {
            $safe_id = basename($tf, ".jsonl");
            
            // Read all lines
            $content = file_get_contents($tf);
            // Wrap in [] and remove last comma
            // $content ends with ",\n"
            $json_content = "[" . trim($content, ",\n") . "]";
            
            file_put_contents($final_dir . $safe_id . ".json", $json_content);
            @unlink($tf);
        }
        @rmdir($temp_dir);
    }
}
