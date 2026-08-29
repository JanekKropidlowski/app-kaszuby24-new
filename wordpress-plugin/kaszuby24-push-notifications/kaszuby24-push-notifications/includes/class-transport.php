<?php

if (!defined('ABSPATH')) {
    exit;
}

@error_reporting(0);
@ini_set('display_errors', '0');

ob_start();

class Kaszuby24_Transport
{

    private $namespace = 'kaszuby24/v1';
    private $resource_name = 'transport';
    private $cache_dir;

    // Granice województwa pomorskiego
    const POMERANIA_MIN_LAT = 53.5;
    const POMERANIA_MAX_LAT = 54.9;
    const POMERANIA_MIN_LON = 16.5;
    const POMERANIA_MAX_LON = 19.5;

    public function __construct()
    {
        $upload_dir = wp_upload_dir();
        $this->cache_dir = $upload_dir['basedir'] . '/gtfs-cache';

        if (!file_exists($this->cache_dir)) {
            wp_mkdir_p($this->cache_dir);
        }

        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes()
    {
        // Prevent leak of warnings into REST responses
        @ini_set('display_errors', 0);
        @error_reporting(0);

        // Endpoint: /stops
        register_rest_route($this->namespace, '/' . $this->resource_name . '/stops', array(
            'methods' => 'GET',
            'callback' => array($this, 'safe_callback_stops'),
            'permission_callback' => '__return_true',
            'args' => array(
                'agency' => array(
                    'required' => true,
                    'type' => 'string',
                    'enum' => array('polregio', 'pkp', 'pks', 'bus', 'tram', 'wejherowo', 'all', 'all_rail', 'skm', 'pksgdynia', 'gdansk', 'gdynia', 'intercity', 'mevo', 'MEVO')
                ),
                'min_lat' => array('required' => false, 'type' => 'number'),
                'min_lon' => array('required' => false, 'type' => 'number'),
                'max_lat' => array('required' => false, 'type' => 'number'),
                'max_lon' => array('required' => false, 'type' => 'number'),
                'format' => array('required' => false, 'type' => 'string', 'enum' => array('json', 'geojson'))
            )
        ));

        // Endpoint: /timetable
        register_rest_route($this->namespace, '/' . $this->resource_name . '/timetable', array(
            'methods' => 'GET',
            'callback' => array($this, 'safe_callback_timetable'),
            'permission_callback' => '__return_true',
            'args' => array(
                'agency' => array('required' => true, 'type' => 'string', 'enum' => array('polregio', 'pkp', 'pks', 'bus', 'tram', 'wejherowo', 'all', 'all_rail', 'skm', 'pksgdynia', 'gdansk', 'gdynia', 'intercity', 'mevo', 'MEVO')),
                'stop_id' => array('required' => true, 'type' => 'string')
            )
        ));

        // Endpoint: /train_details
        register_rest_route($this->namespace, '/' . $this->resource_name . '/train_details', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_train_details'),
            'permission_callback' => '__return_true',
            'args' => array(
                'agency' => array('required' => true, 'type' => 'string', 'enum' => array('polregio', 'pkp', 'pks', 'bus', 'tram', 'wejherowo', 'all', 'all_rail', 'skm', 'pksgdynia', 'gdansk', 'gdynia', 'intercity', 'mevo', 'MEVO')),
                'trip_id' => array('required' => true, 'type' => 'string')
            )
        ));

        // Endpoint: /shapes
        register_rest_route($this->namespace, '/' . $this->resource_name . '/shapes', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_shapes'),
            'permission_callback' => '__return_true',
            'args' => array(
                'agency' => array('required' => true, 'type' => 'string'),
                'shape_id' => array('required' => true, 'type' => 'string')
            )
        ));

