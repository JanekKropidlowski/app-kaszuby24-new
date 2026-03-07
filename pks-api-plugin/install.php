<?php
/**
 * PKS API Plugin - Installation Script
 *
 * Run this script to set up the PKS API plugin
 * URL: https://your-domain.com/wp-content/plugins/pks-api-plugin/install.php
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    die('Direct access not allowed');
}

echo "<h1>🚌 PKS Gdynia API Plugin - Installation</h1>";

// Check if plugin is active
if (!is_plugin_active('pks-api/pks-api.php')) {
    echo "<div style='color: red; padding: 10px; border: 1px solid red; margin: 10px 0;'>";
    echo "❌ Plugin nie jest aktywowany. Przejdź do panelu WordPress → Wtyczki i aktywuj 'PKS Gdynia API'.";
    echo "</div>";
    exit;
}

echo "<div style='background: #f0f8ff; padding: 20px; border: 1px solid #add8e6; margin: 20px 0;'>";
echo "<h2>🔍 Sprawdzanie instalacji...</h2>";

// Check PHP version
$php_version = phpversion();
$php_ok = version_compare($php_version, '7.4', '>=');
echo "<p>PHP Version: <strong>$php_version</strong> - " . ($php_ok ? "✅ OK" : "❌ Wymagane 7.4+") . "</p>";

// Check WordPress version
global $wp_version;
$wp_ok = version_compare($wp_version, '5.0', '>=');
echo "<p>WordPress Version: <strong>$wp_version</strong> - " . ($wp_ok ? "✅ OK" : "❌ Wymagane 5.0+") . "</p>";

// Check database
global $wpdb;
$db_ok = $wpdb->check_connection();
echo "<p>Database Connection: " . ($db_ok ? "✅ OK" : "❌ Problem") . "</p>";

// Check cache table
$table_name = $wpdb->prefix . 'pks_api_cache';
$table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
echo "<p>Cache Table: " . ($table_exists ? "✅ OK" : "❌ Brak tabeli") . "</p>";

// Create cache table if not exists
if (!$table_exists) {
    echo "<h3>📋 Tworzenie tabeli cache...</h3>";

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
    $result = dbDelta($sql);

    if (!empty($result)) {
        echo "<p style='color: green;'>✅ Tabela cache została utworzona!</p>";
    } else {
        echo "<p style='color: red;'>❌ Błąd tworzenia tabeli cache</p>";
    }
}

// Check stops data file
$stops_file = plugin_dir_path(__FILE__) . 'pks_stops_data.json';
$stops_ok = file_exists($stops_file);
echo "<p>Stops Data File: " . ($stops_ok ? "✅ OK" : "❌ Brak pliku") . "</p>";

if ($stops_ok) {
    $stops_data = json_decode(file_get_contents($stops_file), true);
    $stops_count = isset($stops_data['stops']) ? count($stops_data['stops']) : 0;
    echo "<p>Liczba przystanków: <strong>$stops_count</strong></p>";
}

echo "</div>";

// Test API endpoints
echo "<div style='background: #fffacd; padding: 20px; border: 1px solid #ffa500; margin: 20px 0;'>";
echo "<h2>🧪 Testowanie API</h2>";

$api_endpoints = array(
    'status' => '/wp-json/pks-api/v1/status',
    'routes' => '/wp-json/pks-api/v1/routes',
    'stops' => '/wp-json/pks-api/v1/stops?limit=5'
);

foreach ($api_endpoints as $name => $endpoint) {
    $url = get_site_url() . $endpoint;
    $response = wp_remote_get($url, array('timeout' => 10));

    if (is_wp_error($response)) {
        echo "<p><strong>$name</strong>: ❌ " . $response->get_error_message() . "</p>";
    } else {
        $code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);

        if ($code === 200) {
            $status = "✅ OK";
            if ($name === 'routes' && is_array($body)) {
                $status .= " (" . count($body) . " tras)";
            }
            if ($name === 'stops' && is_array($body)) {
                $status .= " (" . count($body) . " przystanków)";
            }
        } else {
            $status = "❌ HTTP $code";
        }

        echo "<p><strong>$name</strong>: $status</p>";
    }
}

echo "</div>";

// Installation complete
echo "<div style='background: #f0fff0; padding: 20px; border: 1px solid #90ee90; margin: 20px 0;'>";
echo "<h2>🎉 Instalacja zakończona!</h2>";

if ($php_ok && $wp_ok && $db_ok && $table_exists && $stops_ok) {
    echo "<p style='color: green; font-weight: bold;'>✅ Wszystkie wymagania spełnione - plugin jest gotowy do użycia!</p>";

    echo "<h3>📡 Dostępne endpointy API:</h3>";
    echo "<ul>";
    echo "<li><code>" . get_site_url() . "/wp-json/pks-api/v1/routes</code> - Wszystkie trasy</li>";
    echo "<li><code>" . get_site_url() . "/wp-json/pks-api/v1/stops</code> - Wszystkie przystanki</li>";
    echo "<li><code>" . get_site_url() . "/wp-json/pks-api/v1/status</code> - Status API</li>";
    echo "</ul>";

    echo "<h3>🎛️ Panel administratora:</h3>";
    echo "<p>Przejdź do <strong>PKS API</strong> w menu WordPress aby zobaczyć dashboard.</p>";

} else {
    echo "<p style='color: red; font-weight: bold;'>⚠️ Niektóre wymagania nie są spełnione. Sprawdź błędy powyżej.</p>";
}

echo "</div>";

// Instructions
echo "<div style='background: #f9f9f9; padding: 20px; border: 1px solid #ddd; margin: 20px 0;'>";
echo "<h3>📖 Instrukcje użycia</h3>";
echo "<ol>";
echo "<li><strong>Dla aplikacji mobilnej:</strong> Użyj endpointów API do pobrania danych</li>";
echo "<li><strong>Dla strony WordPress:</strong> Użyj shortcode'ów lub funkcji PHP</li>";
echo "<li><strong>Aktualizacja danych:</strong> Użyj przycisku 'Odśwież Dane PKS' w panelu admina</li>";
echo "</ol>";

echo "<h4>🔧 Funkcje PHP:</h4>";
echo "<pre style='background: #f4f4f4; padding: 10px; border: 1px solid #ddd;'>";
// Pobierz trasy
\$routes = wp_remote_get('" . get_site_url() . "/wp-json/pks-api/v1/routes');
\$routes_data = json_decode(wp_remote_retrieve_body(\$routes));

// Pobierz przystanki
\$stops = wp_remote_get('" . get_site_url() . "/wp-json/pks-api/v1/stops');
\$stops_data = json_decode(wp_remote_retrieve_body(\$stops));
</pre>";

echo "</div>";

// Footer
echo "<hr>";
echo "<p style='text-align: center; color: #666;'>";
echo "🚌 PKS Gdynia API Plugin v1.0.0 | Kaszuby24 Team<br>";
echo "Licencja: GPL v2 or later";
echo "</p>";

// Prevent further output
exit;




