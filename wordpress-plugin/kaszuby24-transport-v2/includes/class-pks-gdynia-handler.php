<?php
if (!defined('ABSPATH'))
    exit;

class Kaszuby24_PKS_Gdynia_Handler
{
    private $agency = 'pksgdynia';
    private $gtfs_url = 'https://kaszuby24.pl/pksgdynia.zip';
    private $cache_dir;
    private $gtfs_manager;

    public function __construct($cache_dir, $gtfs_manager = null)
    {
        $this->cache_dir = $cache_dir;
        $this->gtfs_manager = $gtfs_manager;
    }

    /**
     * Get timetable for a specific PKS Gdynia line number
     * Returns all stops with their departure times for that line
     */
    public function get_line_timetable($line_number, $day = 'today')
    {
        $path = $this->cache_dir . '/pksgdynia/unzipped/';
        $routes_file = $path . 'routes.txt';
        $trips_file = $path . 'trips.txt';
        $stop_times_file = $path . 'stop_times.txt';
        $stops_file = $path . 'stops.txt';

        if (!file_exists($routes_file) || !file_exists($trips_file) || !file_exists($stop_times_file) || !file_exists($stops_file)) {
            return array('error' => 'GTFS data not found. Run sync first.');
        }

        // Load services
        $services_file = $this->cache_dir . "/pksgdynia/services.json";
        $services = file_exists($services_file) ? json_decode(file_get_contents($services_file), true) : array();

        // Service day logic
        $now_ts = current_time('timestamp');
        $cutoff_hour = 3;
        $hour = (int) wp_date('G', $now_ts);
        
        if (preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/', $day)) {
            $service_ts = strtotime($day);
        } else {
            $service_ts = ($hour < $cutoff_hour) ? ($now_ts - DAY_IN_SECONDS) : $now_ts;
            if ($day === 'tomorrow') {
                $service_ts += 86400;
            }
        }

        $today_ymd = wp_date('Ymd', $service_ts);
        $day_of_week = (int) wp_date('w', $service_ts);
        $day_map = array(1 => 0, 2 => 1, 3 => 2, 4 => 3, 5 => 4, 6 => 5, 0 => 6);
        $current_day_idx = $day_map[$day_of_week];

        // Find route_id for this line number
        $route_id = null;
        $handle = fopen($routes_file, 'r');
        $headers = fgetcsv($handle);
        if ($headers) $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);
        
        while (($row = fgetcsv($handle)) !== FALSE) {
            if (!$headers || count($row) !== count($headers)) continue;
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
        if ($headers) $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);

        while (($row = fgetcsv($handle)) !== FALSE) {
            if (!$headers || count($row) !== count($headers)) continue;
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
        if ($headers) $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);

        while (($row = fgetcsv($handle)) !== FALSE) {
            if (!$headers || count($row) !== count($headers)) continue;
            $data = array_combine($headers, $row);
            $stops_map[$data['stop_id']] = $data;
        }
        fclose($handle);