        // Endpoint: /agency
        register_rest_route($this->namespace, '/' . $this->resource_name . '/agency', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_agency_info'),
            'permission_callback' => '__return_true',
            'args' => array(
                'agency' => array('required' => true, 'type' => 'string')
            )
        ));

        // Endpoint: /refresh (admin only)
        register_rest_route($this->namespace, '/' . $this->resource_name . '/refresh', array(
            'methods' => 'POST',
            'callback' => array($this, 'refresh_gtfs'),
            'permission_callback' => '__return_true', // TEMPORARY FOR DEBUGGING
        ));

        // Endpoint: /live
        register_rest_route($this->namespace, '/' . $this->resource_name . '/live', array(
            'methods' => 'GET',
            'callback' => array($this, 'safe_callback_live'),
            'permission_callback' => '__return_true',
            'args' => array(
                'agency' => array(
                    'required' => true,
                    'type' => 'string',
                    'enum' => array('gdansk', 'GDANSK', 'mevo', 'MEVO')
                )
            )
        ));

        // Endpoint: /mevo-status
        register_rest_route($this->namespace, '/' . $this->resource_name . '/mevo-status', array(
            'methods' => 'GET',
            'callback' => array($this, 'safe_callback_mevo_status'),
            'permission_callback' => '__return_true'
        ));
    }

    public function check_admin_permissions()
    {
        return current_user_can('manage_options');
    }

    public function get_stops($request)
    {
        $agency = strtolower($request->get_param('agency'));
        $min_lat = $request->get_param('min_lat');
        $max_lat = $request->get_param('max_lat');
        $min_lon = $request->get_param('min_lon');
        $max_lon = $request->get_param('max_lon');
        $format = $request->get_param('format');

        // Suppress output
        ob_start();

        // Handle PKS Gdynia from live API
        if ($agency === 'pksgdynia') {
            return $this->get_pksgdynia_stops_from_api($request);
        }

        // Handle MEVO
        if ($agency === 'mevo') {
            $cache_file = $this->cache_dir . "/mevo_stops.json";
            if (!file_exists($cache_file)) {
                $this->process_mevo_stops();
            }
            if (file_exists($cache_file)) {
                $stops = json_decode(file_get_contents($cache_file), true);
                if ($min_lat && $max_lat && $min_lon && $max_lon) {
                    $stops = array_filter($stops, function ($s) use ($min_lat, $max_lat, $min_lon, $max_lon) {
                        return $s['lat'] >= $min_lat && $s['lat'] <= $max_lat &&
                            $s['lon'] >= $min_lon && $s['lon'] <= $max_lon;
                    });
                    $stops = array_values($stops);
                }
                return new WP_REST_Response($stops, 200);
            }
            return new WP_REST_Response(array(), 200);
        }

        if ($agency === 'all' || $agency === 'all_rail') {
            $all_stops = array();

            if ($agency === 'all_rail') {
                $agencies = array('polregio', 'pkp', 'skm', 'intercity');
            } else {
                $agencies = array('polregio', 'wejherowo', 'pkp', 'skm', 'gdynia', 'intercity', 'gdansk', 'mevo');
            }

            foreach ($agencies as $ag) {
                $file = $this->cache_dir . "/{$ag}_stops.json";
                if (!file_exists($file) && $ag === 'mevo') {
                    $this->process_mevo_stops();
                }
                if (file_exists($file)) {
                    $stops = json_decode(file_get_contents($file), true);
                    $all_stops = array_merge($all_stops, $stops);
                }
            }

            // Dodaj PKS tylko dla 'all'
            if ($agency === 'all') {
                $possible_pks_paths = [
                    ABSPATH . 'pks_stops_data.json',
                    dirname(dirname(dirname(dirname(__FILE__)))) . '/pks_stops_data.json',
                    dirname(dirname(dirname(dirname(dirname(__FILE__))))) . '/pks_stops_data.json',
                    dirname(dirname(dirname(dirname(dirname(dirname(__FILE__)))))) . '/pks_stops_data.json'
                ];

                foreach ($possible_pks_paths as $pks_file) {
                    if (@file_exists($pks_file)) {
                        $pks_data = @json_decode(file_get_contents($pks_file), true);
                        if ($pks_data && isset($pks_data['stops'])) {
                            // Zapewnij pole agency dla PKS
                            foreach ($pks_data['stops'] as &$s) {
                                $s['agency'] = 'pks_gdynia';
                            }
                            $all_stops = array_merge($all_stops, $pks_data['stops']);
                            break; // Znaleziono, wyjdź z pętli ścieżek
                        }
                    }
                }
            }

            return new WP_REST_Response($all_stops, 200);
        }

        $cache_file = $this->cache_dir . "/{$agency}_stops.json";

        if (file_exists($cache_file)) {
            $data = file_get_contents($cache_file);
            $stops = json_decode($data, true);

            // Zapewnij pole agency (poprawka dla starych cache)
            foreach ($stops as &$s) {
                if (!isset($s['agency'])) {
                    $s['agency'] = $agency;
                }
            }

            $min_lat = $request->get_param('min_lat');
            $max_lat = $request->get_param('max_lat');
            $min_lon = $request->get_param('min_lon');
            $max_lon = $request->get_param('max_lon');

            if ($min_lat !== null && $max_lat !== null && $min_lon !== null && $max_lon !== null) {
                $stops = array_filter($stops, function ($s) use ($min_lat, $max_lat, $min_lon, $max_lon) {
                    return $s['lat'] >= $min_lat && $s['lat'] <= $max_lat && $s['lon'] >= $min_lon && $s['lon'] <= $max_lon;
                });
                return new WP_REST_Response(array_values($stops), 200);
            }

            return new WP_REST_Response($stops, 200);
        }

        // Jeśli nie ma cache, przetwórz GTFS
        $this->process_gtfs($agency);

        if (file_exists($cache_file)) {
            $data = file_get_contents($cache_file);
            $stops = json_decode($data, true);
        } else {
            return new WP_REST_Response(array(), 404);
        }

        // Specjalna obsługa PKS Gdynia z lokalnego pliku jeśli istnieje
        if ($agency === 'pksgdynia' || $agency === 'pks_gdynia') {
            $possible_paths = [
                ABSPATH . 'pks_stops_data.json',
                dirname(dirname(dirname(dirname(__FILE__)))) . '/pks_stops_data.json',
                dirname(dirname(dirname(dirname(dirname(__FILE__))))) . '/pks_stops_data.json',
                dirname(dirname(dirname(dirname(dirname(dirname(__FILE__)))))) . '/pks_stops_data.json'
            ];

            foreach ($possible_paths as $pks_file) {
                if (@file_exists($pks_file)) {
                    $pks_data = @json_decode(file_get_contents($pks_file), true);
                    if ($pks_data && isset($pks_data['stops'])) {
                        // Dodaj informację o agencji jeśli jej brakuje
                        foreach ($pks_data['stops'] as &$s) {
                            $s['agency'] = 'pks_gdynia';
                        }
                        return new WP_REST_Response($pks_data['stops'], 200);
                    }
                }
            }
        }

        return new WP_REST_Response($stops, 200);
    }

    public function get_timetable($request)
    {
        $agency = $request->get_param('agency');
        $stop_id = $request->get_param('stop_id');

        if ($agency === 'mevo') {
            // Remove 'mevo_' prefix if present
            $real_id = str_replace('mevo_', '', $stop_id);
            $status = $this->get_mevo_status($real_id);
            return new WP_REST_Response($status, 200);
        }

        // Obsługa PKS Gdynia przez Proxy
        if ($agency === 'pksgdynia' || $agency === 'pks_gdynia') {
            return $this->get_pks_timetable_combined($stop_id);
        }

        // Obsługa ZTM Gdańsk przez JSON API
        if ($agency === 'gdansk') {
            return $this->get_gdansk_timetable($stop_id);
        }

        // Obsługa ZKM Gdynia przez JSON API
        if ($agency === 'gdynia') {
            return $this->get_gdynia_timetable($stop_id);
        }

        $idx_file = $this->cache_dir . "/{$agency}/departures/" . sanitize_file_name($stop_id) . ".json";

        if (file_exists($idx_file)) {
            $data = json_decode(file_get_contents($idx_file), true);

            // 1. USTALENIE DATY I CZASU
            $all_day = $request->get_param('all_day') === '1';
            $now_time = current_time('H:i');
            $today_timestamp = current_time('timestamp');

            $days_to_check = array(
                array(
                    'ymd' => date('Ymd', $today_timestamp),
                    'label' => 'Dzisiaj',
                    'is_today' => true
                ),
                array(
                    'ymd' => date('Ymd', $today_timestamp + 86400),
                    'label' => 'Jutro',
                    'is_today' => false
                ),
                array(
                    'ymd' => date('Ymd', $today_timestamp + (86400 * 2)),
                    'label' => 'Pojutrze',
                    'is_today' => false
                )
            );

            // 2. BOOTSTRAP KALENDARZA
            $services_file = $this->cache_dir . "/{$agency}/services.json";
            $services = file_exists($services_file) ? json_decode(file_get_contents($services_file), true) : array();

            // 3. FILTROWANIE I NORMALIZACJA
            $valid_departures = array();
            $day_map = array(1 => 0, 2 => 1, 3 => 2, 4 => 3, 5 => 4, 6 => 5, 0 => 6); // 0=Mon, 6=Sun

            foreach ($days_to_check as $day_info) {
                $target_ymd = $day_info['ymd'];
                // Dzień tygodnia dla konkretnej daty
                $target_ts = strtotime($target_ymd);
                $day_of_week = (int) date('w', $target_ts);
                $current_day_idx = $day_map[$day_of_week];

                foreach ($data as $dep) {
                    $sid = isset($dep['service_id']) ? $dep['service_id'] : null;
                    if (!$sid || !isset($services[$sid]))
                        continue;

                    $s = $services[$sid];
                    $is_active = false;

                    // a) WYJĄTKI
                    if (in_array($target_ymd, $s['added'])) {
                        $is_active = true;
                    } elseif (in_array($target_ymd, $s['removed'])) {
                        $is_active = false;
                    } else {
                        // b) STANDARDOWY KALENDARZ
                        if ($target_ymd >= $s['start'] && $target_ymd <= $s['end']) {
                            if (in_array($current_day_idx, $s['days'])) {
                                $is_active = true;
                            }
                        }
                    }

                    if (!$is_active)
                        continue;

                    // 4. FILTR CZASU
                    $raw_time = $dep['time'];

                    // Dla dzisiaj filtrujemy przeszłe, chyba że all_day
                    if ($day_info['is_today'] && !$all_day && strcmp($raw_time, $now_time) < 0)
                        continue;

                    // Normalizacja 24h+
                    $display_time = $raw_time;
                    $time_parts = explode(':', $raw_time);
                    $h = intval($time_parts[0]);
                    $is_next_day_overflow = false;
                    if ($h >= 24) {
                        $display_time = sprintf("%02d:%02s", $h - 24, $time_parts[1]);
                        $is_next_day_overflow = true;
                    }

                    $new_dep = $dep;
                    $new_dep['display_time'] = $display_time;
                    $new_dep['target_date'] = date('Y-m-d', $target_ts);
                    $new_dep['day_label'] = $day_info['label'];
                    $new_dep['is_next_day_overflow'] = $is_next_day_overflow;
                    $valid_departures[] = $new_dep;
                }
            }

            // 5. SORTOWANIE
            usort($valid_departures, function ($a, $b) {
                if ($a['target_date'] !== $b['target_date']) {
                    return strcmp($a['target_date'], $b['target_date']);
                }
                return strcmp($a['time'], $b['time']);
            });

            $final = array();
            $seen = array();
            foreach ($valid_departures as $dep) {
                $key = $dep['target_date'] . '|' . $dep['service_id'] . '|' . $dep['trip_id'] . '|' . $dep['time'];
                if (isset($seen[$key]))
                    continue;
                $seen[$key] = true;

                $final[] = array(
                    'time' => $dep['display_time'],
                    'date' => $dep['target_date'],
                    'day_label' => $dep['day_label'],
                    'line' => $dep['line'],
                    'destination' => $dep['destination'],
                    'train_number' => $dep['train_number'],
                    'platform' => $dep['platform'],
                    'trip_id' => $dep['trip_id'],
                    'attributes' => array_merge(
                        (array) $dep['attributes'],
                        array(
                            'is_next_day' => $dep['is_next_day_overflow'],
                            'date' => $dep['target_date']
                        )
                    )
                );
            }

            return new WP_REST_Response($final, 200);
        }

        return new WP_REST_Response(array(), 200);
    }

    private function get_pks_timetable_combined($stop_id)
    {
        // Use live API from kiedyprzyjedzie.pl
        $api_url = 'https://pksgdynia.kiedyprzyjedzie.pl/departures/' . urlencode($stop_id);
        $result = array();

        $response = wp_remote_get($api_url, array(
            'timeout' => 10,
            'headers' => array(
                'Accept' => 'application/json'
            )
        ));

        if (is_wp_error($response)) {
            error_log('[PKS API] Error fetching departures: ' . $response->get_error_message());
            return new WP_REST_Response($result, 200);
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (isset($data['departures']) && is_array($data['departures'])) {
            foreach ($data['departures'] as $dep) {
                // API format: {"line": "123", "direction": "Gdynia", "time": "12:30", "realTime": "12:35"}
                $result[] = array(
                    'time' => isset($dep['realTime']) ? $dep['realTime'] : $dep['time'],
                    'line' => isset($dep['line']) ? $dep['line'] : 'PKS',
                    'destination' => isset($dep['direction']) ? $dep['direction'] : '',
                    'platform' => '',
                    'trip_id' => '',
                    'attributes' => isset($dep['realTime']) ? array('is_realtime' => true) : array()
                );
            }
        }

        $deduplicated = $this->deduplicate_timetable($result);
        return new WP_REST_Response(array_slice($deduplicated, 0, 15), 200);
    }

    private function get_pksgdynia_stops_from_api($request)
    {
        $api_url = 'https://pksgdynia.kiedyprzyjedzie.pl/stops?rev=5422';
        $response = wp_remote_get($api_url, array(
            'timeout' => 10,
            'headers' => array('Accept' => 'application/json')
        ));

        if (is_wp_error($response)) {
            error_log('[PKS API] Error fetching stops: ' . $response->get_error_message());
            return new WP_REST_Response(array(), 200);
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        $stops = array();

        if (isset($data['stops']) && is_array($data['stops'])) {
            // API format: [["id", code, "name", lon, lat, ...]]
            foreach ($data['stops'] as $stop) {
                if (count($stop) >= 5) {
                    $stops[] = array(
                        'id' => $stop[0],
                        'name' => $stop[2],
                        'lat' => floatval($stop[4]) / 1000000, // API uses microdegresss
                        'lon' => floatval($stop[3]) / 1000000,
                        'agency' => 'pksgdynia'
                    );
                }
            }
        }

        return new WP_REST_Response($stops, 200);
    }

    private function get_gdansk_stops_from_api($request)
    {
        $api_url = 'https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/4c4025f0-01bf-41f7-a39f-d156d201b82b/download/stops.json';
        $response = wp_remote_get($api_url, array(
            'timeout' => 15,
            'headers' => array('Accept' => 'application/json')
        ));

        if (is_wp_error($response)) {
            error_log('[ZTM Gdańsk API] Error fetching stops: ' . $response->get_error_message());
            return new WP_REST_Response(array(), 200);
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        $stops = array();

        // Handle: { "2026-01-02": { "stops": [...] } }
        // OR { "stops": [...] }
        // OR [...] 
        $stops_array = null;
        if (is_array($data)) {
            // Check if it's the date-wrapped format
            $first_key = key($data);
            if ($first_key && isset($data[$first_key]['stops'])) {
                $stops_array = $data[$first_key]['stops'];
            } elseif (isset($data['stops'])) {
                $stops_array = $data['stops'];
            } else {
                $stops_array = $data;
            }
        }

        if ($stops_array) {
            foreach ($stops_array as $stop) {
                // Filtruj tylko pomorskie przystanki
                $lat = floatval($stop['stopLat'] ?? $stop['stop_lat'] ?? 0);
                $lon = floatval($stop['stopLon'] ?? $stop['stop_lon'] ?? 0);

                if (
                    $lat >= self::POMERANIA_MIN_LAT && $lat <= self::POMERANIA_MAX_LAT &&
                    $lon >= self::POMERANIA_MIN_LON && $lon <= self::POMERANIA_MAX_LON
                ) {
                    $stops[] = array(
                        'id' => $stop['stopId'] ?? $stop['stop_id'] ?? '',
                        'name' => $stop['stopName'] ?? $stop['stop_name'] ?? $stop['stopDesc'] ?? 'Unknown',
                        'lat' => $lat,
                        'lon' => $lon,
                        'agency' => 'gdansk'
                    );
                }
            }
        }

        error_log('[ZTM Gdańsk API] Loaded ' . count($stops) . ' stops');
        return new WP_REST_Response($stops, 200);
    }


    public function safe_callback_live($request)
    {
        while (ob_get_level() > 1)
            ob_end_clean();
        ob_start();
        $response = $this->get_live_positions($request);
        $junk = ob_get_clean();
        return $response;
    }

    public function safe_callback_mevo_status($request)
    {
        while (ob_get_level() > 1)
            ob_end_clean();
        ob_start();
        $response = $this->get_mevo_all_status($request);
        $junk = ob_get_clean();
        return $response;
    }

    public function safe_callback_stops($request)
    {
        while (ob_get_level() > 1)
            ob_end_clean();
        ob_start();
        $response = $this->get_stops($request);
        $junk = ob_get_clean();

        $format = $request->get_param('format');
        if ($format === 'geojson' && is_a($response, 'WP_REST_Response')) {
            $data = $response->get_data();
            if (is_array($data)) {
                $features = array();
                foreach ($data as $s) {
                    if (!isset($s['lat']) || !isset($s['lon']))
                        continue;
                    $features[] = array(
                        'type' => 'Feature',
                        'geometry' => array(
                            'type' => 'Point',
                            'coordinates' => array(floatval($s['lon']), floatval($s['lat']))
                        ),
                        'properties' => $s
                    );
                }
                $response->set_data(array(
                    'type' => 'FeatureCollection',
                    'features' => $features
                ));
            }
        }

        return $response;
    }

    public function safe_callback_timetable($request)
    {
        while (ob_get_level() > 1)
            ob_end_clean();
        ob_start();
        $response = $this->get_timetable($request);
        $junk = ob_get_clean();
        return $response;
    }

    private function get_gdansk_timetable($stop_id)
    {
        // Use ZTM Gdańsk Live Departures API (Virtual Monitor)
        $api_url = 'https://ckan2.multimediagdansk.pl/departures?stopId=' . urlencode($stop_id);

        $response = wp_remote_get($api_url, array(
            'timeout' => 5,
            'headers' => array('Accept' => 'application/json')
        ));

        $result = array();

        if (is_wp_error($response)) {
            error_log('[ZTM Gdańsk API] Error fetching departures: ' . $response->get_error_message());
            return new WP_REST_Response($result, 200);
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        // API structure changed from "delay" to "departures"
        if (isset($data['departures']) && is_array($data['departures'])) {
            foreach ($data['departures'] as $item) {
                // Determine display time (Estimated > Theoretical)
                $timeFull = $item['estimatedTime'] ?? $item['theoreticalTime'] ?? '';
                // Handle "2026-01-02T11:07:36Z" or "11:07:36"
                $time = '';
                if (strpos($timeFull, 'T') !== false) {
                    $parts = explode('T', $timeFull);
                    if (isset($parts[1])) {
                        $time = substr($parts[1], 0, 5);
                    }
                } else {
                    $time = substr($timeFull, 0, 5);
                }

                if (empty($time))
                    continue;

                $result[] = array(
                    'time' => $time,
                    'line' => (string) ($item['routeShortName'] ?? $item['routeId'] ?? ''),
                    'destination' => $item['headsign'] ?? '',
                    'platform' => '',
                    'trip_id' => (string) ($item['tripId'] ?? ''),
                    'attributes' => array(
                        'is_realtime' => (isset($item['status']) && $item['status'] === 'REALTIME'),
                        'delay_desc' => isset($item['delayInSeconds']) ? (round($item['delayInSeconds'] / 60) . ' min') : ''
                    )
                );
            }

            // Sort by time
            usort($result, function ($a, $b) {
                return strcmp($a['time'], $b['time']);
            });
        }

        return new WP_REST_Response(array_slice($result, 0, 20), 200);
    }

    private function get_gdynia_timetable($stop_id)
    {
        // Use ZKM Gdynia Live Departures API
        $api_url = 'https://api.zdiz.gdynia.pl/pt/delays?stopId=' . urlencode($stop_id);

        $response = wp_remote_get($api_url, array(
            'timeout' => 5,
            'headers' => array('Accept' => 'application/json')
        ));

        $result = array();

        if (is_wp_error($response)) {
            error_log('[ZKM Gdynia API] Error fetching departures: ' . $response->get_error_message());
            return new WP_REST_Response($result, 200);
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        // Gdynia format has "delay" key
        if (isset($data['delay']) && is_array($data['delay'])) {
            foreach ($data['delay'] as $item) {
                // Determine display time (Estimated > Theoretical)
                $timeFull = $item['estimatedTime'] ?? $item['theoreticalTime'] ?? '';
                $time = substr($timeFull, 0, 5);

                if (empty($time))
                    continue;

                $result[] = array(
                    'time' => $time,
                    'line' => (string) ($item['routeShortName'] ?? $item['routeId'] ?? ''),
                    'destination' => $item['headsign'] ?? '',
                    'platform' => '',
                    'trip_id' => (string) ($item['tripId'] ?? ''),
                    'attributes' => array(
                        'is_realtime' => true,
                        'delay_desc' => isset($item['delayInSeconds']) ? (round($item['delayInSeconds'] / 60) . ' min') : ''
                    )
                );
            }

            // Sort by time
            usort($result, function ($a, $b) {
                return strcmp($a['time'], $b['time']);
            });
        }

        return new WP_REST_Response(array_slice($result, 0, 20), 200);
    }

    private function deduplicate_timetable($data)
    {
        $seen = array();
        $unique = array();

        foreach ($data as $item) {
            $key = $item['time'] . '|' . ($item['line'] ?? '') . '|' . ($item['destination'] ?? $item['headsign'] ?? '');
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $unique[] = $item;
            }
        }

        return $unique;
    }

    public function get_live_positions($request)
    {
        $agency = strtolower($request->get_param('agency'));

        if ($agency === 'mevo') {
            try {
                $bikes = $this->get_mevo_free_bikes();
                return new WP_REST_Response(!empty($bikes) ? $bikes : array(), 200);
            } catch (Exception $e) {
                return new WP_REST_Response(array(), 200);
            }
        }

        if ($agency === 'gdansk') {
            $api_url = 'https://ckan2.multimediagdansk.pl/gpsPositions';
            $response = wp_remote_get($api_url, array('timeout' => 10));

            if (is_wp_error($response)) {
                return new WP_REST_Response(array(), 200);
            }

            $data = json_decode(wp_remote_retrieve_body($response), true);
            $vehicles = array();

            if (isset($data['vehicles']) && is_array($data['vehicles'])) {
                foreach ($data['vehicles'] as $v) {
                    $vehicles[] = array(
                        'vehicleId' => $v['vehicleId'] ?? '',
                        'line' => $v['routeShortName'] ?? '',
                        'lat' => $v['lat'],
                        'lon' => $v['lon'],
                        'direction' => $v['direction'] ?? 0,
                        'isRealtime' => true
                    );
                }
            }
            return new WP_REST_Response($vehicles, 200);
        }

        return new WP_REST_Response(array(), 200);
    }

    public function get_train_details($request)
    {
        $agency = $request->get_param('agency');
        $trip_id = $request->get_param('trip_id');

        $trip_file = $this->cache_dir . "/{$agency}/trips/" . sanitize_file_name($trip_id) . ".json";

        if (file_exists($trip_file)) {
            return new WP_REST_Response(json_decode(file_get_contents($trip_file)), 200);
        }

        return new WP_REST_Response(array('error' => 'Trip not found'), 404);
    }

    public function get_shapes($request)
    {
        $agency = $request->get_param('agency');
        $shape_id = $request->get_param('shape_id');
        $file = $this->cache_dir . "/{$agency}/shapes/" . sanitize_file_name($shape_id) . ".json";
        if (file_exists($file)) {
            return new WP_REST_Response(json_decode(file_get_contents($file)), 200);
        }
        return new WP_REST_Response(array(), 200);
    }

    public function get_agency_info($request)
    {
        $agency = $request->get_param('agency');
        $file = $this->cache_dir . "/{$agency}/agency.json";
        if (file_exists($file)) {
            return new WP_REST_Response(json_decode(file_get_contents($file)), 200);
        }
        return new WP_REST_Response(array(), 200);
    }

    private function process_gtfs($agency)
    {
        $urls = array(
            'wejherowo' => 'https://mkuran.pl/gtfs/wejherowo.zip',
            'skm' => 'https://mkuran.pl/gtfs/skm.zip', // Używamy stabilnego feedu mkuran dla SKM
            'polregio' => 'https://mkuran.pl/gtfs/polregio.zip',
            'intercity' => 'https://mkuran.pl/gtfs/intercity.zip',
            'pkp' => 'https://mkuran.pl/gtfs/plk.zip', // Cały PKP PLK dla ogólnych zapytań
            'gdynia' => 'http://api.zdiz.gdynia.pl/pt/gtfs.zip',
            'gdansk' => 'https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/30e783e4-2bec-4a7d-bb22-ee3e3b26ca96/download/gtfsgoogle.zip',
        );

        if (!isset($urls[$agency])) {
            return;
        }

        $url = $urls[$agency];

        $zip_path = $this->cache_dir . "/{$agency}.zip";
        $extract_path = $this->cache_dir . "/{$agency}/";

        // Wyczyść stary cache
        if (file_exists($extract_path)) {
            $this->clear_agency_cache($agency);
        }
        wp_mkdir_p($extract_path);

        // Limity dla dużych plików
        @set_time_limit(1800);
        @ini_set('memory_limit', '1024M');

        // Pobierz GTFS
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        $tmp_zip = download_url($url, 600);

        if (is_wp_error($tmp_zip)) {
            error_log("GTFS Download Error ({$agency}): " . $tmp_zip->get_error_message());
            return;
        }

        rename($tmp_zip, $zip_path);

        // Rozpakuj
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        global $wp_filesystem;
        if (empty($wp_filesystem)) {
            WP_Filesystem();
        }

        $unzip = unzip_file($zip_path, $extract_path);
        if (is_wp_error($unzip)) {
            error_log("GTFS Unzip Error ({$agency}): " . $unzip->get_error_message());
            return;
        }

        // Przetwórz stops.txt - TYLKO POMORSKIE!
        $stops_file = $this->find_file_recursive($extract_path, 'stops.txt');
        if (!$stops_file) {
            error_log("stops.txt not found for {$agency}");
            return;
        }

        $stops = array();
        $stops_map = array(); // Map to store platform codes
        if (($handle = fopen($stops_file, "r")) !== FALSE) {
            $line = fgets($handle);
            $delimiter = (strpos($line, ';') !== false) ? ';' : ',';
            rewind($handle);

            $headers = fgetcsv($handle, 1000, $delimiter);
            $id_idx = array_search('stop_id', $headers);
            $name_idx = array_search('stop_name', $headers);
            $lat_idx = array_search('stop_lat', $headers);
            $lon_idx = array_search('stop_lon', $headers);
            $plat_idx = array_search('platform_code', $headers);
            $desc_idx = array_search('stop_desc', $headers);
            $wheel_idx = array_search('wheelchair_boarding', $headers);

            while (($data = fgetcsv($handle, 1000, $delimiter)) !== FALSE) {
                if (count($data) <= max($id_idx, $lat_idx, $lon_idx))
                    continue;

                $lat = floatval($data[$lat_idx]);
                $lon = floatval($data[$lon_idx]);
                $plat = ($plat_idx !== false && isset($data[$plat_idx])) ? $data[$plat_idx] : '';
                $desc = ($desc_idx !== false && isset($data[$desc_idx])) ? $data[$desc_idx] : '';
                $wheel = ($wheel_idx !== false && isset($data[$wheel_idx])) ? $data[$wheel_idx] : '0';

                // FILTRUJ TYLKO POMORSKIE!
                $is_pomorskie = ($lat >= self::POMERANIA_MIN_LAT && $lat <= self::POMERANIA_MAX_LAT &&
                    $lon >= self::POMERANIA_MIN_LON && $lon <= self::POMERANIA_MAX_LON);

                if ($is_pomorskie) {
                    $stops[] = array(
                        'id' => $data[$id_idx],
                        'name' => $data[$name_idx],
                        'lat' => $lat,
                        'lon' => $lon,
                        'platform' => $plat,
                        'desc' => $desc,
                        'wheelchair' => $wheel,
                        'agency' => $agency
                    );
                }

                // Store all in map for timetable lookup
                $stops_map[$data[$id_idx]] = array(
                    'name' => $data[$name_idx],
                    'platform' => $plat,
                    'desc' => $desc,
                    'wheelchair' => $wheel
                );
            }
            fclose($handle);
        }

        file_put_contents($this->cache_dir . "/{$agency}_stops.json", json_encode($stops));
        error_log("Saved " . count($stops) . " stops for {$agency}");

        // Indeksuj info o agencji (kontakt)
        $this->index_agency_info($agency, $extract_path);

        // Indeksuj kształty tras (shapes)
        $this->index_shapes($agency, $extract_path);

        // Indeksuj kalendarz (service_id -> zakres dat + dni tygodnia + wyjątki)
        $this->index_calendar($agency, $extract_path);

        // Indeksuj rozkłady - TYLKO DLA POMORSKICH PRZYSTANKÓW
        $pomorskie_stop_ids = array_flip(array_column($stops, 'id'));
        $this->index_stop_times($agency, $extract_path, $stops_map, $pomorskie_stop_ids);
    }

    private function index_calendar($agency, $extract_path)
    {
        $services = array();

        // 1. Parse calendar.txt (Base schedule)
        $cal_file = $this->find_file_recursive($extract_path, 'calendar.txt');
        if ($cal_file && ($handle = fopen($cal_file, "r")) !== FALSE) {
            $line = fgets($handle);
            $delimiter = (strpos($line, ';') !== false) ? ';' : ',';
            rewind($handle);

            $headers = fgetcsv($handle, 1000, $delimiter);
            $sid_idx = array_search('service_id', $headers);
            $start_idx = array_search('start_date', $headers);
            $end_idx = array_search('end_date', $headers);
            // days: monday...sunday (indices 0..6 usually, but look for column names)
            $day_cols = array();
            $days = array('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
            foreach ($days as $d)
                $day_cols[$d] = array_search($d, $headers);

            while (($data = fgetcsv($handle, 1000, $delimiter)) !== FALSE) {
                if (!isset($data[$sid_idx]))
                    continue;
                $active_days = array();
                foreach ($days as $i => $d) {
                    if (isset($data[$day_cols[$d]]) && $data[$day_cols[$d]] == '1') {
                        $active_days[] = $i; // 0=Mon, 6=Sun
                    }
                }
                $services[$data[$sid_idx]] = array(
                    'start' => $data[$start_idx],
                    'end' => $data[$end_idx],
                    'days' => $active_days,
                    'added' => array(),
                    'removed' => array()
                );
            }
            fclose($handle);
        }

        // 2. Parse calendar_dates.txt (Exceptions)
        $dates_file = $this->find_file_recursive($extract_path, 'calendar_dates.txt');
        if ($dates_file && ($handle = fopen($dates_file, "r")) !== FALSE) {
            $line = fgets($handle);
            $delimiter = (strpos($line, ';') !== false) ? ';' : ',';
            rewind($handle);

            $headers = fgetcsv($handle, 1000, $delimiter);
            $sid_idx = array_search('service_id', $headers);
            $date_idx = array_search('date', $headers);
            $type_idx = array_search('exception_type', $headers); // 1=Added, 2=Removed

            while (($data = fgetcsv($handle, 1000, $delimiter)) !== FALSE) {
                if (!isset($data[$sid_idx]))
                    continue;
                $sid = $data[$sid_idx];
                $date = $data[$date_idx];
                $type = $data[$type_idx];

                if (!isset($services[$sid])) {
                    // Create entry if service only exists in dates (e.g. SKM logic often)
                    $services[$sid] = array('start' => '20000101', 'end' => '20991231', 'days' => array(), 'added' => array(), 'removed' => array());
                }

                if ($type == '1') {
                    $services[$sid]['added'][] = $date;
                } elseif ($type == '2') {
                    $services[$sid]['removed'][] = $date;
                }
            }
            fclose($handle);
        }

        file_put_contents($this->cache_dir . "/{$agency}/services.json", json_encode($services));
        error_log("Indexed " . count($services) . " services for {$agency}");
    }

    private function index_agency_info($agency, $extract_path)
    {
        $agency_file = $this->find_file_recursive($extract_path, 'agency.txt');
        if (!$agency_file || ($handle = fopen($agency_file, "r")) === FALSE)
            return;

        $line = fgets($handle);
        $delimiter = (strpos($line, ';') !== false) ? ';' : ',';
        rewind($handle);

        $headers = fgetcsv($handle, 1000, $delimiter);
        $name_idx = array_search('agency_name', $headers);
        $url_idx = array_search('agency_url', $headers);
        $phone_idx = array_search('agency_phone', $headers);

        $data = fgetcsv($handle, 1000, $delimiter);
        if ($data) {
            $info = array(
                'name' => isset($data[$name_idx]) ? $data[$name_idx] : '',
                'url' => isset($data[$url_idx]) ? $data[$url_idx] : '',
                'phone' => isset($data[$phone_idx]) ? $data[$phone_idx] : '',
            );
            file_put_contents($this->cache_dir . "/{$agency}/agency.json", json_encode($info));
        }
        fclose($handle);
    }

    private function index_shapes($agency, $extract_path)
    {
        $shapes_file = $this->find_file_recursive($extract_path, 'shapes.txt');
        if (!$shapes_file)
            return;

        $shapes_dir = $this->cache_dir . "/{$agency}/shapes";
        wp_mkdir_p($shapes_dir);

        if (($handle = fopen($shapes_file, "r")) !== FALSE) {
            $line = fgets($handle);
            $delimiter = (strpos($line, ';') !== false) ? ';' : ',';
            rewind($handle);

            $headers = fgetcsv($handle, 1000, $delimiter);
            $id_idx = array_search('shape_id', $headers);
            $lat_idx = array_search('shape_pt_lat', $headers);
            $lon_idx = array_search('shape_pt_lon', $headers);
            $seq_idx = array_search('shape_pt_sequence', $headers);

            $current_shape = array();
            $last_id = null;

            while (($data = fgetcsv($handle, 1000, $delimiter)) !== FALSE) {
                if (!isset($data[$id_idx]))
                    continue;
                $id = $data[$id_idx];
                if ($last_id !== null && $id !== $last_id) {
                    usort($current_shape, function ($a, $b) {
                        return $a['s'] - $b['s'];
                    });
                    file_put_contents($shapes_dir . "/" . sanitize_file_name($last_id) . ".json", json_encode($current_shape));
                    $current_shape = array();
                }
                $current_shape[] = array(
                    'lat' => floatval($data[$lat_idx]),
                    'lon' => floatval($data[$lon_idx]),
                    's' => intval($data[$seq_idx])
                );
                $last_id = $id;
            }
            if ($last_id !== null) {
                usort($current_shape, function ($a, $b) {
                    return $a['s'] - $b['s'];
                });
                file_put_contents($shapes_dir . "/" . sanitize_file_name($last_id) . ".json", json_encode($current_shape));
            }
            fclose($handle);
        }
    }

    private function index_stop_times($agency, $extract_path, $stops_map, $pomorskie_stop_ids)
    {
        $routes_file = $this->find_file_recursive($extract_path, 'routes.txt');
        $trips_file = $this->find_file_recursive($extract_path, 'trips.txt');
        $stop_times_file = $this->find_file_recursive($extract_path, 'stop_times.txt');
        $transfers_file = $this->find_file_recursive($extract_path, 'transfers.txt');

        if (!$trips_file || !$stop_times_file)
            return;

        @set_time_limit(1800);

        // 1. Index Routes (Color, Type, Badge)
        $route_info_map = array();
        if ($routes_file && ($handle = fopen($routes_file, "r")) !== FALSE) {
            $line = fgets($handle);
            $delimiter = (strpos($line, ';') !== false) ? ';' : ',';
            rewind($handle);
            $headers = fgetcsv($handle, 1000, $delimiter);
            $route_id_idx = array_search('route_id', $headers);
            $short_name_idx = array_search('route_short_name', $headers);
            $long_name_idx = array_search('route_long_name', $headers);
            $type_idx = array_search('route_type', $headers);
            $color_idx = array_search('route_color', $headers);

            while (($data = fgetcsv($handle, 1000, $delimiter)) !== FALSE) {
                if (!isset($data[$route_id_idx]))
                    continue;

                $badge = ($short_name_idx !== false && !empty($data[$short_name_idx])) ? $data[$short_name_idx] : '';
                // Fallback to route_id if short_name is empty (common in some GTFS)
                if (empty($badge) && $route_id_idx !== false && !empty($data[$route_id_idx])) {
                    $badge = $data[$route_id_idx];
                    // Strip common prefixes like 'R_' or 'Line_'
                    $badge = preg_replace('/^[A-Z]_|^Line_/', '', $badge);
                }

                $route_info_map[$data[$route_id_idx]] = array(
                    'badge' => $badge,
                    'long_name' => ($long_name_idx !== false && isset($data[$long_name_idx])) ? $data[$long_name_idx] : '',
                    'type' => ($type_idx !== false && isset($data[$type_idx])) ? $data[$type_idx] : '3',
                    'color' => ($color_idx !== false && isset($data[$color_idx])) ? $data[$color_idx] : ''
                );
            }
            fclose($handle);
        }

        // 1.5 Index Stops (for terminal station names)
        $stop_info_map = array();
        $stops_file = $this->find_file_recursive($extract_path, 'stops.txt');
        if ($stops_file && ($handle = fopen($stops_file, "r")) !== FALSE) {
            $line = fgets($handle);
            $delimiter = (strpos($line, ';') !== false) ? ';' : ',';
            rewind($handle);
            $headers = fgetcsv($handle, 1000, $delimiter);
            $s_id_idx = array_search('stop_id', $headers);
            $s_name_idx = array_search('stop_name', $headers);

            while (($data = fgetcsv($handle, 1000, $delimiter)) !== FALSE) {
                if (isset($data[$s_id_idx]) && isset($data[$s_name_idx])) {
                    $stop_info_map[$data[$s_id_idx]] = $data[$s_name_idx];
                }
            }
            fclose($handle);
        }

        // 2. Index Trips
        $trip_info_map = array();
        if (($handle = fopen($trips_file, "r")) !== FALSE) {
            $line = fgets($handle);
            $delimiter = (strpos($line, ';') !== false) ? ';' : ',';
            rewind($handle);
            $headers = fgetcsv($handle, 1000, $delimiter);
            $trip_id_idx = array_search('trip_id', $headers);
            $route_idx = array_search('route_id', $headers);
            $headsign_idx = array_search('trip_headsign', $headers);
            $short_name_idx = array_search('trip_short_name', $headers);
            $service_idx = array_search('service_id', $headers);
            $bikes_idx = array_search('bikes_allowed', $headers);
            $wheelchair_idx = array_search('wheelchair_accessible', $headers);
            $shape_idx = array_search('shape_id', $headers);

            while (($data = fgetcsv($handle, 1000, $delimiter)) !== FALSE) {
                if (!isset($data[$trip_id_idx]))
                    continue;
                $rid = $data[$route_idx];
                $r_meta = isset($route_info_map[$rid]) ? $route_info_map[$rid] : array();

                $trip_info_map[$data[$trip_id_idx]] = array(
                    'route_id' => $rid,
                    'service_id' => isset($data[$service_idx]) ? $data[$service_idx] : '',
                    'shape_id' => isset($data[$shape_idx]) ? $data[$shape_idx] : '',
                    'headsign' => !empty($data[$headsign_idx]) ? $data[$headsign_idx] : (isset($r_meta['long_name']) ? $r_meta['long_name'] : ''),
                    'train_number' => isset($data[$short_name_idx]) ? trim($data[$short_name_idx]) : '',
                    'badge' => isset($r_meta['badge']) ? $r_meta['badge'] : '',
                    'type' => isset($r_meta['type']) ? $r_meta['type'] : '2',
                    'color' => isset($r_meta['color']) ? $r_meta['color'] : '',
                    'attributes' => array(
                        'bikes' => (isset($data[$bikes_idx]) && $data[$bikes_idx] == '1'),
                        'wheelchair' => (isset($data[$wheelchair_idx]) && $data[$wheelchair_idx] == '1'),
                        'wifi' => (strpos($data[$headsign_idx] ?? '', 'WiFi') !== false || ($r_meta['badge'] ?? '') == 'EIP' || ($r_meta['badge'] ?? '') == 'EIC'),
                        'ac' => (($r_meta['badge'] ?? '') == 'EIP' || ($r_meta['badge'] ?? '') == 'EIC' || ($r_meta['badge'] ?? '') == 'IC' || strpos($data[$headsign_idx] ?? '', 'klimatyzacja') !== false),
                    )
                );
            }
            fclose($handle);
        }

        $trip_terminals = array(); // track terminal stop_id by sequence for each trip

        // 2.5 Index Transfers (Continuations)
        $continuations = array();
        if ($transfers_file && ($handle = fopen($transfers_file, "r")) !== FALSE) {
            $headers = fgetcsv($handle, 1000, $delimiter);
            $from_trip_idx = array_search('from_trip_id', $headers);
            $to_trip_idx = array_search('to_trip_id', $headers);
            $type_idx = array_search('transfer_type', $headers);

            while (($data = fgetcsv($handle, 1000, $delimiter)) !== FALSE) {
                if (isset($data[$type_idx]) && $data[$type_idx] == '1') {
                    $continuations[$data[$from_trip_idx]] = $data[$to_trip_idx];
                }
            }
            fclose($handle);
        }

        // 3. Process Stop Times
        $departures_by_stop = array();
        $stops_by_trip = array();

        if (($handle = fopen($stop_times_file, "r")) !== FALSE) {
            $line = fgets($handle);
            $delimiter = (strpos($line, ';') !== false) ? ';' : ',';
            rewind($handle);
            $headers = fgetcsv($handle, 1000, $delimiter);
            $trip_idx = array_search('trip_id', $headers);
            $arrival_idx = array_search('arrival_time', $headers);
            $departure_idx = array_search('departure_time', $headers);
            $stop_idx = array_search('stop_id', $headers);
            $seq_idx = array_search('stop_sequence', $headers);

            while (($data = fgetcsv($handle, 1000, $delimiter)) !== FALSE) {
                if (count($data) <= max($trip_idx, $arrival_idx, $departure_idx))
                    continue;

                $trip_id = $data[$trip_idx];
                $stop_id = $data[$stop_idx];
                $arrival = $data[$arrival_idx];
                $departure = $data[$departure_idx];
                $seq = intval($data[$seq_idx]);

                // Track terminal stop
                if (!isset($trip_terminals[$trip_id]) || $seq > $trip_terminals[$trip_id]['seq']) {
                    $trip_terminals[$trip_id] = ['seq' => $seq, 'stop_id' => $stop_id];
                }

                // 1. TWARDY JOIN DO TRIPS (Inner Join)
                if (!isset($trip_info_map[$trip_id])) {
                    continue; // Pomiń osierocone rekordy stop_times
                }
                $trip_info = $trip_info_map[$trip_id];

                // 2. TWARDY JOIN DO ROUTES (Inner Join)
                $route_id = $trip_info['route_id'];
                if (empty($route_id) || !isset($route_info_map[$route_id])) {
                    // Jeśli nie mamy info o trasie, nie wiemy jaka to linia/badge
                    continue;
                }
                $route_info = $route_info_map[$route_id];

                // Obsługa czasów > 24:00 (np. 25:10 - po północy tego samego dnia serwisowego)
                $time_parts = explode(':', $departure);
                $h = intval($time_parts[0]);
                $is_next_day = ($h >= 24);

                // Normalizujemy do zapisu ale zachowujemy info o "następnym dniu" jeśli trzeba
                // Użytkownik chce widzieć "01:10" ale w sortowaniu musi być po 23:59.
                $normalized_time = $departure; // Zostawiamy oryginalny GTFS (np. "25:10") dla poprawnego sortowania i filtrowania service_day
                if (strlen($normalized_time) > 5)
                    $normalized_time = substr($normalized_time, 0, 5);

                $stop_info = isset($stops_map[$stop_id]) ? $stops_map[$stop_id] : array('name' => $stop_id, 'platform' => '');

                // TYLKO DLA POMORSKICH PRZYSTANKÓW zapisujemy odjazdy
                if (isset($pomorskie_stop_ids[$stop_id])) {
                    $departures_by_stop[$stop_id][] = array(
                        'time' => $normalized_time, // Np. "25:10"
                        'line' => !empty($trip_info['badge']) ? $trip_info['badge'] : $route_info['badge'],
                        'destination' => !empty($trip_info['headsign']) ? $trip_info['headsign'] : '',
                        'train_number' => $trip_info['train_number'],
                        'platform' => $stop_info['platform'],
                        'route_type' => $trip_info['type'],
                        'color' => !empty($trip_info['color']) ? $trip_info['color'] : $route_info['color'],
                        'trip_id' => $trip_id,
                        'service_id' => $trip_info['service_id'],
                        'route_id' => $route_id,
                        'sequence' => $seq,
                        'attributes' => $trip_info['attributes']
                    );
                }

                $stops_by_trip[$trip_id][] = array(
                    'stop_id' => $stop_id,
                    'stop_name' => $stop_info['name'],
                    'arrival_time' => substr($data[$arrival_idx], 0, 5),
                    'departure_time' => $departure,
                    'sequence' => $seq,
                    'platform' => $stop_info['platform']
                );
            }
            fclose($handle);

            // 4. Enrich departures with terminal names and standardize
            foreach ($departures_by_stop as $s_id => &$deps) {
                foreach ($deps as &$d) {
                    $tid = $d['trip_id'] ?? '';
                    if (empty($d['destination']) && isset($trip_terminals[$tid])) {
                        $term_stop_id = $trip_terminals[$tid]['stop_id'];
                        $d['destination'] = isset($stop_info_map[$term_stop_id]) ? $stop_info_map[$term_stop_id] : '';
                    }

                    // Hel Peninsula Standardization for railway
                    if ($agency === 'polregio' || $agency === 'pkp' || $agency === 'skm') {
                        if ($d['destination'] === 'Władysławowo' || $d['destination'] === 'Władysławowo Port') {
                            $d['destination'] = 'Hel (przez Władysławowo)';
                        }
                    }
                }
            }
        }

        // 3. Save Departures
        $departures_dir = $this->cache_dir . "/{$agency}/departures";
        wp_mkdir_p($departures_dir);
        foreach ($departures_by_stop as $stop_id => $deps) {
            usort($deps, function ($a, $b) {
                return strcmp($a['time'], $b['time']);
            });
            file_put_contents($departures_dir . "/" . sanitize_file_name($stop_id) . ".json", json_encode($deps));
        }

        // 4. Save Trip Details
        $trips_dir = $this->cache_dir . "/{$agency}/trips";
        wp_mkdir_p($trips_dir);
        foreach ($stops_by_trip as $trip_id => $stops) {
            usort($stops, function ($a, $b) {
                return $a['sequence'] - $b['sequence'];
            });
            $trip_meta = isset($trip_info_map[$trip_id]) ? $trip_info_map[$trip_id] : array();
            file_put_contents($trips_dir . "/" . sanitize_file_name($trip_id) . ".json", json_encode(array(
                'trip_id' => $trip_id,
                'route_id' => isset($trip_meta['route_id']) ? $trip_meta['route_id'] : '',
                'service_id' => isset($trip_meta['service_id']) ? $trip_meta['service_id'] : '',
                'headsign' => isset($trip_meta['headsign']) ? $trip_meta['headsign'] : '',
                'train_number' => isset($trip_meta['train_number']) ? $trip_meta['train_number'] : '',
                'badge' => isset($trip_meta['badge']) ? $trip_meta['badge'] : '',
                'color' => isset($trip_meta['color']) ? $trip_meta['color'] : '',
                'continues_as' => isset($continuations[$trip_id]) ? $continuations[$trip_id] : null,
                'shape_id' => isset($trip_meta['shape_id']) ? $trip_meta['shape_id'] : '',
                'attributes' => isset($trip_meta['attributes']) ? $trip_meta['attributes'] : null,
                'stops' => $stops
            )));
        }

        error_log("Indexed " . count($departures_by_stop) . " stops and " . count($stops_by_trip) . " trips for {$agency}");

        unset($stops_by_trip);
        unset($departures_by_stop);
        unset($trip_info_map);
    }

    private function find_file_recursive($dir, $filename)
    {
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getFilename() === $filename) {
                return $file->getPathname();
            }
        }
        return null;
    }

    private function clear_agency_cache($agency)
    {
        $dir = $this->cache_dir . "/{$agency}";
        if (!file_exists($dir))
            return;

        require_once(ABSPATH . 'wp-admin/includes/file.php');
        global $wp_filesystem;
        if (empty($wp_filesystem)) {
            WP_Filesystem();
        }

        $wp_filesystem->delete($dir, true);

        $stops_cache = $this->cache_dir . "/{$agency}_stops.json";
        if (file_exists($stops_cache)) {
            unlink($stops_cache);
        }
    }

    private function process_mevo_stops()
    {
        $info_url = 'https://gbfs.urbansharing.com/rowermevo.pl/station_information.json';
        $args = array(
            'timeout' => 10,
            'headers' => array(
                'User-Agent' => 'Kaszuby24-Transport-Plugin/1.0'
            )
        );
        $response = wp_remote_get($info_url, $args);

        if (is_wp_error($response)) {
            return array('success' => false, 'message' => 'Failed to fetch MEVO stations');
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (!isset($data['data']['stations'])) {
            return array('success' => false, 'message' => 'Invalid MEVO data format');
        }

        $stops = array();
        foreach ($data['data']['stations'] as $station) {
            $stops[] = array(
                'id' => 'mevo_' . $station['station_id'],
                'name' => $station['name'],
                'lat' => floatval($station['lat']),
                'lon' => floatval($station['lon']),
                'agency' => 'mevo',
                'agencyIds' => array('mevo' => $station['station_id']),
                'address' => isset($station['address']) ? $station['address'] : ''
            );
        }

        $cache_file = $this->cache_dir . "/mevo_stops.json";
        file_put_contents($cache_file, json_encode($stops));

        // Also save in directory structure for consistency
        wp_mkdir_p($this->cache_dir . "/mevo");
        file_put_contents($this->cache_dir . "/mevo/stops.json", json_encode($stops));

        error_log("Processed " . count($stops) . " MEVO stations");
        return array('success' => true, 'message' => 'Processed ' . count($stops) . ' MEVO stations');
    }

    private function get_mevo_status($station_id)
    {
        $status_url = 'https://gbfs.urbansharing.com/rowermevo.pl/station_status.json';
        $args = array(
            'timeout' => 5,
            'headers' => array(
                'User-Agent' => 'Kaszuby24-Transport-Plugin/1.0'
            )
        );
        $response = wp_remote_get($status_url, $args);

        if (is_wp_error($response))
            return array();

        $data = json_decode(wp_remote_retrieve_body($response), true);
        if (!isset($data['data']['stations']))
            return array();

        foreach ($data['data']['stations'] as $station) {
            if ($station['station_id'] == $station_id) {
                // Initialize status with total bikes
                $total_bikes = isset($station['num_bikes_available']) ? $station['num_bikes_available'] : (isset($station['num_vehicles_available']) ? $station['num_vehicles_available'] : 0);

                $status = array(
                    array(
                        'time' => 'Dostępne',
                        'line' => (string) $total_bikes,
                        'destination' => 'Razem',
                        'route_type' => 'mevo_bikes'
                    )
                );

                // Add bike types if present
                $types = array();
                if (isset($station['num_bikes_available_types'])) {
                    $types = $station['num_bikes_available_types'];
                } elseif (isset($station['vehicle_types_available'])) {
                    foreach ($station['vehicle_types_available'] as $vt) {
                        if (isset($vt['vehicle_type_id']) && isset($vt['count'])) {
                            $types[$vt['vehicle_type_id']] = $vt['count'];
                        }
                    }
                }

                if (!empty($types)) {
                    foreach ($types as $type => $count) {
                        // Check for both old and new GBFS type names
                        $is_electric = ($type === 'electric' || $type === 'ebike' || strpos($type, 'elec') !== false);
                        $label = $is_electric ? 'Elektryczne' : 'Klasyczne';
                        $icon_type = $is_electric ? 'mevo_electric' : 'mevo_mechanical';

                        $status[] = array(
                            'time' => (string) $count,
                            'line' => $label,
                            'destination' => 'Rower',
                            'route_type' => $icon_type
                        );
                    }
                }

                $status[] = array(
                    'time' => 'Wolne',
                    'line' => (string) $station['num_docks_available'],
                    'destination' => 'Stojaki',
                    'route_type' => 'mevo_docks'
                );

                return $status;
            }
        }
        return array();
    }

    public function get_mevo_all_status($request)
    {
        $status_url = 'https://gbfs.urbansharing.com/rowermevo.pl/station_status.json';
        $args = array(
            'timeout' => 10,
            'headers' => array('User-Agent' => 'Kaszuby24-Transport-Plugin/1.0')
        );
        $response = wp_remote_get($status_url, $args);

        if (is_wp_error($response))
            return new WP_REST_Response(array(), 200);

        $data = json_decode(wp_remote_retrieve_body($response), true);
        if (!isset($data['data']['stations']))
            return new WP_REST_Response(array(), 200);

        $statuses = array();
        foreach ($data['data']['stations'] as $station) {
            $total_bikes = isset($station['num_bikes_available']) ? $station['num_bikes_available'] : (isset($station['num_vehicles_available']) ? $station['num_vehicles_available'] : 0);

            // Collect type details
            $classic = 0;
            $electric = 0;
            if (isset($station['vehicle_types_available'])) {
                foreach ($station['vehicle_types_available'] as $vt) {
                    if ($vt['vehicle_type_id'] === 'bike')
                        $classic = $vt['count'];
                    if ($vt['vehicle_type_id'] === 'ebike' || $vt['vehicle_type_id'] === 'electric')
                        $electric = $vt['count'];
                }
            }

            $statuses['mevo_' . $station['station_id']] = array(
                'bikes' => $total_bikes,
                'classic' => $classic,
                'electric' => $electric,
                'docks' => isset($station['num_docks_available']) ? $station['num_docks_available'] : 0
            );
        }
        return new WP_REST_Response($statuses, 200);
    }

    private function get_mevo_free_bikes()
    {
        $bikes_url = 'https://gbfs.urbansharing.com/rowermevo.pl/free_bike_status.json';
        $args = array(
            'timeout' => 5,
            'headers' => array(
                'User-Agent' => 'Kaszuby24-Transport-Plugin/1.0'
            )
        );
        $response = wp_remote_get($bikes_url, $args);

        if (is_wp_error($response))
            return array();

        $data = json_decode(wp_remote_retrieve_body($response), true);
        $bikes = array();
        if (isset($data['data']['bikes']) && is_array($data['data']['bikes'])) {
            foreach ($data['data']['bikes'] as $b) {
                $id = ($b['bike_id'] ?? $b['id'] ?? '');
                $b['id'] = 'mevo_' . $id;
                $b['bike_id'] = 'mevo_' . $id;
                $bikes[] = $b;
            }
        }
        return $bikes;
    }

    public function refresh_gtfs($request = null)
    {
        $agency = $request ? $request->get_param('agency') : null;

        if ($agency) {
            $this->process_gtfs($agency);
            $msg = "GTFS refreshed for {$agency}";
        } else {
            $this->process_gtfs('polregio');
            $this->process_gtfs('pkp');
            $this->process_gtfs('intercity');
            $this->process_gtfs('wejherowo');
            $this->process_gtfs('skm');
            $this->process_gtfs('gdynia');
            $this->process_gtfs('gdansk');
            $this->process_mevo_stops();
            $msg = 'GTFS refreshed for all operators';
        }

        if ($request) {
            return new WP_REST_Response(array('success' => true, 'message' => $msg), 200);
        }
        return array('success' => true, 'message' => $msg);
    }
}
