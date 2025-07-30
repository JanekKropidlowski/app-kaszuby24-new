<?php

if (!defined('ABSPATH')) {
    exit;
}

class Kaszuby24_Push_Database {
    
    public function __construct() {
        // Database operations
    }
    
    public function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Table for storing push tokens
        $tokens_table = $wpdb->prefix . 'kaszuby24_push_tokens';
        $tokens_sql = "CREATE TABLE $tokens_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            push_token varchar(255) NOT NULL,
            platform varchar(20) NOT NULL,
            location varchar(100) DEFAULT NULL,
            location_id int(11) DEFAULT NULL,
            preferences longtext DEFAULT NULL,
            is_active tinyint(1) DEFAULT 1,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            last_active datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY push_token (push_token),
            KEY location_id (location_id),
            KEY is_active (is_active)
        ) $charset_collate;";
        
        // Table for notification logs
        $logs_table = $wpdb->prefix . 'kaszuby24_push_logs';
        $logs_sql = "CREATE TABLE $logs_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            push_token varchar(255) NOT NULL,
            article_id int(11) DEFAULT NULL,
            title varchar(255) NOT NULL,
            body text NOT NULL,
            status varchar(20) NOT NULL,
            response_data longtext DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY push_token (push_token),
            KEY article_id (article_id),
            KEY status (status),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($tokens_sql);
        dbDelta($logs_sql);
    }
    
    public function register_token($data) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'kaszuby24_push_tokens';
        
        $preferences = isset($data['preferences']) ? json_encode($data['preferences']) : null;
        
        // Check if token already exists
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM $table_name WHERE push_token = %s",
            $data['pushToken']
        ));
        
        if ($existing) {
            // Update existing token
            $result = $wpdb->update(
                $table_name,
                array(
                    'platform' => $data['platform'],
                    'location' => $data['location'],
                    'location_id' => $data['locationId'],
                    'preferences' => $preferences,
                    'is_active' => 1,
                    'last_active' => current_time('mysql')
                ),
                array('push_token' => $data['pushToken']),
                array('%s', '%s', '%d', '%s', '%d', '%s'),
                array('%s')
            );
        } else {
            // Insert new token
            $result = $wpdb->insert(
                $table_name,
                array(
                    'push_token' => $data['pushToken'],
                    'platform' => $data['platform'],
                    'location' => $data['location'],
                    'location_id' => $data['locationId'],
                    'preferences' => $preferences,
                    'is_active' => 1,
                    'created_at' => current_time('mysql'),
                    'last_active' => current_time('mysql')
                ),
                array('%s', '%s', '%s', '%d', '%s', '%d', '%s', '%s')
            );
        }
        
        return $result !== false;
    }
    
    public function get_tokens_for_article($article_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'kaszuby24_push_tokens';
        
        // Get article categories and terms
        $categories = wp_get_post_categories($article_id);
        $terms = wp_get_post_terms($article_id, 'category');
        
        $sql = "SELECT * FROM $table_name WHERE is_active = 1";
        $params = array();
        
        // If article has categories, filter by preferences
        if (!empty($categories) || !empty($terms)) {
            $sql .= " AND (preferences IS NULL OR preferences = '' OR preferences = '[]'";
            
            // Add category filtering
            if (!empty($categories)) {
                foreach ($categories as $cat_id) {
                    $sql .= " OR preferences LIKE %s";
                    $params[] = '%"categories":%[' . $cat_id . ',%';
                    $sql .= " OR preferences LIKE %s";
                    $params[] = '%"categories":%[' . $cat_id . ']%';
                }
            }
            
            $sql .= ")";
        }
        
        if (!empty($params)) {
            return $wpdb->get_results($wpdb->prepare($sql, $params));
        } else {
            return $wpdb->get_results($sql);
        }
    }
    
    public function get_tokens_by_preferences($regions = array(), $categories = array()) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'kaszuby24_push_tokens';
        
        $sql = "SELECT * FROM $table_name WHERE is_active = 1";
        $params = array();
        
        if (!empty($regions) || !empty($categories)) {
            $conditions = array();
            
            // Users with no preferences (get all notifications)
            $conditions[] = "preferences IS NULL OR preferences = '' OR preferences = '[]'";
            
            // Users with matching region preferences
            if (!empty($regions)) {
                foreach ($regions as $region_id) {
                    $conditions[] = "preferences LIKE %s";
                    $params[] = '%"regions":%[' . $region_id . ',%';
                    $conditions[] = "preferences LIKE %s";
                    $params[] = '%"regions":%[' . $region_id . ']%';
                }
            }
            
            // Users with matching category preferences
            if (!empty($categories)) {
                foreach ($categories as $cat_id) {
                    $conditions[] = "preferences LIKE %s";
                    $params[] = '%"categories":%[' . $cat_id . ',%';
                    $conditions[] = "preferences LIKE %s";
                    $params[] = '%"categories":%[' . $cat_id . ']%';
                }
            }
            
            $sql .= " AND (" . implode(' OR ', $conditions) . ")";
        }
        
        if (!empty($params)) {
            return $wpdb->get_results($wpdb->prepare($sql, $params));
        } else {
            return $wpdb->get_results($sql);
        }
    }
    
    public function log_notification($token, $article_id, $title, $body, $status, $response = null) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'kaszuby24_push_logs';
        
        return $wpdb->insert(
            $table_name,
            array(
                'push_token' => $token,
                'article_id' => $article_id,
                'title' => $title,
                'body' => $body,
                'status' => $status,
                'response_data' => $response ? json_encode($response) : null,
                'created_at' => current_time('mysql')
            ),
            array('%s', '%d', '%s', '%s', '%s', '%s', '%s')
        );
    }
    
    public function get_stats() {
        global $wpdb;
        
        $tokens_table = $wpdb->prefix . 'kaszuby24_push_tokens';
        $logs_table = $wpdb->prefix . 'kaszuby24_push_logs';
        
        $stats = array();
        
        // Total active tokens
        $stats['total_tokens'] = $wpdb->get_var("SELECT COUNT(*) FROM $tokens_table WHERE is_active = 1");
        
        // Tokens by platform
        $stats['by_platform'] = $wpdb->get_results("SELECT platform, COUNT(*) as count FROM $tokens_table WHERE is_active = 1 GROUP BY platform");
        
        // Notifications sent today
        $stats['sent_today'] = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $logs_table WHERE DATE(created_at) = %s AND status = 'sent'",
            current_time('Y-m-d')
        ));
        
        // Failed notifications today
        $stats['failed_today'] = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $logs_table WHERE DATE(created_at) = %s AND status = 'failed'",
            current_time('Y-m-d')
        ));
        
        return $stats;
    }
    
    public function deactivate_token($token) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'kaszuby24_push_tokens';
        
        return $wpdb->update(
            $table_name,
            array('is_active' => 0),
            array('push_token' => $token),
            array('%d'),
            array('%s')
        );
    }
} 