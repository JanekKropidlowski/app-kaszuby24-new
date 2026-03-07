<?php
/**
 * Tymczasowy skrypt do aktualizacji konfiguracji aktualności dla Redy
 * Uruchom jednorazowo przez przeglądarkę: https://kaszuby24.pl/wp-content/plugins/k24-waste-manager/update_reda_news.php
 * Lub wklej kod do WordPress Admin → Tools → Theme Editor lub jako custom PHP snippet
 */

// Załaduj WordPress
require_once('../../../../wp-load.php');

// Sprawdź czy użytkownik jest adminem
if (!current_user_can('manage_options')) {
    die('Brak uprawnień');
}

// Pobierz miasta
$cities = get_option('k24_waste_cities', array());

echo "<h2>Aktualizacja konfiguracji aktualności dla Redy</h2>";
echo "<pre>";

// Znajdź Redę i zaktualizuj
$updated = false;
foreach ($cities as $id => $city) {
    if ($city['slug'] === 'reda') {
        echo "Znaleziono miasto: {$city['name']}\n";
        echo "Stare dane:\n";
        print_r($city);
        
        // Dodaj konfigurację news
        $cities[$id]['news_api_url'] = 'https://miasto.reda.pl/wp-json/wp/v2';
        $cities[$id]['news_category_id'] = 11;
        
        echo "\nNowe dane:\n";
        print_r($cities[$id]);
        
        $updated = true;
        break;
    }
}

if ($updated) {
    update_option('k24_waste_cities', $cities);
    echo "\n✅ Pomyślnie zaktualizowano konfigurację!\n";
    echo "\nSprawdź API: https://kaszuby24.pl/wp-json/kaszuby24/v2/waste-cities\n";
} else {
    echo "❌ Nie znaleziono miasta Reda\n";
    echo "Dostępne miasta:\n";
    foreach ($cities as $city) {
        echo "- {$city['name']} ({$city['slug']})\n";
    }
}

echo "</pre>";
echo "<p><strong>Usuń ten plik po użyciu!</strong></p>";
