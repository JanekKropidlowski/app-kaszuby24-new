<?php
/**
 * Klasa do scrapowania danych PKS Gdynia
 */

if (!defined('ABSPATH')) {
    exit;
}

class PKS_Scraper {

    /**
     * Base URL for PKS website
     */
    const PKS_BASE_URL = 'https://pksgdynia.pl';

    /**
     * E-podroznik API URL
     */
    const EPODROZNIK_API_URL = 'https://www.e-podroznik.pl/public/seoIndexCarrierMainPage.do';

    /**
     * User agent for requests
     */
    const USER_AGENT = 'PKS-API-Plugin/1.0 (WordPress)';

    /**
     * Request timeout
     */
    const REQUEST_TIMEOUT = 30;

    /**
     * Get all PKS routes - scrapuje prawdziwe dane z strony głównej PKS
     */
    public function get_routes() {
        try {
            // Najpierw spróbuj scrapować prawdziwe dane z strony głównej PKS
            $scraped_routes = $this->scrape_real_routes_from_pks();

            if (!empty($scraped_routes)) {
                // Zapisz do pliku JSON dla cache
                $this->save_routes_to_cache($scraped_routes);
                return $scraped_routes;
            }

            // Fallback - załaduj z pliku JSON jeśli scraping nie działa
            $routes_file = plugin_dir_path(dirname(__FILE__)) . '../pks_routes_data.json';
            if (file_exists($routes_file)) {
                $data = json_decode(file_get_contents($routes_file), true);
                if (isset($data['routes']) && is_array($data['routes'])) {
                    return $data['routes'];
                }
            }

            // Fallback - podstawowe trasy jeśli nic nie działa
            return $this->get_basic_routes();

        } catch (Exception $e) {
            error_log('PKS Scraper Error (routes): ' . $e->getMessage());
            return $this->get_basic_routes();
        }
    }

    /**
     * Get all PKS stops
     */
    public function get_stops() {
        try {
            // Załaduj dane przystanków z pliku JSON
            $stops_file = plugin_dir_path(dirname(__FILE__)) . '../pks_stops_data.json';

            if (file_exists($stops_file)) {
                $data = json_decode(file_get_contents($stops_file), true);
                if (isset($data['stops']) && is_array($data['stops'])) {
                    return $data['stops'];
                }
            }

            // Fallback - podstawowe przystanki
            return $this->get_basic_stops();

        } catch (Exception $e) {
            error_log('PKS Scraper Error (stops): ' . $e->getMessage());
            return $this->get_basic_stops();
        }
    }

