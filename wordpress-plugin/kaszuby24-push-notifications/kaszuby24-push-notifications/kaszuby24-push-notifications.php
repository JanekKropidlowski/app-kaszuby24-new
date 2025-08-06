<?php
/**
 * Plugin Name: Kaszuby24 Push Notifications
 * Plugin URI: https://kaszuby24.pl
 * Description: Plugin do obsługi push notifications dla aplikacji mobilnej Kaszuby24
 * Version: 1.0.0
 * Author: Kaszuby24
 * Text Domain: kaszuby24-push
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('KASZUBY24_PUSH_VERSION', '1.0.0');
define('KASZUBY24_PUSH_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('KASZUBY24_PUSH_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include required files
require_once KASZUBY24_PUSH_PLUGIN_DIR . 'includes/class-database.php';
require_once KASZUBY24_PUSH_PLUGIN_DIR . 'includes/class-api.php';
require_once KASZUBY24_PUSH_PLUGIN_DIR . 'includes/class-expo-push.php';
require_once KASZUBY24_PUSH_PLUGIN_DIR . 'includes/class-admin.php';
require_once KASZUBY24_PUSH_PLUGIN_DIR . 'includes/class-hooks.php';
require_once KASZUBY24_PUSH_PLUGIN_DIR . 'includes/class-events-notifications.php';

class Kaszuby24_Push_Notifications {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('plugins_loaded', array($this, 'init'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function init() {
        // Initialize database
        new Kaszuby24_Push_Database();
        
        // Initialize API endpoints
        new Kaszuby24_Push_API();
        
        // Initialize admin interface
        if (is_admin()) {
            new Kaszuby24_Push_Admin();
        }
        
        // Initialize hooks for automatic notifications
        new Kaszuby24_Push_Hooks();
        
        // Load text domain
        load_plugin_textdomain('kaszuby24-push', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    public function activate() {
        // Create database tables
        $database = new Kaszuby24_Push_Database();
        $database->create_tables();
        
        // Set default options
        add_option('kaszuby24_push_auto_send', 1);
        add_option('kaszuby24_push_batch_size', 100);
        add_option('kaszuby24_push_rate_limit', 600); // 10 minutes
        add_option('kaszuby24_push_rich_notifications', 1);
        add_option('kaszuby24_push_analytics_enabled', 1);
        
        // Schedule cleanup cron job
        if (!wp_next_scheduled('kaszuby24_push_cleanup')) {
            wp_schedule_event(time(), 'daily', 'kaszuby24_push_cleanup');
        }
        
        // Schedule processing of scheduled notifications (every 5 minutes)
        if (!wp_next_scheduled('kaszuby24_process_scheduled_notifications')) {
            wp_schedule_event(time(), 'kaszuby24_every_5_minutes', 'kaszuby24_process_scheduled_notifications');
        }
    }
    
    public function deactivate() {
        // Clear scheduled hooks
        wp_clear_scheduled_hook('kaszuby24_push_cleanup');
        wp_clear_scheduled_hook('kaszuby24_process_scheduled_notifications');
        wp_clear_scheduled_hook('kaszuby24_check_push_receipts');
    }
}

// Initialize the plugin
Kaszuby24_Push_Notifications::get_instance();

// Cleanup cron job
add_action('kaszuby24_push_cleanup', function() {
    global $wpdb;
    
    $table_name = $wpdb->prefix . 'kaszuby24_push_tokens';
    
    // Remove tokens older than 90 days without activity
    $wpdb->query($wpdb->prepare(
        "DELETE FROM $table_name WHERE last_active < %s",
        date('Y-m-d H:i:s', strtotime('-90 days'))
    ));
    
    // Remove failed notification logs older than 30 days
    $logs_table = $wpdb->prefix . 'kaszuby24_push_logs';
    $wpdb->query($wpdb->prepare(
        "DELETE FROM $logs_table WHERE created_at < %s",
        date('Y-m-d H:i:s', strtotime('-30 days'))
    ));
    
    // Remove old scheduled notifications
    $scheduled_table = $wpdb->prefix . 'kaszuby24_push_scheduled';
    $wpdb->query($wpdb->prepare(
        "DELETE FROM $scheduled_table WHERE status = 'sent' AND sent_at < %s",
        date('Y-m-d H:i:s', strtotime('-7 days'))
    ));
    
    // Remove old analytics data (keep 6 months)
    $analytics_table = $wpdb->prefix . 'kaszuby24_push_analytics';
    $wpdb->query($wpdb->prepare(
        "DELETE FROM $analytics_table WHERE created_at < %s",
        date('Y-m-d H:i:s', strtotime('-6 months'))
    ));
});

// Scheduled notifications cron job
add_action('kaszuby24_process_scheduled_notifications', function() {
    $database = new Kaszuby24_Push_Database();
    $expo_push = new Kaszuby24_Expo_Push();
    
    $pending_notifications = $database->get_pending_scheduled_notifications();
    
    foreach ($pending_notifications as $notification) {
        $notification_data = array(
            'title' => $notification->title,
            'body' => $notification->body,
            'article_id' => $notification->article_id,
            'image' => $notification->image,
            'icon' => $notification->icon,
            'regions' => json_decode($notification->regions, true) ?: array(),
            'categories' => json_decode($notification->categories, true) ?: array(),
            'options' => json_decode($notification->options, true) ?: array()
        );
        
        $result = $expo_push->send_scheduled_notification($notification_data);
        
        if ($result) {
            $database->mark_scheduled_notification_sent($notification->id);
            error_log("Scheduled notification {$notification->id} sent successfully");
        } else {
            error_log("Failed to send scheduled notification {$notification->id}");
        }
    }
});

// Receipt checking cron job
add_action('kaszuby24_check_push_receipts', function($receipt_ids, $article_id = null) {
    $expo_push = new Kaszuby24_Expo_Push();
    $expo_push->check_push_receipts($receipt_ids, $article_id);
});

// Add custom cron schedule
add_filter('cron_schedules', function($schedules) {
    $schedules['kaszuby24_every_5_minutes'] = array(
        'interval' => 300, // 5 minutes in seconds
        'display' => __('Every 5 Minutes', 'kaszuby24-push')
    );
    return $schedules;
}); 