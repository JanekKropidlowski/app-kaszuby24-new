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
    
    public function send_notifications($tokens, $title, $body, $article_id = null, $image = '', $icon = '') {
        if (empty($tokens)) {
            return array('sent' => 0, 'failed' => 0);
        }
        
        $batch_size = get_option('kaszuby24_push_batch_size', 100);
        $sent_count = 0;
        $failed_count = 0;
        
        // Process tokens in batches
        $token_batches = array_chunk($tokens, $batch_size);
        
        foreach ($token_batches as $batch) {
            $result = $this->send_batch($batch, $title, $body, $article_id, $image, $icon);
            $sent_count += $result['sent'];
            $failed_count += $result['failed'];
            
            // Rate limiting - wait between batches
            $rate_limit = get_option('kaszuby24_push_rate_limit', 600);
            if (count($token_batches) > 1 && $rate_limit > 0) {
                sleep($rate_limit / 1000); // Convert to seconds
            }
        }
        
        return array('sent' => $sent_count, 'failed' => $failed_count);
    }
    
    private function send_batch($tokens, $title, $body, $article_id = null, $image = '', $icon = '') {
        $messages = array();
        
        foreach ($tokens as $token_data) {
            $message = array(
                'to' => $token_data->push_token,
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'badge' => 1,
                'priority' => 'high',
                'channelId' => 'default'
            );
            
            // Add image if provided
            if (!empty($image)) {
                $message['image'] = $image;
            }
            
            // Add icon if provided
            if (!empty($icon)) {
                $message['icon'] = $icon;
            }
            
            // Add data payload
            if ($article_id) {
                $message['data'] = array(
                    'articleId' => $article_id,
                    'type' => 'article',
                    'url' => get_permalink($article_id)
                );
            }
            
            // Platform-specific settings
            if ($token_data->platform === 'android') {
                $message['android'] = array(
                    'channelId' => 'default',
                    'priority' => 'high',
                    'sound' => 'default'
                );
                
                // Add image for Android if provided
                if (!empty($image)) {
                    $message['android']['imageUrl'] = $image;
                }
                
                // Add icon for Android if provided
                if (!empty($icon)) {
                    $message['android']['icon'] = $icon;
                }
            } elseif ($token_data->platform === 'ios') {
                $message['ios'] = array(
                    'sound' => 'default',
                    'badge' => 1
                );
                
                // iOS doesn't support image in push notifications, but we can add it to data
                if (!empty($image)) {
                    $message['data']['image'] = $image;
                }
            }
            
            $messages[] = $message;
        }
        
        // Send to Expo Push API
        $response = $this->call_expo_api($messages);
        
        return $this->process_response($response, $tokens, $title, $body, $article_id);
    }
    
    private function call_expo_api($messages) {
        $args = array(
            'method' => 'POST',
            'headers' => array(
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'Accept-Encoding' => 'gzip, deflate',
                'User-Agent' => 'Kaszuby24-WordPress-Plugin/1.0'
            ),
            'body' => json_encode($messages),
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
        
        if (!$response || !isset($response['data'])) {
            // If API call failed, mark all as failed
            foreach ($tokens as $token_data) {
                $this->database->log_notification(
                    $token_data->push_token,
                    $article_id,
                    $title,
                    $body,
                    'failed',
                    'API call failed'
                );
                $failed_count++;
            }
            return array('sent' => $sent_count, 'failed' => $failed_count);
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
                    $result
                );
                $sent_count++;
            } else {
                // Failed
                $error_message = isset($result['message']) ? $result['message'] : 'Unknown error';
                $this->database->log_notification(
                    $token_data->push_token,
                    $article_id,
                    $title,
                    $body,
                    'failed',
                    $result
                );
                $failed_count++;
                
                // Handle specific error cases
                if (isset($result['details']) && isset($result['details']['error'])) {
                    $error_code = $result['details']['error'];
                    
                    // Deactivate invalid tokens
                    if (in_array($error_code, array('DeviceNotRegistered', 'InvalidCredentials'))) {
                        $this->database->deactivate_token($token_data->push_token);
                        error_log('Deactivated invalid push token: ' . $token_data->push_token);
                    }
                }
            }
        }
        
        return array('sent' => $sent_count, 'failed' => $failed_count);
    }
    
    public function send_single_notification($token, $title, $body, $article_id = null, $image = '', $icon = '') {
        $token_data = (object) array('push_token' => $token, 'platform' => 'unknown');
        return $this->send_batch(array($token_data), $title, $body, $article_id, $image, $icon);
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
        
        $args = array(
            'method' => 'POST',
            'headers' => array(
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ),
            'body' => json_encode(array('ids' => array($receipt_id))),
            'timeout' => 15
        );
        
        $response = wp_remote_post($receipt_url, $args);
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }
} 