<?php
/**
 * Test API dla Kaszuby24 Events
 * 
 * Użyj tego pliku do przetestowania endpointów API
 * Umieść go w głównym katalogu WordPress i otwórz w przeglądarce
 */

// Sprawdź czy jesteśmy w WordPress
if (!defined('ABSPATH')) {
    // Jeśli nie, spróbuj załadować WordPress
    $wp_load = dirname(__FILE__) . '/../../../wp-load.php';
    if (file_exists($wp_load)) {
        require_once($wp_load);
    } else {
        die('Nie można załadować WordPress. Upewnij się, że plik jest w odpowiednim katalogu.');
    }
}

// Sprawdź czy plugin jest aktywny
if (!class_exists('Kaszuby24_Push_API')) {
    die('Plugin Kaszuby24 Push Notifications nie jest aktywny.');
}

// Funkcja do testowania endpointów
function test_api_endpoints() {
    $base_url = get_rest_url(null, 'kaszuby24/v1');
    
    echo "<h1>Test API Kaszuby24 Events</h1>";
    echo "<p><strong>Base URL:</strong> {$base_url}</p>";
    
    // Test 1: Aktywne kategorie
    echo "<h2>1. Test: Aktywne kategorie</h2>";
    $categories_url = $base_url . '/events/categories/active';
    echo "<p><strong>URL:</strong> <a href='{$categories_url}' target='_blank'>{$categories_url}</a></p>";
    
    $response = wp_remote_get($categories_url);
    if (is_wp_error($response)) {
        echo "<p style='color: red;'>Błąd: " . $response->get_error_message() . "</p>";
    } else {
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($data && isset($data['categories'])) {
            echo "<p style='color: green;'>✅ Sukces! Znaleziono " . count($data['categories']) . " aktywnych kategorii</p>";
            echo "<pre>" . print_r($data, true) . "</pre>";
        } else {
            echo "<p style='color: orange;'>⚠️ Odpowiedź otrzymana, ale format może być nieprawidłowy</p>";
            echo "<pre>" . htmlspecialchars($body) . "</pre>";
        }
    }
    
    // Test 2: Aktywne obiekty
    echo "<h2>2. Test: Aktywne obiekty</h2>";
    $objects_url = $base_url . '/events/objects/active';
    echo "<p><strong>URL:</strong> <a href='{$objects_url}' target='_blank'>{$objects_url}</a></p>";
    
    $response = wp_remote_get($objects_url);
    if (is_wp_error($response)) {
        echo "<p style='color: red;'>Błąd: " . $response->get_error_message() . "</p>";
    } else {
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($data && isset($data['objects'])) {
            echo "<p style='color: green;'>✅ Sukces! Znaleziono " . count($data['objects']) . " aktywnych obiektów</p>";
            echo "<pre>" . print_r($data, true) . "</pre>";
        } else {
            echo "<p style='color: orange;'>⚠️ Odpowiedź otrzymana, ale format może być nieprawidłowy</p>";
            echo "<pre>" . htmlspecialchars($body) . "</pre>";
        }
    }
    
    // Test 3: Nowy endpoint - aktywne filtry
    echo "<h2>3. Test: Aktywne filtry (NOWY endpoint)</h2>";
    $filters_url = $base_url . '/events/filters/active';
    echo "<p><strong>URL:</strong> <a href='{$filters_url}' target='_blank'>{$filters_url}</a></p>";
    
    $response = wp_remote_get($filters_url);
    if (is_wp_error($response)) {
        echo "<p style='color: red;'>Błąd: " . $response->get_error_message() . "</p>";
    } else {
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($data && isset($data['success']) && $data['success']) {
            echo "<p style='color: green;'>✅ Sukces! Endpoint działa poprawnie</p>";
            echo "<p>Kategorie: " . $data['total_categories'] . ", Obiekty: " . $data['total_objects'] . "</p>";
            echo "<pre>" . print_r($data, true) . "</pre>";
        } else {
            echo "<p style='color: orange;'>⚠️ Odpowiedź otrzymana, ale format może być nieprawidłowy</p>";
            echo "<pre>" . htmlspecialchars($body) . "</pre>";
        }
    }
    
    // Test 4: Wydarzenia
    echo "<h2>4. Test: Wydarzenia</h2>";
    $events_url = $base_url . '/events?per_page=5';
    echo "<p><strong>URL:</strong> <a href='{$events_url}' target='_blank'>{$events_url}</a></p>";
    
    $response = wp_remote_get($events_url);
    if (is_wp_error($response)) {
        echo "<p style='color: red;'>Błąd: " . $response->get_error_message() . "</p>";
    } else {
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (is_array($data)) {
            echo "<p style='color: green;'>✅ Sukces! Znaleziono " . count($data) . " wydarzeń</p>";
            echo "<pre>" . print_r($data, true) . "</pre>";
        } else {
            echo "<p style='color: orange;'>⚠️ Odpowiedź otrzymana, ale format może być nieprawidłowy</p>";
            echo "<pre>" . htmlspecialchars($body) . "</pre>";
        }
    }
    
    // Test 5: Liczba wydarzeń
    echo "<h2>5. Test: Liczba wydarzeń</h2>";
    $counts_url = $base_url . '/event-counts';
    echo "<p><strong>URL:</strong> <a href='{$counts_url}' target='_blank'>{$counts_url}</a></p>";
    
    $response = wp_remote_get($counts_url);
    if (is_wp_error($response)) {
        echo "<p style='color: red;'>Błąd: " . $response->get_error_message() . "</p>";
    } else {
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (is_array($data)) {
            echo "<p style='color: green;'>✅ Sukces! Liczba wydarzeń:</p>";
            echo "<ul>";
            foreach ($data as $filter => $count) {
                echo "<li><strong>{$filter}:</strong> {$count}</li>";
            }
            echo "</ul>";
        } else {
            echo "<p style='color: orange;'>⚠️ Odpowiedź otrzymana, ale format może być nieprawidłowy</p>";
            echo "<pre>" . htmlspecialchars($body) . "</pre>";
        }
    }
    
    // Informacje o systemie
    echo "<h2>6. Informacje o systemie</h2>";
    echo "<ul>";
    echo "<li><strong>WordPress Version:</strong> " . get_bloginfo('version') . "</li>";
    echo "<li><strong>Plugin Version:</strong> " . (defined('KASZUBY24_PUSH_VERSION') ? KASZUBY24_PUSH_VERSION : 'Nieznana') . "</li>";
    echo "<li><strong>REST API Base:</strong> " . get_rest_url() . "</li>";
    echo "<li><strong>Site URL:</strong> " . get_site_url() . "</li>";
    echo "</ul>";
    
    // Sprawdź typy postów
    echo "<h2>7. Dostępne typy postów</h2>";
    $post_types = get_post_types(array(), 'objects');
    echo "<ul>";
    foreach ($post_types as $post_type => $post_type_obj) {
        $count = wp_count_posts($post_type);
        echo "<li><strong>{$post_type}:</strong> {$count->publish} opublikowanych</li>";
    }
    echo "</ul>";
    
    // Sprawdź taksonomie
    echo "<h2>8. Dostępne taksonomie</h2>";
    $taxonomies = get_taxonomies(array(), 'objects');
    echo "<ul>";
    foreach ($taxonomies as $taxonomy => $taxonomy_obj) {
        $terms = get_terms(array('taxonomy' => $taxonomy, 'hide_empty' => false));
        echo "<li><strong>{$taxonomy}:</strong> " . count($terms) . " terminów</li>";
    }
    echo "</ul>";
}

// Uruchom testy
if (current_user_can('manage_options')) {
    test_api_endpoints();
} else {
    echo "<h1>Test API Kaszuby24 Events</h1>";
    echo "<p style='color: red;'>Brak uprawnień. Musisz być zalogowany jako administrator.</p>";
    echo "<p><a href='" . wp_login_url() . "'>Zaloguj się</a></p>";
}
?>