    /**
     * Get schedule for specific route
     */
    public function get_schedule($route_id) {
        try {
            $url = self::PKS_BASE_URL . '/rozklad_jazdy/' . $route_id . '/';

            $response = $this->make_request($url);

            if (!$response) {
                return false;
            }

            return $this->parse_schedule($response);

        } catch (Exception $e) {
            error_log('PKS Scraper Error (schedule): ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Search connections between stops
     */
    public function search_connections($from, $to, $date = null) {
        try {
            if (!$date) {
                $date = date('Y-m-d');
            }

            // Użyj e-podroznik API do wyszukiwania połączeń
            $connections = $this->search_epodroznik($from, $to, $date);

            return $connections;

        } catch (Exception $e) {
            error_log('PKS Scraper Error (search): ' . $e->getMessage());
            return array();
        }
    }

    /**
     * Scrape routes from e-podroznik API
     */
    private function scrape_routes_from_epodroznik() {
        $routes = array();

        try {
            $timestamp = time() * 1000;
            $url = self::EPODROZNIK_API_URL . '?' . http_build_query(array(
                'carrierId' => '1847',
                'seoName' => 'pks-gdynia',
                'lang' => 'pl',
                'formCompositeExternalCarrier.version' => '2.2',
                'ajax' => 'true',
                '_' => $timestamp
            ));

            $response = $this->make_request($url);

            if (!$response) {
                return $routes;
            }

            // Parsuj tabelę z trasami
            $routes = $this->parse_epodroznik_routes($response);

        } catch (Exception $e) {
            error_log('E-podroznik scraping error: ' . $e->getMessage());
        }

        return $routes;
    }

    /**
     * Scrape routes from PKS website
     */
    private function scrape_routes_from_website() {
        $routes = array();

        try {
            $url = self::PKS_BASE_URL . '/rozklad-jazdy/';
            $response = $this->make_request($url);

            if (!$response) {
                return $routes;
            }

            // Parsuj listę tras
            $routes = $this->parse_website_routes($response);

        } catch (Exception $e) {
            error_log('Website scraping error: ' . $e->getMessage());
        }

        return $routes;
    }

    /**
     * Parse routes from e-podroznik HTML
     */
    private function parse_epodroznik_routes($html) {
        $routes = array();

        // Szukaj tabeli z trasami
        if (preg_match('/<table[^>]*>.*?<\/table>/s', $html, $table_match)) {
            $table_html = $table_match[0];

            // Szukaj linków do tras
            $pattern = '/<a[^>]*href="\/(\d+),(\d+),(\d+),rozklad-jazdy-pks-([^"]+)\.html"[^>]*title="([^"]+)"/i';

            if (preg_match_all($pattern, $table_html, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $match) {
                    $carrier_id = $match[1];
                    $from_id = $match[2];
                    $to_id = $match[3];
                    $route_slug = $match[4];
                    $route_title = $match[5];

                    // Podziel tytuł na części (np. "Gdynia - Sopot - Gdańsk")
                    $route_parts = explode(' - ', $route_title);
                    $from = isset($route_parts[0]) ? trim($route_parts[0]) : '';
                    $to = isset($route_parts[count($route_parts) - 1]) ? trim($route_parts[count($route_parts) - 1]) : '';

                    $routes[] = array(
                        'id' => $route_slug,
                        'line' => $route_slug,
                        'route' => $route_title,
                        'from' => $from,
                        'to' => $to,
                        'url' => "https://www.e-podroznik.pl/{$carrier_id},{$from_id},{$to_id},rozklad-jazdy-pks-{$route_slug}.html",
                        'source' => 'e-podroznik'
                    );
                }
            }
        }

        return $routes;
    }

    /**
     * Parse routes from PKS website HTML
     */
    private function parse_website_routes($html) {
        $routes = array();

        // Szukaj elementów z trasami
        $pattern = '/href="https:\/\/pksgdynia\.pl\/rozklad_jazdy\/([^\/]+)\/"[^>]*>[\s\S]*?<div[^>]*class="[^"]*list-no[^"]*"[^>]*>([^<]+)<\/div>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/i';

        if (preg_match_all($pattern, $html, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $route_id = $match[1];
                $line_number = trim($match[2]);
                $route_name = trim($match[3]);

                $routes[] = array(
                    'id' => $route_id,
                    'line' => $line_number,
                    'route' => $route_name,
                    'url' => self::PKS_BASE_URL . '/rozklad_jazdy/' . $route_id . '/',
                    'source' => 'pks-website'
                );
            }
        }

        return $routes;
    }

    /**
     * Parse schedule from route page
     */
    private function parse_schedule($html) {
        $schedule = array(
            'route' => '',
            'pdf_url' => '',
            'last_updated' => date('Y-m-d'),
            'valid' => false
        );

        // Najpierw szukaj nazwy trasy z numeru linii
        if (preg_match('/<h[1-6][^>]*>\s*Linia\s+(\d+)[^<]*<\/h[1-6]>/i', $html, $line_match)) {
            $line_number = $line_match[1];
            // Szukaj opisu trasy w następujących elementach
            if (preg_match('/<h[1-6][^>]*>\s*Linia\s+' . $line_number . '[^<]*<\/h[1-6]>\s*<[^>]*>([^<]+)<\/[^>]*>/i', $html, $desc_match)) {
                $schedule['route'] = trim($desc_match[1]);
            } else {
                $schedule['route'] = 'Linia ' . $line_number;
            }
        } elseif (preg_match('/<h[1-6][^>]*>([^<]+Linia[^<]+)<\/h[1-6]>/i', $html, $title_match)) {
            $schedule['route'] = trim($title_match[1]);
        } elseif (preg_match('/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i', $html, $title_match)) {
            $schedule['route'] = trim($title_match[1]);
        }

        // Szukaj linku do PDF - priorytet dla konkretnych plików linii
        $line_specific_pdf = '';
        if (preg_match('/href="([^"]*?(?:' . preg_quote($schedule['route'], '/') . '|schemat|rozklad)[^"]*\.pdf[^"]*)"/i', $html, $pdf_match)) {
            $line_specific_pdf = $pdf_match[1];
        }

        // Jeśli nie znaleziono specyficznego PDF, szukaj pierwszego dostępnego
        if (empty($line_specific_pdf) && preg_match('/href="([^"]+\.pdf[^"]*)"/i', $html, $pdf_match)) {
            $line_specific_pdf = $pdf_match[1];
        }

        // Jeśli nadal nie ma, użyj domyślnego schematu głównego
        if (empty($line_specific_pdf)) {
            $line_specific_pdf = 'https://pksgdynia.pl/wp-content/uploads/2025/08/PKSW-Schemat-glowny-2025.pdf';
        }

        $schedule['pdf_url'] = $line_specific_pdf;
        $schedule['valid'] = true;

        // Szukaj daty aktualizacji - bardziej restrykcyjne dopasowanie
        if (preg_match('/(?:Data\s*aktualizacji|ostatnia\s*aktualizacja|zaktualizowano)\s*:?\s*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4}|\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/i', $html, $date_match)) {
            $raw_date = trim($date_match[1]);
            // Konwertuj różne formaty dat na Y-m-d
            if (preg_match('/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})/', $raw_date, $parts)) {
                $schedule['last_updated'] = sprintf('%04d-%02d-%02d', $parts[3], $parts[2], $parts[1]);
            } elseif (preg_match('/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/', $raw_date, $parts)) {
                $schedule['last_updated'] = sprintf('%04d-%02d-%02d', $parts[1], $parts[2], $parts[3]);
            }
        }

        // Jeśli nie znaleziono daty, użyj aktualnej
        if (empty($schedule['last_updated']) || $schedule['last_updated'] === 'Layer and the gtag function.') {
            $schedule['last_updated'] = date('Y-m-d');
        }

        return $schedule;
    }

    /**
     * Search connections using e-podroznik
     */
    private function search_epodroznik($from, $to, $date) {
        $connections = array();

        try {
            // Użyj e-podroznik API do wyszukiwania
            // To jest uproszczona wersja - w rzeczywistości trzeba by użyć ich API
            $url = 'https://www.e-podroznik.pl/public/searchCarrier.do';

            $post_data = array(
                'carrierId' => '1847',
                'from' => $from,
                'to' => $to,
                'date' => $date,
                'lang' => 'pl'
            );

            $response = $this->make_request($url, array(
                'method' => 'POST',
                'body' => $post_data
            ));

            if ($response) {
                $connections = $this->parse_search_results($response);
            }

        } catch (Exception $e) {
            error_log('E-podroznik search error: ' . $e->getMessage());
        }

        return $connections;
    }

    /**
     * Parse search results
     */
    private function parse_search_results($html) {
        $connections = array();

        // To jest przykładowa implementacja - w rzeczywistości trzeba by
        // dokładniej przeanalizować strukturę HTML e-podroznik

        $connections[] = array(
            'from' => 'Gdynia',
            'to' => 'Gdańsk',
            'departure' => '08:30',
            'arrival' => '09:45',
            'duration' => '1h 15min',
            'line' => '150',
            'price' => '12.00 PLN'
        );

        return $connections;
    }

    /**
     * Get basic fallback stops
     */
    private function get_basic_stops() {
        return array(
            array(
                'id' => 'pks_gdynia_main',
                'name' => 'Dworzec Główny PKS Gdynia',
                'lat' => 54.5189,
                'lon' => 18.5305,
                'agency' => 'pks_gdynia'
            ),
            array(
                'id' => 'pks_wejherowo',
                'name' => 'Wejherowo Dworzec',
                'lat' => 54.6053,
                'lon' => 18.2464,
                'agency' => 'pks_gdynia'
            ),
            array(
                'id' => 'pks_rumia',
                'name' => 'Rumia',
                'lat' => 54.5623,
                'lon' => 18.3870,
                'agency' => 'pks_gdynia'
            ),
            array(
                'id' => 'pks_reda',
                'name' => 'Reda',
                'lat' => 54.6050,
                'lon' => 18.3467,
                'agency' => 'pks_gdynia'
            ),
            array(
                'id' => 'pks_puck',
                'name' => 'Puck',
                'lat' => 54.7167,
                'lon' => 18.4,
                'agency' => 'pks_gdynia'
            ),
            array(
                'id' => 'pks_kartuzy',
                'name' => 'Kartuzy',
                'lat' => 54.3333,
                'lon' => 18.2,
                'agency' => 'pks_gdynia'
            ),
            array(
                'id' => 'pks_lebork',
                'name' => 'Lębork',
                'lat' => 54.5396,
                'lon' => 17.7436,
                'agency' => 'pks_gdynia'
            ),
            array(
                'id' => 'pks_leba',
                'name' => 'Łeba',
                'lat' => 54.7609,
                'lon' => 17.5556,
                'agency' => 'pks_gdynia'
            ),
            array(
                'id' => 'pks_wladyslawowo',
                'name' => 'Władysławowo',
                'lat' => 54.7833,
                'lon' => 18.4167,
                'agency' => 'pks_gdynia'
            ),
            array(
                'id' => 'pks_hel',
                'name' => 'Hel',
                'lat' => 54.6083,
                'lon' => 18.8083,
                'agency' => 'pks_gdynia'
            )
        );
    }

    /**
     * Scrape real routes from PKS main page - prawdziwe dane!
     */
    private function scrape_real_routes_from_pks() {
        $routes = array();

        try {
            $url = self::PKS_BASE_URL . '/rozklad-jazdy/';
            $html = $this->make_request($url);

            if (!$html) {
                return $routes;
            }

            // Szukaj wszystkich elementów z trasami
            // Pattern: <div class="list-item"> ... <div class="list-no">NUMER</div> ... <h3>NAZWA</h3> ... <a href="PDF_URL"
            $pattern = '/<div class="list-item">.*?<a href="[^"]*\/rozklad_jazdy\/([^\/]+)\/"[^>]*>.*?<div class="list-no">([^<]+)<\/div>.*?<h3>([^<]+)<\/h3>.*?<\/a>.*?(?:<a href="([^"]+\.pdf[^"]*)"[^>]*>.*?)?/s';

            if (preg_match_all($pattern, $html, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $match) {
                    $route_id = trim($match[1]);
                    $line_number = trim($match[2]);
                    $route_name = trim($match[3]);
                    $pdf_url = isset($match[4]) ? trim($match[4]) : '';

                    // Wyciągnij informacje o trasie z nazwy
                    $route_info = $this->parse_route_info($route_name, $line_number);

                    $routes[] = array(
                        'id' => $route_id,
                        'line' => $line_number,
                        'route' => $route_name,
                        'from' => $route_info['from'],
                        'to' => $route_info['to'],
                        'description' => $route_info['description'],
                        'url' => self::PKS_BASE_URL . '/rozklad_jazdy/' . $route_id . '/',
                        'pdf_url' => $pdf_url,
                        'source' => 'pks-main-page',
                        'frequency' => $route_info['frequency'],
                        'duration' => $route_info['duration']
                    );
                }
            }

            // Jeśli znalazł trasy, posortuj po numerze linii
            if (!empty($routes)) {
                usort($routes, function($a, $b) {
                    return intval($a['line']) - intval($b['line']);
                });
            }

        } catch (Exception $e) {
            error_log('Real PKS scraping error: ' . $e->getMessage());
        }

        return $routes;
    }

    /**
     * Parse route information from route name
     */
    private function parse_route_info($route_name, $line_number) {
        $info = array(
            'from' => '',
            'to' => '',
            'description' => $route_name,
            'frequency' => 'co godzinę',
            'duration' => 'brak danych'
        );

        // Parsuj różne typy nazw tras
        if (strpos($route_name, 'Komunikacji Miejskiej') !== false) {
            // Linie miejskie: "Linia Komunikacji Miejskiej we Władysławowie"
            $info['from'] = 'Władysławowo';
            $info['to'] = 'Władysławowo';
            $info['description'] = 'Komunikacja miejska Władysławowo';
            $info['frequency'] = 'co 30-60 minut';
            $info['duration'] = 'miejskie';
        } elseif (strpos($route_name, 'Gdynia') !== false && strpos($route_name, 'Sopot') !== false) {
            // Gdynia - Sopot - Gdańsk
            $info['from'] = 'Gdynia';
            $info['to'] = 'Gdańsk';
            $info['description'] = 'Przez Sopot';
            $info['frequency'] = 'co 30 minut';
            $info['duration'] = '1h 15min';
        } elseif (strpos($route_name, 'Gdynia') !== false && strpos($route_name, 'Kartuzy') !== false) {
            // Gdynia - Kartuzy
            $info['from'] = 'Gdynia';
            $info['to'] = 'Kartuzy';
            $info['description'] = 'Przez Żukowo';
            $info['frequency'] = 'co 2 godziny';
            $info['duration'] = '1h 45min';
        } elseif (strpos($route_name, 'Gdynia') !== false && strpos($route_name, 'Hel') !== false) {
            // Gdynia - Hel
            $info['from'] = 'Gdynia';
            $info['to'] = 'Hel';
            $info['description'] = 'Nadmorska';
            $info['frequency'] = 'co 1 godzinę';
            $info['duration'] = '2h 15min';
        } elseif (strpos($route_name, 'Gdynia') !== false && strpos($route_name, 'Puck') !== false) {
            // Gdynia - Puck
            $info['from'] = 'Gdynia';
            $info['to'] = 'Puck';
            $info['description'] = 'Przez Rewę, Mechelinki';
            $info['frequency'] = 'co 2 godziny';
            $info['duration'] = '45 min';
        } elseif (strpos($route_name, 'Lębork') !== false || strpos($route_name, 'Słupsk') !== false) {
            // Połączenia dalekobieżne
            if (strpos($route_name, 'Lębork') !== false) {
                $info['from'] = 'Gdynia';
                $info['to'] = 'Lębork';
                $info['frequency'] = 'co 3 godziny';
                $info['duration'] = '2h 30min';
            } elseif (strpos($route_name, 'Słupsk') !== false) {
                $info['from'] = 'Gdynia';
                $info['to'] = 'Słupsk';
                $info['frequency'] = 'co 3 godziny';
                $info['duration'] = '3h 30min';
            }
        }

        return $info;
    }

    /**
     * Save routes to cache file
     */
    private function save_routes_to_cache($routes) {
        try {
            $cache_data = array(
                'source' => 'PKS Gdynia - scraped from main page',
                'timestamp' => date('c'),
                'version' => '1.0.0',
                'description' => 'Rzeczywiste trasy PKS Gdynia ze strony głównej',
                'count' => count($routes),
                'routes' => $routes
            );

            $routes_file = plugin_dir_path(dirname(__FILE__)) . '../pks_routes_data.json';
            file_put_contents($routes_file, json_encode($cache_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        } catch (Exception $e) {
            error_log('Save routes cache error: ' . $e->getMessage());
        }
    }

    /**
     * Get basic fallback routes
     */
    private function get_basic_routes() {
        return array(
            array(
                'id' => '1',
                'line' => '1',
                'route' => 'Linia Po Pucku',
                'from' => 'Gdynia',
                'to' => 'Puck',
                'description' => 'Gdynia - Puck przez Rewę, Mechelinki',
                'url' => 'https://pksgdynia.pl/rozklad-jazdy/linia-po-pucku/',
                'source' => 'pks-website',
                'frequency' => 'co 2 godziny',
                'duration' => '45 min'
            ),
            array(
                'id' => '150',
                'line' => '150',
                'route' => 'Gdynia - Sopot - Gdańsk',
                'from' => 'Gdynia',
                'to' => 'Gdańsk',
                'description' => 'Międzymiejska przez Sopot',
                'url' => 'https://pksgdynia.pl/rozklad-jazdy/gdynia-sopot-gdansk/',
                'source' => 'pks-website',
                'frequency' => 'co 30 minut',
                'duration' => '1h 15min'
            ),
            array(
                'id' => '650',
                'line' => '650',
                'route' => 'Gdynia - Żukowo - Kartuzy',
                'from' => 'Gdynia',
                'to' => 'Kartuzy',
                'description' => 'Przez Żukowo do Kartuz',
                'url' => 'https://pksgdynia.pl/rozklad-jazdy/gdynia-zukowo-kartuzy/',
                'source' => 'pks-website',
                'frequency' => 'co 2 godziny',
                'duration' => '1h 45min'
            ),
            array(
                'id' => '800',
                'line' => '800',
                'route' => 'Gdynia - Władysławowo - Hel',
                'from' => 'Gdynia',
                'to' => 'Hel',
                'description' => 'Nadmorska do Helu',
                'url' => 'https://pksgdynia.pl/rozklad-jazdy/gdynia-wladyslawowo-hel/',
                'source' => 'pks-website',
                'frequency' => 'co 1 godzinę',
                'duration' => '2h 15min'
            )
        );
    }

    /**
     * Make HTTP request
     */
    private function make_request($url, $args = array()) {
        $defaults = array(
            'method' => 'GET',
            'timeout' => self::REQUEST_TIMEOUT,
            'user-agent' => self::USER_AGENT,
            'headers' => array(
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'pl,en-US;q=0.7,en;q=0.3',
                'Accept-Encoding' => 'gzip, deflate',
                'Connection' => 'keep-alive',
                'Upgrade-Insecure-Requests' => '1',
            ),
            'sslverify' => false,
        );

        $args = wp_parse_args($args, $defaults);

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            error_log('PKS API Request Error: ' . $response->get_error_message());
            return false;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            error_log('PKS API HTTP Error: ' . $response_code . ' for URL: ' . $url);
            return false;
        }

        return wp_remote_retrieve_body($response);
    }
}
