<?php
if (!defined('ABSPATH'))
    exit;

require_once K24_TRANS_V2_PATH . 'includes/class-gtfs-engine.php';
require_once K24_TRANS_V2_PATH . 'includes/class-skm-handler.php';
require_once K24_TRANS_V2_PATH . 'includes/class-gtfs-manager.php';

class Kaszuby24_Transport_V2
{
    private $namespace = 'kaszuby24/v2';
    private $cache_dir;
    private $handlers = array();
    public $gtfs_manager;

    public function __construct()
    {
        $upload_dir = wp_upload_dir();
        $this->cache_dir = $upload_dir['basedir'] . '/k24-transport-v2';

        if (!file_exists($this->cache_dir))
            wp_mkdir_p($this->cache_dir);

        // Rejestracja Handlerów
        require_once K24_TRANS_V2_PATH . 'includes/class-skm-handler.php';
        require_once K24_TRANS_V2_PATH . 'includes/class-polregio-handler.php';
        require_once K24_TRANS_V2_PATH . 'includes/class-mzk-handler.php';
        require_once K24_TRANS_V2_PATH . 'includes/class-pks-gdynia-handler.php';

        $this->gtfs_manager = new Kaszuby24_GTFS_Manager();

        $this->handlers['skm'] = new Kaszuby24_SKM_Handler($this->cache_dir, $this->gtfs_manager);
        $this->handlers['polregio'] = new Kaszuby24_PolRegio_Handler($this->cache_dir, $this->gtfs_manager);
        $this->handlers['mzk_wejherowo'] = new Kaszuby24_MZK_Handler($this->cache_dir, $this->gtfs_manager);
        $this->handlers['pksgdynia'] = new Kaszuby24_PKS_Gdynia_Handler($this->cache_dir, $this->gtfs_manager);

        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('wp_ajax_k24_sync_agency', array($this, 'ajax_sync_agency'));

        if (!wp_next_scheduled('k24_transport_sync_cron')) {
            wp_schedule_event(time(), 'daily', 'k24_transport_sync_cron');
        }
        add_action('k24_transport_sync_cron', array($this, 'sync_all'));
    }

    public function add_admin_menu()
    {
        add_menu_page(
            'Transport V2',
            'Transport V2',
            'manage_options',
            'k24-transport-v2',
            array($this, 'render_admin_page'),
            'dashicons-location-alt',
            30
        );
    }

