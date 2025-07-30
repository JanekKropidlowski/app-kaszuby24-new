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
        
        register_rest_route('kaszuby24/v1', '/events', array(
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
                    'type' => 'string'
                ),
                'category' => array(
                    'required' => false,
                    'type' => 'integer'
                ),
                'search' => array(
                    'required' => false,
                    'type' => 'string'
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
        
        // Test endpoint
        register_rest_route('kaszuby24/v1', '/test', array(
            'methods' => 'GET',
            'callback' => array($this, 'test_endpoint'),
            'permission_callback' => '__return_true'
        ));
    }
    
    public function test_endpoint($request) {
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'API is working',
            'timestamp' => current_time('mysql')
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
            $city = $request->get_param('city');
            $category = $request->get_param('category');
            $search = $request->get_param('search');
            
            // Debug: Log the parameters
            error_log("Events request - page: $page, per_page: $per_page, filter: $filter, city: $city, category: $category, search: $search");
            
            // Base query arguments
            $args = array(
                'post_type' => 'kalendarz',
                'post_status' => 'publish',
                'posts_per_page' => $per_page,
                'paged' => $page,
                'orderby' => 'meta_value_num',
                'meta_key' => 'sama-data',
                'order' => 'ASC'
            );
            
            // Add meta query for date filtering
            $meta_query = array();
            
            // Add default filter to only show events from today onwards
            $today = current_time('timestamp');
            $meta_query[] = array(
                'key' => 'sama-data',
                'value' => $today,
                'compare' => '>=',
                'type' => 'NUMERIC'
            );
            
            if ($filter) {
                switch ($filter) {
                    case 'today':
                        $start_of_day = strtotime('today', $today);
                        $end_of_day = strtotime('tomorrow', $today) - 1;
                        
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
                        $saturday = strtotime("+$days_until_saturday days", $today);
                        $sunday = strtotime("+$days_until_sunday days", $today);
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
                        $start_of_week = strtotime("-" . ($week_day_of_week - 1) . " days", $today);
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
            
            // Add city filter
            if ($city) {
                $meta_query[] = array(
                    'key' => 'miasto',
                    'value' => $city,
                    'compare' => '='
                );
            }
            
            // Add category filter
            if ($category) {
                $args['tax_query'] = array(
                    array(
                        'taxonomy' => 'kategoria-wydarzenia',
                        'field' => 'term_id',
                        'terms' => $category
                    )
                );
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
} 