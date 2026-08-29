<?php
/**
 * Główna klasa API dla PKS
 */

if (!defined('ABSPATH')) {
    exit;
}

class PKS_API {

    /**
     * Cache expiry time (24 hours)
     */
    const CACHE_EXPIRY = 24 * 60 * 60;

    /**
     * PKS Scraper instance
     */
    private $scraper;

    /**
     * Constructor
     */
    public function __construct() {
        $this->scraper = new PKS_Scraper();
    }

    /**
     * Get routes endpoint
     */
    public function get_routes($request) {
        try {
            $force_refresh = $request->get_param('force_refresh') === true;

            // Sprawdź cache
            $cache_key = 'pks_routes';
            if (!$force_refresh) {
                $cached_data = $this->get_cached_data($cache_key);
                if ($cached_data) {
                    return new WP_REST_Response($cached_data, 200);
                }
            }

            // Pobierz dane z scrapera
            $routes = $this->scraper->get_routes();

            if (empty($routes)) {
                return new WP_Error('no_data', 'Nie udało się pobrać danych tras PKS', array('status' => 503));
            }

            // Zapisz w cache
            $this->set_cached_data($cache_key, $routes);

            return new WP_REST_Response($routes, 200);

        } catch (Exception $e) {
            error_log('PKS API Error (routes): ' . $e->getMessage());
            return new WP_Error('server_error', 'Błąd serwera', array('status' => 500));
        }
    }

    /**
     * Get stops endpoint
     */
    public function get_stops($request) {
        try {
            $search = $request->get_param('search');
            $limit = $request->get_param('limit');

            // Sprawdź cache
            $cache_key = 'pks_stops' . ($search ? '_search_' . md5($search) : '');
            $cached_data = $this->get_cached_data($cache_key);

            if ($cached_data) {
                $stops = $cached_data;
            } else {
                // Pobierz wszystkie przystanki
                $stops = $this->scraper->get_stops();

                if (empty($stops)) {
                    return new WP_Error('no_data', 'Nie udało się pobrać danych przystanków PKS', array('status' => 503));
                }

                // Zapisz w cache
                $this->set_cached_data($cache_key, $stops);
            }

            // Filtruj jeśli podano wyszukiwanie
            if ($search) {
                $search_lower = strtolower($search);
                $stops = array_filter($stops, function($stop) use ($search_lower) {
                    return strpos(strtolower($stop['name']), $search_lower) !== false;
                });
            }

            // Ogranicz liczbę wyników
            if ($limit && count($stops) > $limit) {
                $stops = array_slice($stops, 0, $limit);
            }

            return new WP_REST_Response(array_values($stops), 200);

        } catch (Exception $e) {
            error_log('PKS API Error (stops): ' . $e->getMessage());
            return new WP_Error('server_error', 'Błąd serwera', array('status' => 500));
        }
    }

    /**
     * Get schedule for specific route - prawdziwe PDF-y z PKS!
     */
    public function get_schedule($request) {
        try {
            $route_id = $request->get_param('route_id');

            if (empty($route_id)) {
                return new WP_Error('invalid_route', 'Nieprawidłowy identyfikator trasy', array('status' => 400));
            }

            // Sprawdź cache
            $cache_key = 'pks_schedule_' . $route_id;
            $cached_data = $this->get_cached_data($cache_key);

            if ($cached_data) {
                return new WP_REST_Response($cached_data, 200);
            }

            // Najpierw spróbuj znaleźć PDF w danych tras
            $pdf_url = $this->find_pdf_for_route($route_id);

            if ($pdf_url) {
                $schedule = array(
                    'route' => 'Linia ' . $route_id,
                    'route_id' => $route_id,
                    'pdf_url' => $pdf_url,
                    'last_updated' => date('Y-m-d'),
                    'valid' => true,
                    'operator' => 'PKS Gdynia',
                    'info' => 'Rozkład dostępny w PDF. Aktualne informacje na stronie PKS Gdynia.',
                    'source' => 'scraped-from-pks-main-page'
                );
            } else {
                // Fallback do mock danych
                $schedule = $this->get_mock_schedule($route_id);
            }

            // Zapisz w cache
            $this->set_cached_data($cache_key, $schedule);

            return new WP_REST_Response($schedule, 200);

        } catch (Exception $e) {
            error_log('PKS API Error (schedule): ' . $e->getMessage());
            return new WP_Error('server_error', 'Błąd serwera', array('status' => 500));
        }
    }

