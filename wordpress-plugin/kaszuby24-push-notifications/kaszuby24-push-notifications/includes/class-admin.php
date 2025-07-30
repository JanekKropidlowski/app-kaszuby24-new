<?php

if (!defined('ABSPATH')) {
    exit;
}

class Kaszuby24_Push_Admin {
    
    private $database;
    private $expo_push;
    
    public function __construct() {
        $this->database = new Kaszuby24_Push_Database();
        $this->expo_push = new Kaszuby24_Expo_Push();
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('wp_ajax_send_test_notification', array($this, 'send_test_notification'));
        add_action('wp_ajax_send_manual_notification', array($this, 'send_manual_notification'));
    }
    
    public function add_admin_menu() {
        add_menu_page(
            'Push Notifications',
            'Push Notifications',
            'manage_options',
            'kaszuby24-push',
            array($this, 'admin_page'),
            'dashicons-smartphone',
            30
        );
        
        add_submenu_page(
            'kaszuby24-push',
            'Statystyki',
            'Statystyki',
            'manage_options',
            'kaszuby24-push-stats',
            array($this, 'stats_page')
        );
        
        add_submenu_page(
            'kaszuby24-push',
            'Ustawienia',
            'Ustawienia',
            'manage_options',
            'kaszuby24-push-settings',
            array($this, 'settings_page')
        );
    }
    