        // Load stop times for these trips
        $departures_by_stop = array();
        $handle = fopen($stop_times_file, 'r');
        $headers = fgetcsv($handle);
        if ($headers) $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);

        while (($row = fgetcsv($handle)) !== FALSE) {
            if (!$headers || count($row) !== count($headers)) continue;
            $data = array_combine($headers, $row);
            if (!in_array($data['trip_id'], $trip_ids))
                continue;

            $service_id = $trips_data[$data['trip_id']]['service_id'];
            if (!$this->is_service_active($services, $service_id, $today_ymd, $current_day_idx))
                continue;

            $stop_id = $data['stop_id'];
            if (!isset($departures_by_stop[$stop_id])) {
                $departures_by_stop[$stop_id] = array();
            }

            $departures_by_stop[$stop_id][] = array(
                'time' => $data['departure_time'],
                'trip_id' => $data['trip_id'],
                'direction' => isset($trips_data[$data['trip_id']]['trip_headsign']) ? $trips_data[$data['trip_id']]['trip_headsign'] : '',
                'sequence' => (int) $data['stop_sequence']
            );
        }
        fclose($handle);

        // Build result - format zgodny z MZK Wejherowo
        $stops_result = array();
        foreach ($departures_by_stop as $stop_id => $deps) {
            if (!isset($stops_map[$stop_id]))
                continue;

            usort($deps, function ($a, $b) {
                return strcmp($a['time'], $b['time']);
            });

            $stops_result[] = array(
                'stop_id' => $stop_id,
                'stop_name' => $stops_map[$stop_id]['stop_name'],
                'stop_lat' => (float) $stops_map[$stop_id]['stop_lat'],
                'stop_lon' => (float) $stops_map[$stop_id]['stop_lon'],
                'departures' => $deps
            );
        }

        return array(
            'line' => $line_number,
            'stops' => $stops_result,
            'day' => $day,
            'service_date' => $today_ymd
        );
    }

    /**
     * Get list of all PKS Gdynia lines
     */
    public function get_lines_list()
    {
        $path = $this->cache_dir . '/pksgdynia/unzipped/';
        $routes_file = $path . 'routes.txt';

        if (!file_exists($routes_file)) {
            return array(
                'error' => 'GTFS data not found. Run sync first.',
                'checked_path' => $routes_file
            );
        }

        $lines = array();
        $handle = fopen($routes_file, 'r');
        $headers = fgetcsv($handle);

        if (!$headers) {
            fclose($handle);
            return array('error' => 'Could not read headers from routes.txt');
        }

        // Remove BOM if present
        $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);

        while (($row = fgetcsv($handle)) !== FALSE) {
            if (empty($row) || count($row) < 2) continue;
            
            if (count($row) !== count($headers)) {
                // If counts don't match, try to use headers as keys for what we have
                $data = array();
                foreach($headers as $i => $h) {
                    $data[$h] = isset($row[$i]) ? $row[$i] : '';
                }
            } else {
                $data = array_combine($headers, $row);
            }

            if (!isset($data['route_short_name'])) continue;

            $lines[] = array(
                'number' => $data['route_short_name'],
                'route' => $data['route_long_name'] ?? $data['route_short_name'],
                'route_id' => $data['route_id']
            );
        }
        fclose($handle);

        // Sort by line number
        usort($lines, function ($a, $b) {
            return strnatcmp($a['number'], $b['number']);
        });

        return array('lines' => $lines);
    }

    public function get_timetable($stop_id, $day = 'today')
    {
        $dep_file = $this->cache_dir . "/pksgdynia/departures/" . sanitize_file_name($stop_id) . ".json";

        if (!file_exists($dep_file)) {
            error_log("[PKS Gdynia] Departures file not found: " . $dep_file);
            return new WP_REST_Response(array(), 200);
        }

        $services_file = $this->cache_dir . "/pksgdynia/services.json";
        $services = file_exists($services_file) ? json_decode(file_get_contents($services_file), true) : array();

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

        $now_time_str = wp_date('H:i', $now_ts);
        if ($hour < $cutoff_hour) {
            $now_time_str = sprintf("%02d:%s", $hour + 24, wp_date('i', $now_ts));
        }

        $all_departures = json_decode(file_get_contents($dep_file), true);
        if (!$all_departures) {
            error_log("[PKS Gdynia] Could not decode departures JSON");
            return new WP_REST_Response(array(), 200);
        }

        $valid = array();
        foreach ($all_departures as $dep) {
            $service_id = $dep['service_id'];

            if (!$this->is_service_active($services, $service_id, $today_ymd, $current_day_idx)) {
                continue;
            }

            $dep_time = $dep['departure_time'];

            if ($day === 'today') {
                if (strcmp($dep_time, $now_time_str) < 0) {
                    continue;
                }
            }

            $valid[] = array(
                'time' => $dep_time,
                'line' => $dep['route_short_name'],
                'headsign' => $dep['trip_headsign'],
                'trip_id' => $dep['trip_id'],
                'agency' => 'pksgdynia'
            );
        }

        usort($valid, function ($a, $b) {
            return strcmp($a['time'], $b['time']);
        });

        error_log('[PKS Gdynia Timetable] Stop: ' . $stop_id . ', Departures count: ' . count($valid));
        if (count($valid) > 0) {
            error_log('[PKS Gdynia Timetable] First departure: ' . json_encode($valid[0]));
        }

        return new WP_REST_Response($valid, 200);
    }

    public function sync($force = false)
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(600);

        error_log("[PKS Gdynia] Starting sync for PKS Gdynia");
        
        // 1. Download ZIP directly
        $download_response = wp_remote_get($this->gtfs_url, array('timeout' => 300));
        
        if (is_wp_error($download_response)) {
            error_log("[PKS Gdynia] Download failed: " . $download_response->get_error_message());
            return false;
        }
        
        $zip_content = wp_remote_retrieve_body($download_response);
        $tmp_zip = wp_tempnam($this->gtfs_url);
        file_put_contents($tmp_zip, $zip_content);
        
        error_log("[PKS Gdynia] Downloaded " . strlen($zip_content) . " bytes to: " . $tmp_zip);

        // 2. Ingest via GTFS Manager for validation & archiving
        if ($this->gtfs_manager) {
            $result = $this->gtfs_manager->ingest_feed($this->agency, $tmp_zip, $this->gtfs_url);
            if (!$result['success']) {
                error_log("[PKS Gdynia] GTFS validation failed: " . $result['error']);
                @unlink($tmp_zip);
                return false;
            }
            error_log("[PKS Gdynia] GTFS validated successfully");
        }

        // 3. Extract for processing
        $extract_path = $this->cache_dir . '/pksgdynia/unzipped/';
        if (!file_exists($extract_path)) {
            wp_mkdir_p($extract_path);
        }
        
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        $unzip_status = unzip_file($tmp_zip, $extract_path);
        
        @unlink($tmp_zip);
        
        if (is_wp_error($unzip_status)) {
            error_log("[PKS Gdynia] Unzip failed: " . $unzip_status->get_error_message());
            return false;
        }
        
        error_log("[PKS Gdynia] Extracted to: " . $extract_path);
        error_log("[PKS Gdynia] Files: " . print_r(scandir($extract_path), true));

        // 4. Process GTFS data
        $this->build_services_map();
        $this->build_departure_cache();
        $exported = $this->export_stops();
        
        if ($exported) {
            error_log("[PKS Gdynia] Sync completed successfully, stops exported to: " . $exported);
        } else {
            error_log("[PKS Gdynia] Sync completed but export_stops failed");
        }
        
        return true;
    }

    private function extract_and_process()
    {
        $extract_path = $this->cache_dir . '/pksgdynia/unzipped/';
        if (!file_exists($extract_path)) {
            wp_mkdir_p($extract_path);
        }

        $zip_file = $this->cache_dir . '/pksgdynia/latest.zip';
        error_log("[PKS Gdynia extract] Looking for ZIP at: " . $zip_file);
        
        if (!file_exists($zip_file)) {
            error_log("[PKS Gdynia extract] ZIP not found!");
            error_log("[PKS Gdynia extract] Cache dir contents: " . print_r(scandir($this->cache_dir), true));
            return false;
        }

        error_log("[PKS Gdynia extract] ZIP found, size: " . filesize($zip_file) . " bytes");
        
        $zip = new ZipArchive();
        if ($zip->open($zip_file) !== TRUE) {
            error_log("[PKS Gdynia extract] Cannot open ZIP");
            return false;
        }

        error_log("[PKS Gdynia extract] ZIP opened, extracting to: " . $extract_path);
        $zip->extractTo($extract_path);
        $zip->close();
        
        error_log("[PKS Gdynia extract] Extraction complete. Files: " . print_r(scandir($extract_path), true));
        
        return true;
    }

    private function is_service_active($services, $service_id, $date_ymd, $day_idx)
    {
        if (!isset($services[$service_id]))
            return false;
        $s = $services[$service_id];

        $numeric_date = (int) $date_ymd;
        if ($numeric_date < (int) $s['start'] || $numeric_date > (int) $s['end'])
            return false;

        $days_arr = array_values($s['days']);
        if (!isset($days_arr[$day_idx]) || !$days_arr[$day_idx])
            return false;

        if (isset($s['additions']) && in_array($date_ymd, $s['additions']))
            return true;
        if (isset($s['removals']) && in_array($date_ymd, $s['removals']))
            return false;

        return true;
    }

    private function build_services_map()
    {
        $path = $this->cache_dir . '/pksgdynia/unzipped/';
        $calendar_file = $path . 'calendar.txt';
        $calendar_dates_file = $path . 'calendar_dates.txt';

        $services = array();

        if (file_exists($calendar_file)) {
            $handle = fopen($calendar_file, 'r');
            $headers = fgetcsv($handle);
            if ($headers) $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);

            while (($row = fgetcsv($handle)) !== FALSE) {
                if (!$headers || count($row) !== count($headers)) continue;
                $data = array_combine($headers, $row);
                $services[$data['service_id']] = array(
                    'start' => $data['start_date'],
                    'end' => $data['end_date'],
                    'days' => array(
                        'monday' => (int) $data['monday'],
                        'tuesday' => (int) $data['tuesday'],
                        'wednesday' => (int) $data['wednesday'],
                        'thursday' => (int) $data['thursday'],
                        'friday' => (int) $data['friday'],
                        'saturday' => (int) $data['saturday'],
                        'sunday' => (int) $data['sunday']
                    ),
                    'additions' => array(),
                    'removals' => array()
                );
            }
            fclose($handle);
        }

        if (file_exists($calendar_dates_file)) {
            $handle = fopen($calendar_dates_file, 'r');
            $headers = fgetcsv($handle);
            if ($headers) $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);

            while (($row = fgetcsv($handle)) !== FALSE) {
                if (!$headers || count($row) !== count($headers)) continue;
                $data = array_combine($headers, $row);
                $sid = $data['service_id'];
                $date = $data['date'];
                $type = (int) $data['exception_type'];

                if (!isset($services[$sid])) {
                    // Create minimal entry if not in calendar.txt
                    $services[$sid] = array(
                        'start' => $date,
                        'end' => $date,
                        'days' => array_fill_keys(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], 0),
                        'additions' => array(),
                        'removals' => array()
                    );
                }

                if ($type === 1) {
                    $services[$sid]['additions'][] = $date;
                    // Update bounds
                    if (strcmp($date, $services[$sid]['start']) < 0) $services[$sid]['start'] = $date;
                    if (strcmp($date, $services[$sid]['end']) > 0) $services[$sid]['end'] = $date;
                } else if ($type === 2) {
                    $services[$sid]['removals'][] = $date;
                }
            }
            fclose($handle);
        }

        if (empty($services)) {
            error_log("[PKS Gdynia] No services found in calendar or calendar_dates");
        }

        $output_file = $this->cache_dir . '/pksgdynia/services.json';
        file_put_contents($output_file, json_encode($services, JSON_PRETTY_PRINT));
        return true;
    }

    private function build_departure_cache()
    {
        $path = $this->cache_dir . '/pksgdynia/unzipped/';
        $stop_times_file = $path . 'stop_times.txt';
        $trips_file = $path . 'trips.txt';
        $routes_file = $path . 'routes.txt';

        if (!file_exists($stop_times_file) || !file_exists($trips_file) || !file_exists($routes_file)) {
            error_log("[PKS Gdynia] Required GTFS files missing for departure cache");
            return false;
        }

        $trips = array();
        $handle = fopen($trips_file, 'r');
        $headers = fgetcsv($handle);
        if ($headers) $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);

        while (($row = fgetcsv($handle)) !== FALSE) {
            if (!$headers || count($row) !== count($headers)) continue;
            $data = array_combine($headers, $row);
            $trips[$data['trip_id']] = $data;
        }
        fclose($handle);

        $routes = array();
        $handle = fopen($routes_file, 'r');
        $headers = fgetcsv($handle);
        if ($headers) $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);

        while (($row = fgetcsv($handle)) !== FALSE) {
            if (!$headers || count($row) !== count($headers)) continue;
            $data = array_combine($headers, $row);
            $routes[$data['route_id']] = $data;
        }
        fclose($handle);

        $dep_dir = $this->cache_dir . '/pksgdynia/departures/';
        if (!file_exists($dep_dir)) {
            wp_mkdir_p($dep_dir);
        }

        $departures_by_stop = array();
        $handle = fopen($stop_times_file, 'r');
        $headers = fgetcsv($handle);
        if ($headers) $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);

        while (($row = fgetcsv($handle)) !== FALSE) {
            if (!$headers || count($row) !== count($headers)) continue;
            $data = array_combine($headers, $row);
            $trip_id = $data['trip_id'];

            if (!isset($trips[$trip_id]))
                continue;

            $trip = $trips[$trip_id];
            $route_id = $trip['route_id'];

            if (!isset($routes[$route_id]))
                continue;

            $route = $routes[$route_id];
            $stop_id = $data['stop_id'];

            if (!isset($departures_by_stop[$stop_id])) {
                $departures_by_stop[$stop_id] = array();
            }

            $departures_by_stop[$stop_id][] = array(
                'departure_time' => $data['departure_time'],
                'trip_id' => $trip_id,
                'trip_headsign' => isset($trip['trip_headsign']) ? $trip['trip_headsign'] : '',
                'route_short_name' => $route['route_short_name'],
                'service_id' => $trip['service_id']
            );
        }
        fclose($handle);

        // Clear old cache
        if (file_exists($dep_dir)) {
            $files = glob($dep_dir . '*.json');
            foreach($files as $file) {
                if(is_file($file)) @unlink($file);
            }
        }

        foreach ($departures_by_stop as $stop_id => $deps) {
            $file_path = $dep_dir . sanitize_file_name($stop_id) . '.json';
            file_put_contents($file_path, json_encode($deps, JSON_PRETTY_PRINT));
        }

        error_log("[PKS Gdynia] Departure cache built for " . count($departures_by_stop) . " stops");
        return true;
    }

    public function export_stops()
    {
        $output_file = $this->cache_dir . '/pksgdynia_stops.json';
        $stops = array();

        $stops_file = $this->cache_dir . '/pksgdynia/unzipped/stops.txt';
        error_log("[PKS Gdynia export_stops] Looking for stops.txt at: " . $stops_file);
        
        if (!file_exists($stops_file)) {
            error_log("[PKS Gdynia export_stops] stops.txt NOT FOUND!");
            error_log("[PKS Gdynia export_stops] Directory contents: " . print_r(scandir($this->cache_dir . '/pksgdynia/'), true));
            return false;
        }

        error_log("[PKS Gdynia export_stops] stops.txt FOUND, reading...");
        $handle = fopen($stops_file, 'r');
        $headers = fgetcsv($handle);

        while (($row = fgetcsv($handle)) !== FALSE) {
            $data = array_combine($headers, $row);
            $stops[] = array(
                'id' => $data['stop_id'],
                'name' => $data['stop_name'],
                'lat' => (float) $data['stop_lat'],
                'lon' => (float) $data['stop_lon'],
                'agency' => 'pksgdynia'
            );
        }

        fclose($handle);
        error_log("[PKS Gdynia export_stops] Processed " . count($stops) . " stops");
        
        file_put_contents($output_file, json_encode($stops, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        error_log("[PKS Gdynia export_stops] Saved to: " . $output_file);
        
        return $output_file;
    }
}
