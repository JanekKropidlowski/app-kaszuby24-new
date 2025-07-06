<?php

if (!defined('ABSPATH')) {
    exit;
}

class Kaszuby24_Push_Hooks {
    
    private $database;
    private $expo_push;
    
    public function __construct() {
        $this->database = new Kaszuby24_Push_Database();
        $this->expo_push = new Kaszuby24_Expo_Push();
        
        // Hook into post publication
        add_action('publish_post', array($this, 'on_post_published'), 10, 2);
        add_action('publish_nekrolog', array($this, 'on_nekrolog_published'), 10, 2);
        
        // Hook into post updates (for republishing)
        add_action('post_updated', array($this, 'on_post_updated'), 10, 3);
        
        // Add meta box for manual push notifications
        add_action('add_meta_boxes', array($this, 'add_push_meta_box'));
        add_action('save_post', array($this, 'save_push_meta_box'));
    }
    
    public function on_post_published($post_id, $post) {
        // Check if auto-send is enabled
        if (!get_option('kaszuby24_push_auto_send', 1)) {
            return;
        }
        
        // Skip if this is a revision or auto-draft
        if (wp_is_post_revision($post_id) || $post->post_status !== 'publish') {
            return;
        }
        
        // Skip if notification was already sent
        if (get_post_meta($post_id, '_push_notification_sent', true)) {
            return;
        }
        
        // Skip sponsored content (category 554)
        $categories = wp_get_post_categories($post_id);
        if (in_array(554, $categories)) {
            return;
        }
        
        $this->send_notification_for_post($post_id, $post);
    }
    
    public function on_nekrolog_published($post_id, $post) {
        // Check if auto-send is enabled
        if (!get_option('kaszuby24_push_auto_send', 1)) {
            return;
        }
        
        // Skip if this is a revision or auto-draft
        if (wp_is_post_revision($post_id) || $post->post_status !== 'publish') {
            return;
        }
        
        // Skip if notification was already sent
        if (get_post_meta($post_id, '_push_notification_sent', true)) {
            return;
        }
        
        $this->send_nekrolog_notification($post_id, $post);
    }
    
    public function on_post_updated($post_id, $post_after, $post_before) {
        // Only send notification if post was just published (changed from draft to publish)
        if ($post_before->post_status !== 'publish' && $post_after->post_status === 'publish') {
            $this->on_post_published($post_id, $post_after);
        }
    }
    
    private function send_notification_for_post($post_id, $post) {
        // Get post categories
        $categories = wp_get_post_categories($post_id);
        
        // Get post regions (if using custom taxonomy)
        $regions = array();
        $region_terms = wp_get_post_terms($post_id, 'region');
        if (!is_wp_error($region_terms)) {
            $regions = array_map(function($term) {
                return $term->term_id;
            }, $region_terms);
        }
        
        // Create notification title and body
        $title = $this->create_notification_title($post);
        $body = $this->create_notification_body($post);
        
        // Get target tokens
        $tokens = $this->database->get_tokens_by_preferences($regions, $categories);
        
        if (empty($tokens)) {
            error_log("No tokens found for post {$post_id}");
            return;
        }
        
        // Send notifications
        $result = $this->expo_push->send_notifications($tokens, $title, $body, $post_id);
        
        // Mark as sent
        update_post_meta($post_id, '_push_notification_sent', time());
        update_post_meta($post_id, '_push_notification_result', $result);
        
        error_log("Push notification sent for post {$post_id}: {$result['sent']} sent, {$result['failed']} failed");
    }
    
    private function send_nekrolog_notification($post_id, $post) {
        // Nekrologi are usually sent to all users or specific regions
        $title = "Nowy nekrolog - " . get_the_title($post_id);
        $body = "Dodano nowy nekrolog na portalu Kaszuby24";
        
        // Get all active tokens (nekrologi are important for everyone)
        $tokens = $this->database->get_tokens_by_preferences(array(), array());
        
        if (empty($tokens)) {
            error_log("No tokens found for nekrolog {$post_id}");
            return;
        }
        
        // Send notifications
        $result = $this->expo_push->send_notifications($tokens, $title, $body, $post_id);
        
        // Mark as sent
        update_post_meta($post_id, '_push_notification_sent', time());
        update_post_meta($post_id, '_push_notification_result', $result);
        
        error_log("Push notification sent for nekrolog {$post_id}: {$result['sent']} sent, {$result['failed']} failed");
    }
    
    private function create_notification_title($post) {
        $title = get_the_title($post->ID);
        
        // Truncate if too long
        if (strlen($title) > 50) {
            $title = substr($title, 0, 47) . '...';
        }
        
        return $title;
    }
    
