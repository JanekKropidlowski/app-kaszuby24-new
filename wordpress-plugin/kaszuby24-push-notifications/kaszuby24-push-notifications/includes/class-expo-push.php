<?php

if (!defined('ABSPATH')) {
    exit;
}

class Kaszuby24_Expo_Push {
    
    private $api_url = 'https://exp.host/--/api/v2/push/send';
    private $database;
    
    public function __construct() {
        $this->database = new Kaszuby24_Push_Database();
    }
    
    /**
     * Normalize text for push notifications.
     * - Decode HTML entities
     * - Strip tags
     * - Normalize whitespace
     * - Trim
     */
    private function normalize_text($text) {
        if (!is_string($text)) {
            return $text;
        }
        // Decode common HTML entities without affecting quotes in a harmful way
        $decoded = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, get_bloginfo('charset') ?: 'UTF-8');
        // Remove HTML tags
        $stripped = wp_strip_all_tags($decoded, true);
        // Replace multiple whitespace (including newlines) with single spaces
        $normalized = preg_replace('/\s+/u', ' ', $stripped);
        // Trim
        return trim($normalized);
    }
    
    public function send_notifications($tokens, $title, $body, $article_id = null, $image = '', $icon = '', $options = array()) {
        // Ensure tokens is an array and not false/null
        if (empty($tokens) || !is_array($tokens)) {
            error_log('Invalid tokens provided to send_notifications: ' . var_export($tokens, true));
            return array('sent' => 0, 'failed' => 0, 'receipt_ids' => array());
        }
        
        $batch_size = get_option('kaszuby24_push_batch_size', 100);
        $sent_count = 0;
        $failed_count = 0;
        $receipt_ids = array();
        
        // Process tokens in batches
        $token_batches = array_chunk($tokens, $batch_size);
        
        foreach ($token_batches as $batch_index => $batch) {
            $result = $this->send_batch($batch, $title, $body, $article_id, $image, $icon, $options);
            $sent_count += $result['sent'];
            $failed_count += $result['failed'];
            
            // Collect receipt IDs for tracking
            if (!empty($result['receipt_ids'])) {
                $receipt_ids = array_merge($receipt_ids, $result['receipt_ids']);
            }
            
            // Rate limiting - wait between batches (but not after the last batch)
            $rate_limit = get_option('kaszuby24_push_rate_limit', 600);
            if ($batch_index < count($token_batches) - 1 && $rate_limit > 0) {
                sleep($rate_limit / 1000); // Convert to seconds
            }
            
            // Log batch progress for large sends
            if (count($token_batches) > 5) {
                error_log("Push notification batch progress: " . ($batch_index + 1) . "/" . count($token_batches) . " completed");
            }
        }
        
        // Schedule receipt checking for successful sends
        if (!empty($receipt_ids)) {
            $this->schedule_receipt_check($receipt_ids, $article_id);
        }
        
        return array(
            'sent' => $sent_count, 
            'failed' => $failed_count,
            'receipt_ids' => $receipt_ids,
            'batches_processed' => count($token_batches)
        );
    }
    
    private function send_batch($tokens, $title, $body, $article_id = null, $image = '', $icon = '', $options = array()) {
        // Ensure tokens is an array and not false/null
        if (empty($tokens) || !is_array($tokens)) {
            error_log('Invalid tokens provided to send_batch: ' . var_export($tokens, true));
            return array('sent' => 0, 'failed' => 0, 'receipt_ids' => array());
        }
        
        $messages = array();
        
        // Extract options with defaults
        $priority = isset($options['priority']) ? $options['priority'] : 'high';
        $ttl = isset($options['ttl']) ? $options['ttl'] : 2419200; // 4 weeks default
        $subtitle = isset($options['subtitle']) ? $options['subtitle'] : '';
        $category_id = isset($options['category_id']) ? $options['category_id'] : null;
        $scheduled_time = isset($options['scheduled_time']) ? $options['scheduled_time'] : null;
		
		// Normalize textual fields to handle quotes, entities and whitespace
		$normalized_title = $this->normalize_text($title);
		$normalized_body = $this->normalize_text($body);
		$normalized_subtitle = $this->normalize_text($subtitle);
        
        foreach ($tokens as $token_data) {
            // Ensure token_data is valid
            if (empty($token_data) || !is_object($token_data) || empty($token_data->push_token)) {
                error_log('Invalid token data: ' . var_export($token_data, true));
                continue;
            }
            
            $message = array(
                'to' => $token_data->push_token,
				'title' => $normalized_title,
				'body' => $normalized_body,
                'sound' => 'default',
                'badge' => 1,
                'priority' => $priority,
                'channelId' => 'default',
                'ttl' => $ttl
            );
            
            // Add subtitle if provided
			if (!empty($normalized_subtitle)) {
				$message['subtitle'] = $normalized_subtitle;
            }
            
            // Add image if provided (with size optimization)
            if (!empty($image)) {
                $message['image'] = $this->optimize_image_url($image);
            }
            
            // Add icon if provided
            if (!empty($icon)) {
                $message['icon'] = $icon;
            }
            
            // Enhanced data payload
            $data = array();
            if ($article_id) {
                $data['articleId'] = $article_id;
                $data['type'] = 'article';
                $data['url'] = get_permalink($article_id);
                
                // Add article metadata
                $post = get_post($article_id);
                if ($post) {
                    $data['slug'] = $post->post_name;
                    $data['published'] = $post->post_date;
                    
                    // Add routing information based on post type
                    if ($post->post_type === 'post') {
                        $data['route'] = '/(tabs)'; // Main tab for articles
                    } elseif ($post->post_type === 'wydarzenie') {
                        $data['route'] = '/(tabs)/kalendarz'; // Calendar tab for events
                    } elseif ($post->post_type === 'nekrolog') {
                        $data['route'] = '/(tabs)'; // Main tab for obituaries
                    }
                }
            }
            
            if ($category_id) {
                $data['categoryId'] = $category_id;
            }
            
            // Add tracking data
            $data['notification_id'] = uniqid('notif_', true);
            $data['sent_time'] = current_time('mysql');
            
            $message['data'] = $data;
            
            // Platform-specific settings with rich notifications
            if ($token_data->platform === 'android') {
                $android_config = array(
                    'channelId' => 'default',
                    'priority' => $priority,
                    'sound' => 'default',
                    'vibrationPattern' => array(0, 250, 250, 250),
                    'lightColor' => '#FF231F7C'
                );
                
                // Rich notification for Android
                if (!empty($image)) {
                    $android_config['imageUrl'] = $this->optimize_image_url($image);
                    $android_config['largeIcon'] = $icon ?: $this->get_default_large_icon();
                    $android_config['style'] = 'bigPicture';
                }
                
                // Add action buttons for articles
                if ($article_id) {
                    $android_config['actions'] = array(
                        array(
                            'title' => 'Czytaj',
                            'pressAction' => array('id' => 'read_article')
                        ),
                        array(
                            'title' => 'Zapisz',
                            'pressAction' => array('id' => 'save_article')
                        )
                    );
                }
                
                $message['android'] = $android_config;
                
            } elseif ($token_data->platform === 'ios') {
                $ios_config = array(
                    'sound' => 'default',
                    'badge' => 1,
                    'mutableContent' => true // Enable rich notifications
                );
                
                // iOS rich notifications
                if (!empty($image)) {
                    $ios_config['attachments'] = array(
                        array(
                            'url' => $this->optimize_image_url($image),
                            'type' => 'image'
                        )
                    );
                }
                
                // Add category for action buttons
                if ($article_id) {
                    $ios_config['categoryId'] = 'ARTICLE_CATEGORY';
                }
                
                $message['ios'] = $ios_config;
            }
            
            $messages[] = $message;
        }
        
        // Ensure we have messages to send
        if (empty($messages)) {
            error_log('No valid messages to send in batch');
            return array('sent' => 0, 'failed' => 0, 'receipt_ids' => array());
        }
        
        // Send to Expo Push API
        $response = $this->call_expo_api($messages);
        
        return $this->process_response($response, $tokens, $title, $body, $article_id);
    }
    
    private function call_expo_api($messages) {
        // Ensure messages is not empty and is an array
        if (empty($messages) || !is_array($messages)) {
            error_log('Invalid messages provided to call_expo_api: ' . var_export($messages, true));
            return false;
        }
        
        // Encode messages to JSON
        $json_body = wp_json_encode($messages, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        
        // Ensure JSON encoding was successful
        if ($json_body === false) {
            error_log('Failed to encode messages to JSON: ' . json_last_error_msg());
            return false;
        }
        
		$args = array(
            'method' => 'POST',
            'headers' => array(
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'Accept-Encoding' => 'gzip, deflate',
                'User-Agent' => 'Kaszuby24-WordPress-Plugin/1.0'
            ),
			'body' => $json_body,
            'timeout' => 30,
            'sslverify' => true
        );
        
        $response = wp_remote_post($this->api_url, $args);
        
        if (is_wp_error($response)) {
            error_log('Expo Push API error: ' . $response->get_error_message());
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('Expo Push API response JSON error: ' . json_last_error_msg());
            return false;
        }
        
        return $data;
    }
    
    private function process_response($response, $tokens, $title, $body, $article_id) {
        $sent_count = 0;
        $failed_count = 0;
        $receipt_ids = array();
        
        if (!$response || !isset($response['data'])) {
            // If API call failed, mark all as failed
            foreach ($tokens as $token_data) {
                $this->database->log_notification(
                    $token_data->push_token,
                    $article_id,
                    $title,
                    $body,
                    'failed',
                    'API call failed',
                    null
                );
                $failed_count++;
            }
            return array('sent' => $sent_count, 'failed' => $failed_count, 'receipt_ids' => $receipt_ids);
        }
        
        $results = $response['data'];
        
        foreach ($results as $index => $result) {
            $token_data = $tokens[$index];
            
            if (isset($result['status']) && $result['status'] === 'ok') {
                // Success
                $this->database->log_notification(
                    $token_data->push_token,
                    $article_id,
                    $title,
                    $body,
                    'sent',
                    $result,
                    isset($result['id']) ? $result['id'] : null
                );
                $sent_count++;
                
                // Collect receipt ID for tracking
                if (isset($result['id'])) {
                    $receipt_ids[] = $result['id'];
                }
                
                // Update token activity
                $this->database->update_token_activity($token_data->push_token);
                
            } else {
                // Failed
                $error_message = isset($result['message']) ? $result['message'] : 'Unknown error';
                $this->database->log_notification(
                    $token_data->push_token,
                    $article_id,
                    $title,
                    $body,
                    'failed',
                    $result,
                    isset($result['id']) ? $result['id'] : null
                );
                $failed_count++;
                
                // Handle specific error cases
                if (isset($result['details']) && isset($result['details']['error'])) {
                    $error_code = $result['details']['error'];
                    
                    // Deactivate invalid tokens
                    if (in_array($error_code, array('DeviceNotRegistered', 'InvalidCredentials', 'MessageTooBig'))) {
                        $this->database->deactivate_token($token_data->push_token);
                        error_log('Deactivated invalid push token: ' . $token_data->push_token . ' (Reason: ' . $error_code . ')');
                    }
                    
                    // Handle rate limiting
                    if ($error_code === 'MessageRateExceeded') {
                        error_log('Rate limit exceeded for token: ' . $token_data->push_token);
                        // Could implement exponential backoff here
                    }
                }
            }
        }
        
        return array('sent' => $sent_count, 'failed' => $failed_count, 'receipt_ids' => $receipt_ids);
    }
    
    public function send_single_notification($token, $title, $body, $article_id = null, $image = '', $icon = '') {
        $token_data = (object) array('push_token' => $token, 'platform' => 'unknown');
        return $this->send_batch(array($token_data), $title, $body, $article_id, $image, $icon);
    }

    /**
     * Send a batch of notifications given a list of token strings and a generic notification payload
     * This is a convenience wrapper used by events notifications module.
     */
    public function send_batch_notifications($token_strings, $notification_data) {
        if (empty($token_strings)) {
            return array('sent' => 0, 'failed' => 0, 'receipt_ids' => array());
        }

        // Normalize tokens into the expected object shape
        $tokens = array_map(function($t) {
            return (object) array('push_token' => $t, 'platform' => 'unknown');
        }, $token_strings);

        $title = isset($notification_data['title']) ? $notification_data['title'] : '';
        $body = isset($notification_data['body']) ? $notification_data['body'] : '';
        $image = isset($notification_data['image']) ? $notification_data['image'] : '';
        $icon = isset($notification_data['icon']) ? $notification_data['icon'] : '';
        $options = isset($notification_data['options']) ? $notification_data['options'] : array();

        // Try to infer related content id (articleId) if present
        $article_id = null;
        if (isset($notification_data['article_id'])) {
            $article_id = intval($notification_data['article_id']);
        } elseif (isset($notification_data['data']) && isset($notification_data['data']['articleId'])) {
            $article_id = intval($notification_data['data']['articleId']);
        }

        return $this->send_notifications($tokens, $title, $body, $article_id, $image, $icon, $options);
    }
    
    public function test_connection() {
        $test_message = array(
            'to' => 'ExponentPushToken[test]',
            'title' => 'Test',
            'body' => 'Test message'
        );
        
        $response = $this->call_expo_api(array($test_message));
        
        return $response !== false;
    }
    
    public function get_push_receipt($receipt_id) {
        $receipt_url = 'https://exp.host/--/api/v2/push/getReceipts';
        
        // Encode receipt data to JSON
        $json_body = wp_json_encode(array('ids' => array($receipt_id)), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        
        // Ensure JSON encoding was successful
        if ($json_body === false) {
            error_log('Failed to encode receipt data to JSON: ' . json_last_error_msg());
            return false;
        }
        
        $args = array(
            'method' => 'POST',
            'headers' => array(
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ),
			'body' => $json_body,
            'timeout' => 15
        );
        
        $response = wp_remote_post($receipt_url, $args);
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }
    
    /**
     * Optimize image URL for push notifications
     */
    private function optimize_image_url($image_url) {
        if (empty($image_url)) {
            return $image_url;
        }
        
        // If it's a WordPress attachment, get optimized size
        if (strpos($image_url, wp_get_upload_dir()['baseurl']) !== false) {
            $attachment_id = attachment_url_to_postid($image_url);
            if ($attachment_id) {
                $optimized = wp_get_attachment_image_url($attachment_id, 'medium_large');
                return $optimized ?: $image_url;
            }
        }
        
        return $image_url;
    }
    
    /**
     * Get default large icon for Android notifications
     */
    private function get_default_large_icon() {
        $icon_url = get_site_icon_url(192);
        if (empty($icon_url)) {
            $icon_url = get_template_directory_uri() . '/assets/images/app-icon-large.png';
        }
        return $icon_url;
    }
    
    /**
     * Schedule receipt checking for delivered notifications
     */
    private function schedule_receipt_check($receipt_ids, $article_id = null) {
        if (empty($receipt_ids)) {
            return;
        }
        
        // Schedule check after 15 minutes
        wp_schedule_single_event(
            time() + (15 * 60),
            'kaszuby24_check_push_receipts',
            array($receipt_ids, $article_id)
        );
    }
    
    /**
     * Check push notification receipts and update delivery status
     */
    public function check_push_receipts($receipt_ids, $article_id = null) {
        if (empty($receipt_ids)) {
            return;
        }
        
        $receipt_url = 'https://exp.host/--/api/v2/push/getReceipts';
        
        // Encode receipt data to JSON
        $json_body = wp_json_encode(array('ids' => $receipt_ids), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        
        // Ensure JSON encoding was successful
        if ($json_body === false) {
            error_log('Failed to encode receipt data to JSON: ' . json_last_error_msg());
            return;
        }
        
		$args = array(
            'method' => 'POST',
            'headers' => array(
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ),
			'body' => $json_body,
            'timeout' => 30
        );
        
        $response = wp_remote_post($receipt_url, $args);
        
        if (is_wp_error($response)) {
            error_log('Failed to check push receipts: ' . $response->get_error_message());
            return;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || !isset($data['data'])) {
            error_log('Invalid receipt response format');
            return;
        }
        
        $delivered_count = 0;
        $failed_count = 0;
        
        foreach ($data['data'] as $receipt_id => $receipt) {
            if (isset($receipt['status'])) {
                if ($receipt['status'] === 'ok') {
                    $delivered_count++;
                } else {
                    $failed_count++;
                    error_log('Push notification delivery failed for receipt ' . $receipt_id . ': ' . json_encode($receipt));
                }
            }
        }
        
        // Log delivery statistics
        if ($article_id) {
            update_post_meta($article_id, '_push_delivery_stats', array(
                'delivered' => $delivered_count,
                'failed_delivery' => $failed_count,
                'checked_at' => current_time('mysql')
            ));
        }
        
        error_log("Push delivery check completed: {$delivered_count} delivered, {$failed_count} failed");
    }
    
    /**
     * Create notification templates for different content types
     */
    public function get_notification_template($type, $post) {
        $templates = array(
            'breaking_news' => array(
                'title' => '🚨 PILNE: ' . $post->post_title,
                'body' => 'Najważniejsze wiadomości z Kaszub. Sprawdź szczegóły.',
                'priority' => 'high',
                'subtitle' => 'Wiadomości'
            ),
            'weather_alert' => array(
                'title' => '⚠️ Ostrzeżenie pogodowe',
                'body' => wp_trim_words(strip_tags($post->post_content), 20),
                'priority' => 'high',
                'subtitle' => 'Pogoda'
            ),
            'event' => array(
                'title' => '📅 ' . $post->post_title,
                'body' => 'Nowe wydarzenie w Twojej okolicy',
                'priority' => 'normal',
                'subtitle' => 'Wydarzenia'
            ),
            'article' => array(
                'title' => $post->post_title,
                'body' => wp_trim_words(strip_tags($post->post_content), 25),
                'priority' => 'normal',
                'subtitle' => get_the_category_list(', ', '', $post->ID)
            )
        );
        
        return isset($templates[$type]) ? $templates[$type] : $templates['article'];
    }
    
    /**
     * Send scheduled notification
     */
    public function send_scheduled_notification($notification_data) {
        $tokens = $this->database->get_tokens_by_preferences(
            $notification_data['regions'] ?? array(),
            $notification_data['categories'] ?? array()
        );
        
        if (empty($tokens)) {
            error_log('No tokens found for scheduled notification');
            return;
        }
        
        $result = $this->send_notifications(
            $tokens,
            $notification_data['title'],
            $notification_data['body'],
            $notification_data['article_id'] ?? null,
            $notification_data['image'] ?? '',
            $notification_data['icon'] ?? '',
            $notification_data['options'] ?? array()
        );
        
        error_log('Scheduled notification sent: ' . json_encode($result));
        
        return $result;
    }
} 