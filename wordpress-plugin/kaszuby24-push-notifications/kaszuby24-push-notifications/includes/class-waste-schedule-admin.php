<?php
/**
 * Waste Schedule Admin Panel
 * 
 * Provides WordPress admin interface for managing waste collection schedules
 */

class Kaszuby24_Waste_Schedule_Admin {
    
    private $waste_schedule;
    
    public function __construct($waste_schedule) {
        $this->waste_schedule = $waste_schedule;
        
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Register AJAX handlers
        add_action('wp_ajax_waste_add_custom_date', array($this, 'ajax_add_custom_date'));
        add_action('wp_ajax_waste_delete_custom_date', array($this, 'ajax_delete_custom_date'));
        add_action('wp_ajax_waste_get_schedule', array($this, 'ajax_get_schedule'));
        add_action('wp_ajax_waste_update_date', array($this, 'ajax_update_date'));
        add_action('wp_ajax_waste_delete_date_type', array($this, 'ajax_delete_date_type'));
        
        // Enqueue admin scripts and styles
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
    }
    
    /**
     * Add admin menu page
     */
    public function add_admin_menu() {
        add_menu_page(
            'Harmonogram Odpadów',
            'Harmonogram Odpadów',
            'manage_options',
            'waste-schedule-manager',
            array($this, 'render_admin_page'),
            'dashicons-calendar-alt',
            30
        );
    }
    
