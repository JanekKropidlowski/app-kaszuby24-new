<?php

if (!defined('ABSPATH')) {
    exit;
}

class Kaszuby24_Push_API {
    
    private $database;
    
    public function __construct() {
        $this->database = new Kaszuby24_Push_Database();
        
        // Register REST API routes
        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('rest_api_init', array($this, 'register_events_routes'));
    }
    
    public function register_routes() {
        register_rest_route('kaszuby24/v1', '/register-expo-push-token', array(
            'methods' => 'POST',
            'callback' => array($this, 'register_token'),
            'permission_callback' => '__return_true',
            'args' => array(
                'pushToken' => array(
                    'required' => true,
                    'type' => 'string',
                    'validate_callback' => array($this, 'validate_push_token')
                ),
                'platform' => array(
                    'required' => true,
                    'type' => 'string',
                    'enum' => array('ios', 'android', 'web')
                ),
                'location' => array(
                    'required' => false,
                    'type' => 'string'
                ),
                'locationId' => array(
                    'required' => false,
                    'type' => 'integer'
                ),
                'preferences' => array(
                    'required' => false,
                    'type' => 'object'
                )
            )
        ));
        
        register_rest_route('kaszuby24/v1', '/send-push-notification', array(
            'methods' => 'POST',
            'callback' => array($this, 'send_notification'),
            'permission_callback' => array($this, 'check_admin_permissions'),
            'args' => array(
                'title' => array(
                    'required' => true,
                    'type' => 'string'
                ),
                'body' => array(
                    'required' => true,
                    'type' => 'string'
                ),
                'articleId' => array(
                    'required' => false,
                    'type' => 'integer'
                ),
                'regions' => array(
                    'required' => false,
                    'type' => 'array'
                ),
                'categories' => array(
                    'required' => false,
                    'type' => 'array'
                ),
                'image' => array(
                    'required' => false,
                    'type' => 'string',
                    'format' => 'uri'
                ),
                'icon' => array(
                    'required' => false,
                    'type' => 'string',
                    'format' => 'uri'
                )
            )
        ));
        
        register_rest_route('kaszuby24/v1', '/push-stats', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_stats'),
            'permission_callback' => array($this, 'check_admin_permissions')
        ));
        
        register_rest_route('kaszuby24/v1', '/deactivate-token', array(
            'methods' => 'POST',
            'callback' => array($this, 'deactivate_token'),
            'permission_callback' => '__return_true',
            'args' => array(
                'pushToken' => array(
                    'required' => true,
                    'type' => 'string'
                )
            )
        ));
        
        // Track notification analytics endpoint
        register_rest_route('kaszuby24/v1', '/track-notification', array(
            'methods' => 'POST',
            'callback' => array($this, 'track_notification'),
            'permission_callback' => '__return_true',
            'args' => array(
                'notification_id' => array(
                    'required' => true,
                    'type' => 'string'
                ),
                'action' => array(
                    'required' => true,
                    'type' => 'string'
                ),
                'platform' => array(
                    'required' => false,
                    'type' => 'string'
                ),
                'location' => array(
                    'required' => false,
                    'type' => 'string'
                ),
                'article_id' => array(
                    'required' => false,
                    'type' => 'integer'
                )
            )
        ));
        
