# 🚌 PKS GDYNIA API PLUGIN

Niezależny plugin WordPressa dostarczający REST API dla rozkładów jazdy PKS Gdynia.

## ✨ Funkcje

- 🚍 **91 tras autobusowych** PKS Gdynia
- 📍 **102 przystanki** z współrzędnymi GPS
- 🔄 **Automatyczne odświeżanie** danych (cache 24h)
- 📊 **REST API** endpoints
- 🎛️ **Panel administratora** z statystykami
- 📄 **PDF rozkłady** jazdy

## 📋 Wymagania

- WordPress 5.0+
- PHP 7.4+
- MySQL 5.6+

## 🚀 Instalacja

1. **Pobierz plugin**
   ```bash
   cd wp-content/plugins/
   git clone https://github.com/twoje-repo/pks-api-plugin.git
   ```

2. **Aktywuj plugin**
   - Przejdź do `Wtyczki` w panelu WordPress
   - Znajdź "PKS Gdynia API"
   - Kliknij `Aktywuj`

3. **Sprawdź status**
   - Przejdź do `PKS API` w menu administratora
   - Sprawdź status API

## 📡 API Endpoints

### Pobierz wszystkie trasy
```
GET /wp-json/pks-api/v1/routes
```
**Odpowiedź:**
```json
[
  {
    "id": "1",
    "line": "1",
    "route": "Linia Po Pucku",
    "from": "Gdynia",
    "to": "Puck",
    "url": "https://pksgdynia.pl/rozklad_jazdy/1/",
    "source": "pks-website"
  }
]
```

### Pobierz przystanki
```
GET /wp-json/pks-api/v1/stops?search=Gdynia&limit=10
```
**Parametry:**
- `search` - wyszukiwanie po nazwie
- `limit` - maksymalna liczba wyników

### Pobierz rozkład trasy
```
GET /wp-json/pks-api/v1/schedule/1
```

### Wyszukaj połączenia
```
GET /wp-json/pks-api/v1/search?from=Gdynia&to=Gdańsk&date=2026-01-01
```

### Status API
```
GET /wp-json/pks-api/v1/status
```

## 🎛️ Panel Administratora

### Dashboard
- 📊 Statystyki: liczba tras, przystanków, status cache
- 🔄 Przycisk odświeżania danych
- 📋 Lista najnowszych tras

### Ustawienia (planowane)
- ⏰ Czas wygaśnięcia cache
- 🤖 User Agent dla requestów
- ⏱️ Timeout połączeń

## 🔧 Użycie w Kodzie

### JavaScript/React Native
```javascript
// Pobierz trasy
const response = await fetch('/wp-json/pks-api/v1/routes');
const routes = await response.json();

// Pobierz przystanki
const stopsResponse = await fetch('/wp-json/pks-api/v1/stops?search=Gdynia');
const stops = await stopsResponse.json();

// Znajdź najbliższe przystanki
async function findNearbyStops(lat, lon) {
  const allStops = await fetch('/wp-json/pks-api/v1/stops').then(r => r.json());

  return allStops
    .map(stop => ({
      ...stop,
      distance: calculateDistance(lat, lon, stop.lat, stop.lon)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
}
```

### PHP
```php
// Pobierz trasy
$routes = wp_remote_get('https://twoja-domena.pl/wp-json/pks-api/v1/routes');
$routes_data = json_decode(wp_remote_retrieve_body($routes));

// Pobierz przystanki
$stops = wp_remote_get('https://twoja-domena.pl/wp-json/pks-api/v1/stops');
$stops_data = json_decode(wp_remote_retrieve_body($stops));
```

## 📁 Struktura Plików

```
pks-api-plugin/
├── pks-api.php                 # Główny plik pluginu
├── includes/
│   ├── class-pks-api.php       # REST API handler
│   └── class-pks-scraper.php   # Web scraper
├── pks_stops_data.json         # Dane przystanków
├── README.md                   # Dokumentacja
└── assets/                     # CSS/JS (planowane)
```

## 🔄 Mechanizm Cache

- **Tabela bazy danych**: `wp_pks_api_cache`
- **Czas życia**: 24 godziny
- **Automatyczne czyszczenie**: Cron job codziennie
- **Ręczne odświeżanie**: Przycisk w panelu admina

## 🐛 Troubleshooting

### Problem: Brak danych tras
```
Rozwiązanie: Przejdź do panelu PKS API → "Odśwież Dane PKS"
```

### Problem: HTTP 503 Service Unavailable
```
Rozwiązanie: Sprawdź połączenie internetowe, spróbuj ponownie za 5 minut
```

### Problem: Puste wyniki wyszukiwania
```
Rozwiązanie: Sprawdź pisownię, spróbuj krótsze zapytanie
```

## 📞 Kontakt

- **Autor**: Kaszuby24 Team
- **Wersja**: 1.0.0
- **Licencja**: GPL v2 or later

## 🔄 Plany Rozwoju

- [ ] Wyszukiwanie połączeń w czasie rzeczywistym
- [ ] Integracja z Google Maps
- [ ] Notyfikacje o zmianach rozkładów
- [ ] API dla innych przewoźników PKS
- [ ] Aplikacja mobilna PKS

---

**Plugin jest całkowicie niezależny i nie wymaga innych wtyczek Kaszuby24!** 🎉
