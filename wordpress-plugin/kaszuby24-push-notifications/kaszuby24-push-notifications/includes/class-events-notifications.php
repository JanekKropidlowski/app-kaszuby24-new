<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Klasa obsługująca powiadomienia o wydarzeniach
 */
class Kaszuby24_Events_Notifications {
    
    private $database;
    private $expo_push;
    
    public function __construct() {
        $this->database = new Kaszuby24_Push_Database();
        $this->expo_push = new Kaszuby24_Expo_Push();
    }
    
    /**
     * Wyślij powiadomienie o nowym wydarzeniu
     */
    public function send_event_notification($post_id, $post) {
        // Pobierz lokalizację wydarzenia
        $miasto = get_post_meta($post_id, 'miasto', true);
        $region = get_post_meta($post_id, 'region', true);
        $data_wydarzenia = get_post_meta($post_id, 'data_wydarzenia', true);
        
        // Pobierz kategorie wydarzenia
        $categories = wp_get_post_terms($post_id, 'kategoria-wydarzenia');
        $category_ids = array_map(function($cat) { return $cat->term_id; }, $categories);
        
        // Stwórz tytuł i treść powiadomienia
        $title = "📅 Nowe wydarzenie: " . wp_trim_words($post->post_title, 8);
        $body = $this->create_event_notification_body($post, $miasto, $data_wydarzenia);
        
        // Pobierz tokeny użytkowników zainteresowanych wydarzeniami w tej lokalizacji
        $tokens = $this->get_tokens_for_event($miasto, $region, $category_ids);
        
        if (empty($tokens)) {
            error_log("Brak tokenów dla wydarzenia {$post_id} w lokalizacji: {$miasto}");
            return;
        }
        
        // Przygotuj dane powiadomienia
        $notification_data = array(
            'title' => $title,
            'body' => $body,
            'data' => array(
                'type' => 'event',
                'eventId' => $post_id,
                'location' => $miasto,
                'eventDate' => $data_wydarzenia,
                'route' => '/(tabs)/kalendarz' // Calendar tab for events
            )
        );
        
        // Dodaj obrazek jeśli istnieje
        $featured_image = get_the_post_thumbnail_url($post_id, 'medium');
        if ($featured_image) {
            $notification_data['image'] = $featured_image;
        }
        
        // Wyślij powiadomienia
        $this->expo_push->send_batch_notifications($tokens, $notification_data);
        
        // Oznacz jako wysłane
        update_post_meta($post_id, '_push_notification_sent', current_time('mysql'));
        
        error_log("Wysłano powiadomienie o wydarzeniu {$post_id} do " . count($tokens) . " użytkowników");
    }
    
    /**
     * Wyślij przypomnienie o zbliżającym się wydarzeniu
     */
    public function send_event_reminder_notification($post_id, $post) {
        $miasto = get_post_meta($post_id, 'miasto', true);
        $region = get_post_meta($post_id, 'region', true);
        $data_wydarzenia = get_post_meta($post_id, 'data_wydarzenia', true);
        
        // Oblicz ile godzin do wydarzenia
        $event_time = strtotime($data_wydarzenia);
        $hours_until = round(($event_time - time()) / 3600);
        
        $categories = wp_get_post_terms($post_id, 'kategoria-wydarzenia');
        $category_ids = array_map(function($cat) { return $cat->term_id; }, $categories);
        
        // Stwórz tytuł i treść przypomnienia
        $title = "⏰ Przypomnienie: " . wp_trim_words($post->post_title, 6);
        $body = "Wydarzenie rozpocznie się za {$hours_until}h";
        if ($miasto) {
            $body .= " w {$miasto}";
        }
        
        // Pobierz tokeny użytkowników którzy zapisali to wydarzenie
        $tokens = $this->get_tokens_for_saved_event($post_id);
        
        if (empty($tokens)) {
            return;
        }
        
        $notification_data = array(
            'title' => $title,
            'body' => $body,
            'data' => array(
                'type' => 'event_reminder',
                'eventId' => $post_id,
                'location' => $miasto,
                'eventDate' => $data_wydarzenia,
                'route' => '/(tabs)/kalendarz' // Calendar tab for events
            )
        );
        
        $this->expo_push->send_batch_notifications($tokens, $notification_data);
        
        error_log("Wysłano przypomnienie o wydarzeniu {$post_id} do " . count($tokens) . " użytkowników");
    }
    