    /**
     * Enqueue admin CSS and JS
     */
    public function enqueue_admin_assets($hook) {
        if ($hook !== 'toplevel_page_waste-schedule-manager') {
            return;
        }
        
        wp_enqueue_style(
            'waste-admin-css',
            plugin_dir_url(dirname(__FILE__)) . 'admin/css/waste-admin.css',
            array(),
            '1.0.1'
        );
        
        wp_enqueue_script(
            'waste-admin-js',
            plugin_dir_url(dirname(__FILE__)) . 'admin/js/waste-admin.js',
            array('jquery'),
            '1.0.1',
            true
        );
        
        wp_localize_script('waste-admin-js', 'wasteAdmin', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('waste_admin_nonce')
        ));
    }
    
    /**
     * Render admin page
     */
    public function render_admin_page() {
        include plugin_dir_path(dirname(__FILE__)) . 'admin/waste-schedule-admin.php';
    }
    
    /**
     * AJAX: Get schedule for a city
     */
    public function ajax_get_schedule() {
        check_ajax_referer('waste_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Brak uprawnień');
        }
        
        $city = sanitize_text_field($_POST['city']);
        $schedule = $this->waste_schedule->get_schedule($city);
        
        if ($schedule) {
            wp_send_json_success($schedule);
        } else {
            wp_send_json_error('Nie znaleziono harmonogramu dla tego miasta');
        }
    }
    
    /**
     * AJAX: Update existing date (add type to existing date from main schedule)
     */
    public function ajax_update_date() {
        check_ajax_referer('waste_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Brak uprawnień');
        }
        
        $city = sanitize_text_field($_POST['city']);
        $date = sanitize_text_field($_POST['date']);
        $type = sanitize_text_field($_POST['type']);
        $region = sanitize_text_field($_POST['region']);
        $action_type = sanitize_text_field($_POST['action_type']); // 'add' or 'remove'
        
        $manual_file = WP_CONTENT_DIR . '/uploads/waste-schedules/manual-waste-data-' . $city . '.json';
        
        if (!file_exists(dirname($manual_file))) {
            mkdir(dirname($manual_file), 0755, true);
        }
        
        $manual_data = array();
        if (file_exists($manual_file)) {
            $manual_data = json_decode(file_get_contents($manual_file), true);
            if (!is_array($manual_data)) {
                $manual_data = array();
            }
        }
        
        if (!isset($manual_data[$region])) {
            $manual_data[$region] = array();
        }
        
        // Find existing entry for this date
        $entry_found = false;
        foreach ($manual_data[$region] as &$entry) {
            if ($entry['date'] === $date) {
                if ($action_type === 'add') {
                    if (!in_array($type, $entry['types'])) {
                        $entry['types'][] = $type;
                    }
                } else if ($action_type === 'remove') {
                    $entry['types'] = array_values(array_diff($entry['types'], array($type)));
                    
                    // If no types left, mark for deletion
                    if (empty($entry['types'])) {
                        $entry['_delete'] = true;
                    }
                }
                $entry_found = true;
                break;
            }
        }
        
        // If not found and adding, create new entry
        if (!$entry_found && $action_type === 'add') {
            $manual_data[$region][] = array(
                'date' => $date,
                'types' => array($type)
            );
        }
        
        // Remove entries marked for deletion
        foreach ($manual_data as $reg => &$entries) {
            $entries = array_values(array_filter($entries, function($e) {
                return !isset($e['_delete']);
            }));
            
            // Sort by date
            usort($entries, function($a, $b) {
                return strcmp($a['date'], $b['date']);
            });
        }
        
        file_put_contents($manual_file, json_encode($manual_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        delete_transient('waste_schedule_' . $city);
        
        wp_send_json_success(array(
            'message' => $action_type === 'add' ? 'Dodano typ odpadu' : 'Usunięto typ odpadu',
            'data' => $manual_data
        ));
    }
    
    /**
     * AJAX: Delete specific type from a date
     */
    public function ajax_delete_date_type() {
        check_ajax_referer('waste_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Brak uprawnień');
        }
        
        $city = sanitize_text_field($_POST['city']);
        $date = sanitize_text_field($_POST['date']);
        $region = sanitize_text_field($_POST['region']);
        $type = sanitize_text_field($_POST['type']);
        
        // Use update_date with 'remove' action
        $_POST['action_type'] = 'remove';
        $this->ajax_update_date();
    }
    
    /**
     * AJAX: Add custom date
     */
    public function ajax_add_custom_date() {
        check_ajax_referer('waste_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Brak uprawnień');
        }
        
        $city = sanitize_text_field($_POST['city']);
        $date = sanitize_text_field($_POST['date']);
        $type = sanitize_text_field($_POST['type']);
        $region = sanitize_text_field($_POST['region']);
        
        // Use update_date with 'add' action
        $_POST['action_type'] = 'add';
        $this->ajax_update_date();
    }
    
    /**
     * AJAX: Delete custom date
     */
    public function ajax_delete_custom_date() {
        check_ajax_referer('waste_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Brak uprawnień');
        }
        
        $city = sanitize_text_field($_POST['city']);
        $date = sanitize_text_field($_POST['date']);
        $region = sanitize_text_field($_POST['region']);
        $type = sanitize_text_field($_POST['type']);
        
        $manual_file = WP_CONTENT_DIR . '/uploads/waste-schedules/manual-waste-data-' . $city . '.json';
        
        if (!file_exists($manual_file)) {
            wp_send_json_error('Plik nie istnieje');
        }
        
        $manual_data = json_decode(file_get_contents($manual_file), true);
        
        if (isset($manual_data[$region])) {
            foreach ($manual_data[$region] as $idx => &$entry) {
                if ($entry['date'] === $date) {
                    // Remove specific type
                    $entry['types'] = array_values(array_diff($entry['types'], array($type)));
                    
                    // If no types left, remove entire entry
                    if (empty($entry['types'])) {
                        unset($manual_data[$region][$idx]);
                    }
                    break;
                }
            }
            
            // Reindex array
            $manual_data[$region] = array_values($manual_data[$region]);
        }
        
        file_put_contents($manual_file, json_encode($manual_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        // Clear cache
        delete_transient('waste_schedule_' . $city);
        
        wp_send_json_success(array(
            'message' => 'Usunięto datę',
            'data' => $manual_data
        ));
    }
}