    public function register_settings() {
        register_setting('kaszuby24_push_settings', 'kaszuby24_push_auto_send');
        register_setting('kaszuby24_push_settings', 'kaszuby24_push_batch_size');
        register_setting('kaszuby24_push_settings', 'kaszuby24_push_rate_limit');
        register_setting('kaszuby24_push_settings', 'kaszuby24_push_enabled_categories');
        register_setting('kaszuby24_push_settings', 'kaszuby24_push_notification_template');
    }
    
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'kaszuby24-push') !== false) {
            wp_enqueue_script('jquery');
            wp_enqueue_script(
                'kaszuby24-push-admin',
                KASZUBY24_PUSH_PLUGIN_URL . 'assets/admin.js',
                array('jquery'),
                KASZUBY24_PUSH_VERSION,
                true
            );
            
            wp_localize_script('kaszuby24-push-admin', 'kaszuby24_push_ajax', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('kaszuby24_push_nonce')
            ));
        }
    }
    
    public function admin_page() {
        $stats = $this->database->get_stats();
        
        ?>
        <div class="wrap">
            <h1>Push Notifications - Kaszuby24</h1>
            
            <div class="notice notice-info">
                <p><strong>Aktywne tokeny:</strong> <?php echo esc_html($stats['total_tokens']); ?></p>
                <p><strong>Wysłane dzisiaj:</strong> <?php echo esc_html($stats['sent_today']); ?></p>
                <p><strong>Niepowodzenia dzisiaj:</strong> <?php echo esc_html($stats['failed_today']); ?></p>
            </div>
            
            <div class="card">
                <h2>Wyślij powiadomienie testowe</h2>
                <form id="test-notification-form">
                    <table class="form-table">
                        <tr>
                            <th scope="row">Token testowy</th>
                            <td>
                                <input type="text" id="test-token" class="regular-text" 
                                       placeholder="ExponentPushToken[...]" />
                                <p class="description">Wprowadź token z aplikacji mobilnej</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Tytuł</th>
                            <td>
                                <input type="text" id="test-title" class="regular-text" 
                                       value="Test z Kaszuby24" />
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Treść</th>
                            <td>
                                <textarea id="test-body" class="large-text" rows="3">To jest testowe powiadomienie z panelu administracyjnego.</textarea>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <button type="submit" class="button button-primary">Wyślij test</button>
                    </p>
                </form>
                
                <div id="test-result" style="display: none;"></div>
            </div>
            
            <div class="card">
                <h2>Wyślij powiadomienie do wszystkich</h2>
                <form id="manual-notification-form">
                    <table class="form-table">
                        <tr>
                            <th scope="row">Tytuł</th>
                            <td>
                                <input type="text" id="manual-title" class="regular-text" 
                                       placeholder="Tytuł powiadomienia" />
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Treść</th>
                            <td>
                                <textarea id="manual-body" class="large-text" rows="3" 
                                          placeholder="Treść powiadomienia"></textarea>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Regiony</th>
                            <td>
                                <select id="manual-regions" multiple="multiple" style="width: 300px; height: 100px;">
                                    <option value="2583">Wejherowo</option>
                                    <option value="7">Trójmiasto</option>
                                    <option value="2128">Puck</option>
                                    <option value="76797">Reda</option>
                                    <option value="65546">Kościerzyna</option>
                                    <option value="65545">Kartuzy</option>
                                    <option value="65558">Lębork</option>
                                </select>
                                <p class="description">Pozostaw puste aby wysłać do wszystkich</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Kategorie</th>
                            <td>
                                <select id="manual-categories" multiple="multiple" style="width: 300px; height: 100px;">
                                    <option value="17">Bezpieczeństwo</option>
                                    <option value="11">Biznes</option>
                                    <option value="16">Kultura i Rozrywka</option>
                                    <option value="22">Religia</option>
                                    <option value="24">Sport i Rekreacja</option>
                                    <option value="2246">Zdrowie</option>
                                    <option value="3">Wiadomości</option>
                                </select>
                                <p class="description">Pozostaw puste aby wysłać do wszystkich</p>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <button type="submit" class="button button-primary">Wyślij powiadomienie</button>
                    </p>
                </form>
                
                <div id="manual-result" style="display: none;"></div>
            </div>
        </div>
        <?php
    }
    
    public function stats_page() {
        global $wpdb;
        
        $stats = $this->database->get_stats();
        $tokens_table = $wpdb->prefix . 'kaszuby24_push_tokens';
        $logs_table = $wpdb->prefix . 'kaszuby24_push_logs';
        
        // Get recent logs
        $recent_logs = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $logs_table ORDER BY created_at DESC LIMIT %d",
            50
        ));
        
        // Get tokens by location
        $tokens_by_location = $wpdb->get_results(
            "SELECT location, COUNT(*) as count FROM $tokens_table WHERE is_active = 1 GROUP BY location ORDER BY count DESC"
        );
        
        ?>
        <div class="wrap">
            <h1>Statystyki Push Notifications</h1>
            
            <div class="card">
                <h2>Podsumowanie</h2>
                <table class="widefat">
                    <tr>
                        <td><strong>Łączna liczba aktywnych tokenów:</strong></td>
                        <td><?php echo esc_html($stats['total_tokens']); ?></td>
                    </tr>
                    <tr>
                        <td><strong>Wysłane dzisiaj:</strong></td>
                        <td><?php echo esc_html($stats['sent_today']); ?></td>
                    </tr>
                    <tr>
                        <td><strong>Niepowodzenia dzisiaj:</strong></td>
                        <td><?php echo esc_html($stats['failed_today']); ?></td>
                    </tr>
                </table>
            </div>
            
            <div class="card">
                <h2>Tokeny według platform</h2>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th>Platforma</th>
                            <th>Liczba tokenów</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($stats['by_platform'] as $platform): ?>
                        <tr>
                            <td><?php echo esc_html(ucfirst($platform->platform)); ?></td>
                            <td><?php echo esc_html($platform->count); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
            <div class="card">
                <h2>Tokeny według lokalizacji</h2>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th>Lokalizacja</th>
                            <th>Liczba tokenów</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($tokens_by_location as $location): ?>
                        <tr>
                            <td><?php echo esc_html($location->location ?: 'Nie określono'); ?></td>
                            <td><?php echo esc_html($location->count); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
            <div class="card">
                <h2>Ostatnie powiadomienia</h2>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tytuł</th>
                            <th>Status</th>
                            <th>Token</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($recent_logs as $log): ?>
                        <tr>
                            <td><?php echo esc_html(date('Y-m-d H:i:s', strtotime($log->created_at))); ?></td>
                            <td><?php echo esc_html($log->title); ?></td>
                            <td>
                                <span class="status-<?php echo esc_attr($log->status); ?>">
                                    <?php echo esc_html($log->status); ?>
                                </span>
                            </td>
                            <td><?php echo esc_html(substr($log->push_token, 0, 20) . '...'); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <style>
            .status-sent { color: green; font-weight: bold; }
            .status-failed { color: red; font-weight: bold; }
        </style>
        <?php
    }
    
    public function settings_page() {
        if (isset($_POST['submit'])) {
            update_option('kaszuby24_push_auto_send', isset($_POST['kaszuby24_push_auto_send']));
            update_option('kaszuby24_push_batch_size', intval($_POST['kaszuby24_push_batch_size']));
            update_option('kaszuby24_push_rate_limit', intval($_POST['kaszuby24_push_rate_limit']));
            
            echo '<div class="notice notice-success"><p>Ustawienia zapisane!</p></div>';
        }
        
        $auto_send = get_option('kaszuby24_push_auto_send', 1);
        $batch_size = get_option('kaszuby24_push_batch_size', 100);
        $rate_limit = get_option('kaszuby24_push_rate_limit', 600);
        
        ?>
        <div class="wrap">
            <h1>Ustawienia Push Notifications</h1>
            
            <form method="post" action="">
                <table class="form-table">
                    <tr>
                        <th scope="row">Automatyczne wysyłanie</th>
                        <td>
                            <label>
                                <input type="checkbox" name="kaszuby24_push_auto_send" value="1" 
                                       <?php checked($auto_send, 1); ?> />
                                Wysyłaj powiadomienia automatycznie przy publikacji artykułów
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Rozmiar paczki</th>
                        <td>
                            <input type="number" name="kaszuby24_push_batch_size" 
                                   value="<?php echo esc_attr($batch_size); ?>" min="1" max="1000" />
                            <p class="description">Liczba powiadomień wysyłanych jednocześnie</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Limit czasu (ms)</th>
                        <td>
                            <input type="number" name="kaszuby24_push_rate_limit" 
                                   value="<?php echo esc_attr($rate_limit); ?>" min="0" max="10000" />
                            <p class="description">Opóźnienie między paczkami powiadomień (w milisekundach)</p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
    
    public function send_test_notification() {
        check_ajax_referer('kaszuby24_push_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Brak uprawnień');
        }
        
        $token = sanitize_text_field($_POST['token']);
        $title = sanitize_text_field($_POST['title']);
        $body = sanitize_textarea_field($_POST['body']);
        
        $result = $this->expo_push->send_single_notification($token, $title, $body);
        
        wp_send_json_success(array(
            'message' => 'Powiadomienie testowe wysłane',
            'result' => $result
        ));
    }
    
    public function send_manual_notification() {
        check_ajax_referer('kaszuby24_push_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Brak uprawnień');
        }
        
        $title = sanitize_text_field($_POST['title']);
        $body = sanitize_textarea_field($_POST['body']);
        $regions = array_map('intval', $_POST['regions'] ?? array());
        $categories = array_map('intval', $_POST['categories'] ?? array());
        
        $tokens = $this->database->get_tokens_by_preferences($regions, $categories);
        
        if (empty($tokens)) {
            wp_send_json_error('Nie znaleziono tokenów dla wybranych kryteriów');
        }
        
        $result = $this->expo_push->send_notifications($tokens, $title, $body);
        
        wp_send_json_success(array(
            'message' => 'Powiadomienia wysłane',
            'sent' => $result['sent'],
            'failed' => $result['failed'],
            'total' => count($tokens)
        ));
    }
} 