        // Get analytics endpoint
        register_rest_route('kaszuby24/v1', '/push-analytics', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_analytics'),
            'permission_callback' => array($this, 'check_admin_permissions'),
            'args' => array(
                'article_id' => array(
                    'required' => false,
                    'type' => 'integer'
                ),
                'days' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 30
                )
            )
        ));
        
        // Schedule notification endpoint
        register_rest_route('kaszuby24/v1', '/schedule-notification', array(
            'methods' => 'POST',
            'callback' => array($this, 'schedule_notification'),
            'permission_callback' => array($this, 'check_admin_permissions'),
            'args' => array(
                'title' => array(
                    'required' => true,
                    'type' => 'string'
                ),
                'body' => array(
                    'required' => true,
                    'type' => 'string'
                ),
                'scheduled_time' => array(
                    'required' => true,
                    'type' => 'string'
                ),
                'article_id' => array(
                    'required' => false,
                    'type' => 'integer'
                ),
                'regions' => array(
                    'required' => false,
                    'type' => 'array'
                ),
                'categories' => array(
                    'required' => false,
                    'type' => 'array'
                )
            )
        ));
        
        register_rest_route('kaszuby24/v1', '/posts-filtered', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_filtered_posts'),
            'permission_callback' => '__return_true',
            'args' => array(
                'region' => array(
                    'required' => false,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ),
                'dzial' => array(
                    'required' => false,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ),
                'page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 1,
                    'sanitize_callback' => 'absint'
                ),
                'per_page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 10,
                    'sanitize_callback' => 'absint'
                )
            )
        ));
        
        // Endpoint dla wydarzeń z filtrami (aplikacja mobilna)
        register_rest_route('kaszuby24/v1', '/events/mobile', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_events'),
            'permission_callback' => '__return_true',
            'args' => array(
                'page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 1
                ),
                'per_page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 20
                ),
                'filter' => array(
                    'required' => false,
                    'type' => 'string',
                    'enum' => array('today', 'this-weekend', 'this-week', 'free', 'popular', 'nearby', 'saved')
                ),
                'city' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Nazwa miasta do filtrowania'
                ),
                'object' => array(
                    'required' => false,
                    'type' => 'integer'
                ),
                'category' => array(
                    'required' => false,
                    'type' => 'integer'
                ),
                'search' => array(
                    'required' => false,
                    'type' => 'string'
                ),
                'date_from' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Data od (format: Y-m-d)'
                ),
                'date_to' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Data do (format: Y-m-d)'
                )
            )
        ));

        /**
         * Get event counts for all filters
         */
        register_rest_route('kaszuby24/v1', '/event-counts', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_event_counts'),
            'permission_callback' => '__return_true'
        ));
        
        /**
         * Get individual event by ID
         */
        register_rest_route('kaszuby24/v1', '/events/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_event_by_id'),
            'permission_callback' => '__return_true',
            'args' => array(
                'id' => array(
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                )
            )
        ));
        
        /**
         * Get related events
         */
        register_rest_route('kaszuby24/v1', '/related-events', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_related_events'),
            'permission_callback' => '__return_true',
            'args' => array(
                'event_id' => array(
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ),
                'categories' => array(
                    'required' => false,
                    'type' => 'string'
                ),
                'location' => array(
                    'required' => false,
                    'type' => 'string'
                ),
                'limit' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 6
                )
            )
        ));
        
        register_rest_route('kaszuby24/v1', '/saved-events', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_saved_events'),
            'permission_callback' => '__return_true',
            'args' => array(
                'user_id' => array(
                    'required' => false,
                    'type' => 'integer'
                ),
                'page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 1
                ),
                'per_page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 20
                )
            )
        ));
        
        // Test endpoint
        register_rest_route('kaszuby24/v1', '/test', array(
            'methods' => 'GET',
            'callback' => array($this, 'test_endpoint'),
            'permission_callback' => '__return_true'
        ));

        // Test endpoint dla taksonomii miasta
        register_rest_route('kaszuby24/v1', '/test-city-taxonomy', array(
            'methods' => 'GET',
            'callback' => array($this, 'test_city_taxonomy'),
            'permission_callback' => '__return_true'
        ));

        // Endpoint dla aplikacji mobilnej - pobiera tylko aktywne kategorie i obiekty
        register_rest_route('kaszuby24/v1', '/events/filters/active', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_active_filters_for_mobile'),
            'permission_callback' => '__return_true',
            'args' => array(
                'date_from' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Data od (format: Y-m-d)',
                    'default' => date('Y-m-d')
                ),
                'date_to' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Data do (format: Y-m-d)',
                    'default' => date('Y-m-d', strtotime('+90 days'))
                )
            )
        ));

        // Endpoint diagnostyczny - sprawdza stan bazy danych i struktury
        register_rest_route('kaszuby24/v1', '/debug/database-status', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_database_status'),
            'permission_callback' => '__return_true'
        ));

        // Endpoint do testowania konkretnych zapytań
        register_rest_route('kaszuby24/v1', '/debug/test-query', array(
            'methods' => 'GET',
            'callback' => array($this, 'test_specific_query'),
            'permission_callback' => '__return_true',
            'args' => array(
                'post_type' => array(
                    'required' => false,
                    'type' => 'string',
                    'default' => 'kalendarz'
                ),
                'meta_key' => array(
                    'required' => false,
                    'type' => 'string',
                    'default' => 'sama-data'
                ),
                'taxonomy' => array(
                    'required' => false,
                    'type' => 'string',
                    'default' => 'kategoria-wydarzenia'
                )
            )
        ));

        // Słownik segregacji
        register_rest_route('kaszuby24/v1', '/waste-dictionary', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_waste_dictionary'),
            'permission_callback' => '__return_true'
        ));
    }

    public function get_waste_dictionary() {
        $file = WP_CONTENT_DIR . '/uploads/waste-schedules/waste-dictionary.json';
        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            return new WP_REST_Response($data, 200);
        }
        
        // Domyslny slownik jesli plik nie istnieje
        $default = array(
            array('name' => 'Karton po mleku', 'category' => 'Plastik i metale'),
            array('name' => 'Butelka plastikowa', 'category' => 'Plastik i metale'),
            array('name' => 'Puszka po konserwie', 'category' => 'Plastik i metale'),
            array('name' => 'Gazeta', 'category' => 'Makulatura'),
            array('name' => 'Kartonowe pudełko', 'category' => 'Makulatura'),
            array('name' => 'Słoik', 'category' => 'Szkło'),
            array('name' => 'Butelka szklana', 'category' => 'Szkło'),
            array('name' => 'Obierki', 'category' => 'Bio'),
            array('name' => 'Resztki jedzenia', 'category' => 'Bio'),
            array('name' => 'Lustro', 'category' => 'Gabaryty (PSZOK)'),
            array('name' => 'Stary telewizor', 'category' => 'Elektrośmieci'),
            array('name' => 'Bateria', 'category' => 'Niebezpieczne (PSZOK)')
        );
        
        return new WP_REST_Response($default, 200);
    }
    
    public function test_endpoint($request) {
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'API is working',
            'timestamp' => current_time('mysql')
        ), 200);
    }
    
    public function test_city_taxonomy($request) {
        // Sprawdź czy taksonomia miasto istnieje
        $taxonomies = get_taxonomies(array(), 'objects');
        $miasto_taxonomy = get_taxonomy('miasto');
        
        // Pobierz wszystkie termy taksonomii miasto
        $cities = get_terms(array(
            'taxonomy' => 'miasto',
            'hide_empty' => false
        ));
        
        // Sprawdź czy post type kalendarz istnieje
        $post_types = get_post_types(array(), 'objects');
        $kalendarz_post_type = get_post_type_object('kalendarz');
        
        // Sprawdź przykładowe wydarzenia
        $sample_events = get_posts(array(
            'post_type' => 'kalendarz',
            'posts_per_page' => 5,
            'post_status' => 'publish'
        ));
        
        $sample_events_data = array();
        foreach ($sample_events as $event) {
            $sample_events_data[] = array(
                'id' => $event->ID,
                'title' => $event->post_title,
                'miasto_meta' => get_post_meta($event->ID, 'miasto', true),
                'miasto_terms' => wp_get_post_terms($event->ID, 'miasto', array('fields' => 'names')),
                'miasto_term_ids' => wp_get_post_terms($event->ID, 'miasto', array('fields' => 'ids'))
            );
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'City taxonomy test',
            'timestamp' => current_time('mysql'),
            'taxonomies' => array_keys($taxonomies),
            'miasto_taxonomy_exists' => !empty($miasto_taxonomy),
            'miasto_taxonomy_object' => $miasto_taxonomy,
            'cities_count' => is_array($cities) ? count($cities) : 'error',
            'cities' => is_array($cities) ? array_map(function($city) {
                return array(
                    'id' => $city->term_id,
                    'name' => $city->name,
                    'slug' => $city->slug,
                    'count' => $city->count
                );
            }, $cities) : $cities,
            'post_types' => array_keys($post_types),
            'kalendarz_post_type_exists' => !empty($kalendarz_post_type),
            'sample_events' => $sample_events_data
        ), 200);
    }
    
    public function register_token($request) {
        try {
            $data = array(
                'pushToken' => sanitize_text_field($request['pushToken']),
                'platform' => sanitize_text_field($request['platform']),
                'location' => sanitize_text_field($request['location'] ?? ''),
                'locationId' => intval($request['locationId'] ?? 0),
                'preferences' => $request['preferences'] ?? null
            );
            
            // Validate preferences structure
            if ($data['preferences'] && !$this->validate_preferences($data['preferences'])) {
                return new WP_Error('invalid_preferences', 'Invalid preferences format', array('status' => 400));
            }
            
            $result = $this->database->register_token($data);
            
            if ($result) {
                return new WP_REST_Response(array(
                    'success' => true,
                    'message' => 'Token registered successfully'
                ), 200);
            } else {
                return new WP_Error('registration_failed', 'Failed to register token', array('status' => 500));
            }
            
        } catch (Exception $e) {
            error_log('Push token registration error: ' . $e->getMessage());
            return new WP_Error('server_error', 'Internal server error', array('status' => 500));
        }
    }
    
    public function send_notification($request) {
        try {
            $title = sanitize_text_field($request['title']);
            $body = sanitize_textarea_field($request['body']);
            $article_id = intval($request['articleId'] ?? 0);
            $regions = $request['regions'] ?? array();
            $categories = $request['categories'] ?? array();
            $image = esc_url_raw($request['image'] ?? '');
            $icon = esc_url_raw($request['icon'] ?? '');
            
            // Get target tokens based on preferences
            $tokens = $this->database->get_tokens_by_preferences($regions, $categories);
            
            if (empty($tokens)) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => 'No tokens found for specified criteria'
                ), 200);
            }
            
            // If article_id is provided and no image specified, try to get article thumbnail
            if ($article_id > 0 && empty($image)) {
                $thumbnail_url = get_the_post_thumbnail_url($article_id, 'medium');
                if ($thumbnail_url) {
                    $image = $thumbnail_url;
                }
            }
            
            // Set default app icon if not provided
            if (empty($icon)) {
                $icon = get_site_icon_url(96); // Get site icon, fallback to default
                if (empty($icon)) {
                    $icon = get_template_directory_uri() . '/assets/images/app-icon.png'; // Fallback
                }
            }
            
            // Send notifications via Expo Push service
            $expo_push = new Kaszuby24_Expo_Push();
            $results = $expo_push->send_notifications($tokens, $title, $body, $article_id, $image, $icon);
            
            return new WP_REST_Response(array(
                'success' => true,
                'message' => 'Notifications sent',
                'sent_count' => $results['sent'],
                'failed_count' => $results['failed'],
                'total_tokens' => count($tokens),
                'image_used' => $image,
                'icon_used' => $icon
            ), 200);
            
        } catch (Exception $e) {
            error_log('Push notification send error: ' . $e->getMessage());
            return new WP_Error('send_error', 'Failed to send notifications', array('status' => 500));
        }
    }
    
    public function get_stats($request) {
        try {
            $stats = $this->database->get_stats();
            
            return new WP_REST_Response(array(
                'success' => true,
                'stats' => $stats
            ), 200);
            
        } catch (Exception $e) {
            error_log('Push stats error: ' . $e->getMessage());
            return new WP_Error('stats_error', 'Failed to get statistics', array('status' => 500));
        }
    }
    
    public function deactivate_token($request) {
        try {
            $token = sanitize_text_field($request['pushToken']);
            
            $result = $this->database->deactivate_token($token);
            
            if ($result) {
                return new WP_REST_Response(array(
                    'success' => true,
                    'message' => 'Token deactivated successfully'
                ), 200);
            } else {
                return new WP_Error('deactivation_failed', 'Failed to deactivate token', array('status' => 500));
            }
            
        } catch (Exception $e) {
            error_log('Push token deactivation error: ' . $e->getMessage());
            return new WP_Error('server_error', 'Internal server error', array('status' => 500));
        }
    }
    
    public function validate_push_token($param, $request, $key) {
        // Validate Expo push token format
        if (!is_string($param)) {
            return false;
        }
        
        // Expo push tokens start with ExponentPushToken[
        if (strpos($param, 'ExponentPushToken[') === 0) {
            return true;
        }
        
        // Also accept test tokens for development
        if (strpos($param, 'ExpoPushToken[') === 0) {
            return true;
        }
        
        return false;
    }
    
    public function validate_preferences($preferences) {
        if (!is_array($preferences)) {
            return false;
        }
        
        // Check if regions and categories are arrays of integers
        if (isset($preferences['regions']) && !is_array($preferences['regions'])) {
            return false;
        }
        
        if (isset($preferences['categories']) && !is_array($preferences['categories'])) {
            return false;
        }
        
        // Validate that all IDs are integers
        if (isset($preferences['regions'])) {
            foreach ($preferences['regions'] as $region_id) {
                if (!is_int($region_id) && !ctype_digit($region_id)) {
                    return false;
                }
            }
        }
        
        if (isset($preferences['categories'])) {
            foreach ($preferences['categories'] as $cat_id) {
                if (!is_int($cat_id) && !ctype_digit($cat_id)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    public function check_admin_permissions($request) {
        return current_user_can('manage_options');
    }
    
    public function get_filtered_posts($request) {
        try {
            $region_id = $request->get_param('region');
            $dzial_id = $request->get_param('dzial');
            $page = $request->get_param('page') ?: 1;
            $per_page = $request->get_param('per_page') ?: 10;
            
            // Debug: Log the parameters
            error_log("Filtered posts request - region: $region_id, dzial: $dzial_id, page: $page, per_page: $per_page");
            
            // Build the query arguments
            $args = array(
                'post_type' => 'post',
                'post_status' => 'publish',
                'posts_per_page' => $per_page,
                'paged' => $page,
                'orderby' => 'date',
                'order' => 'DESC'
            );
            
            // Add taxonomy query if filters are provided
            if ($region_id || $dzial_id) {
                $args['tax_query'] = array('relation' => 'AND');
                
                if ($region_id) {
                    $args['tax_query'][] = array(
                        'taxonomy' => 'category',
                        'field' => 'term_id',
                        'terms' => $region_id,
                        'operator' => 'IN'
                    );
                }
                
                if ($dzial_id) {
                    $args['tax_query'][] = array(
                        'taxonomy' => 'category',
                        'field' => 'term_id',
                        'terms' => $dzial_id,
                        'operator' => 'IN'
                    );
                }
            }
            
            // Debug: Log the query arguments
            error_log("WP_Query arguments: " . print_r($args, true));
            
            // Execute the query
            $query = new WP_Query($args);
            
            // Debug: Log query results
            error_log("Query found posts: " . $query->found_posts);
            error_log("Query have posts: " . ($query->have_posts() ? 'yes' : 'no'));
            
            if ($query->have_posts()) {
                $posts = array();
                
                while ($query->have_posts()) {
                    $query->the_post();
                    
                    // Get post data
                    $post_data = array(
                        'id' => get_the_ID(),
                        'title' => array(
                            'rendered' => get_the_title()
                        ),
                        'excerpt' => array(
                            'rendered' => get_the_excerpt()
                        ),
                        'content' => array(
                            'rendered' => get_the_content()
                        ),
                        'date' => get_the_date('c'),
                        'modified' => get_the_modified_date('c'),
                        'link' => get_permalink(),
                        'slug' => get_post_field('post_name'),
                        'featured_media' => get_post_thumbnail_id(),
                        'featured_media_url' => get_the_post_thumbnail_url(get_the_ID(), 'full'),
                        'author' => get_the_author_meta('ID'),
                        'categories' => wp_get_post_categories(get_the_ID(), array('fields' => 'ids')),
                        'tags' => wp_get_post_tags(get_the_ID(), array('fields' => 'ids')),
                        'meta' => array(
                            'views' => get_post_meta(get_the_ID(), 'views', true),
                            'flickr' => get_post_meta(get_the_ID(), 'flickr', true),
                            'youtube' => get_post_meta(get_the_ID(), 'youtube', true),
                            'foto' => get_post_meta(get_the_ID(), 'foto', true),
                            'zrodlo' => get_post_meta(get_the_ID(), 'zrodlo', true),
                            'zrudlo' => get_post_meta(get_the_ID(), 'zrudlo', true),
                            'galeria' => get_post_meta(get_the_ID(), 'galeria', true),
                            'link' => get_post_meta(get_the_ID(), 'link', true)
                        )
                    );
                    
                    // Get embedded data
                    $post_data['_embedded'] = array(
                        'author' => array(
                            array(
                                'id' => get_the_author_meta('ID'),
                                'name' => get_the_author(),
                                'url' => get_author_posts_url(get_the_author_meta('ID')),
                                'avatar_urls' => array(
                                    '96' => get_avatar_url(get_the_author_meta('ID'), 96),
                                    '24' => get_avatar_url(get_the_author_meta('ID'), 24)
                                )
                            )
                        ),
                        'wp:featuredmedia' => array(),
                        'wp:term' => array()
                    );
                    
                    // Get featured media
                    if (has_post_thumbnail()) {
                        $post_data['_embedded']['wp:featuredmedia'][] = array(
                            'id' => get_post_thumbnail_id(),
                            'source_url' => get_the_post_thumbnail_url(get_the_ID(), 'full'),
                            'media_details' => array(
                                'sizes' => array(
                                    'medium' => array(
                                        'source_url' => get_the_post_thumbnail_url(get_the_ID(), 'medium')
                                    ),
                                    'thumbnail' => array(
                                        'source_url' => get_the_post_thumbnail_url(get_the_ID(), 'thumbnail')
                                    )
                                )
                            )
                        );
                    }
                    
                    // Get terms (categories, tags)
                    $categories = get_the_category();
                    $tags = get_the_tags();
                    
                    $all_terms = array();
                    if ($categories) $all_terms = array_merge($all_terms, $categories);
                    if ($tags) $all_terms = array_merge($all_terms, $tags);
                    
                    if ($all_terms) {
                        $terms_data = array();
                        foreach ($all_terms as $term) {
                            $terms_data[] = array(
                                'id' => $term->term_id,
                                'name' => $term->name,
                                'slug' => $term->slug,
                                'taxonomy' => $term->taxonomy
                            );
                        }
                        $post_data['_embedded']['wp:term'][] = $terms_data;
                    }
                    
                    $posts[] = $post_data;
                }
                
                wp_reset_postdata();
                
                return new WP_REST_Response(array(
                    'success' => true,
                    'posts' => $posts,
                    'total_posts' => $query->found_posts,
                    'total_pages' => $query->max_num_pages,
                    'current_page' => $page,
                    'per_page' => $per_page,
                    'filters' => array(
                        'region' => $region_id,
                        'dzial' => $dzial_id
                    )
                ), 200);
                
            } else {
                return new WP_REST_Response(array(
                    'success' => true,
                    'posts' => array(),
                    'total_posts' => 0,
                    'total_pages' => 0,
                    'current_page' => $page,
                    'per_page' => $per_page,
                    'filters' => array(
                        'region' => $region_id,
                        'dzial' => $dzial_id
                    ),
                    'message' => 'No posts found with the specified filters'
                ), 200);
            }
            
        } catch (Exception $e) {
            error_log('Filtered posts error: ' . $e->getMessage());
            return new WP_Error('filter_error', 'Failed to get filtered posts', array('status' => 500));
        }
    }
    
    public function get_events($request) {
        try {
            $page = $request->get_param('page') ?: 1;
            $per_page = $request->get_param('per_page') ?: 20;
            $filter = $request->get_param('filter');
            // NOWE: obsługa wielu filtrów
            $filters = is_array($filter) ? $filter : ($filter ? [$filter] : []);
            $city = $request->get_param('city');
            $object = $request->get_param('object');
            $category = $request->get_param('category');
            $search = $request->get_param('search');
            
            $search = $request->get_param('search');
            
            // Base query arguments
            $args = array(
                'post_type' => 'kalendarz', // Poprawione - używamy 'kalendarz' bo taki typ jest w WordPress
                'post_status' => 'publish',
                'posts_per_page' => $per_page,
                'paged' => $page,
                'orderby' => 'meta_value_num',
                'meta_key' => 'sama-data', // Poprawione - używamy 'sama-data' bo taki klucz jest w WordPress
                'order' => 'ASC'
            );
            
            // Add meta query for date filtering
            $meta_query = array();
            
            // Add default filter to only show events from today onwards (tylko jeśli nie ma specjalnego filtru czasowego)
            $today = current_time('timestamp');
            $timeFilters = ['today', 'this-weekend', 'this-week'];
            $hasTimeFilter = !empty($filters) && !empty(array_intersect($filters, $timeFilters));
            
            $today = current_time('timestamp');
            $timeFilters = ['today', 'this-weekend', 'this-week'];
            $hasTimeFilter = !empty($filters) && !empty(array_intersect($filters, $timeFilters));
            
            if (!$hasTimeFilter) {
                $meta_query[] = array(
                    'key' => 'sama-data',
                    'value' => $today,
                    'compare' => '>=',
                    'type' => 'NUMERIC'
                );
            }
            
            // NOWE: obsługa wielu filtrów
            if (!empty($filters)) {
                foreach ($filters as $filter) {
                    switch ($filter) {
                        case 'today':
                            // Używaj WordPress timezone - pobierz dzisiaj 00:00:00 i 23:59:59
                            $today_str = current_time('Y-m-d');
                            $start_of_day = strtotime($today_str . ' 00:00:00');
                            $end_of_day = strtotime($today_str . ' 23:59:59');
                            
                            $meta_query[] = array(
                                'key' => 'sama-data',
                                'value' => array($start_of_day, $end_of_day),
                                'compare' => 'BETWEEN',
                                'type' => 'NUMERIC'
                            );
                            break;
                            
                        case 'this-weekend':
                            $day_of_week = date('w');
                            $days_until_saturday = (6 - $day_of_week + 7) % 7;
                            $days_until_sunday = (7 - $day_of_week + 7) % 7;
                            $saturday = strtotime("+$days_until_saturday days");
                            $sunday = strtotime("+$days_until_sunday days");
                            $end_of_sunday = strtotime('tomorrow', $sunday) - 1;
                            
                            $meta_query[] = array(
                                'key' => 'sama-data',
                                'value' => array($saturday, $end_of_sunday),
                                'compare' => 'BETWEEN',
                                'type' => 'NUMERIC'
                            );
                            break;
                            
                        case 'this-week':
                            $week_day_of_week = date('w');
                            $start_of_week = strtotime("-" . ($week_day_of_week - 1) . " days");
                            $end_of_week = strtotime("+6 days", $start_of_week);
                            $end_of_week = strtotime('tomorrow', $end_of_week) - 1;
                            
                            $meta_query[] = array(
                                'key' => 'sama-data',
                                'value' => array($start_of_week, $end_of_week),
                                'compare' => 'BETWEEN',
                                'type' => 'NUMERIC'
                            );
                            break;
                            
                        case 'free':
                            $meta_query[] = array(
                                'relation' => 'OR',
                                array(
                                    'key' => 'cena',
                                    'value' => array('0', 'darmowe', 'gratis', 'wolny wstęp'),
                                    'compare' => 'IN'
                                ),
                                array(
                                    'key' => 'cena',
                                    'compare' => 'NOT EXISTS'
                                )
                            );
                            break;
                            
                        case 'popular':
                            $meta_query[] = array(
                                'relation' => 'OR',
                                array(
                                    'key' => '_thumbnail_id',
                                    'compare' => 'EXISTS'
                                ),
                                array(
                                    'key' => 'miasto',
                                    'compare' => 'EXISTS'
                                )
                            );
                            break;
                    }
                }
            }
            
            // Add city filter
            if ($city) {
                // Obsługa wielu miast oddzielonych przecinkami
                if (strpos($city, ',') !== false) {
                    $cities = array_map('trim', explode(',', $city));
                    
                    if (isset($args['tax_query'])) {
                        $args['tax_query'][] = array(
                            'taxonomy' => 'miasto',
                            'field' => 'name',
                            'terms' => $cities
                        );
                        $args['tax_query']['relation'] = 'AND';
                    } else {
                        $args['tax_query'] = array(
                            array(
                                'taxonomy' => 'miasto',
                                'field' => 'name',
                                'terms' => $cities
                            )
                        );
                    }
                } else {
                    if (isset($args['tax_query'])) {
                        $args['tax_query'][] = array(
                            'taxonomy' => 'miasto',
                            'field' => 'name',
                            'terms' => $city
                        );
                        $args['tax_query']['relation'] = 'AND';
                    } else {
                        $args['tax_query'] = array(
                            array(
                                'taxonomy' => 'miasto',
                                'field' => 'name',
                                'terms' => $city
                            )
                        );
                    }
                }
            }
            
            // Add category filter
            if ($category) {
                $category_id = is_numeric($category) ? intval($category) : $category;
                if (isset($args['tax_query'])) {
                    $args['tax_query'][] = array(
                        'taxonomy' => 'kategoria-wydarzenia',
                        'field' => 'term_id',
                        'terms' => $category_id
                    );
                    $args['tax_query']['relation'] = 'AND';
                } else {
                    $args['tax_query'] = array(
                        array(
                            'taxonomy' => 'kategoria-wydarzenia',
                            'field' => 'term_id',
                            'terms' => $category_id
                        )
                    );
                }
            }
            
            // Add object filter
            if ($object) {
                $object_id = is_numeric($object) ? intval($object) : $object;
                if (isset($args['tax_query'])) {
                    $args['tax_query'][] = array(
                        'taxonomy' => 'obiekt',
                        'field' => 'term_id',
                        'terms' => $object_id
                    );
                    $args['tax_query']['relation'] = 'AND';
                } else {
                    $args['tax_query'] = array(
                        array(
                            'taxonomy' => 'obiekt',
                            'field' => 'term_id',
                            'terms' => $object_id
                        )
                    );
                }
            }
            
            // Add search filter
            if ($search) {
                $args['s'] = $search;
            }
            
            // Set meta query if we have any
            if (!empty($meta_query)) {
                if (count($meta_query) > 1) {
                    $args['meta_query'] = array(
                        'relation' => 'AND',
                        $meta_query
                    );
                } else {
                    $args['meta_query'] = $meta_query[0];
                }
            }
            
            $query = new WP_Query($args);
            
            $query = new WP_Query($args);
            
            if ($query->have_posts()) {
                $events = array();
                
                while ($query->have_posts()) {
                    $query->the_post();
                    
                    // Get event data
                    $event_data = array(
                        'id' => get_the_ID(),
                        'title' => array(
                            'rendered' => get_the_title()
                        ),
                        'excerpt' => array(
                            'rendered' => get_the_excerpt()
                        ),
                        'content' => array(
                            'rendered' => get_the_content()
                        ),
                        'date' => get_post_meta(get_the_ID(), 'sama-data', true),
                        'modified' => get_the_modified_date('c'),
                        'link' => get_permalink(),
                        'slug' => get_post_field('post_name'),
                        'featured_media' => get_post_thumbnail_id(),
                        'featured_media_url' => get_the_post_thumbnail_url(get_the_ID(), 'full'),
                        'meta' => array(
                            'miasto' => get_post_meta(get_the_ID(), 'miasto', true),
                            'cena' => get_post_meta(get_the_ID(), 'cena', true),
                            'opis-wydarzenia' => get_post_meta(get_the_ID(), 'opis-wydarzenia', true),
                            'link-do-wydarzenia' => get_post_meta(get_the_ID(), 'link-do-wydarzenia', true)
                        )
                    );
                    
                    // Get embedded data
                    $event_data['_embedded'] = array(
                        'wp:featuredmedia' => array(),
                        'wp:term' => array()
                    );
                    
                    // Get featured media - sprawdź różne sposoby
                    $featured_image_url = null;
                    
                    // 1. Sprawdź featured image
                    if (has_post_thumbnail()) {
                        $featured_image_url = get_the_post_thumbnail_url(get_the_ID(), 'full');
                    }
                    
                    // 2. Sprawdź meta pole 'obrazek' lub 'image'
                    if (!$featured_image_url) {
                        $featured_image_url = get_post_meta(get_the_ID(), 'obrazek', true);
                    }
                    
                    // 3. Sprawdź meta pole 'image'
                    if (!$featured_image_url) {
                        $featured_image_url = get_post_meta(get_the_ID(), 'image', true);
                    }
                    
                    // 4. Sprawdź meta pole 'zdjecie'
                    if (!$featured_image_url) {
                        $featured_image_url = get_post_meta(get_the_ID(), 'zdjecie', true);
                    }
                    
                    // Jeśli znaleziono obrazek, dodaj do embedded
                    if ($featured_image_url) {
                        $event_data['_embedded']['wp:featuredmedia'][] = array(
                            'id' => get_post_thumbnail_id() ?: 0,
                            'source_url' => $featured_image_url,
                            'media_details' => array(
                                'sizes' => array(
                                    'medium' => array(
                                        'source_url' => $featured_image_url
                                    ),
                                    'thumbnail' => array(
                                        'source_url' => $featured_image_url
                                    )
                                )
                            )
                        );
                        
                        // Debug log
                        error_log("API Debug - Found image for event " . get_the_ID() . ": " . $featured_image_url);
                    } else {
                        error_log("API Debug - No image found for event " . get_the_ID());
                    }
                    
                    // Get terms (categories)
                    $categories = get_the_terms(get_the_ID(), 'kategoria-wydarzenia');
                    if ($categories && !is_wp_error($categories)) {
                        $event_data['_embedded']['wp:term'][] = array_map(function($term) {
                            return array(
                                'id' => $term->term_id,
                                'name' => $term->name,
                                'taxonomy' => $term->taxonomy
                            );
                        }, $categories);
                    }
                    
                    // Get category IDs for filtering
                    $category_ids = wp_get_post_terms(get_the_ID(), 'kategoria-wydarzenia', array('fields' => 'ids'));
                    if (!is_wp_error($category_ids)) {
                        $event_data['kategoria-wydarzenia'] = $category_ids;
                    }
                    
                    $events[] = $event_data;
                }
                
                wp_reset_postdata();
                
                // Set headers for pagination
                $total_posts = $query->found_posts;
                $total_pages = ceil($total_posts / $per_page);
                
                $response = new WP_REST_Response($events, 200);
                $response->set_headers(array(
                    'X-WP-Total' => $total_posts,
                    'X-WP-TotalPages' => $total_pages
                ));
                
                return $response;
            } else {
                return new WP_REST_Response(array(), 200);
            }
            
        } catch (Exception $e) {
            error_log("Error in get_events: " . $e->getMessage());
            return new WP_Error('events_error', 'Error fetching events', array('status' => 500));
        }
    }

    /**
     * Get event counts for all filters
     */
    public function get_event_counts($request) {
        try {
            $today = current_time('timestamp');
            $counts = array(
                'today' => 0,
                'this-weekend' => 0,
                'this-week' => 0,
                'nearby' => 0
            );
            
            // Count today's events
            $today_args = array(
                'post_type' => 'kalendarz',
                'post_status' => 'publish',
                'posts_per_page' => -1,
                'meta_query' => array(
                    array(
                        'key' => 'sama-data',
                        'value' => array(strtotime('today', $today), strtotime('tomorrow', $today) - 1),
                        'compare' => 'BETWEEN',
                        'type' => 'NUMERIC'
                    )
                )
            );
            $today_query = new WP_Query($today_args);
            $counts['today'] = $today_query->found_posts;
            wp_reset_postdata();
            
            // Count this weekend's events
            $day_of_week = date('w');
            $days_until_saturday = (6 - $day_of_week + 7) % 7;
            $days_until_sunday = (7 - $day_of_week + 7) % 7;
            $saturday = strtotime("+$days_until_saturday days", $today);
            $sunday = strtotime("+$days_until_sunday days", $today);
            $end_of_sunday = strtotime('tomorrow', $sunday) - 1;
            
            $weekend_args = array(
                'post_type' => 'kalendarz',
                'post_status' => 'publish',
                'posts_per_page' => -1,
                'meta_query' => array(
                    array(
                        'key' => 'sama-data',
                        'value' => array($saturday, $end_of_sunday),
                        'compare' => 'BETWEEN',
                        'type' => 'NUMERIC'
                    )
                )
            );
            $weekend_query = new WP_Query($weekend_args);
            $counts['this-weekend'] = $weekend_query->found_posts;
            wp_reset_postdata();
            
            // Count this week's events
            $week_day_of_week = date('w');
            $start_of_week = strtotime("-" . ($week_day_of_week - 1) . " days", $today);
            $end_of_week = strtotime("+6 days", $start_of_week);
            $end_of_week = strtotime('tomorrow', $end_of_week) - 1;
            
            $week_args = array(
                'post_type' => 'kalendarz',
                'post_status' => 'publish',
                'posts_per_page' => -1,
                'meta_query' => array(
                    array(
                        'key' => 'sama-data',
                        'value' => array($start_of_week, $end_of_week),
                        'compare' => 'BETWEEN',
                        'type' => 'NUMERIC'
                    )
                )
            );
            $week_query = new WP_Query($week_args);
            $counts['this-week'] = $week_query->found_posts;
            wp_reset_postdata();
            
            // Count nearby events (events with city)
            $nearby_args = array(
                'post_type' => 'kalendarz',
                'post_status' => 'publish',
                'posts_per_page' => -1,
                'meta_query' => array(
                    'relation' => 'AND',
                    array(
                        'key' => 'sama-data',
                        'value' => $today,
                        'compare' => '>=',
                        'type' => 'NUMERIC'
                    ),
                    array(
                        'key' => 'miasto',
                        'compare' => 'EXISTS'
                    ),
                    array(
                        'key' => 'miasto',
                        'value' => '',
                        'compare' => '!='
                    )
                )
            );
            $nearby_query = new WP_Query($nearby_args);
            $counts['nearby'] = $nearby_query->found_posts;
            wp_reset_postdata();
            
            return new WP_REST_Response($counts, 200);
            
        } catch (Exception $e) {
            error_log("Error in get_event_counts: " . $e->getMessage());
            return new WP_Error('counts_error', 'Error fetching event counts', array('status' => 500));
        }
    }
    
    /**
     * Get saved events for a user
     */
    public function get_saved_events($request) {
        try {
            $user_id = $request->get_param('user_id');
            $page = $request->get_param('page') ?: 1;
            $per_page = $request->get_param('per_page') ?: 20;
            
            // For now, return all events since we don't have user-specific saved events
            // In the future, this could be connected to a user preferences system
            $args = array(
                'post_type' => 'kalendarz', // Poprawione - używamy 'kalendarz' bo taki typ jest w WordPress
                'post_status' => 'publish',
                'posts_per_page' => $per_page,
                'paged' => $page,
                'orderby' => 'meta_value_num',
                'meta_key' => 'sama-data', // Poprawione - używamy 'sama-data' bo taki klucz jest w WordPress
                'order' => 'ASC',
                'meta_query' => array(
                    array(
                        'key' => 'sama-data',
                        'value' => current_time('timestamp'),
                        'compare' => '>=',
                        'type' => 'NUMERIC'
                    )
                )
            );
            
            $query = new WP_Query($args);
            
            if ($query->have_posts()) {
                $events = array();
                
                while ($query->have_posts()) {
                    $query->the_post();
                    
                    $event_data = array(
                        'id' => get_the_ID(),
                        'title' => array(
                            'rendered' => get_the_title()
                        ),
                        'excerpt' => array(
                            'rendered' => get_the_excerpt()
                        ),
                        'content' => array(
                            'rendered' => get_the_content()
                        ),
                        'date' => get_post_meta(get_the_ID(), 'sama-data', true),
                        'modified' => get_the_modified_date('c'),
                        'link' => get_permalink(),
                        'slug' => get_post_field('post_name'),
                        'featured_media' => get_post_thumbnail_id(),
                        'featured_media_url' => get_the_post_thumbnail_url(get_the_ID(), 'full'),
                        'meta' => array(
                            'miasto' => get_post_meta(get_the_ID(), 'miasto', true),
                            'cena' => get_post_meta(get_the_ID(), 'cena', true),
                            'opis-wydarzenia' => get_post_meta(get_the_ID(), 'opis-wydarzenia', true),
                            'link-do-wydarzenia' => get_post_meta(get_the_ID(), 'link-do-wydarzenia', true)
                        )
                    );
                    
                    // Get embedded data
                    $event_data['_embedded'] = array(
                        'wp:featuredmedia' => array(),
                        'wp:term' => array()
                    );
                    
                    // Get featured media
                    if (has_post_thumbnail()) {
                        $event_data['_embedded']['wp:featuredmedia'][] = array(
                            'id' => get_post_thumbnail_id(),
                            'source_url' => get_the_post_thumbnail_url(get_the_ID(), 'full'),
                            'media_details' => array(
                                'sizes' => array(
                                    'medium' => array(
                                        'source_url' => get_the_post_thumbnail_url(get_the_ID(), 'medium')
                                    ),
                                    'thumbnail' => array(
                                        'source_url' => get_the_post_thumbnail_url(get_the_ID(), 'thumbnail')
                                    )
                                )
                            )
                        );
                    }
                    
                    // Get terms (categories)
                    $categories = get_the_terms(get_the_ID(), 'kategoria-wydarzenia');
                    if ($categories && !is_wp_error($categories)) {
                        $event_data['_embedded']['wp:term'][] = array_map(function($term) {
                            return array(
                                'id' => $term->term_id,
                                'name' => $term->name,
                                'taxonomy' => $term->taxonomy
                            );
                        }, $categories);
                    }
                    
                    // Get category IDs for filtering
                    $category_ids = wp_get_post_terms(get_the_ID(), 'kategoria-wydarzenia', array('fields' => 'ids'));
                    if (!is_wp_error($category_ids)) {
                        $event_data['kategoria-wydarzenia'] = $category_ids;
                    }
                    
                    $events[] = $event_data;
                }
                
                wp_reset_postdata();
                
                // Set headers for pagination
                $total_posts = $query->found_posts;
                $total_pages = ceil($total_posts / $per_page);
                
                $response = new WP_REST_Response($events, 200);
                $response->set_headers(array(
                    'X-WP-Total' => $total_posts,
                    'X-WP-TotalPages' => $total_pages
                ));
                
                return $response;
            } else {
                return new WP_REST_Response(array(), 200);
            }
            
        } catch (Exception $e) {
            error_log("Error in get_saved_events: " . $e->getMessage());
            return new WP_Error('saved_events_error', 'Error fetching saved events', array('status' => 500));
        }
    }
    
    public function track_notification($request) {
        try {
            $notification_id = sanitize_text_field($request['notification_id']);
            $action = sanitize_text_field($request['action']);
            $platform = sanitize_text_field($request['platform'] ?? '');
            $location = sanitize_text_field($request['location'] ?? '');
            $article_id = intval($request['article_id'] ?? 0);
            
            $result = $this->database->log_notification_analytics(
                $notification_id,
                $action,
                $platform,
                $location,
                $article_id ?: null
            );
            
            if ($result) {
                return new WP_REST_Response(array(
                    'success' => true,
                    'message' => 'Analytics tracked successfully'
                ), 200);
            } else {
                return new WP_Error('tracking_failed', 'Failed to track analytics', array('status' => 500));
            }
            
        } catch (Exception $e) {
            error_log('Notification tracking error: ' . $e->getMessage());
            return new WP_Error('tracking_error', 'Failed to track notification', array('status' => 500));
        }
    }
    
    public function get_analytics($request) {
        try {
            $article_id = intval($request['article_id'] ?? 0);
            $days = intval($request['days'] ?? 30);
            
            $analytics = $this->database->get_notification_analytics(
                $article_id ?: null,
                $days
            );
            
            $delivery_stats = $this->database->get_delivery_stats(
                $article_id ?: null,
                $days
            );
            
            return new WP_REST_Response(array(
                'success' => true,
                'analytics' => $analytics,
                'delivery_stats' => $delivery_stats,
                'period_days' => $days
            ), 200);
            
        } catch (Exception $e) {
            error_log('Analytics retrieval error: ' . $e->getMessage());
            return new WP_Error('analytics_error', 'Failed to get analytics', array('status' => 500));
        }
    }
    
    public function schedule_notification($request) {
        try {
            $title = sanitize_text_field($request['title']);
            $body = sanitize_textarea_field($request['body']);
            $scheduled_time = sanitize_text_field($request['scheduled_time']);
            $article_id = intval($request['article_id'] ?? 0);
            $regions = $request['regions'] ?? array();
            $categories = $request['categories'] ?? array();
            
            // Validate scheduled time
            $scheduled_timestamp = strtotime($scheduled_time);
            if (!$scheduled_timestamp || $scheduled_timestamp <= time()) {
                return new WP_Error('invalid_time', 'Scheduled time must be in the future', array('status' => 400));
            }
            
            $notification_data = array(
                'title' => $title,
                'body' => $body,
                'scheduled_time' => date('Y-m-d H:i:s', $scheduled_timestamp),
                'article_id' => $article_id ?: null,
                'regions' => $regions,
                'categories' => $categories
            );
            
            $result = $this->database->schedule_notification($notification_data);
            
            if ($result) {
                return new WP_REST_Response(array(
                    'success' => true,
                    'message' => 'Notification scheduled successfully',
                    'scheduled_id' => $this->database->wpdb->insert_id,
                    'scheduled_time' => $scheduled_time
                ), 200);
            } else {
                return new WP_Error('scheduling_failed', 'Failed to schedule notification', array('status' => 500));
            }
            
        } catch (Exception $e) {
            error_log('Notification scheduling error: ' . $e->getMessage());
            return new WP_Error('scheduling_error', 'Failed to schedule notification', array('status' => 500));
        }
    }
    
    /**
     * Get individual event by ID
     */
    public function get_event_by_id($request) {
        try {
            $event_id = $request['id'];
            
            // Get the event post
            $event = get_post($event_id);
            
            if (!$event || $event->post_type !== 'kalendarz') { // Poprawione - używamy 'kalendarz' bo taki typ jest w WordPress
                return new WP_Error('event_not_found', 'Event not found', array('status' => 404));
            }
            
            // Get event data
            $event_data = array(
                'id' => $event->ID,
                'title' => array(
                    'rendered' => get_the_title($event->ID)
                ),
                'excerpt' => array(
                    'rendered' => get_the_excerpt($event->ID),
                    'protected' => false
                ),
                'content' => array(
                    'rendered' => get_the_content(null, false, $event->ID),
                    'protected' => false
                ),
                'date' => get_post_meta($event->ID, 'sama-data', true),
                'modified' => get_the_modified_date('c', $event->ID),
                'link' => get_permalink($event->ID),
                'slug' => get_post_field('post_name', $event->ID),
                'featured_media' => get_post_thumbnail_id($event->ID),
                'featured_media_url' => get_the_post_thumbnail_url($event->ID, 'full'),
                'meta' => array(
                    'miasto' => get_post_meta($event->ID, 'miasto', true),
                    'cena' => get_post_meta($event->ID, 'cena', true),
                    'opis-wydarzenia' => get_post_meta($event->ID, 'opis-wydarzenia', true),
                    'link-do-wydarzenia' => get_post_meta($event->ID, 'link-do-wydarzenia', true)
                )
            );
            
            // Get embedded data
            $event_data['_embedded'] = array(
                'wp:featuredmedia' => array(),
                'wp:term' => array()
            );
            
            // Get featured media
            if (has_post_thumbnail($event->ID)) {
                $event_data['_embedded']['wp:featuredmedia'][] = array(
                    'id' => get_post_thumbnail_id($event->ID),
                    'source_url' => get_the_post_thumbnail_url($event->ID, 'full'),
                    'media_details' => array(
                        'sizes' => array(
                            'medium' => array(
                                'source_url' => get_the_post_thumbnail_url($event->ID, 'medium')
                            ),
                            'thumbnail' => array(
                                'source_url' => get_the_post_thumbnail_url($event->ID, 'thumbnail')
                            )
                        )
                    )
                );
            }
            
            // Get terms (categories)
            $categories = get_the_terms($event->ID, 'kategoria-wydarzenia');
            if ($categories && !is_wp_error($categories)) {
                $event_data['_embedded']['wp:term'][] = array_map(function($term) {
                    return array(
                        'id' => $term->term_id,
                        'name' => $term->name,
                        'taxonomy' => $term->taxonomy
                    );
                }, $categories);
            }
            
            // Get category IDs for filtering
            $category_ids = wp_get_post_terms($event->ID, 'kategoria-wydarzenia', array('fields' => 'ids'));
            if (!is_wp_error($category_ids)) {
                $event_data['kategoria-wydarzenia'] = $category_ids;
            }
            
            return new WP_REST_Response($event_data, 200);
            
        } catch (Exception $e) {
            return new WP_Error('event_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Get related events based on categories and location
     */
    public function get_related_events($request) {
        try {
            $event_id = $request['event_id'];
            $categories = $request['categories'] ? explode(',', $request['categories']) : array();
            $location = $request['location'] ? sanitize_text_field($request['location']) : '';
            $limit = $request['limit'] ? intval($request['limit']) : 6;
            
            // Get current event to extract categories and location if not provided
            $current_event = get_post($event_id);
            if (!$current_event || $current_event->post_type !== 'kalendarz') { // Poprawione - używamy 'kalendarz' bo taki typ jest w WordPress
                return new WP_Error('event_not_found', 'Current event not found', array('status' => 404));
            }
            
            // If categories not provided, get them from current event
            if (empty($categories)) {
                $category_ids = wp_get_post_terms($event_id, 'kategoria-wydarzenia', array('fields' => 'ids'));
                if (!is_wp_error($category_ids) && !empty($category_ids)) {
                    $categories = $category_ids;
                }
            }
            
            // If location not provided, get it from current event
            if (empty($location)) {
                $location = get_post_meta($event_id, 'miasto', true);
            }
            
            // Build query arguments
            $args = array(
                'post_type' => 'kalendarz', // Poprawione - używamy 'kalendarz' bo taki typ jest w WordPress
                'post_status' => 'publish',
                'posts_per_page' => $limit,
                'post__not_in' => array($event_id), // Exclude current event
                'meta_query' => array(),
                'tax_query' => array()
            );
            
            // Add location filter if provided
            if (!empty($location)) {
                $args['meta_query'][] = array(
                    'key' => 'miasto',
                    'value' => $location,
                    'compare' => 'LIKE'
                );
            }
            
            // Add category filter if provided
            if (!empty($categories)) {
                $args['tax_query'][] = array(
                    'taxonomy' => 'kategoria-wydarzenia',
                    'field' => 'term_id',
                    'terms' => $categories,
                    'operator' => 'IN'
                );
            }
            
            // If we have both location and categories, use OR relation
            if (!empty($location) && !empty($categories)) {
                $args['meta_query']['relation'] = 'OR';
                $args['tax_query']['relation'] = 'OR';
            }
            
            // Order by date (upcoming events first)
            $args['meta_key'] = 'sama-data';
            $args['orderby'] = 'meta_value';
            $args['order'] = 'ASC';
            
            // Get related events
            $related_events = get_posts($args);
            
            $events_data = array();
            
            foreach ($related_events as $event) {
                $event_data = array(
                    'id' => $event->ID,
                    'title' => array(
                        'rendered' => get_the_title($event->ID)
                    ),
                    'excerpt' => array(
                        'rendered' => get_the_excerpt($event->ID),
                        'protected' => false
                    ),
                    'date' => get_post_meta($event->ID, 'sama-data', true),
                    'link' => get_permalink($event->ID),
                    'slug' => get_post_field('post_name', $event->ID),
                    'featured_media' => get_post_thumbnail_id($event->ID),
                    'featured_media_url' => get_the_post_thumbnail_url($event->ID, 'full'),
                    'meta' => array(
                        'miasto' => get_post_meta($event->ID, 'miasto', true),
                        'cena' => get_post_meta($event->ID, 'cena', true),
                        'opis-wydarzenia' => get_post_meta($event->ID, 'opis-wydarzenia', true),
                        'link-do-wydarzenia' => get_post_meta($event->ID, 'link-do-wydarzenia', true)
                    )
                );
                
                // Get embedded data
                $event_data['_embedded'] = array(
                    'wp:featuredmedia' => array(),
                    'wp:term' => array()
                );
                
                // Get featured media
                if (has_post_thumbnail($event->ID)) {
                    $event_data['_embedded']['wp:featuredmedia'][] = array(
                        'id' => get_post_thumbnail_id($event->ID),
                        'source_url' => get_the_post_thumbnail_url($event->ID, 'full'),
                        'media_details' => array(
                            'sizes' => array(
                                'medium' => array(
                                    'source_url' => get_the_post_thumbnail_url($event->ID, 'medium')
                                ),
                                'thumbnail' => array(
                                    'source_url' => get_the_post_thumbnail_url($event->ID, 'thumbnail')
                                )
                            )
                        )
                    );
                }
                
                // Get terms (categories)
                $categories = get_the_terms($event->ID, 'kategoria-wydarzenia');
                if ($categories && !is_wp_error($categories)) {
                    $event_data['_embedded']['wp:term'][] = array_map(function($term) {
                        return array(
                            'id' => $term->term_id,
                            'name' => $term->name,
                            'taxonomy' => $term->taxonomy
                        );
                    }, $categories);
                }
                
                $events_data[] = $event_data;
            }
            
            return new WP_REST_Response($events_data, 200);
            
        } catch (Exception $e) {
            return new WP_Error('related_events_error', $e->getMessage(), array('status' => 500));
        }
    }

    /**
     * Register events API routes
     */
    public function register_events_routes() {
        // Endpoint dla kategorii z aktualnymi wydarzeniami
        register_rest_route('kaszuby24/v1', '/events/categories/active', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_active_event_categories'),
            'permission_callback' => '__return_true',
            'args' => array(
                'date_from' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Data od (format: Y-m-d)',
                    'default' => date('Y-m-d')
                ),
                'date_to' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Data do (format: Y-m-d)',
                    'default' => date('Y-m-d', strtotime('+90 days'))
                ),
                'per_page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'description' => 'Liczba wyników na stronę',
                    'default' => 100,
                    'minimum' => 1,
                    'maximum' => 1000
                )
            )
        ));

        // Endpoint dla obiektów z aktualnymi wydarzeniami
        register_rest_route('kaszuby24/v1', '/events/objects/active', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_active_event_objects'),
            'permission_callback' => '__return_true',
            'args' => array(
                'date_from' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Data od (format: Y-m-d)',
                    'default' => date('Y-m-d')
                ),
                'date_to' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Data do (format: Y-m-d)',
                    'default' => date('Y-m-d', strtotime('+90 days'))
                ),
                'per_page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'description' => 'Liczba wyników na stronę',
                    'default' => 100,
                    'minimum' => 1,
                    'maximum' => 1000
                )
            )
        ));

        // Endpoint dla miast z aktualnymi wydarzeniami
        register_rest_route('kaszuby24/v1', '/events/cities/active', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_active_event_cities'),
            'permission_callback' => '__return_true',
            'args' => array(
                'date_from' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Data od (format: Y-m-d)',
                    'default' => date('Y-m-d')
                ),
                'date_to' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Data do (format: Y-m-d)',
                    'default' => date('Y-m-d', strtotime('+90 days'))
                ),
                'per_page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'description' => 'Liczba wyników na stronę',
                    'default' => 100,
                    'minimum' => 1,
                    'maximum' => 1000
                )
            )
        ));

        // Endpoint dla wszystkich kategorii wydarzeń (hierarchiczne)
        register_rest_route('kaszuby24/v1', '/events/categories', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_all_event_categories'),
            'permission_callback' => '__return_true',
            'args' => array(
                'hierarchical' => array(
                    'required' => false,
                    'type' => 'boolean',
                    'description' => 'Czy zwrócić hierarchiczną strukturę',
                    'default' => true
                )
            )
        ));

        // Endpoint dla wszystkich obiektów wydarzeń (hierarchiczne)
        register_rest_route('kaszuby24/v1', '/events/objects', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_all_event_objects'),
            'permission_callback' => '__return_true',
            'args' => array(
                'hierarchical' => array(
                    'required' => false,
                    'type' => 'boolean',
                    'description' => 'Czy zwrócić hierarchiczną strukturę',
                    'default' => true
                )
            )
        ));

        // Endpoint dla wydarzeń z filtrami
        register_rest_route('kaszuby24/v1', '/events', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_events_with_filters'),
            'permission_callback' => '__return_true',
            'args' => array(
                'date_from' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Data od (format: Y-m-d)',
                    'default' => date('Y-m-d')
                ),
                'date_to' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Data do (format: Y-m-d)',
                    'default' => date('Y-m-d', strtotime('+90 days'))
                ),
                'city' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Nazwa miasta do filtrowania'
                ),
                'category' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'ID kategorii (może być lista oddzielona przecinkami)'
                ),
                'object' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'ID obiektu (może być lista oddzielona przecinkami)'
                ),
                'per_page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'description' => 'Liczba wyników na stronę',
                    'default' => 20,
                    'minimum' => 1,
                    'maximum' => 100
                ),
                'page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'description' => 'Numer strony',
                    'default' => 1,
                    'minimum' => 1
                )
            )
        ));
    }

    /**
     * Pobiera kategorie wydarzeń z aktualnymi wydarzeniami
     */
    public function get_active_event_categories($request) {
        $date_from = $request->get_param('date_from') ?: date('Y-m-d');
        $date_to = $request->get_param('date_to') ?: date('Y-m-d', strtotime('+90 days'));
        $per_page = intval($request->get_param('per_page')) ?: 100;

        // Pobierz wszystkie kategorie wydarzeń
        $categories = get_terms(array(
            'taxonomy' => 'kategoria-wydarzenia',
            'hide_empty' => false,
            'number' => $per_page
        ));

        if (is_wp_error($categories)) {
            return new WP_Error('categories_error', 'Błąd podczas pobierania kategorii', array('status' => 500));
        }

        $active_categories = array();

        foreach ($categories as $category) {
            // Sprawdź czy kategoria ma wydarzenia w podanym zakresie dat
            $events_count = $this->get_events_count_by_category($category->term_id, $date_from, $date_to);
            
            if ($events_count > 0) {
                $active_categories[] = array(
                    'id' => $category->term_id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'description' => $category->description,
                    'count' => $events_count,
                    'parent' => $category->parent,
                    'link' => get_term_link($category)
                );
            }
        }

        // Sortuj po liczbie wydarzeń (malejąco)
        usort($active_categories, function($a, $b) {
            return $b['count'] - $a['count'];
        });

        return rest_ensure_response(array(
            'categories' => $active_categories,
            'total' => count($active_categories),
            'date_range' => array(
                'from' => $date_from,
                'to' => $date_to
            )
        ));
    }

    /**
     * Pobiera obiekty wydarzeń z aktualnymi wydarzeniami
     */
    public function get_active_event_objects($request) {
        $date_from = $request->get_param('date_from') ?: date('Y-m-d');
        $date_to = $request->get_param('date_to') ?: date('Y-m-d', strtotime('+90 days'));
        $per_page = intval($request->get_param('per_page')) ?: 100;

        // Pobierz wszystkie obiekty wydarzeń (jeśli istnieją)
        $objects = get_terms(array(
            'taxonomy' => 'obiekt',
            'hide_empty' => false,
            'number' => $per_page
        ));

        if (is_wp_error($objects)) {
            return new WP_Error('objects_error', 'Błąd podczas pobierania obiektów', array('status' => 500));
        }

        $active_objects = array();

        foreach ($objects as $object) {
            // Sprawdź czy obiekt ma wydarzenia w podanym zakresie dat
            $events_count = $this->get_events_count_by_object($object->term_id, $date_from, $date_to);
            
            if ($events_count > 0) {
                $active_objects[] = array(
                    'id' => $object->term_id,
                    'name' => $object->name,
                    'slug' => $object->slug,
                    'description' => $object->description,
                    'count' => $events_count,
                    'parent' => $object->parent,
                    'link' => get_term_link($object)
                );
            }
        }

        // Sortuj po liczbie wydarzeń (malejąco)
        usort($active_objects, function($a, $b) {
            return $b['count'] - $a['count'];
        });

        return rest_ensure_response(array(
            'objects' => $active_objects,
            'total' => count($active_objects),
            'date_range' => array(
                'from' => $date_from,
                'to' => $date_to
            )
        ));
    }

    /**
     * Pobiera miasta z aktualnymi wydarzeniami
     */
    public function get_active_event_cities($request) {
        $date_from = $request->get_param('date_from') ?: date('Y-m-d');
        $date_to = $request->get_param('date_to') ?: date('Y-m-d', strtotime('+90 days'));
        $per_page = intval($request->get_param('per_page')) ?: 100;

        // Pobierz wszystkie miasta
        $cities = get_terms(array(
            'taxonomy' => 'miasto',
            'hide_empty' => false,
            'number' => $per_page
        ));

        if (is_wp_error($cities)) {
            return new WP_Error('cities_error', 'Błąd podczas pobierania miast', array('status' => 500));
        }

        $active_cities = array();

        foreach ($cities as $city) {
            // Sprawdź czy miasto ma wydarzenia w podanym zakresie dat
            $events_count = $this->get_events_count_by_city($city->name, $date_from, $date_to);
            
            if ($events_count > 0) {
                $active_cities[] = array(
                    'id' => $city->term_id,
                    'name' => $city->name,
                    'slug' => $city->slug,
                    'description' => $city->description,
                    'count' => $events_count,
                    'parent' => $city->parent,
                    'link' => get_term_link($city)
                );
            }
        }

        // Sortuj po liczbie wydarzeń (malejąco)
        usort($active_cities, function($a, $b) {
            return $b['count'] - $a['count'];
        });

        return rest_ensure_response(array(
            'cities' => $active_cities,
            'total' => count($active_cities),
            'date_range' => array(
                'from' => $date_from,
                'to' => $date_to
            )
        ));
    }

    /**
     * Pobiera wszystkie kategorie wydarzeń w strukturze hierarchicznej
     */
    public function get_all_event_categories($request) {
        $hierarchical = $request->get_param('hierarchical') !== 'false';
        
        if ($hierarchical) {
            $categories = get_terms(array(
                'taxonomy' => 'kategoria-wydarzenia',
                'hide_empty' => false,
                'parent' => 0
            ));

            $hierarchical_categories = array();
            foreach ($categories as $category) {
                $hierarchical_categories[] = $this->build_hierarchical_category($category);
            }

            return rest_ensure_response(array(
                'categories' => $hierarchical_categories,
                'total' => count($hierarchical_categories)
            ));
        } else {
            $categories = get_terms(array(
                'taxonomy' => 'kategoria-wydarzenia',
                'hide_empty' => false
            ));

            $flat_categories = array();
            foreach ($categories as $category) {
                $flat_categories[] = array(
                    'id' => $category->term_id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'description' => $category->description,
                    'parent' => $category->parent,
                    'count' => $category->count,
                    'link' => get_term_link($category)
                );
            }

            return rest_ensure_response(array(
                'categories' => $flat_categories,
                'total' => count($flat_categories)
            ));
        }
    }

    /**
     * Pobiera wszystkie obiekty wydarzeń w strukturze hierarchicznej
     */
    public function get_all_event_objects($request) {
        $hierarchical = $request->get_param('hierarchical') !== 'false';
        
        if ($hierarchical) {
            $objects = get_terms(array(
                'taxonomy' => 'obiekt',
                'hide_empty' => false,
                'parent' => 0
            ));

            $hierarchical_objects = array();
            foreach ($objects as $object) {
                $hierarchical_objects[] = $this->build_hierarchical_object($object);
            }

            return rest_ensure_response(array(
                'objects' => $hierarchical_objects,
                'total' => count($hierarchical_objects)
            ));
        } else {
            $objects = get_terms(array(
                'taxonomy' => 'obiekt',
                'hide_empty' => false
            ));

            $flat_objects = array();
            foreach ($objects as $object) {
                $flat_objects[] = array(
                    'id' => $object->term_id,
                    'name' => $object->name,
                    'slug' => $object->slug,
                    'description' => $object->description,
                    'parent' => $object->parent,
                    'count' => $object->count,
                    'link' => get_term_link($object)
                );
            }

            return rest_ensure_response(array(
                'objects' => $flat_objects,
                'total' => count($flat_objects)
            ));
        }
    }

    /**
     * Pobiera wydarzenia z filtrami
     */
    public function get_events_with_filters($request) {
        $date_from = $request->get_param('date_from') ?: date('Y-m-d');
        $date_to = $request->get_param('date_to') ?: date('Y-m-d', strtotime('+90 days'));
        $city = $request->get_param('city');
        $category = $request->get_param('category');
        $object = $request->get_param('object');
        $per_page = intval($request->get_param('per_page')) ?: 20;
        $page = intval($request->get_param('page')) ?: 1;

        $args = array(
            'post_type' => 'kalendarz', // Poprawione - używamy 'kalendarz' bo taki typ jest w WordPress
            'post_status' => 'publish',
            'posts_per_page' => $per_page,
            'paged' => $page,
            'meta_query' => array(
                'relation' => 'AND',
                array(
                    'key' => 'sama-data',
                    'value' => strtotime($date_from . ' 00:00:00'),
                    'compare' => '>=',
                    'type' => 'NUMERIC'
                ),
                array(
                    'key' => 'sama-data',
                    'value' => strtotime($date_to . ' 23:59:59'),
                    'compare' => '<=',
                    'type' => 'NUMERIC'
                )
            ),
            'orderby' => 'meta_value_num',
            'meta_key' => 'sama-data',
            'order' => 'ASC'
        );

        // Inicjalizuj tax_query jeśli będzie potrzebny
        $tax_queries = array();

        // Dodaj filtry taksonomii
        if ($category) {
            $category_ids = array_map('intval', explode(',', $category));
            $tax_queries[] = array(
                'taxonomy' => 'kategoria-wydarzenia',
                'field' => 'term_id',
                'terms' => $category_ids
            );
        }

        if ($object) {
            $object_ids = array_map('intval', explode(',', $object));
            $tax_queries[] = array(
                'taxonomy' => 'obiekt',
                'field' => 'term_id',
                'terms' => $object_ids
            );
        }

        // Dodaj filtr miasta
        if ($city) {
            $tax_queries[] = array(
                'taxonomy' => 'miasto',
                'field' => 'name',
                'terms' => $city
            );
        }

        // Dodaj tax_query do głównych argumentów jeśli są jakieś filtry
        if (!empty($tax_queries)) {
            if (count($tax_queries) > 1) {
                $args['tax_query'] = array(
                    'relation' => 'AND',
                    $tax_queries
                );
            } else {
                $args['tax_query'] = $tax_queries;
            }
        }

        $query = new WP_Query($args);
        $events = array();

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                
                $events[] = array(
                    'id' => $post_id,
                    'title' => get_the_title(),
                    'content' => get_the_content(),
                    'excerpt' => get_the_excerpt(),
                    'date' => get_post_meta($post_id, 'sama-data', true),
                    'time' => get_post_meta($post_id, 'czas', true),
                    'end_date' => get_post_meta($post_id, 'data-koniec', true),
                    'end_time' => get_post_meta($post_id, 'czas-koniec', true),
                    'location' => get_post_meta($post_id, 'miasto', true),
                    'price' => get_post_meta($post_id, 'cena', true),
                    'link' => get_permalink(),
                    'featured_image' => get_the_post_thumbnail_url($post_id, 'medium'),
                    'categories' => wp_get_post_terms($post_id, 'kategoria-wydarzenia', array('fields' => 'names')),
                    'objects' => wp_get_post_terms($post_id, 'obiekt', array('fields' => 'names'))
                );
            }
        }

        wp_reset_postdata();

        return rest_ensure_response(array(
            'events' => $events,
            'total' => $query->found_posts,
            'total_pages' => $query->max_num_pages,
            'current_page' => $page,
            'per_page' => $per_page,
            'date_range' => array(
                'from' => $date_from,
                'to' => $date_to
            )
        ));
    }

    /**
     * Buduje hierarchiczną strukturę kategorii
     */
    private function build_hierarchical_category($category) {
        $children = get_terms(array(
            'taxonomy' => 'kategoria-wydarzenia',
            'hide_empty' => false,
            'parent' => $category->term_id
        ));

        $hierarchical_category = array(
            'id' => $category->term_id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'count' => $category->count,
            'parent' => $category->parent,
            'link' => get_term_link($category),
            'children' => array()
        );

        foreach ($children as $child) {
            $hierarchical_category['children'][] = $this->build_hierarchical_category($child);
        }

        return $hierarchical_category;
    }

    /**
     * Buduje hierarchiczną strukturę obiektów
     */
    private function build_hierarchical_object($object) {
        $children = get_terms(array(
            'taxonomy' => 'obiekt',
            'hide_empty' => false,
            'parent' => $object->term_id
        ));

        $hierarchical_object = array(
            'id' => $object->term_id,
            'name' => $object->name,
            'slug' => $object->slug,
            'description' => $object->description,
            'count' => $object->count,
            'parent' => $object->parent,
            'link' => get_term_link($object),
            'children' => array()
        );

        foreach ($children as $child) {
            $hierarchical_object['children'][] = $this->build_hierarchical_object($child);
        }

        return $hierarchical_object;
    }

    /**
     * Pobiera aktywne filtry dla aplikacji mobilnej (kategorie i obiekty z wydarzeniami)
     */
    public function get_active_filters_for_mobile($request) {
        try {
            $date_from = $request->get_param('date_from') ?: date('Y-m-d');
            $date_to = $request->get_param('date_to') ?: date('Y-m-d', strtotime('+90 days'));

            // Simplify: Return all terms instead of heavy counting in loop
            // The client can filter or we can use a simpler query later
            $categories = get_terms(array(
                'taxonomy' => 'kategoria-wydarzenia',
                'hide_empty' => true // Only meaningful categories
            ));

            $objects = get_terms(array(
                'taxonomy' => 'obiekt',
                'hide_empty' => true
            ));

            $cities = get_terms(array(
                'taxonomy' => 'miasto',
                'hide_empty' => true
            ));

            $categories_data = array_map(function($t) {
                return array('id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug, 'count' => $t->count);
            }, is_array($categories) ? $categories : array());

            $objects_data = array_map(function($t) {
                return array('id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug, 'count' => $t->count);
            }, is_array($objects) ? $objects : array());

            $cities_data = array_map(function($t) {
                return array('id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug, 'count' => $t->count);
            }, is_array($cities) ? $cities : array());

            return new WP_REST_Response(array(
                'success' => true,
                'categories' => $categories_data,
                'objects' => $objects_data,
                'cities' => $cities_data,
                'total_categories' => count($categories_data),
                'total_objects' => count($objects_data),
                'total_cities' => count($cities_data),
                'date_range' => array('from' => $date_from, 'to' => $date_to)
            ), 200);

        } catch (Exception $e) {
            error_log("Error in get_active_filters_for_mobile: " . $e->getMessage());
            return new WP_Error('filters_error', 'Error fetching active filters', array('status' => 500));
        }
    }

    /**
     * Liczy wydarzenia w kategorii w danym zakresie dat
     */
    private function get_events_count_by_category($category_id, $date_from, $date_to) {
        return 0; // Simplified to avoid slow queries
    }

    /**
     * Liczy wydarzenia w obiekcie w danym zakresie dat
     */
    private function get_events_count_by_object($object_id, $date_from, $date_to) {
        try {
            // Debug: Log parameters
            error_log("get_events_count_by_object - object_id: $object_id, date_from: $date_from, date_to: $date_to");
            
            $args = array(
                'post_type' => 'kalendarz', // Poprawione - używamy 'kalendarz' bo taki typ jest w WordPress
                'post_status' => 'publish',
                'posts_per_page' => -1,
                'tax_query' => array(
                    array(
                        'taxonomy' => 'obiekt',
                        'field' => 'term_id',
                        'terms' => $object_id
                    )
                ),
                'meta_query' => array(
                    'relation' => 'AND',
                    array(
                        'key' => 'sama-data',
                        'value' => strtotime($date_from . ' 00:00:00'),
                        'compare' => '>=',
                        'type' => 'NUMERIC'
                    ),
                    array(
                        'key' => 'sama-data',
                        'value' => strtotime($date_to . ' 23:59:59'),
                        'compare' => '<=',
                        'type' => 'NUMERIC'
                    )
                )
            );

            // Debug: Log query arguments
            error_log("get_events_count_by_object - Query args: " . print_r($args, true));

            $query = new WP_Query($args);
            
            // Debug: Log query results
            error_log("get_events_count_by_object - Found posts: " . $query->found_posts);
            error_log("get_events_count_by_object - Query SQL: " . $query->request);
            
            if ($query->have_posts()) {
                // Debug: Log first few posts for verification
                $post_count = 0;
                while ($query->have_posts() && $post_count < 3) {
                    $query->the_post();
                    $post_id = get_the_ID();
                    $post_date = get_post_meta($post_id, 'sama-data', true);
                    error_log("get_events_count_by_object - Post ID: $post_id, Date: $post_date");
                    $post_count++;
                }
                wp_reset_postdata();
            }
            
            return $query->found_posts;
            
        } catch (Exception $e) {
            error_log("get_events_count_by_object - Error: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Liczy wydarzenia w mieście w danym zakresie dat
     */
    private function get_events_count_by_city($city_name, $date_from, $date_to) {
        try {
            // Debug: Log parameters
            error_log("get_events_count_by_city - city_name: $city_name, date_from: $date_from, date_to: $date_to");
            
            $args = array(
                'post_type' => 'kalendarz',
                'post_status' => 'publish',
                'posts_per_page' => -1,
                'meta_query' => array(
                    'relation' => 'AND',
                    array(
                        'key' => 'miasto',
                        'value' => $city_name,
                        'compare' => '='
                    ),
                    array(
                        'key' => 'sama-data',
                        'value' => strtotime($date_from . ' 00:00:00'),
                        'compare' => '>=',
                        'type' => 'NUMERIC'
                    ),
                    array(
                        'key' => 'sama-data',
                        'value' => strtotime($date_to . ' 23:59:59'),
                        'compare' => '<=',
                        'type' => 'NUMERIC'
                    )
                )
            );

            // Debug: Log query arguments
            error_log("get_events_count_by_city - Query args: " . print_r($args, true));

            $query = new WP_Query($args);
            
            // Debug: Log query results
            error_log("get_events_count_by_city - Found posts: " . $query->found_posts);
            error_log("get_events_count_by_city - Query SQL: " . $query->request);
            
            return $query->found_posts;
            
        } catch (Exception $e) {
            error_log("get_events_count_by_city - Error: " . $e->getMessage());
            return 0;
        }
    }

    // Endpoint diagnostyczny - sprawdza stan bazy danych i struktury
    public function get_database_status($request) {
        try {
            global $wpdb;
            
            $database_status = array(
                'wordpress_version' => get_bloginfo('version'),
                'php_version' => PHP_VERSION,
                'mysql_version' => $wpdb->db_version(),
                'post_types' => array(),
                'taxonomies' => array(),
                'meta_fields' => array(),
                'sample_posts' => array()
            );
            
            // Sprawdź typy postów
            $post_types = get_post_types(array(), 'objects');
            foreach ($post_types as $post_type => $post_type_obj) {
                $count = wp_count_posts($post_type);
                $database_status['post_types'][$post_type] = array(
                    'name' => $post_type_obj->name,
                    'label' => $post_type_obj->label,
                    'count' => $count->publish,
                    'total' => $count->publish + $count->draft + $count->pending + $count->private
                );
            }
            
            // Sprawdź taksonomie
            $taxonomies = get_taxonomies(array(), 'objects');
            foreach ($taxonomies as $taxonomy => $taxonomy_obj) {
                $terms = get_terms(array('taxonomy' => $taxonomy, 'hide_empty' => false));
                $database_status['taxonomies'][$taxonomy] = array(
                    'name' => $taxonomy_obj->name,
                    'label' => $taxonomy_obj->label,
                    'terms_count' => count($terms),
                    'sample_terms' => array_slice(array_map(function($term) {
                        return array('id' => $term->term_id, 'name' => $term->name, 'slug' => $term->slug);
                    }, $terms), 0, 5)
                );
            }
            
            // Sprawdź meta pola dla typu 'kalendarz'
            if (post_type_exists('kalendarz')) {
                $sample_posts = get_posts(array(
                    'post_type' => 'kalendarz',
                    'post_status' => 'publish',
                    'posts_per_page' => 3
                ));
                
                foreach ($sample_posts as $post) {
                    $meta_fields = get_post_meta($post->ID);
                    $database_status['meta_fields'][$post->ID] = array(
                        'title' => $post->post_title,
                        'meta' => $meta_fields
                    );
                }
            }
            
            // Sprawdź próbkę postów
            $recent_posts = get_posts(array(
                'post_type' => 'any',
                'post_status' => 'publish',
                'posts_per_page' => 5
            ));
            
            foreach ($recent_posts as $post) {
                $database_status['sample_posts'][] = array(
                    'id' => $post->ID,
                    'type' => $post->post_type,
                    'title' => $post->post_title,
                    'date' => $post->post_date,
                    'meta_count' => count(get_post_meta($post->ID))
                );
            }

            return new WP_REST_Response(array(
                'success' => true,
                'database_status' => $database_status
            ), 200);

        } catch (Exception $e) {
            error_log("Error in get_database_status: " . $e->getMessage());
            return new WP_Error('database_status_error', 'Error fetching database status', array('status' => 500));
        }
    }

    // Endpoint do testowania konkretnych zapytań
    public function test_specific_query($request) {
        try {
            $post_type = $request->get_param('post_type') ?: 'kalendarz';
            $meta_key = $request->get_param('meta_key') ?: 'sama-data';
            $taxonomy = $request->get_param('taxonomy') ?: 'kategoria-wydarzenia';

            // Sprawdź czy typ postu istnieje
            if (!post_type_exists($post_type)) {
                return new WP_Error('invalid_post_type', "Typ postu '$post_type' nie istnieje", array('status' => 400));
            }

            // Sprawdź czy taksonomia istnieje
            if (!taxonomy_exists($taxonomy)) {
                return new WP_Error('invalid_taxonomy', "Taksonomia '$taxonomy' nie istnieje", array('status' => 400));
            }

            // Pobierz termy taksonomii
            $terms = get_terms(array('taxonomy' => $taxonomy, 'hide_empty' => false));
            if (is_wp_error($terms)) {
                return new WP_Error('terms_error', 'Błąd podczas pobierania terminów', array('status' => 500));
            }

            $args = array(
                'post_type' => $post_type,
                'post_status' => 'publish',
                'posts_per_page' => 10,
                'meta_key' => $meta_key,
                'orderby' => 'meta_value_num',
                'order' => 'ASC'
            );

            // Dodaj tax_query tylko jeśli są termy
            if (!empty($terms)) {
                $term_ids = wp_list_pluck($terms, 'term_id');
                $args['tax_query'] = array(
                    array(
                        'taxonomy' => $taxonomy,
                        'field' => 'term_id',
                        'terms' => $term_ids,
                        'operator' => 'IN'
                    )
                );
            }

            // Debug: Log query arguments
            error_log("test_specific_query - Args: " . print_r($args, true));

            $query = new WP_Query($args);

            // Debug: Log query results
            error_log("test_specific_query - Found posts: " . $query->found_posts);
            error_log("test_specific_query - Query SQL: " . $query->request);

            $results = array();
            if ($query->have_posts()) {
                while ($query->have_posts()) {
                    $query->the_post();
                    $post_id = get_the_ID();
                    
                    $results[] = array(
                        'id' => $post_id,
                        'title' => get_the_title(),
                        'post_type' => get_post_type($post_id),
                        'meta_data' => get_post_meta($post_id, $meta_key, true),
                        'all_meta' => get_post_meta($post_id),
                        'categories' => wp_get_post_terms($post_id, 'kategoria-wydarzenia', array('fields' => 'names')),
                        'objects' => wp_get_post_terms($post_id, 'obiekt', array('fields' => 'names')),
                        'permalink' => get_permalink($post_id)
                    );
                }
            }

            wp_reset_postdata();

            return new WP_REST_Response(array(
                'success' => true,
                'query_args' => $args,
                'query_sql' => $query->request,
                'found_posts' => $query->found_posts,
                'max_pages' => $query->max_num_pages,
                'results' => $results,
                'terms_count' => count($terms),
                'sample_terms' => array_slice(array_map(function($term) {
                    return array('id' => $term->term_id, 'name' => $term->name, 'slug' => $term->slug);
                }, $terms), 0, 5)
            ), 200);

        } catch (Exception $e) {
            error_log("Error in test_specific_query: " . $e->getMessage());
            return new WP_Error('query_error', 'Error testing query: ' . $e->getMessage(), array('status' => 500));
        }
    }
} 