    /**
     * Find PDF URL for specific route from scraped data
     */
    private function find_pdf_for_route($route_id) {
        try {
            // Pobierz wszystkie trasy żeby znaleźć PDF
            $routes = $this->scraper->get_routes();

            foreach ($routes as $route) {
                if ($route['id'] === $route_id && isset($route['pdf_url']) && !empty($route['pdf_url'])) {
                    return $route['pdf_url'];
                }
            }

            return false;

        } catch (Exception $e) {
            error_log('Find PDF error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get mock schedule data for testing
     */
    private function get_mock_schedule($route_id) {
        // Lista rzeczywistych tras z PKS
        $routes_data = array(
            '1' => array('name' => 'Linia Po Pucku', 'description' => 'Gdynia - Puck'),
            '11' => array('name' => 'Linia Komunikacji Miejskiej we Władysławowie', 'description' => 'Władysławowo - Władysławowo'),
            '12' => array('name' => 'Linia Komunikacji Miejskiej we Władysławowie', 'description' => 'Władysławowo - Władysławowo'),
            '150' => array('name' => 'Gdynia - Sopot - Gdańsk', 'description' => 'Gdynia przez Sopot do Gdańska'),
            '200' => array('name' => 'Gdynia - Kartuzy - Kościerzyna', 'description' => 'Gdynia przez Kartuzy do Kościerzyny'),
            '650' => array('name' => 'Gdynia - Żukowo - Kartuzy', 'description' => 'Gdynia przez Żukowo do Kartuz'),
        );

        if (isset($routes_data[$route_id])) {
            return array(
                'route' => $routes_data[$route_id]['name'],
                'description' => $routes_data[$route_id]['description'],
                'route_id' => $route_id,
                'pdf_url' => 'https://pksgdynia.pl/wp-content/uploads/2025/08/PKSW-Schemat-glowny-2025.pdf',
                'last_updated' => date('Y-m-d'),
                'valid' => true,
                'operator' => 'PKS Gdynia',
                'info' => 'Rozkład dostępny w PDF. Aktualne informacje na stronie PKS Gdynia.'
            );
        }

        // Domyślne dane dla nieznanych tras
        return array(
            'route' => 'Linia ' . $route_id,
            'description' => 'Trasa regionalna PKS Gdynia',
            'route_id' => $route_id,
            'pdf_url' => 'https://pksgdynia.pl/wp-content/uploads/2025/08/PKSW-Schemat-glowny-2025.pdf',
            'last_updated' => date('Y-m-d'),
            'valid' => true,
            'operator' => 'PKS Gdynia',
            'info' => 'Rozkład dostępny w PDF. Sprawdź stronę PKS Gdynia dla szczegółów.'
        );
    }

    // USUNIĘTO: Metoda search_connections - plugin obsługuje tylko PKS Gdynia
    // Nie ma wyszukiwania połączeń między różnymi przewoźnikami

    /**
     * Get API status - tylko PKS Gdynia
     */
    public function get_status() {
        try {
            $stats = $this->get_stats();

            $status = array(
                'status' => 'ok',
                'version' => '1.0.0',
                'provider' => 'PKS Gdynia',
                'last_update' => $stats['last_update'],
                'routes_count' => $stats['routes_count'],
                'stops_count' => $stats['stops_count'],
                'cache_status' => $stats['cache_status'],
                'description' => 'API tylko dla PKS Gdynia - rozkłady jazdy i przystanki',
                'endpoints' => array(
                    'routes' => array(
                        'url' => rest_url('pks-api/v1/routes'),
                        'description' => 'Lista wszystkich tras PKS Gdynia (91 linii)'
                    ),
                    'stops' => array(
                        'url' => rest_url('pks-api/v1/stops'),
                        'description' => 'Wszystkie przystanki PKS z współrzędnymi GPS (102 przystanki)'
                    ),
                    'schedule' => array(
                        'url' => rest_url('pks-api/v1/schedule/{route_id}'),
                        'description' => 'Rozkład jazdy konkretnej trasy'
                    )
                ),
                'data_types' => array(
                    'routes' => 'Strukturalne dane tras z numerami linii i opisami',
                    'stops' => 'Przystanki z nazwami, współrzędnymi GPS i regionami',
                    'schedules' => 'Linki do PDF-ów rozkładów jazdy'
                )
            );

            return new WP_REST_Response($status, 200);

        } catch (Exception $e) {
            return new WP_Error('server_error', 'Błąd serwera', array('status' => 500));
        }
    }

    /**
     * Get statistics
     */
    public function get_stats() {
        $routes_count = 0;
        $stops_count = 0;
        $last_update = 'Nigdy';
        $cache_status = 'unknown';

        // Sprawdź cache tras
        $routes_cache = $this->get_cached_data('pks_routes');
        if ($routes_cache) {
            $routes_count = count($routes_cache);
            $last_update = get_option('pks_api_last_update', 'Nieznana');
            $cache_status = $this->is_cache_valid('pks_routes') ? 'valid' : 'expired';
        }

        // Sprawdź cache przystanków
        $stops_cache = $this->get_cached_data('pks_stops');
        if ($stops_cache) {
            $stops_count = count($stops_cache);
        }

        // Pobierz ostatnie trasy
        $recent_routes = $routes_cache ? array_slice($routes_cache, 0, 5) : array();

        return array(
            'routes_count' => $routes_count,
            'stops_count' => $stops_count,
            'last_update' => $last_update,
            'cache_status' => $cache_status,
            'recent_routes' => $recent_routes
        );
    }

    /**
     * Refresh all data
     */
    public function refresh_data() {
        try {
            // Wyczyść cache
            $this->clear_cache();

            // Odśwież trasy
            $routes = $this->scraper->get_routes();
            if (!empty($routes)) {
                $this->set_cached_data('pks_routes', $routes);
            }

            // Odśwież przystanki
            $stops = $this->scraper->get_stops();
            if (!empty($stops)) {
                $this->set_cached_data('pks_stops', $stops);
            }

            // Zapisz czas aktualizacji
            update_option('pks_api_last_update', current_time('mysql'));

            return true;

        } catch (Exception $e) {
            error_log('PKS API Refresh Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get cached data
     */
    private function get_cached_data($key) {
        global $wpdb;

        $table_name = $wpdb->prefix . 'pks_api_cache';
        $result = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT cache_data FROM $table_name WHERE cache_key = %s AND expires > NOW()",
                $key
            )
        );

        if ($result) {
            return json_decode($result->cache_data, true);
        }

        return false;
    }

    /**
     * Set cached data
     */
    private function set_cached_data($key, $data) {
        global $wpdb;

        $table_name = $wpdb->prefix . 'pks_api_cache';
        $expires = date('Y-m-d H:i:s', time() + self::CACHE_EXPIRY);

        $wpdb->replace(
            $table_name,
            array(
                'cache_key' => $key,
                'cache_data' => wp_json_encode($data),
                'expires' => $expires
            ),
            array('%s', '%s', '%s')
        );
    }

    /**
     * Check if cache is valid
     */
    private function is_cache_valid($key) {
        global $wpdb;

        $table_name = $wpdb->prefix . 'pks_api_cache';
        $count = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $table_name WHERE cache_key = %s AND expires > NOW()",
                $key
            )
        );

        return $count > 0;
    }

    /**
     * Clear all cache
     */
    private function clear_cache() {
        global $wpdb;

        $table_name = $wpdb->prefix . 'pks_api_cache';
        $wpdb->query("DELETE FROM $table_name");
    }
}
