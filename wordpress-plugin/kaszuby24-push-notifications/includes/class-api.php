<?php

if (!defined('ABSPATH')) {
    exit;
}

class Kaszuby24_Push_API {
    
    private $database;
    
    public function __construct() {
        $this->database = new Kaszuby24_Push_Database();
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
            
            // Get target tokens based on preferences
            $tokens = $this->database->get_tokens_by_preferences($regions, $categories);
            
            if (empty($tokens)) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => 'No tokens found for specified criteria'
                ), 200);
            }
            
            // Send notifications via Expo Push service
            $expo_push = new Kaszuby24_Expo_Push();
            $results = $expo_push->send_notifications($tokens, $title, $body, $article_id);
            
            return new WP_REST_Response(array(
                'success' => true,
                'message' => 'Notifications sent',
                'sent_count' => $results['sent'],
                'failed_count' => $results['failed'],
                'total_tokens' => count($tokens)
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
} 