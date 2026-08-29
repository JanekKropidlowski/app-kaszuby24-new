<?php
/**
 * Plugin Name: PKS Gdynia API
 * Plugin URI: https://kaszuby24.pl
 * Description: REST API dla rozkładów jazdy PKS Gdynia. Zapewnia dane o trasach, przystankach i rozkładach jazdy.
 * Version: 1.0.0
 * Author: Kaszuby24
 * License: GPL v2 or later
 * Text Domain: pks-api
 */

// Zapobiegaj bezpośredniemu dostępowi
if (!defined('ABSPATH')) {
    exit;
}

// Główne klasy pluginu
require_once plugin_dir_path(__FILE__) . 'includes/class-pks-api.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-pks-scraper.php';

/**
 * Główna klasa pluginu PKS API
 */
class PKS_API_Plugin {

    /**
     * Instancja singleton
     */
    private static $instance = null;

    /**
     * Pobierz instancję singleton
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Konstruktor
     */
    private function __construct() {
        $this->init_hooks();
    }

    /**
     * Inicjalizuj hooki
     */
    private function init_hooks() {
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));

        // Hook do aktywacji/deaktywacji
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }

    /**
     * Ładuj domenę tłumaczeń
     */
    public function load_textdomain() {
        load_plugin_textdomain(
            'pks-api',
            false,
            dirname(plugin_basename(__FILE__)) . '/languages/'
        );
    }

    /**
     * Rejestruj REST API routes
     */
    public function register_rest_routes() {
        $api = new PKS_API();

        // Endpoint dla tras PKS
        register_rest_route('pks-api/v1', '/routes', array(
            'methods' => 'GET',
            'callback' => array($api, 'get_routes'),
            'permission_callback' => '__return_true',
            'args' => array(
                'force_refresh' => array(
                    'required' => false,
                    'type' => 'boolean',
                    'default' => false,
                ),
            ),
        ));

        // Endpoint dla przystanków PKS
        register_rest_route('pks-api/v1', '/stops', array(
            'methods' => 'GET',
            'callback' => array($api, 'get_stops'),
            'permission_callback' => '__return_true',
            'args' => array(
                'search' => array(
                    'required' => false,
                    'type' => 'string',
                ),
                'limit' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 50,
                ),
            ),
        ));

        // Endpoint dla rozkładu konkretnej trasy
        register_rest_route('pks-api/v1', '/schedule/(?P<route_id>[a-zA-Z0-9_-]+)', array(
            'methods' => 'GET',
            'callback' => array($api, 'get_schedule'),
            'permission_callback' => '__return_true',
            'args' => array(
                'route_id' => array(
                    'required' => true,
                    'type' => 'string',
                ),
            ),
        ));

        // USUNIĘTO: Endpoint dla wyszukiwania połączeń - tylko PKS Gdynia

        // Endpoint statusu API
        register_rest_route('pks-api/v1', '/status', array(
            'methods' => 'GET',
            'callback' => array($api, 'get_status'),
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * Dodaj menu administratora
     */
    public function add_admin_menu() {
        add_menu_page(
            'PKS API',
            'PKS API',
            'manage_options',
            'pks-api',
            array($this, 'admin_page'),
            'dashicons-bus',
            30
        );

        add_submenu_page(
            'pks-api',
            'Ustawienia PKS API',
            'Ustawienia',
            'manage_options',
            'pks-api-settings',
            array($this, 'settings_page')
        );
    }

    /**
     * Główna strona admina
     */
    public function admin_page() {
        $api = new PKS_API();
        $stats = $api->get_stats();

        ?>
        <div class="wrap">
            <h1>🚌 PKS Gdynia API - TYLKO PKS GDYNIA</h1>
            <p style="color: #666; font-style: italic;">Plugin obsługuje wyłącznie rozkłady jazdy PKS Gdynia. Brak integracji z innymi przewoźnikami.</p>

            <div class="pks-api-dashboard">
                <div class="pks-stats-grid">
                    <div class="pks-stat-card">
                        <h3>📋 Trasy</h3>
                        <div class="stat-number"><?php echo $stats['routes_count']; ?></div>
                        <p>Zaindeksowane trasy autobusowe</p>
                    </div>

                    <div class="pks-stat-card">
                        <h3>📍 Przystanki</h3>
                        <div class="stat-number"><?php echo $stats['stops_count']; ?></div>
                        <p>Przystanki z współrzędnymi GPS</p>
                    </div>

                    <div class="pks-stat-card">
                        <h3>🔄 Aktualizacja</h3>
                        <div class="stat-date"><?php echo $stats['last_update']; ?></div>
                        <p>Ostatnia aktualizacja danych</p>
                    </div>

                    <div class="pks-stat-card">
                        <h3>⚡ Status</h3>
                        <div class="stat-status <?php echo $stats['cache_status']; ?>">
                            <?php echo $stats['cache_status'] === 'valid' ? '✅ Aktualne' : '⚠️ Przestarzałe'; ?>
                        </div>
                        <p>Status cache</p>
                    </div>
                </div>

                <div class="pks-actions">
                    <h3>Akcje</h3>
                    <form method="post" style="display: inline;">
                        <?php wp_nonce_field('pks_api_refresh', 'pks_api_nonce'); ?>
                        <input type="hidden" name="pks_action" value="refresh_data">
                        <button type="submit" class="button button-primary">
                            🔄 Odśwież Dane PKS
                        </button>
                    </form>

                    <a href="<?php echo admin_url('admin.php?page=pks-api-settings'); ?>" class="button">
                        ⚙️ Ustawienia
                    </a>

                    <a href="<?php echo rest_url('pks-api/v1/status'); ?>" target="_blank" class="button">
                        📊 Status API
                    </a>
                </div>

                <div class="pks-recent-routes">
                    <h3>📝 Najnowsze Trasy</h3>
                    <?php
                    $recent_routes = array_slice($stats['recent_routes'], 0, 10);
                    if (!empty($recent_routes)) {
                        echo '<ul>';
                        foreach ($recent_routes as $route) {
                            echo '<li><strong>' . esc_html($route['line']) . '</strong> - ' . esc_html($route['route']) . '</li>';
                        }
                        echo '</ul>';
                    } else {
                        echo '<p>Brak danych tras. Odśwież dane PKS.</p>';
                    }
                    ?>
                </div>
            </div>
        </div>

        <style>
            .pks-api-dashboard { margin-top: 20px; }
            .pks-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .pks-stat-card {
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .pks-stat-card h3 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 14px;
                text-transform: uppercase;
                font-weight: 600;
            }
            .stat-number {
                font-size: 36px;
                font-weight: bold;
                color: #EC4899;
                margin: 10px 0;
            }
            .stat-date, .stat-status {
                font-size: 14px;
                color: #666;
                margin: 10px 0;
            }
            .stat-status.valid { color: #10B981; }
            .stat-status.expired { color: #F59E0B; }
            .pks-actions {
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .pks-actions h3 {
                margin-top: 0;
                margin-bottom: 15px;
            }
            .pks-actions .button {
                margin-right: 10px;
                margin-bottom: 10px;
            }
            .pks-recent-routes {
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
            }
            .pks-recent-routes ul {
                margin: 0;
                padding-left: 20px;
            }
            .pks-recent-routes li {
                margin-bottom: 5px;
                color: #666;
            }
        </style>
        <?php
    }

    /**
     * Strona ustawień
     */
    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>Ustawienia PKS API</h1>

            <form method="post" action="options.php">
                <?php
                settings_fields('pks_api_settings');
                do_settings_sections('pks_api_settings');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    /**
     * Dodaj skrypty admina
     */
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'pks-api') === false) {
            return;
        }

        wp_enqueue_style('pks-api-admin', plugin_dir_url(__FILE__) . 'assets/css/admin.css', array(), '1.0.0');
        wp_enqueue_script('pks-api-admin', plugin_dir_url(__FILE__) . 'assets/js/admin.js', array('jquery'), '1.0.0', true);
    }

    /**
     * Aktywacja pluginu
     */
    public function activate() {
        // Utwórz tabele cache jeśli potrzebne
        $this->create_cache_table();

        // Dodaj domyślne opcje
        add_option('pks_api_cache_expiry', 24 * 60 * 60); // 24 godziny
        add_option('pks_api_user_agent', 'PKS-API-Plugin/1.0');
        add_option('pks_api_timeout', 30);

        // Zaplanuj cron job do odświeżania danych
        if (!wp_next_scheduled('pks_api_refresh_data')) {
            wp_schedule_event(time(), 'daily', 'pks_api_refresh_data');
        }
    }

    /**
     * Dezaktywacja pluginu
     */
    public function deactivate() {
        // Usuń zaplanowane zadania
        wp_clear_scheduled_hook('pks_api_refresh_data');
    }

    /**
     * Utwórz tabelę cache
     */
    private function create_cache_table() {
        global $wpdb;

        $table_name = $wpdb->prefix . 'pks_api_cache';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            cache_key varchar(255) NOT NULL,
            cache_data longtext NOT NULL,
            expires datetime NOT NULL,
            created datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY cache_key (cache_key),
            KEY expires (expires)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

/**
 * Hook do obsługi akcji refresh
 */
add_action('admin_init', 'pks_api_handle_actions');
function pks_api_handle_actions() {
    if (isset($_POST['pks_action']) && $_POST['pks_action'] === 'refresh_data') {
        if (!wp_verify_nonce($_POST['pks_api_nonce'], 'pks_api_refresh')) {
            wp_die('Security check failed');
        }

        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }

        $api = new PKS_API();
        $result = $api->refresh_data();

        if ($result) {
            add_settings_error('pks_api_messages', 'pks_api_refresh_success', '✅ Dane PKS zostały odświeżone!', 'updated');
        } else {
            add_settings_error('pks_api_messages', 'pks_api_refresh_error', '❌ Błąd podczas odświeżania danych PKS.', 'error');
        }

        wp_redirect(add_query_arg('settings-updated', 'true', wp_get_referer()));
        exit;
    }
}

/**
 * Hook do cron job
 */
add_action('pks_api_refresh_data', 'pks_api_cron_refresh');
function pks_api_cron_refresh() {
    $api = new PKS_API();
    $api->refresh_data();
}

/**
 * Uruchom plugin
 */
function run_pks_api_plugin() {
    PKS_API_Plugin::get_instance();
}
run_pks_api_plugin();
