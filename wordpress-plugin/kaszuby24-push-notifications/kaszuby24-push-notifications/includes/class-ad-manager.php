<?php

if (!defined('ABSPATH')) {
    exit;
}

class Kaszuby24_Ad_Manager {

    const POST_TYPE = 'app_ad';

    public function __construct() {
        // Register Post Type
        add_action('init', array($this, 'register_post_type'));
        
        // Meta Boxes
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
        add_action('save_post', array($this, 'save_meta_boxes'));
        
        // Custom Columns
        add_action('manage_'.self::POST_TYPE.'_posts_columns', array($this, 'add_custom_columns'));
        add_action('manage_'.self::POST_TYPE.'_posts_custom_column', array($this, 'render_custom_columns'), 10, 2);

        // Admin Menu & Settings
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));

        // REST API
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    // 1. Register Custom Post Type
    public function register_post_type() {
        $labels = array(
            'name'                  => 'Reklamy (App)',
            'singular_name'         => 'Reklama',
            'menu_name'             => 'Reklamy (App)',
            'name_admin_bar'        => 'Reklama (App)',
            'add_new'               => 'Dodaj nową',
            'add_new_item'          => 'Dodaj nową reklamę',
            'new_item'              => 'Nowa reklama',
            'edit_item'             => 'Edytuj reklamę',
            'view_item'             => 'Zobacz reklamę',
            'all_items'             => 'Wszystkie reklamy',
            'search_items'          => 'Szukaj reklam',
            'not_found'             => 'Nie znaleziono reklam',
            'not_found_in_trash'    => 'Nie znaleziono w koszu'
        );

        $args = array(
            'labels'             => $labels,
            'public'             => false,  // Not visible on frontend directly
            'publicly_queryable' => false,
            'show_ui'            => true,   // Show in admin
            'show_in_menu'       => 'kaszuby24-push-notifications', // Submenu of main plugin? Or top level? 
                                            // User asked for "Dashboard". Let's put it top level for visibility or keep in plugin menu.
                                            // Keeping in plugin menu is safer for now, but let's see. 
                                            // Actually, 'show_in_menu' => true makes it top level. 
                                            // Let's attach to the existing plugin menu.
            'show_in_menu'       => true,
            'query_var'          => false,
            'rewrite'            => false,
            'capability_type'    => 'post',
            'has_archive'        => false,
            'hierarchical'       => false,
            'menu_position'      => null,
            'supports'           => array('title', 'thumbnail'), // Title for internal name, Thumbnail for Image
            'menu_icon'          => 'dashicons-megaphone',
        );

        register_post_type(self::POST_TYPE, $args);
    }

    // 2. Admin Menu & Settings
    public function add_admin_menu() {
        add_submenu_page(
            'edit.php?post_type=app_ad',
            'Ustawienia Reklam',
            'Ustawienia',
            'manage_options',
            'app_ad_settings',
            array($this, 'render_settings_page')
        );
    }

    public function register_settings() {
        register_setting('app_ad_settings_group', 'kaszuby24_ad_rotation_mode');
    }

    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>Ustawienia Reklam w Aplikacji</h1>
            <form method="post" action="options.php">
                <?php settings_fields('app_ad_settings_group'); ?>
                <?php do_settings_sections('app_ad_settings_group'); ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Tryb wielu reklam na jednej pozycji</th>
                        <td>
                            <select name="kaszuby24_ad_rotation_mode">
                                <option value="random" <?php selected(get_option('kaszuby24_ad_rotation_mode'), 'random'); ?>>Losowo (Wyświetl jedną losową)</option>
                                <option value="slider" <?php selected(get_option('kaszuby24_ad_rotation_mode'), 'slider'); ?>>Slider (Przewijaj wszystkie)</option>
                            </select>
                            <p class="description">Wybierz, co ma się stać, jeśli dla danej pozycji (np. "Artykuł Góra") aktywnych jest wiele reklam.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    // 3. Meta Boxes
    public function add_meta_boxes() {
        add_meta_box(
            'app_ad_details',
            'Ustawienia Reklamy',
            array($this, 'render_meta_box'),
            self::POST_TYPE,
            'normal',
            'high'
        );
    }

    public function render_meta_box($post) {
        // Retrieve current values
        $positions = get_post_meta($post->ID, '_app_ad_position', true);
        
        // Handle legacy single value or JSON array
        if (!is_array($positions)) {
            // Try json decode if it's a string looking like json
            $decoded = json_decode($positions, true);
            if (is_array($decoded)) {
                $positions = $decoded;
            } else {
                // Legacy single value -> convert to array if not empty
                $positions = $positions ? array($positions) : array();
            }
        }

        $link_url = get_post_meta($post->ID, '_app_ad_link_url', true);
        $start_date = get_post_meta($post->ID, '_app_ad_start_date', true);
        $end_date = get_post_meta($post->ID, '_app_ad_end_date', true);
        
        // Security nonce
        wp_nonce_field('app_ad_meta_box', 'app_ad_meta_box_nonce');
        
        $available_positions = [
            'home_feed' => 'Strona Główna (Feed - po 3 artykule)',
            'article_top' => 'Artykuł (Góra)',
            'article_middle' => 'Artykuł (Środek)',
            'article_bottom' => 'Artykuł (Dół)',
        ];
        ?>
        <table class="form-table">
            <tr>
                <th><label>Pozycja</label></th>
                <td>
                    <?php foreach ($available_positions as $key => $label): ?>
                        <label style="display: block; margin-bottom: 5px;">
                            <input type="checkbox" name="app_ad_position[]" value="<?php echo esc_attr($key); ?>" 
                                <?php checked(in_array($key, $positions)); ?> />
                            <?php echo esc_html($label); ?>
                        </label>
                    <?php endforeach; ?>
                    <p class="description">Wybierz jedną lub więcej pozycji, gdzie reklama ma się wyświetlać.</p>
                </td>
            </tr>
            <tr>
                <th><label for="app_ad_link_url">Link docelowy</label></th>
                <td>
                    <input type="url" name="app_ad_link_url" id="app_ad_link_url" value="<?php echo esc_attr($link_url); ?>" style="width: 100%;" placeholder="https://..." />
                    <p class="description">Adres URL, który otworzy się po kliknięciu.</p>
                </td>
            </tr>
            <tr>
                <th><label>Harmonogram (Opcjonalne)</label></th>
                <td>
                    <p>
                        <label for="app_ad_start_date">Od:</label><br>
                        <input type="date" name="app_ad_start_date" id="app_ad_start_date" value="<?php echo esc_attr($start_date); ?>" />
                    </p>
                    <p>
                        <label for="app_ad_end_date">Do:</label><br>
                        <input type="date" name="app_ad_end_date" id="app_ad_end_date" value="<?php echo esc_attr($end_date); ?>" />
                    </p>
                    <p class="description">Jeśli puste, reklama wyświetla się zawsze (gdy jest opublikowana).</p>
                </td>
            </tr>
            <tr>
                <th>Grafika</th>
                <td>
                    <p>Użyj panelu po prawej ("Obrazek wyróżniający"), aby ustawić baner.</p>
                </td>
            </tr>
        </table>
        <?php
    }

    public function save_meta_boxes($post_id) {
        if (!isset($_POST['app_ad_meta_box_nonce']) || !wp_verify_nonce($_POST['app_ad_meta_box_nonce'], 'app_ad_meta_box')) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;

        // Save fields
        // Position is now an array
        if (isset($_POST['app_ad_position'])) {
            $positions = array_map('sanitize_text_field', $_POST['app_ad_position']);
            // Store as JSON for flexibility
            update_post_meta($post_id, '_app_ad_position', json_encode($positions));
        } else {
            delete_post_meta($post_id, '_app_ad_position');
        }

        $fields = ['app_ad_link_url', 'app_ad_start_date', 'app_ad_end_date'];
        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                update_post_meta($post_id, '_' . $field, sanitize_text_field($_POST[$field]));
            } else {
                delete_post_meta($post_id, '_' . $field);
            }
        }
    }

    // 4. Custom Columns
    public function add_custom_columns($columns) {
        $new_columns = array();
        $new_columns['cb'] = $columns['cb'];
        $new_columns['title'] = $columns['title'];
        $new_columns['ad_image'] = 'Podgląd';
        $new_columns['ad_position'] = 'Pozycja';
        $new_columns['ad_schedule'] = 'Harmonogram';
        $new_columns['date'] = $columns['date'];
        return $new_columns;
    }

    public function render_custom_columns($column, $post_id) {
        switch ($column) {
            case 'ad_image':
                if (has_post_thumbnail($post_id)) {
                    echo get_the_post_thumbnail($post_id, array(100, 50));
                } else {
                    echo 'Brak obrazka';
                }
                break;
            case 'ad_position':
                $positions_json = get_post_meta($post_id, '_app_ad_position', true);
                if (!$positions_json) {
                    echo 'Nieustawiona';
                } else {
                    $decoded = json_decode($positions_json, true);
                    if (is_array($decoded)) {
                        echo implode(', ', $decoded);
                    } else {
                        // Legacy single string
                        echo $positions_json;
                    }
                }
                break;
            case 'ad_schedule':
                $start = get_post_meta($post_id, '_app_ad_start_date', true);
                $end = get_post_meta($post_id, '_app_ad_end_date', true);
                if ($start || $end) {
                    echo 'Od: ' . ($start ? $start : 'Teraz') . '<br>';
                    echo 'Do: ' . ($end ? $end : 'Zawsze');
                } else {
                    echo 'Zawsze';
                }
                break;
        }
    }

    // 5. REST API
    public function register_rest_routes() {
        register_rest_route('kaszuby24/v1', '/ads', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_ads_api'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route('kaszuby24/v1', '/ad-settings', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_settings_api'),
            'permission_callback' => '__return_true'
        ));
    }

    public function get_settings_api() {
        return new WP_REST_Response([
            'rotation_mode' => get_option('kaszuby24_ad_rotation_mode', 'random')
        ], 200);
    }

    public function get_ads_api() {
        // Query active ads
        $args = array(
            'post_type' => self::POST_TYPE,
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'meta_query' => array(
                'relation' => 'AND',
                array(
                    'relation' => 'OR',
                    array(
                        'key' => '_app_ad_start_date',
                        'value' => date('Y-m-d'),
                        'compare' => '<=',
                        'type' => 'DATE'
                    ),
                    array(
                        'key' => '_app_ad_start_date',
                        'value' => '',
                        'compare' => '='
                    ),
                    array(
                        'key' => '_app_ad_start_date',
                        'compare' => 'NOT EXISTS'
                    )
                ),
                array(
                    'relation' => 'OR',
                    array(
                        'key' => '_app_ad_end_date',
                        'value' => date('Y-m-d'),
                        'compare' => '>=',
                        'type' => 'DATE'
                    ),
                    array(
                        'key' => '_app_ad_end_date',
                        'value' => '',
                        'compare' => '='
                    ),
                    array(
                        'key' => '_app_ad_end_date',
                        'compare' => 'NOT EXISTS'
                    )
                )
            )
        );

        $query = new WP_Query($args);
        $ads = array();

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $id = get_the_ID();
                $image_url = get_the_post_thumbnail_url($id, 'full');
                
                if (!$image_url) continue; // Skip if no image

                $positions_val = get_post_meta($id, '_app_ad_position', true);
                $positions = [];

                if ($positions_val) {
                    $decoded = json_decode($positions_val, true);
                    if (is_array($decoded)) {
                        $positions = $decoded;
                    } else {
                        $positions = [$positions_val]; // Legacy fallback
                    }
                } else {
                    $positions = ['home_feed']; // Default fallback?
                }

                // If no positions set, use default or skip? Let's use default to avoid hiding ads.
                if (empty($positions)) $positions = ['home_feed'];

                // Output one ad entry for EACH position to keep API contract with app simple
                foreach ($positions as $pos) {
                    $ads[] = array(
                        'id' => (string)$id,
                        'imageUrl' => $image_url,
                        'linkUrl' => get_post_meta($id, '_app_ad_link_url', true),
                        'position' => $pos,
                        'active' => true 
                    );
                }
            }
            wp_reset_postdata();
        }

        return new WP_REST_Response($ads, 200);
    }
}
