<?php
/**
 * Test nowego scrapera PKS - sprawdź czy wyciąga prawdziwe dane
 */

require_once 'includes/class-pks-scraper.php';

echo "<h1>🧪 TEST NOWEGO SCRAPERA PKS</h1>";
echo "<p>Testowanie scrapowania prawdziwych danych z strony głównej PKS...</p>";

// Utwórz instancję scrapera
$scraper = new PKS_Scraper();

// Test 1: Pobierz trasy
echo "<h2>📋 Test 1: Pobieranie tras</h2>";
$routes = $scraper->get_routes();

echo "<p>Znalezione trasy: <strong>" . count($routes) . "</strong></p>";

if (!empty($routes)) {
    echo "<table border='1' style='border-collapse: collapse;'>";
    echo "<tr><th>ID</th><th>Linia</th><th>Trasa</th><th>Źródło</th><th>PDF</th></tr>";

    foreach (array_slice($routes, 0, 10) as $route) {
        $has_pdf = isset($route['pdf_url']) && !empty($route['pdf_url']) ? '✅' : '❌';
        echo "<tr>";
        echo "<td>{$route['id']}</td>";
        echo "<td>{$route['line']}</td>";
        echo "<td>{$route['route']}</td>";
        echo "<td>{$route['source']}</td>";
        echo "<td>{$has_pdf}</td>";
        echo "</tr>";
    }
    echo "</table>";

    // Szczegóły pierwszej trasy
    echo "<h3>📄 Szczegóły pierwszej trasy:</h3>";
    echo "<pre>" . json_encode($routes[0], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";

} else {
    echo "<p style='color: red;'>❌ Nie znaleziono żadnych tras!</p>";
}

// Test 2: Pobierz przystanki
echo "<h2>📍 Test 2: Pobieranie przystanków</h2>";
$stops = $scraper->get_stops();

echo "<p>Znalezione przystanki: <strong>" . count($stops) . "</strong></p>";

if (!empty($stops)) {
    echo "<table border='1' style='border-collapse: collapse;'>";
    echo "<tr><th>ID</th><th>Nazwa</th><th>Współrzędne</th><th>Region</th></tr>";

    foreach (array_slice($stops, 0, 5) as $stop) {
        echo "<tr>";
        echo "<td>{$stop['id']}</td>";
        echo "<td>{$stop['name']}</td>";
        echo "<td>{$stop['lat']}, {$stop['lon']}</td>";
        echo "<td>{$stop['region']}</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "<p style='color: red;'>❌ Nie znaleziono przystanków!</p>";
}

echo "<hr>";
echo "<p><strong>✅ Test zakończony!</strong></p>";
echo "<p>Jeśli scraper działa prawidłowo, powinien znaleźć prawdziwe trasy i przystanki z PKS Gdynia.</p>";
?>




