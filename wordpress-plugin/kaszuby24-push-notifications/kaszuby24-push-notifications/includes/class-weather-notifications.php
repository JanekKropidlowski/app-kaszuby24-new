<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Klasa obsługująca powiadomienia pogodowe
 */
class Kaszuby24_Weather_Notifications {
    
    private $database;
    private $expo_push;
    
    public function __construct() {
        $this->database = new Kaszuby24_Push_Database();
        $this->expo_push = new Kaszuby24_Expo_Push();
    }
    
    /**
     * Wyślij powiadomienie o ostrzeżeniu pogodowym
     */
    public function send_weather_warning_notification($warning_data) {
        $title = "⚠️ Ostrzeżenie pogodowe";
        $body = $this->create_weather_warning_body($warning_data);
        
        // Pobierz tokeny użytkowników w danym regionie
        $tokens = $this->get_tokens_for_weather_region($warning_data['region']);
        
        if (empty($tokens)) {
            error_log("Brak tokenów dla ostrzeżenia pogodowego w regionie: {$warning_data['region']}");
            return;
        }
        
        $notification_data = array(
            'title' => $title,
            'body' => $body,
            'data' => array(
                'type' => 'weather_warning',
                'region' => $warning_data['region'],
                'warning_type' => $warning_data['type'],
                'severity' => $warning_data['severity'],
                'route' => '/(tabs)/weather'
            )
        );
        
        // Wyślij powiadomienia
        $this->expo_push->send_batch_notifications($tokens, $notification_data);
        
        error_log("Wysłano ostrzeżenie pogodowe do " . count($tokens) . " użytkowników w regionie {$warning_data['region']}");
    }
    
    /**
     * Wyślij powiadomienie o codziennej prognozie pogody
     */
    public function send_daily_weather_notification($weather_data) {
        $title = "🌤️ Prognoza pogody na dziś";
        $body = $this->create_daily_weather_body($weather_data);
        
        // Pobierz tokeny użytkowników w danym regionie
        $tokens = $this->get_tokens_for_weather_region($weather_data['region']);
        
        if (empty($tokens)) {
            error_log("Brak tokenów dla prognozy pogody w regionie: {$weather_data['region']}");
            return;
        }
        
        $notification_data = array(
            'title' => $title,
            'body' => $body,
            'data' => array(
                'type' => 'daily_weather',
                'region' => $weather_data['region'],
                'temperature_max' => $weather_data['temp_max'],
                'temperature_min' => $weather_data['temp_min'],
                'precipitation_probability' => $weather_data['precip_prob'],
                'route' => '/(tabs)/weather'
            )
        );
        
        // Wyślij powiadomienia
        $this->expo_push->send_batch_notifications($tokens, $notification_data);
        
        error_log("Wysłano prognozę pogody do " . count($tokens) . " użytkowników w regionie {$weather_data['region']}");
    }
    
    /**
     * Wyślij powiadomienie o jakości powietrza
     */
    public function send_air_quality_notification($air_data) {
        $title = "🌬️ Jakość powietrza";
        $body = $this->create_air_quality_body($air_data);
        
        // Pobierz tokeny użytkowników w danym regionie
        $tokens = $this->get_tokens_for_weather_region($air_data['region']);
        
        if (empty($tokens)) {
            error_log("Brak tokenów dla jakości powietrza w regionie: {$air_data['region']}");
            return;
        }
        
        $notification_data = array(
            'title' => $title,
            'body' => $body,
            'data' => array(
                'type' => 'air_quality',
                'region' => $air_data['region'],
                'aqi' => $air_data['aqi'],
                'pollutant' => $air_data['main_pollutant'],
                'route' => '/(tabs)/weather'
            )
        );
        
        // Wyślij powiadomienia
        $this->expo_push->send_batch_notifications($tokens, $notification_data);
        
        error_log("Wysłano powiadomienie o jakości powietrza do " . count($tokens) . " użytkowników w regionie {$air_data['region']}");
    }
    
    /**
     * Pomocnicze metody
     */
    private function create_weather_warning_body($warning_data) {
        $body = "Ostrzeżenie: " . $warning_data['description'];
        
        if (isset($warning_data['valid_from']) && isset($warning_data['valid_until'])) {
            $from = date('H:i', strtotime($warning_data['valid_from']));
            $until = date('H:i', strtotime($warning_data['valid_until']));
            $body .= " (od {$from} do {$until})";
        }
        
        if (isset($warning_data['region'])) {
            $body .= " - Region: " . $warning_data['region'];
        }
        
        return $body;
    }
    
    private function create_daily_weather_body($weather_data) {
        $body = "Dzisiaj w " . $weather_data['region'];
        
        if (isset($weather_data['temp_max']) && isset($weather_data['temp_min'])) {
            $body .= ": od " . $weather_data['temp_min'] . "°C do " . $weather_data['temp_max'] . "°C";
        }
        
        if (isset($weather_data['precip_prob']) && $weather_data['precip_prob'] > 50) {
            $body .= ", możliwe opady (" . $weather_data['precip_prob'] . "%)";
        }
        
        return $body;
    }
    
    private function create_air_quality_body($air_data) {
        $body = "Jakość powietrza w " . $air_data['region'] . ": ";
        
        if (isset($air_data['aqi'])) {
            $body .= "AQI " . $air_data['aqi'];
            
            if ($air_data['aqi'] <= 50) {
                $body .= " (dobra)";
            } elseif ($air_data['aqi'] <= 100) {
                $body .= " (umiarkowana)";
            } elseif ($air_data['aqi'] <= 150) {
                $body .= " (niezdrowa dla wrażliwych)";
            } else {
                $body .= " (niezdrowa)";
            }
        }
        
        if (isset($air_data['main_pollutant'])) {
            $body .= " - główny zanieczyszczający: " . $air_data['main_pollutant'];
        }
        
        return $body;
    }
    
    private function get_tokens_for_weather_region($region) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'kaszuby24_push_tokens';
        
        // Pobierz tokeny użytkowników w danym regionie lub wszystkich jeśli region nie jest określony
        if ($region) {
            return $wpdb->get_col($wpdb->prepare(
                "SELECT push_token FROM $table_name WHERE (location = %s OR location IS NULL) AND is_active = 1",
                $region
            ));
        } else {
            return $wpdb->get_col("SELECT push_token FROM $table_name WHERE is_active = 1");
        }
    }
}
