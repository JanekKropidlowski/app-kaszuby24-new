<?php
/**
 * PKS API Examples - Przykłady użycia API
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

echo "<h1>🚌 PKS GDYNIA API - Przykłady Użycia</h1>";

// Example 1: Get all routes
echo "<h2>📋 Przykład 1: Pobierz wszystkie trasy</h2>";
echo "<pre><code>// JavaScript
fetch('" . get_site_url() . "/wp-json/pks-api/v1/routes')
  .then(response => response.json())
  .then(routes => {
    console.log('Znalezione trasy:', routes.length);
    routes.forEach(route => {
      console.log(\`\${route.line}: \${route.route}\`);
    });
  });

// PHP
\$response = wp_remote_get('" . get_site_url() . "/wp-json/pks-api/v1/routes');
\$routes = json_decode(wp_remote_retrieve_body(\$response), true);
echo 'Liczba tras: ' . count(\$routes);
</code></pre>";

// Example 2: Get stops
echo "<h2>📍 Przykład 2: Pobierz przystanki</h2>";
echo "<pre><code>// Wyszukaj przystanki w Gdyni
fetch('" . get_site_url() . "/wp-json/pks-api/v1/stops?search=Gdynia&limit=5')
  .then(response => response.json())
  .then(stops => {
    stops.forEach(stop => {
      console.log(\`\${stop.name}: \${stop.lat}, \${stop.lon}\`);
    });
  });

// Wszystkie przystanki
fetch('" . get_site_url() . "/wp-json/pks-api/v1/stops')
  .then(response => response.json())
  .then(stops => console.log('Wszystkie przystanki:', stops.length));
</code></pre>";

// Example 3: Search connections
echo "<h2>🔍 Przykład 3: Wyszukaj połączenia</h2>";
echo "<pre><code>// Znajdź połączenie Gdynia → Gdańsk
const searchParams = new URLSearchParams({
  from: 'Gdynia',
  to: 'Gdańsk',
  date: '2026-01-01'
});

fetch('" . get_site_url() . "/wp-json/pks-api/v1/search?' + searchParams)
  .then(response => response.json())
  .then(connections => {
    connections.forEach(conn => {
      console.log(\`\${conn.line}: \${conn.departure} - \${conn.arrival}\`);
    });
  });
</code></pre>";

// Example 4: Get route schedule
echo "<h2>📄 Przykład 4: Pobierz rozkład trasy</h2>";
echo "<pre><code>// Rozkład trasy nr 150 (Gdynia - Sopot - Gdańsk)
fetch('" . get_site_url() . "/wp-json/pks-api/v1/schedule/150')
  .then(response => response.json())
  .then(schedule => {
    if (schedule.valid) {
      console.log('Rozkład ważny do:', schedule.last_updated);
      console.log('PDF:', schedule.pdf_url);
    } else {
      console.log('Rozkład niedostępny');
    }
  });
</code></pre>";

// Example 5: Real app integration
echo "<h2>📱 Przykład 5: Integracja z aplikacją React Native</h2>";
echo "<pre><code>import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';

const PKS_APP_URL = '" . get_site_url() . "';

export default function PKSScreen() {
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPKSData();
  }, []);

  const loadPKSData = async () => {
    try {
      // Pobierz trasy
      const routesResponse = await fetch(\`\${PKS_APP_URL}/wp-json/pks-api/v1/routes\`);
      const routesData = await routesResponse.json();

      // Pobierz przystanki
      const stopsResponse = await fetch(\`\${PKS_APP_URL}/wp-json/pks-api/v1/stops?limit=20\`);
      const stopsData = await stopsResponse.json();

      setRoutes(routesData);
      setStops(stopsData);
    } catch (error) {
      console.error('Błąd ładowania danych PKS:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchStops = async (query) => {
    if (query.length < 2) return;

    const response = await fetch(\`\${PKS_APP_URL}/wp-json/pks-api/v1/stops?search=\${query}&limit=10\`);
    const results = await response.json();
    setStops(results);
  };

  if (loading) {
    return (
      &lt;View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}&gt;
        &lt;Text&gt;Ładowanie danych PKS...&lt;/Text&gt;
      &lt;/View&gt;
    );
  }

  return (
    &lt;View style={{ flex: 1, padding: 16 }}&gt;
      &lt;Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}&gt;
        🚌 PKS Gdynia
      &lt;/Text&gt;

      &lt;Text style={{ fontSize: 16, marginBottom: 8 }}&gt;
        📋 Dostępne trasy: {routes.length}
      &lt;/Text&gt;

      &lt;Text style={{ fontSize: 16, marginBottom: 16 }}&gt;
        📍 Przystanki: {stops.length}
      &lt;/Text&gt;

      &lt;FlatList
        data={routes.slice(0, 10)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          &lt;TouchableOpacity
            style={{
              padding: 12,
              backgroundColor: '#f8f9fa',
              marginBottom: 8,
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor: '#EC4899'
            }}
            onPress={() => {
              // Otwórz rozkład PDF
              Linking.openURL(item.url);
            }}
          &gt;
            &lt;Text style={{ fontSize: 16, fontWeight: 'bold', color: '#EC4899' }}&gt;
              Linia {item.line}
            &lt;/Text&gt;
            &lt;Text style={{ fontSize: 14, color: '#666' }}&gt;
              {item.route}
            &lt;/Text&gt;
          &lt;/TouchableOpacity&gt;
        )}
        ListHeaderComponent={
          &lt;Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}&gt;
            🚍 Trasy autobusowe
          &lt;/Text&gt;
        }
      /&gt;
    &lt;/View&gt;
  );
}
</code></pre>";

// Example 6: WordPress shortcode
echo "<h2>🌐 Przykład 6: Shortcode WordPress</h2>";
echo "<p>Możesz stworzyć shortcode do wyświetlania danych PKS na stronie WordPress:</p>";
echo "<pre><code>// Dodaj do functions.php
function pks_routes_shortcode() {
    \$response = wp_remote_get('" . get_site_url() . "/wp-json/pks-api/v1/routes');
    \$routes = json_decode(wp_remote_retrieve_body(\$response), true);

    \$output = '&lt;h3&gt;Trasy PKS Gdynia&lt;/h3&gt;';
    \$output .= '&lt;ul&gt;';

    foreach (array_slice(\$routes, 0, 10) as \$route) {
        \$output .= \"&lt;li&gt;&lt;strong&gt;{\$route['line']}&lt;/strong&gt;: {\$route['route']}&lt;/li&gt;\";
    }

    \$output .= '&lt;/ul&gt;';
    return \$output;
}
add_shortcode('pks_routes', 'pks_routes_shortcode');

// Użyj na stronie: [pks_routes]
</code></pre>";

// Example 7: Status monitoring
echo "<h2>📊 Przykład 7: Monitorowanie statusu API</h2>";
echo "<pre><code>// Sprawdź status API
fetch('" . get_site_url() . "/wp-json/pks-api/v1/status')
  .then(response => response.json())
  .then(status => {
    console.log('Status API:', status.status);
    console.log('Wersja:', status.version);
    console.log('Trasy:', status.routes_count);
    console.log('Przystanki:', status.stops_count);
    console.log('Cache:', status.cache_status);
  });

// Automatyczne odświeżanie (co 5 minut)
setInterval(() => {
  fetch('" . get_site_url() . "/wp-json/pks-api/v1/status')
    .then(response => response.json())
    .then(status => {
      if (status.cache_status === 'expired') {
        console.log('Cache wygasł - odśwież dane');
        // Wywołaj odświeżanie w panelu admina
      }
    });
}, 5 * 60 * 1000);
</code></pre>";

// Footer with links
echo "<div style='background: #f0f8ff; padding: 20px; border: 1px solid #add8e6; margin: 20px 0;'>";
echo "<h3>🔗 Przydatne linki</h3>";
echo "<ul>";
echo "<li><a href='" . admin_url('admin.php?page=pks-api') . "' target='_blank'>📊 Panel administratora PKS API</a></li>";
echo "<li><a href='" . rest_url('pks-api/v1/status') . "' target='_blank'>📈 Status API</a></li>";
echo "<li><a href='" . rest_url('pks-api/v1/routes') . "' target='_blank'>🚍 Wszystkie trasy</a></li>";
echo "<li><a href='" . rest_url('pks-api/v1/stops') . "' target='_blank'>📍 Wszystkie przystanki</a></li>";
echo "</ul>";
echo "</div>";

echo "<hr>";
echo "<p style='text-align: center; color: #666;'>";
echo "🚌 PKS Gdynia API Plugin Examples | Kaszuby24 Team";
echo "</p>";