    /**
     * Wyślij powiadomienia o wydarzeniach weekendowych (piątek)
     */
    public function send_weekend_events_notification() {
        // Sprawdź czy dzisiaj jest piątek
        if (date('N') != 5) {
            return;
        }
        
        // Pobierz wydarzenia na weekend
        $weekend_start = date('Y-m-d 00:00:00', strtotime('next Saturday'));
        $weekend_end = date('Y-m-d 23:59:59', strtotime('next Sunday'));
        
        $weekend_events = get_posts(array(
            'post_type' => 'wydarzenie',
            'post_status' => 'publish',
            'numberposts' => 10,
            'meta_query' => array(
                array(
                    'key' => 'data_wydarzenia',
                    'value' => array($weekend_start, $weekend_end),
                    'compare' => 'BETWEEN',
                    'type' => 'DATETIME'
                )
            )
        ));
        
        if (empty($weekend_events)) {
            return;
        }
        
        // Grupuj wydarzenia po lokalizacjach
        $events_by_location = array();
        foreach ($weekend_events as $event) {
            $miasto = get_post_meta($event->ID, 'miasto', true) ?: 'Inne';
            if (!isset($events_by_location[$miasto])) {
                $events_by_location[$miasto] = array();
            }
            $events_by_location[$miasto][] = $event;
        }
        
        // Wyślij powiadomienia dla każdej lokalizacji
        foreach ($events_by_location as $location => $events) {
            $count = count($events);
            $title = "🎉 Weekend na Kaszubach!";
            $body = "Znajdź {$count} " . $this->get_events_word_form($count) . " w {$location} na ten weekend";
            
            $tokens = $this->get_tokens_for_location($location);
            
            if (!empty($tokens)) {
                $notification_data = array(
                    'title' => $title,
                    'body' => $body,
                    'data' => array(
                        'type' => 'weekend_events',
                        'location' => $location,
                        'eventCount' => $count,
                        'route' => '/(tabs)/kalendarz' // Calendar tab for events
                    )
                );
                
                $this->expo_push->send_batch_notifications($tokens, $notification_data);
            }
        }
    }
    
    /**
     * Pomocnicze metody
     */
    private function create_event_notification_body($post, $miasto, $data_wydarzenia) {
        $body = wp_trim_words(strip_tags($post->post_content), 15);
        
        if ($data_wydarzenia) {
            $formatted_date = date('d.m H:i', strtotime($data_wydarzenia));
            $body = "{$formatted_date}";
        }
        
        if ($miasto) {
            $body .= " • {$miasto}";
        }
        
        return $body;
    }
    
    private function get_tokens_for_event($miasto, $region, $category_ids) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'kaszuby24_push_tokens';
        
        $where_conditions = array("is_active = 1");
        $params = array();
        
        // Filtruj po lokalizacji
        if ($miasto) {
            $where_conditions[] = "(location = %s OR location IS NULL)";
            $params[] = $miasto;
        }
        
        $where_clause = implode(' AND ', $where_conditions);
        
        $query = "SELECT push_token FROM $table_name WHERE $where_clause";
        
        if (!empty($params)) {
            $query = $wpdb->prepare($query, $params);
        }
        
        return $wpdb->get_col($query);
    }
    
    private function get_tokens_for_saved_event($post_id) {
        // Ta funkcja wymagałaby dodatkowej tabeli dla zapisanych wydarzeń
        // Na razie zwracamy wszystkie aktywne tokeny
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'kaszuby24_push_tokens';
        
        return $wpdb->get_col("SELECT push_token FROM $table_name WHERE is_active = 1");
    }
    
    private function get_tokens_for_location($location) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'kaszuby24_push_tokens';
        
        return $wpdb->get_col($wpdb->prepare(
            "SELECT push_token FROM $table_name WHERE (location = %s OR location IS NULL) AND is_active = 1",
            $location
        ));
    }
    
    private function get_events_word_form($count) {
        if ($count == 1) {
            return "wydarzenie";
        } elseif ($count >= 2 && $count <= 4) {
            return "wydarzenia";
        } else {
            return "wydarzeń";
        }
    }
}