    public function render_admin_page()
    {
        ?>
        <div class="wrap">
            <h1>Kaszuby24 Transport V2 - Synchronizacja GTFS</h1>
            <p>Panel administracyjny do synchronizacji danych transportowych.</p>

            <div style="margin-top: 30px;">
                <h2>Synchronizuj dane GTFS</h2>
                <p>Kliknij przycisk aby pobrać i przetworzyć najnowsze rozkłady jazdy.</p>

                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>Operator</th>
                            <th>Status</th>
                            <th>Akcja</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>SKM</strong> (Szybka Kolej Miejska)</td>
                            <td><span class="skm-status">Gotowy do synchronizacji</span></td>
                            <td>
                                <button class="button button-primary sync-btn" data-agency="skm">
                                    Synchronizuj SKM
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td><strong>POLREGIO</strong> (Koleje regionalne)</td>
                            <td><span class="polregio-status">Gotowy do synchronizacji</span></td>
                            <td>
                                <button class="button button-primary sync-btn" data-agency="polregio">
                                    Synchronizuj POLREGIO
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td><strong>MZK Wejherowo</strong> (Autobusy miejskie)</td>
                            <td><span class="mzk_wejherowo-status">Gotowy do synchronizacji</span></td>
                            <td>
                                <button class="button button-primary sync-btn" data-agency="mzk_wejherowo">
                                    Synchronizuj MZK
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td><strong>PKS Gdynia</strong> (Autobusy regionalne)</td>
                            <td><span class="pksgdynia-status">Gotowy do synchronizacji</span></td>
                            <td>
                                <button class="button button-primary sync-btn" data-agency="pksgdynia">
                                    Synchronizuj PKS
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 20px; padding: 15px; background: #fff; border-left: 4px solid #2271b1;">
                    <h3>Logi synchronizacji</h3>
                    <div id="sync-logs" style="font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; background: #f6f7f7; padding: 10px;">
                        <p>Kliknij przycisk synchronizacji aby zobaczyć logi...</p>
                    </div>
                </div>
            </div>
        </div>

        <script>
        jQuery(document).ready(function($) {
            $('.sync-btn').on('click', function() {
                var agency = $(this).data('agency');
                var btn = $(this);
                var statusSpan = $('.' + agency + '-status');

                btn.prop('disabled', true).text('Synchronizacja...');
                statusSpan.html('<span style="color: orange;">⏳ Trwa synchronizacja...</span>');
                $('#sync-logs').html('<p style="color: blue;">Rozpoczęto synchronizację ' + agency + '...</p>');

                $.ajax({
                    url: ajaxurl,
                    method: 'POST',
                    data: {
                        action: 'k24_sync_agency',
                        agency: agency,
                        _ajax_nonce: '<?php echo wp_create_nonce('k24_sync_nonce'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            statusSpan.html('<span style="color: green;">✅ ' + response.data.message + '</span>');
                            $('#sync-logs').append('<p style="color: green;">✅ ' + agency + ': ' + response.data.message + '</p>');
                        } else {
                            statusSpan.html('<span style="color: red;">❌ Błąd</span>');
                            $('#sync-logs').append('<p style="color: red;">❌ ' + agency + ': ' + response.data + '</p>');
                        }
                        btn.prop('disabled', false).text('Synchronizuj ' + agency.toUpperCase());
                    },
                    error: function(xhr, status, error) {
                        statusSpan.html('<span style="color: red;">❌ Błąd połączenia</span>');
                        $('#sync-logs').append('<p style="color: red;">❌ Błąd AJAX: ' + error + '</p>');
                        btn.prop('disabled', false).text('Synchronizuj ' + agency.toUpperCase());
                    }
                });
            });
        });
        </script>
        <?php
    }

    public function ajax_sync_agency()
    {
        check_ajax_referer('k24_sync_nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Brak uprawnień');
            return;
        }

        $agency = sanitize_text_field($_POST['agency']);

        if (!isset($this->handlers[$agency])) {
            wp_send_json_error('Nieznany operator: ' . $agency);
            return;
        }

        $result = $this->handlers[$agency]->sync();

        if ($result === true) {
            wp_send_json_success(array('message' => 'Synchronizacja zakończona pomyślnie'));
        } else {
            wp_send_json_error($result);
        }
    }

    public function register_routes()
    {
        register_rest_route($this->namespace, '/stops', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_stops'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route($this->namespace, '/timetable', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_timetable'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route($this->namespace, '/mzk-line', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_mzk_line_timetable'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route($this->namespace, '/pks-line', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_pks_line_timetable'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route($this->namespace, '/pks-lines', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_pks_lines_list'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route($this->namespace, '/skm-routes', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_skm_routes'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route($this->namespace, '/polregio-routes', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_polregio_routes'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route($this->namespace, '/shapes', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_shapes'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route($this->namespace, '/trip-stops', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_trip_stops'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route($this->namespace, '/debug', array(
            'methods' => 'GET',
            'callback' => function () {
                $now_ts = current_time('timestamp');
                $hour = (int) wp_date('G', $now_ts);
                $service_ts = ($hour < 3) ? ($now_ts - 86400) : $now_ts;
                $now_time_str = wp_date('H:i', $now_ts);
                if ($hour < 3) {
                    $now_time_str = sprintf("%02d:%s", $hour + 24, wp_date('i', $now_ts));
                }
                $services_file = $this->cache_dir . "/skm/services.json";
                $services = file_exists($services_file) ? json_decode(file_get_contents($services_file), true) : array();

                $path = $this->cache_dir . '/skm/unzipped/';
                $stops_file = $path . 'stops.txt';
                $debug_data = array();

                if (file_exists($stops_file)) {
                    $handle = fopen($stops_file, 'r');
                    $headers = fgetcsv($handle);
                    $rows = array();
                    for ($i = 0; $i < 5; $i++) {
                        $row = fgetcsv($handle);
                        if ($row)
                            $rows[] = $row;
                    }
                    fclose($handle);
                    $debug_data['headers'] = $headers;
                    $debug_data['rows'] = $rows;
                } else {
                    $debug_data['error'] = 'stops.txt not found at ' . $stops_file;
                }

                return array(
                    'server_time' => wp_date('Y-m-d H:i:s', $now_ts),
                    'service_date_ymd' => wp_date('Ymd', $service_ts),
                    'wp_upload_dir' => wp_upload_dir(),
                    'debug_stops' => $debug_data
                );
            },
            'permission_callback' => '__return_true'
        ));

        register_rest_route($this->namespace, '/debug-gtfs', array(
            'methods' => 'GET',
            'callback' => function () {
                $path = $this->cache_dir . '/skm/unzipped/';
                $stops_file = $path . 'stops.txt';
                $debug_data = array(
                    'cache_dir' => $this->cache_dir,
                    'path_exists' => file_exists($path),
                    'file_exists' => file_exists($stops_file),
                );

                if (file_exists($stops_file)) {
                    $handle = fopen($stops_file, 'r');
                    $headers = fgetcsv($handle);
                    $rows = array();
                    for ($i = 0; $i < 5; $i++) {
                        $row = fgetcsv($handle);
                        if ($row)
                            $rows[] = $row;
                    }
                    fclose($handle);
                    $debug_data['headers'] = $headers;
                    $debug_data['rows'] = $rows;
                }

                return $debug_data;
            },
            'permission_callback' => '__return_true'
        ));

        register_rest_route($this->namespace, '/sync', array(
            'methods' => 'GET',
            'callback' => function ($request) {
                $agency = $request->get_param('agency');
                if ($request->get_param('force')) {
                    delete_transient('k24_sync_lock');
                    return $this->sync_all(true, $agency);
                }
                return $this->sync_all(false, $agency);
            },
            'permission_callback' => function ($request) {
                $key = $request->get_param('key');
                if ($key === 'k24_secret_sync_key')
                    return true;
            }
        ));

        register_rest_route($this->namespace, '/test-otp', array(
            'methods' => 'GET',
            'callback' => function () {
                $url = 'http://46.29.18.195:8012/otp/routers/default/index/graphql';
                $query = '{ agencies { name } }';

                $response = wp_remote_post($url, array(
                    'headers' => array('Content-Type' => 'application/json'),
                    'body' => json_encode(array('query' => $query)),
                    'timeout' => 15
                ));

                if (is_wp_error($response)) {
                    return array('success' => false, 'error' => $response->get_error_message());
                }

                $body = wp_remote_retrieve_body($response);
                return array(
                    'success' => true,
                    'status' => wp_remote_retrieve_response_code($response),
                    'data' => json_decode($body, true)
                );
            },
            'permission_callback' => '__return_true'
        ));
    }

    public function get_timetable($request)
    {
        $agency = $request->get_param('agency');
        $stop_id = $request->get_param('stop_id');
        $day = $request->get_param('day') ?: 'today';

        error_log('[Transport V2 API] get_timetable called - Agency: ' . $agency . ', Stop: ' . $stop_id . ', Day: ' . $day);

        if (isset($this->handlers[$agency])) {
            $response = $this->handlers[$agency]->get_timetable($stop_id, $day);
            
            // Log response data
            if ($response instanceof WP_REST_Response) {
                $data = $response->get_data();
                error_log('[Transport V2 API] Response data count: ' . count($data));
                if (count($data) > 0) {
                    error_log('[Transport V2 API] First item: ' . json_encode($data[0]));
                }
            }
            
            return $response;
        }

        error_log('[Transport V2 API] Unsupported agency: ' . $agency);
        return new WP_REST_Response(array('error' => 'Unsupported agency'), 404);
    }

    public function get_mzk_line_timetable($request)
    {
        $line_number = $request->get_param('line');
        $day = $request->get_param('day') ?: 'today';

        if (!$line_number) {
            return new WP_REST_Response(array('error' => 'Line number required'), 400);
        }

        if (isset($this->handlers['mzk_wejherowo'])) {
            $response = $this->handlers['mzk_wejherowo']->get_line_timetable($line_number, $day);
            return new WP_REST_Response($response, 200);
        }

        return new WP_REST_Response(array('error' => 'MZK handler not available'), 404);
    }

    public function get_pks_line_timetable($request)
    {
        $line_number = $request->get_param('line');
        $day = $request->get_param('day') ?: 'today';

        if (!$line_number) {
            return new WP_REST_Response(array('error' => 'Line number required'), 400);
        }

        if (isset($this->handlers['pksgdynia'])) {
            $response = $this->handlers['pksgdynia']->get_line_timetable($line_number, $day);
            return new WP_REST_Response($response, 200);
        }

        return new WP_REST_Response(array('error' => 'PKS Gdynia handler not available'), 404);
    }
    public function get_skm_routes($request)
    {
        $route_id = $request->get_param('route');
        $day = $request->get_param('day') ?: 'today';
        $direction = $request->get_param('direction');

        if (!$route_id) {
            return new WP_REST_Response(array('error' => 'Missing route parameter'), 400);
        }

        if (isset($this->handlers['skm'])) {
            $response = $this->handlers['skm']->get_route_stops($route_id, $day, $direction);
            return new WP_REST_Response($response, 200);
        }

        return new WP_REST_Response(array('error' => 'SKM handler not found'), 500);
    }

    public function get_polregio_routes($request)
    {
        $route_id = $request->get_param('route');
        $day = $request->get_param('day') ?: 'today';
        $direction = $request->get_param('direction');

        if (!$route_id) {
            return new WP_REST_Response(array('error' => 'Missing route parameter'), 400);
        }

        if (isset($this->handlers['polregio'])) {
            $response = $this->handlers['polregio']->get_route_stops($route_id, $day, $direction);
            return new WP_REST_Response($response, 200);
        }

        return new WP_REST_Response(array('error' => 'POLREGIO handler not found'), 500);
    }
    public function get_pks_lines_list($request)
    {
        if (isset($this->handlers['pksgdynia'])) {
            try {
                $response = $this->handlers['pksgdynia']->get_lines_list();
                return new WP_REST_Response($response, 200);
            } catch (Exception $e) {
                return new WP_REST_Response(array('error' => $e->getMessage()), 500);
            }
        }

        return new WP_REST_Response(array('error' => 'PKS Gdynia handler not available'), 404);
    }

    public function get_shapes($request)
    {
        $agency = $request->get_param('agency') ?: 'skm';

        if (isset($this->handlers[$agency])) {
            $response = $this->handlers[$agency]->get_shapes();
            return $response;
        }

        return new WP_REST_Response(array('error' => 'Unsupported agency'), 404);
    }

    public function get_stops($request)
    {
        $agency = $request->get_param('agency');
        $bbox = $request->get_param('bbox');

        $min_lon = $min_lat = $max_lon = $max_lat = null;
        if ($bbox) {
            $parts = explode(',', $bbox);
            if (count($parts) === 4) {
                list($min_lon, $min_lat, $max_lon, $max_lat) = array_map('floatval', $parts);
            }
        }

        $features = array();

        foreach ($this->handlers as $slug => $handler) {
            if ($agency && $agency !== 'all' && $agency !== $slug)
                continue;

            $file = $this->cache_dir . "/{$slug}_stops.json";
            if (file_exists($file)) {
                $stops = json_decode(file_get_contents($file), true);
                foreach ((array) $stops as $s) {
                    if ($min_lon !== null) {
                        if ($s['lon'] < $min_lon || $s['lon'] > $max_lon || $s['lat'] < $min_lat || $s['lat'] > $max_lat) {
                            continue;
                        }
                    }

                    $features[] = array(
                        'type' => 'Feature',
                        'geometry' => array('type' => 'Point', 'coordinates' => array($s['lon'], $s['lat'])),
                        'properties' => $s
                    );
                }
            }
        }

        // Sort stops by priority: SKM > POLREGIO > MZK Wejherowo > others
        usort($features, function ($a, $b) {
            $priority_a = $this->get_agency_priority($a['properties']['agency'] ?? '');
            $priority_b = $this->get_agency_priority($b['properties']['agency'] ?? '');
            return $priority_b - $priority_a; // Higher priority first
        });

        return new WP_REST_Response(array('type' => 'FeatureCollection', 'features' => $features), 200);
    }

    public function sync_all($force = false, $target_agency = null)
    {
        if (!$force && get_transient('k24_sync_lock')) {
            return new WP_REST_Response(array('status' => 'busy', 'message' => 'Sync already in progress'), 423);
        }
        set_transient('k24_sync_lock', 1, 900); // 15 min lock

        $report = array();
        foreach ($this->handlers as $slug => $handler) {
            if ($target_agency && $slug !== $target_agency) {
                continue;
            }
            $success = $handler->sync();
            $file = $this->cache_dir . "/{$slug}_stops.json";
            $count = file_exists($file) ? count(json_decode(file_get_contents($file), true)) : 0;
            $report[$slug] = array(
                'success' => $success,
                'stops_count' => $count,
                'cache_file' => basename($file)
            );
        }

        delete_transient('k24_sync_lock');
        return new WP_REST_Response(array('status' => 'Sync completed', 'report' => $report), 200);
    }

    public function get_trip_stops($request)
    {
        $trip_id = $request->get_param('trip_id');
        $agency = $request->get_param('agency');

        if (!$trip_id || !$agency) {
            return new WP_REST_Response(array('error' => 'Missing trip_id or agency'), 400);
        }

        $agency = strtolower($agency);
        
        // Map frontend agency names to handler keys
        $agency_map = array(
            'skm' => 'skm',
            'polregio' => 'polregio',
            'mzk' => 'mzk_wejherowo',
            'pks' => 'pksgdynia'
        );

        if (!isset($agency_map[$agency]) || !isset($this->handlers[$agency_map[$agency]])) {
            return new WP_REST_Response(array('error' => 'Invalid agency'), 400);
        }

        $handler = $this->handlers[$agency_map[$agency]];
        
        if (!method_exists($handler, 'get_trip_stops')) {
            return new WP_REST_Response(array('error' => 'Handler does not support trip stops'), 501);
        }

        $result = $handler->get_trip_stops($trip_id);
        return new WP_REST_Response($result, 200);
    }

    // Dodatkowy punkt diagnostyczny
    public function get_debug_info()
    {
        $files = scandir($this->cache_dir);
        return new WP_REST_Response(array(
            'cache_dir' => $this->cache_dir,
            'files' => $files,
            'wp_upload_dir' => wp_upload_dir()
        ), 200);
    }

    /**
     * Get agency priority for sorting stops
     * Priority: SKM (110) > POLREGIO (100) > MZK Wejherowo (90) > others
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

        // PKS gets good priority
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

        return 30; // Default
    }
}