    private function create_notification_body($post) {
        // Get excerpt or create one from content
        $body = get_the_excerpt($post->ID);
        
        if (empty($body)) {
            $body = wp_strip_all_tags($post->post_content);
        }
        
        // Truncate if too long
        if (strlen($body) > 100) {
            $body = substr($body, 0, 97) . '...';
        }
        
        return $body;
    }
    
    public function add_push_meta_box() {
        add_meta_box(
            'kaszuby24_push_notification',
            'Push Notifications',
            array($this, 'push_meta_box_callback'),
            array('post', 'nekrolog'),
            'side',
            'default'
        );
    }
    
    public function push_meta_box_callback($post) {
        wp_nonce_field('kaszuby24_push_meta_box', 'kaszuby24_push_meta_box_nonce');
        
        $sent_time = get_post_meta($post->ID, '_push_notification_sent', true);
        $result = get_post_meta($post->ID, '_push_notification_result', true);
        $manual_send = get_post_meta($post->ID, '_push_manual_send', true);
        
        ?>
        <div>
            <?php if ($sent_time): ?>
                <p><strong>Status:</strong> Powiadomienie wysłane</p>
                <p><strong>Data:</strong> <?php echo date('Y-m-d H:i:s', $sent_time); ?></p>
                
                <?php if ($result): ?>
                    <p><strong>Wysłane:</strong> <?php echo esc_html($result['sent']); ?></p>
                    <p><strong>Niepowodzenia:</strong> <?php echo esc_html($result['failed']); ?></p>
                <?php endif; ?>
                
                <label>
                    <input type="checkbox" name="push_resend" value="1" />
                    Wyślij ponownie
                </label>
            <?php else: ?>
                <p><strong>Status:</strong> Powiadomienie nie zostało wysłane</p>
                
                <label>
                    <input type="checkbox" name="push_manual_send" value="1" <?php checked($manual_send, 1); ?> />
                    Wyślij powiadomienie przy publikacji
                </label>
            <?php endif; ?>
            
            <hr />
            
            <h4>Niestandardowe powiadomienie</h4>
            <p>
                <label>Tytuł:</label><br />
                <input type="text" name="push_custom_title" style="width: 100%;" 
                       placeholder="Zostaw puste aby użyć tytułu artykułu" />
            </p>
            <p>
                <label>Treść:</label><br />
                <textarea name="push_custom_body" style="width: 100%; height: 60px;" 
                          placeholder="Zostaw puste aby użyć automatycznej treści"></textarea>
            </p>
        </div>
        <?php
    }
    
    public function save_push_meta_box($post_id) {
        // Verify nonce
        if (!isset($_POST['kaszuby24_push_meta_box_nonce']) || 
            !wp_verify_nonce($_POST['kaszuby24_push_meta_box_nonce'], 'kaszuby24_push_meta_box')) {
            return;
        }
        
        // Check permissions
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Save manual send preference
        if (isset($_POST['push_manual_send'])) {
            update_post_meta($post_id, '_push_manual_send', 1);
        } else {
            delete_post_meta($post_id, '_push_manual_send');
        }
        
        // Handle resend
        if (isset($_POST['push_resend']) && $_POST['push_resend'] === '1') {
            delete_post_meta($post_id, '_push_notification_sent');
            delete_post_meta($post_id, '_push_notification_result');
            
            // Send notification immediately if post is published
            $post = get_post($post_id);
            if ($post && $post->post_status === 'publish') {
                $this->send_notification_for_post($post_id, $post);
            }
        }
        
        // Handle custom notification
        if (!empty($_POST['push_custom_title']) || !empty($_POST['push_custom_body'])) {
            $custom_title = sanitize_text_field($_POST['push_custom_title']);
            $custom_body = sanitize_textarea_field($_POST['push_custom_body']);
            
            if (empty($custom_title)) {
                $custom_title = get_the_title($post_id);
            }
            
            if (empty($custom_body)) {
                $post = get_post($post_id);
                $custom_body = $this->create_notification_body($post);
            }
            
            // Get post categories and regions
            $categories = wp_get_post_categories($post_id);
            $regions = array();
            $region_terms = wp_get_post_terms($post_id, 'region');
            if (!is_wp_error($region_terms)) {
                $regions = array_map(function($term) {
                    return $term->term_id;
                }, $region_terms);
            }
            
            // Send custom notification
            $tokens = $this->database->get_tokens_by_preferences($regions, $categories);
            if (!empty($tokens)) {
                $result = $this->expo_push->send_notifications($tokens, $custom_title, $custom_body, $post_id);
                
                // Update meta
                update_post_meta($post_id, '_push_notification_sent', time());
                update_post_meta($post_id, '_push_notification_result', $result);
                
                // Clear custom fields
                $_POST['push_custom_title'] = '';
                $_POST['push_custom_body'] = '';
            }
        }
    }
} 