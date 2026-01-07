<?php
/**
 * PKS Gdynia Proxy Class
 * 
 * Handles proxying requests to e-podroznik.pl API and parsing HTML responses
 * to provide clean JSON data for the mobile app.
 */

class Kaszuby24_PKS_Gdynia_Proxy {
    
    const CARRIER_ID = 1847; // PKS Gdynia
    const BASE_URL = 'https://www.e-podroznik.pl';
    const CACHE_TIME_LINES = 86400; // 24 hours for route list
    const CACHE_TIME_TIMETABLE = 1800; // 30 minutes for timetables
    
    /**
     * Fetch all PKS Gdynia lines
     * 
     * @return array Array of routes with from, to, fromId, toId, url
     */
    public function fetch_all_lines() {
        $cache_key = 'pks_gdynia_lines_v1';
        $cached = get_transient($cache_key);
        
        if ($cached !== false) {
            return $cached;
        }
        
        $timestamp = time() * 1000;
        $url = self::BASE_URL . '/public/seoIndexCarrierMainPage.do?carrierId=' . self::CARRIER_ID . 
               '&seoName=pks-gdynia&lang=pl&formCompositeExternalCarrier.version=2.2&ajax=true&_=' . $timestamp;
        
        $response = wp_remote_get($url, array(
            'timeout' => 10,
            'headers' => array(
                'User-Agent' => 'Kaszuby24-App/1.0'
            )
        ));
        
        if (is_wp_error($response)) {
            error_log('PKS Gdynia API Error: ' . $response->get_error_message());
            return array();
        }
        
        $body = wp_remote_retrieve_body($response);
        $routes = $this->parse_route_list($body);
        
        if (!empty($routes)) {
            set_transient($cache_key, $routes, self::CACHE_TIME_LINES);
        }
        
        return $routes;
    }
    
    /**
     * Parse HTML route list
     * 
     * @param string $html HTML content from e-podroznik.pl
     * @return array Parsed routes
     */
    private function parse_route_list($html) {
        $routes = array();
        
        // Pattern: /1847,{fromId},{toId},rozklad-jazdy-pks-{routeName}.html
        preg_match_all(
            '/href="\/(\d+),(\d+),(\d+),rozklad-jazdy-pks-([^"]+)\.html">([^<]+)</i',
            $html,
            $matches,
            PREG_SET_ORDER
        );
        
        foreach ($matches as $match) {
            $carrierId = $match[1];
            $fromId = $match[2];
            $toId = $match[3];
            $routeName = $match[4];
            $label = trim($match[5]);
            
            // Parse "From - To" label
            $parts = explode(' - ', $label);
            if (count($parts) === 2) {
                $routes[] = array(
                    'from' => trim($parts[0]),
                    'to' => trim($parts[1]),
                    'fromId' => $fromId,
                    'toId' => $toId,
                    'routeName' => $routeName,
                    'url' => self::BASE_URL . "/{$carrierId},{$fromId},{$toId},rozklad-jazdy-pks-{$routeName}.html"
                );
            }
        }
        
        return $routes;
    }
    
    /**
     * Fetch timetable for specific route
     * 
     * @param string $from_id Origin stop ID
     * @param string $to_id Destination stop ID
     * @param string $route_name Route name slug
     * @return array Timetable data
     */
    public function fetch_timetable($from_id, $to_id, $route_name) {
        $cache_key = "pks_timetable_{$from_id}_{$to_id}_{$route_name}";
        $cached = get_transient($cache_key);
        
        if ($cached !== false) {
            return $cached;
        }
        
        $url = self::BASE_URL . '/' . self::CARRIER_ID . ",{$from_id},{$to_id},rozklad-jazdy-pks-{$route_name}.html";
        
        $response = wp_remote_get($url, array(
            'timeout' => 10,
            'headers' => array(
                'User-Agent' => 'Kaszuby24-App/1.0'
            )
        ));
        
        if (is_wp_error($response)) {
            error_log('PKS Timetable Error: ' . $response->get_error_message());
            return array('times' => array(), 'route' => '');
        }
        
        $body = wp_remote_retrieve_body($response);
        $timetable = $this->parse_timetable($body);
        
        if (!empty($timetable)) {
            set_transient($cache_key, $timetable, self::CACHE_TIME_TIMETABLE);
        }
        
        return $timetable;
    }
    
    /**
     * Parse timetable HTML
     * 
     * @param string $html HTML content
     * @return array Parsed timetable with times and route details
     */
    private function parse_timetable($html) {
        $times = array();
        $route_info = '';
        
        // Extract departure times - looking for time patterns like "05:40", "06:25"
        // We look for patterns following "godz." or within table cells
        preg_match_all('/\b([0-2]?\d):([0-5]\d)\b/', $html, $time_matches);
        
        if (!empty($time_matches[0])) {
            // Filter out obviously non-time strings if any (though \b helps)
            $times = array_unique($time_matches[0]);
            sort($times);
        }
        
        // Extract route description (cities along the way)
        // Look for patterns like "Gdynia - Rumia - Reda - Karwia"
        // often found in headers or specific div identifiers
        preg_match('/([\w\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+ - [\w\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+ - [\w\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)/u', $html, $route_match);
        if (!empty($route_match[1])) {
            $route_info = trim($route_match[1]);
        }
        
        return array(
            'times' => array_values($times),
            'route' => $route_info,
            'has_data' => !empty($times)
        );
    }
}
