<?php

class K24_Waste_Admin
{
    public function __construct()
    {
        add_action('admin_menu', array($this, 'add_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));

        // AJAX handlers
        add_action('wp_ajax_k24_save_city', array($this, 'ajax_save_city'));
        add_action('wp_ajax_k24_delete_city', array($this, 'ajax_delete_city'));
        add_action('wp_ajax_k24_save_regions', array($this, 'ajax_save_regions'));
        add_action('wp_ajax_k24_save_schedule', array($this, 'ajax_save_schedule'));
        add_action('wp_ajax_k24_get_city_data', array($this, 'ajax_get_city_data'));
        add_action('wp_ajax_k24_import_legacy', array($this, 'ajax_import_legacy'));
        add_action('wp_ajax_k24_bulk_generate', array($this, 'ajax_bulk_generate'));
        add_action('wp_ajax_k24_save_announcements', array($this, 'ajax_save_announcements'));
        add_action('wp_ajax_k24_sync_city', array($this, 'ajax_sync_city'));
    }

    public function add_menu()
    {
        add_menu_page(
            'Zarządzanie Odpadami',
            'Odpady Manager',
            'manage_options',
            'k24-waste-manager',
            array($this, 'render_page'),
            'dashicons-trash',
            25
        );
    }

    public function enqueue_assets($hook)
    {
        if ($hook !== 'toplevel_page_k24-waste-manager')
            return;

        // Inline CSS (workaround for rewrite issues)
        $css_file = K24_WASTE_PATH . 'admin/css/admin-style.css';
        if (file_exists($css_file)) {
            $css = file_get_contents($css_file);
            wp_add_inline_style('wp-admin', $css);
        }

        // Load jQuery as dependency
        wp_enqueue_script('jquery');

        // Inline JS in footer after jQuery loads
        add_action('admin_footer', array($this, 'inline_admin_script'));
    }

    public function inline_admin_script()
    {
        $js_file = K24_WASTE_PATH . 'admin/js/admin-script.js';
        if (file_exists($js_file)) {
            $js = file_get_contents($js_file);
            ?>
            <script type="text/javascript">
                var k24Waste = {
                    ajax_url: '<?php echo admin_url('admin-ajax.php'); ?>',
                    nonce: '<?php echo wp_create_nonce('k24_waste_nonce'); ?>'
                };
                <?php echo $js; ?>
            </script>
            <?php
        }
    }

    public function render_page()
    {
        $cities = K24_Waste_DB::get_cities();
        
        // DEBUG - usuń po sprawdzeniu
        echo '<div style="background:yellow;padding:10px;margin:10px;border:2px solid red;"><strong>DEBUG Liczba miast:</strong> ' . count($cities) . '<pre>';
        var_dump($cities);
        echo '</pre></div>';
        // KONIEC DEBUG
        ?>
        <div class="wrap k24-waste-wrap">
            <h1>Harmonogramy Odpadów 🗑️</h1>

            <div class="k24-tabs">
                <button class="tab-btn active" data-tab="tab-cities">Miasta</button>
                <button class="tab-btn" data-tab="tab-regions" id="btn-regions-tab" disabled>Regiony i Ulice</button>
                <button class="tab-btn" data-tab="tab-schedule" id="btn-schedule-tab" disabled>Szybka Edycja
                    Harmonogramu</button>
                <button class="tab-btn" data-tab="tab-announcements" id="btn-announcements-tab" disabled>Komunikaty
                    (News)</button>
                <button class="tab-btn" data-tab="tab-generator">Generator JSON (Bulk)</button>
            </div>

            <!-- TAB: CITIES -->
            <div id="tab-cities" class="tab-content active">
                <div class="k24-card">
                    <h2>Zarządzaj Miastami</h2>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>Nazwa Miasta</th>
                                <th>Slug / API Source</th>
                                <th>Akcje</th>
                            </tr>
                        </thead>
                        <tbody id="cities-list">
                            <?php foreach ($cities as $city): ?>
                                <tr data-id="<?php echo esc_attr($city['id']); ?>"
                                    data-slug="<?php echo esc_attr($city['slug']); ?>">
                                    <td><strong><?php echo esc_html($city['name']); ?></strong></td>
                                    <td>
                                        <code><?php echo esc_html($city['slug']); ?></code><br>
                                        <small style="color:#64748b">
                                            Source:
                                            <?php echo !empty($city['source_url']) ? esc_url($city['source_url']) : 'Manual'; ?>
                                        </small>
                                    </td>
                                    <td>
                                        <button class="button action-edit-city">Zarządzaj</button>
                                        <button class="button action-sync-city" title="Pobierz dane z API" <?php echo empty($city['source_url']) ? 'disabled' : ''; ?>>🔄 Sync</button>
                                        <button class="button btn-danger action-delete-city">Usuń</button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>

                    <div class="add-city-form">
                        <h3>Dodaj Nowe Miasto</h3>
                        <input type="text" id="new-city-name" placeholder="np. Puck">
                        <button class="button button-primary" id="btn-add-city">Dodaj Miasto</button>
                    </div>

                    <div class="import-section" style="margin-top: 30px; padding-top: 20px; border-top: 2px dashed #cbd5e1;">
                        <h3>🚀 Import z poprzedniej wersji (JSON)</h3>
                        <p>Jeśli masz pliki <code>waste-data-reda.json</code> itp. w starym pluginie, kliknij poniżej, aby je
                            zaimportować.</p>
                        <button class="button" id="btn-import-legacy">Importuj Redę, Wejherowo i Rumię</button>
                    </div>
                </div>
            </div>

            <!-- TAB: REGIONS & STREETS -->
            <div id="tab-regions" class="tab-content">
                <div class="k24-card">
                    <h2 id="current-city-title">Regiony i Ulice</h2>
                    <div id="regions-container">
                        <!-- Dynamic content -->
                    </div>

                    <div class="city-meta-section"
                        style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <h3>⚙️ Konfiguracja Źródła Danych (Harmonogram)</h3>
                        <div style="display: flex; gap: 20px; align-items: flex-end;">
                            <div style="flex: 2;">
                                <label>URL API/Źródła (np. JSON lub strona Ekofabryki):</label>
                                <input type="text" id="city-source-url" style="width: 100%;" placeholder="https://...">
                            </div>
                            <div style="flex: 1;">
                                <label>Typ źródła:</label>
                                <select id="city-source-type" style="width: 100%;">
                                    <option value="manual">Manual (Tylko WP)</option>
                                    <option value="ekofabryka">Ekofabryka (Scraper)</option>
                                    <option value="json_api">JSON API (Struktura Kaszuby24)</option>
                                </select>
                            </div>
                        </div>
                        <p class="description">Ustawienie źródła pozwoli na automatyczne pobieranie harmonogramu (przycisk
                            Sync).</p>
                    </div>

                    <div class="city-meta-section"
                        style="margin-top: 20px; padding: 20px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
                        <h3>📰 Konfiguracja Aktualności (WordPress API)</h3>
                        <div style="display: flex; gap: 20px; align-items: flex-end;">
                            <div style="flex: 2;">
                                <label>URL do WordPress REST API (np. https://reda.pl/wp-json/wp/v2):</label>
                                <input type="text" id="city-news-url" style="width: 100%;" placeholder="https://reda.pl/wp-json/wp/v2">
                            </div>
                            <div style="flex: 1;">
                                <label>ID Kategorii (opcjonalne):</label>
                                <input type="number" id="city-news-category" style="width: 100%;" placeholder="15">
                            </div>
                        </div>
                        <p class="description">Wpisz URL do REST API WordPress strony miasta. Aplikacja będzie pobierać artykuły z tej kategorii przy dzwonku aktualności w sekcji odpadów.</p>
                    </div>

                    <button class="button" id="btn-add-region" style="margin-top: 20px;">+ Dodaj Rejon</button>
                    <button class="button button-primary" id="btn-save-regions" style="float:right; margin-top: 20px;">Zapisz
                        Wszystko</button>
                </div>
            </div>

            <!-- TAB: SCHEDULE (Quick Edit) -->
            <div id="tab-schedule" class="tab-content">
                <div class="k24-card">
                    <h2>Szybka Edycja Harmonogramu</h2>
                    <p class="description">Wybierz rejon, aby edytować daty w formie tabeli.</p>
                    <select id="schedule-region-selector">
                        <option value="">Wybierz rejon...</option>
                    </select>

                    <div id="quick-edit-table-wrap">
                        <table class="wp-list-table widefat fixed striped" id="table-dates">
                            <thead>
                                <tr>
                                    <th width="150">Data</th>
                                    <th>Typy Odpadów (oddziel przecinkiem)</th>
                                    <th width="80">Akcja</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Dynamic rows -->
                            </tbody>
                        </table>
                        <button class="button" id="btn-add-date-row">+ Dodaj Wiersz</button>

                        <div
                            style="margin-top: 20px; padding: 15px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
                            <h4>🚀 Szybki import dat dla tego rejonu (JSON)</h4>
                            <p class="description">Wklej tablicę dat, np:
                                <code>[{"date":"2026-01-20","types":["Bio"]},{"date":"2026-01-22","types":["Szkło"]}]</code>
                            </p>
                            <textarea id="json-region-import-input"
                                style="width: 100%; height: 100px; font-family: monospace; font-size: 11px;"
                                placeholder='[{"date": "2026-01-01", "types": ["Bio"]}]'></textarea>
                            <button class="button" id="btn-import-region-json" style="margin-top: 10px;">Dopisz te daty do
                                tabeli ↓</button>
                        </div>

                        <button class="button button-primary" id="btn-save-schedule"
                            style="float:right; margin-top: 20px;">Zapisz Harmonogram</button>
                    </div>
                </div>
            </div>

            <!-- TAB: ANNOUNCEMENTS -->
            <div id="tab-announcements" class="tab-content">
                <div class="k24-card">
                    <h2>Komunikaty i Alerty 📢</h2>
                    <p class="description">Dodaj ważne informacje, które wyświetlą się w aplikacji dla tego miasta.</p>

                    <div id="announcements-container">
                        <!-- Dynamic content -->
                    </div>
                    <button class="button" id="btn-add-announcement">+ Dodaj Komunikat</button>
                    <button class="button button-primary" id="btn-save-announcements" style="float:right">Zapisz
                        Komunikaty</button>
                </div>
            </div>
            <!-- TAB: GENERATOR (Bulk) -->
            <div id="tab-generator" class="tab-content">
                <div class="k24-card">
                    <h2>Generator / Import z JSON 🧙‍♂️</h2>
                    <p class="description">Wklej strukturę JSON, aby błyskawicznie stworzyć całe miasto z rejonami i
                        harmonogramem.</p>

                    <div style="display: flex; gap: 20px;">
                        <div style="flex: 1;">
                            <textarea id="json-generator-input"
                                style="width: 100%; height: 400px; font-family: monospace; font-size: 12px;"
                                placeholder="Wklej tutaj JSON..."></textarea>
                            <button class="button button-primary" id="btn-run-generator" style="margin-top: 15px;">Uruchom
                                Generator (Zapisz)</button>
                        </div>
                        <div style="flex: 1; background: #f1f5f9; padding: 15px; border-radius: 8px;">
                            <h4 style="margin-top:0">Szablon JSON (Przykład):</h4>
                            <pre style="font-size: 11px; color: #475569; overflow: auto;">
                        {
                          "city": "Puck",
                          "regions": [
                            {
                              "id": "rejon_1",
                              "name": "Centrum - Bloki",
                              "streets": "ul. Morska, ul. Portowa, ul. 1 Maja",
                              "schedule": [
                                {"date": "2026-01-10", "types": ["Zmieszane"]},
                                {"date": "2026-01-15", "types": ["Bio", "Plastik"]}
                              ]
                            },
                            {
                              "id": "rejon_2",
                              "name": "Osiedle Słoneczne",
                              "streets": "ul. Polna, ul. Letnia",
                              "schedule": [
                                {"date": "2026-01-12", "types": ["Papier"]}
                              ]
                            }
                          ]
                        }
                        </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    // AJAX Callbacks
    public function ajax_save_city()
    {
        check_ajax_referer('k24_waste_nonce', 'nonce');
        $name = sanitize_text_field($_POST['name']);
        $slug = sanitize_title($name);
        $id = K24_Waste_DB::save_city(array('name' => $name, 'slug' => $slug, 'id' => ''));
        wp_send_json_success(array('id' => $id, 'slug' => $slug, 'name' => $name));
    }

    public function ajax_delete_city()
    {
        check_ajax_referer('k24_waste_nonce', 'nonce');
        K24_Waste_DB::delete_city(sanitize_text_field($_POST['id']));
        wp_send_json_success();
    }

    public function ajax_get_city_data()
    {
        check_ajax_referer('k24_waste_nonce', 'nonce');
        $slug = sanitize_text_field($_POST['slug']);

        $cities = K24_Waste_DB::get_cities();
        $city_meta = array();
        foreach ($cities as $c) {
            if ($c['slug'] === $slug) {
                $city_meta = $c;
                break;
            }
        }

        wp_send_json_success(array(
            'meta' => $city_meta,
            'regions' => K24_Waste_DB::get_regions($slug),
            'schedule' => K24_Waste_DB::get_schedule($slug),
            'announcements' => K24_Waste_DB::get_announcements($slug)
        ));
    }

    public function ajax_save_regions()
    {
        check_ajax_referer('k24_waste_nonce', 'nonce');
        $slug = sanitize_text_field($_POST['slug']);
        $regions = json_decode(stripslashes($_POST['regions']), true);
        $meta = json_decode(stripslashes($_POST['meta']), true);

        error_log('K24 Waste: Saving meta for ' . $slug . ': ' . print_r($meta, true));

        // 1. Save Regions
        K24_Waste_DB::save_regions($slug, $regions);

        // 2. Update City Meta (URL, Type, News)
        $cities = K24_Waste_DB::get_cities();
        foreach ($cities as $id => $city) {
            if ($city['slug'] === $slug) {
                $cities[$id]['source_url'] = esc_url_raw($meta['source_url']);
                $cities[$id]['source_type'] = sanitize_text_field($meta['source_type']);
                $cities[$id]['news_api_url'] = isset($meta['news_api_url']) ? esc_url_raw($meta['news_api_url']) : '';
                $cities[$id]['news_category_id'] = isset($meta['news_category_id']) ? intval($meta['news_category_id']) : 0;
                error_log('K24 Waste: Updated city meta: ' . print_r($cities[$id], true));
                break;
            }
        }
        $result = update_option('k24_waste_cities', $cities);
        error_log('K24 Waste: update_option result: ' . ($result ? 'true' : 'false'));

        wp_send_json_success();
    }

    public function ajax_save_schedule()
    {
        check_ajax_referer('k24_waste_nonce', 'nonce');
        $slug = sanitize_text_field($_POST['slug']);
        $schedule = json_decode(stripslashes($_POST['schedule']), true);
        K24_Waste_DB::save_schedule($slug, $schedule);
        wp_send_json_success();
    }

    public function ajax_import_legacy()
    {
        check_ajax_referer('k24_waste_nonce', 'nonce');

        $cities_to_import = array('reda', 'wejherowo', 'rumia');

        // Probujemy znalezc sciezke do starego pluginu dynamicznie
        $plugins_dir = WP_PLUGIN_DIR;
        $legacy_path_candidates = array(
            $plugins_dir . '/kaszuby24-push-notifications/kaszuby24-push-notifications/includes/',
            $plugins_dir . '/kaszuby24-push-notifications/includes/',
            // Jako fallback sprawdzamy wzglednie do obecnego pluginu
            plugin_dir_path(dirname(dirname(__FILE__))) . 'kaszuby24-push-notifications/kaszuby24-push-notifications/includes/',
            plugin_dir_path(dirname(dirname(__FILE__))) . 'kaszuby24-push-notifications/includes/'
        );

        $legacy_path = '';
        foreach ($legacy_path_candidates as $candidate) {
            if (file_exists($candidate . 'waste-data-reda.json')) {
                $legacy_path = $candidate;
                break;
            }
        }

        if (empty($legacy_path)) {
            wp_send_json_error('Nie znaleziono plików do importu. Sprawdzone ścieżki: ' . implode(', ', $legacy_path_candidates));
        }

        $count = 0;
        foreach ($cities_to_import as $city_slug) {
            $file = $legacy_path . 'waste-data-' . $city_slug . '.json';
            if (file_exists($file)) {
                $content = json_decode(file_get_contents($file), true);
                if ($content) {
                    // 1. Save City
                    K24_Waste_DB::save_city(array(
                        'id' => '',
                        'name' => ucfirst($city_slug),
                        'slug' => $city_slug
                    ));

                    // 2. Prepare Regions
                    $regions = array();
                    $schedule = array();

                    foreach ($content['regions'] as $reg) {
                        $region_id = $reg['id'];
                        $regions[] = array(
                            'id' => $region_id,
                            'name' => $reg['name'],
                            'streets' => isset($reg['streets']) ? implode(', ', $reg['streets']) : ''
                        );
                        $schedule[$region_id] = isset($reg['schedule']) ? $reg['schedule'] : array();
                    }

                    K24_Waste_DB::save_regions($city_slug, $regions);
                    K24_Waste_DB::save_schedule($city_slug, $schedule);
                    $count++;
                }
            }
        }

        if ($count > 0) {
            wp_send_json_success('Zaimportowano ' . $count . ' miast z lokalizacji: ' . $legacy_path);
        } else {
            wp_send_json_error('Nie znaleziono konkretnych plików miast w: ' . $legacy_path);
        }
    }

    public function ajax_bulk_generate()
    {
        check_ajax_referer('k24_waste_nonce', 'nonce');

        $json = stripslashes($_POST['json']);
        $data = json_decode($json, true);

        if (!$data || !isset($data['city']) || !isset($data['regions'])) {
            wp_send_json_error('Nieprawidłowy format JSON. Upewnij się, że zawiera klucze "city" i "regions".');
        }

        $city_name = sanitize_text_field($data['city']);
        $city_slug = sanitize_title($city_name);

        // 1. Zapisz miasto
        K24_Waste_DB::save_city(array(
            'id' => '',
            'name' => $city_name,
            'slug' => $city_slug
        ));

        // 2. Przygotuj regiony i harmonogram
        $regions = array();
        $full_schedule = array();

        foreach ($data['regions'] as $reg) {
            $reg_id = isset($reg['id']) ? $reg['id'] : 'reg_' . uniqid();

            $regions[] = array(
                'id' => $reg_id,
                'name' => sanitize_text_field($reg['name']),
                'streets' => sanitize_textarea_field($reg['streets'])
            );

            if (isset($reg['schedule']) && is_array($reg['schedule'])) {
                $full_schedule[$reg_id] = $reg['schedule'];
            }
        }

        K24_Waste_DB::save_regions($city_slug, $regions);
        K24_Waste_DB::save_schedule($city_slug, $full_schedule);

        wp_send_json_success("Miasto '$city_name' zostało wygenerowane pomyślnie z " . count($regions) . " rejonami!");
    }

    public function ajax_save_announcements()
    {
        check_ajax_referer('k24_waste_nonce', 'nonce');
        $slug = sanitize_text_field($_POST['slug']);
        $announcements = json_decode(stripslashes($_POST['announcements']), true);

        $processed = array();
        foreach ($announcements as $ann) {
            $processed[] = array(
                'id' => !empty($ann['id']) ? $ann['id'] : uniqid(),
                'title' => sanitize_text_field($ann['title']),
                'content' => sanitize_textarea_field($ann['content']),
                'type' => sanitize_text_field($ann['type']), // info, warning, error
                'date' => current_time('mysql')
            );
        }

        K24_Waste_DB::save_announcements($slug, $processed);
        wp_send_json_success();
    }

    public function ajax_sync_city()
    {
        check_ajax_referer('k24_waste_nonce', 'nonce');
        $slug = sanitize_text_field($_POST['slug']);

        $cities = K24_Waste_DB::get_cities();
        $target_city = null;
        foreach ($cities as $c) {
            if ($c['slug'] === $slug) {
                $target_city = $c;
                break;
            }
        }

        if (!$target_city || empty($target_city['source_url'])) {
            wp_send_json_error('Brak URL źródłowego dla tego miasta.');
        }

        $source_url = $target_city['source_url'];
        $source_type = $target_city['source_type'] ?? 'manual';

        if ($source_type === 'ekofabryka') {
            wp_send_json_error('Synchronizacja z Ekofabryką wymaga wejścia w ich interaktywny kalendarz, co nie jest obecnie obsługiwane.');
        } elseif ($source_type === 'json_api') {
            $response = wp_remote_get($source_url);
            if (is_wp_error($response)) {
                wp_send_json_error('Błąd połączenia: ' . $response->get_error_message());
            }

            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);

            if (!$data) {
                wp_send_json_error('Otrzymano nieprawidłowy format JSON.');
            }

            // Sync Regions
            if (isset($data['regions'])) {
                K24_Waste_DB::save_regions($slug, $data['regions']);
            }
            // Sync Schedule
            if (isset($data['schedule'])) {
                K24_Waste_DB::save_schedule($slug, $data['schedule']);
            }

            wp_send_json_success('Synchronizacja zakończenia pomyślnie!');
        } else {
            wp_send_json_error('Nieobsługiwany typ źródła.');
        }
    }
}
