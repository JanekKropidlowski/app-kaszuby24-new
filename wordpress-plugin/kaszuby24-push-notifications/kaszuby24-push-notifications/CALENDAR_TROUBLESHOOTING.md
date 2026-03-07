# 🔧 Rozwiązywanie Problemów z Kalendarzem Kaszuby24

## 🚨 Problem: Brak Wydarzeń i Puste Filtry

### 📋 Lista Kontrolna

#### 1. **Sprawdź Połączenie z API**
```bash
# Test podstawowego połączenia
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/test"

# Oczekiwana odpowiedź:
{
  "success": true,
  "message": "API is working",
  "timestamp": "2025-08-17 01:35:58"
}
```

#### 2. **Sprawdź Endpoint Wydarzeń**
```bash
# Test pobierania wydarzeń
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/events?page=1&per_page=5"

# Oczekiwana odpowiedź:
{
  "events": [
    {
      "id": 394944,
      "title": "Szalona komedia dla dzieci",
      "date": "1755428400",
      "categories": ["dzieci", "teatr"],
      "objects": ["Teatr Atelier Sopot"]
    }
  ]
}
```

#### 3. **Sprawdź Endpoint Filtrów**
```bash
# Test filtrów aktywnych
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/events/filters/active"

# Oczekiwana odpowiedź:
{
  "success": true,
  "categories": [...],
  "objects": [...],
  "total_categories": 19,
  "total_objects": 32
}
```

### 🔍 Diagnostyka Krok po Kroku

#### **Krok 1: Test w Przeglądarce**
1. Otwórz plik `test-calendar-api.html` w przeglądarce
2. Kliknij "Uruchom Wszystkie Testy"
3. Sprawdź wyniki każdego testu

#### **Krok 2: Sprawdź Konsolę Aplikacji**
1. Otwórz aplikację w trybie deweloperskim
2. Przejdź do zakładki Kalendarz
3. Otwórz konsolę (F12)
4. Kliknij przycisk "Odśwież"
5. Sprawdź logi z emoji (🔄✅⚠️❌)

#### **Krok 3: Sprawdź Sieć**
1. W konsoli przejdź do zakładki Network
2. Odśwież filtry
3. Sprawdź czy są wywołania do API
4. Sprawdź status odpowiedzi (200, 404, 500, etc.)

### 🐛 Typowe Problemy i Rozwiązania

#### **Problem 1: CORS Error**
```
Access to fetch at 'https://kaszuby24.pl/wp-json/kaszuby24/v1/events' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Rozwiązanie:**
- Sprawdź czy serwer ma włączone CORS
- Dodaj nagłówki CORS w WordPress
- Użyj proxy w trybie deweloperskim

#### **Problem 2: 404 Not Found**
```
GET https://kaszuby24.pl/wp-json/kaszuby24/v1/events 404
```

**Rozwiązanie:**
- Sprawdź czy plugin jest aktywowany
- Sprawdź czy permalinks są ustawione na "Post name"
- Sprawdź czy endpoint jest zarejestrowany

#### **Problem 3: 500 Internal Server Error**
```
GET https://kaszuby24.pl/wp-json/kaszuby24/v1/events 500
```

**Rozwiązanie:**
- Sprawdź logi błędów WordPress
- Sprawdź logi PHP
- Sprawdź czy baza danych jest dostępna

#### **Problem 4: Puste Dane**
```
API zwraca 200 OK ale dane są puste
```

**Rozwiązanie:**
- Sprawdź czy są wydarzenia w bazie danych
- Sprawdź czy post type `kalendarz` istnieje
- Sprawdź czy taksonomie są poprawnie przypisane

### 🛠️ Narzędzia Diagnostyczne

#### **1. Plik Testowy HTML**
```bash
# Otwórz w przeglądarce
test-calendar-api.html
```

#### **2. PowerShell Scripts**
```powershell
# Test pojedynczego endpointu
.\test-single.ps1 -Endpoint "/events"

# Test wszystkich endpointów
.\test-api.ps1
```

#### **3. cURL Commands**
```bash
# Test podstawowy
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/test"

# Test z nagłówkami
curl -H "Accept: application/json" \
     "https://kaszuby24.pl/wp-json/kaszuby24/v1/events"
```

### 📱 Diagnostyka w Aplikacji

#### **1. Sprawdź Stan Ładowania**
- Czy przycisk "Odśwież" pokazuje "Ładowanie..."?
- Czy są widoczne spinnery w przyciskach filtrów?
- Czy przyciski są wyłączone podczas ładowania?

#### **2. Sprawdź Logi w Konsoli**
```javascript
// Oczekiwane logi:
🔄 Fetching filter data...
🔄 Trying combined filters endpoint...
✅ Successfully fetched combined filters
✅ Set 19 active categories
✅ Set 32 active objects
🔄 Filter data fetch completed
```

#### **3. Sprawdź Stan Zmiennych**
```javascript
// W konsoli przeglądarki:
console.log('Categories:', categories);
console.log('Objects:', objects);
console.log('Loading filters:', loadingFilters);
```

### 🔧 Naprawy

#### **Naprawa 1: Reset Filtrów**
```javascript
// W konsoli aplikacji:
refreshFilters();
```

#### **Naprawa 2: Wymuszenie Pobrania**
```javascript
// W konsoli aplikacji:
setLoadingFilters(false);
fetchFilterData();
```

#### **Naprawa 3: Sprawdzenie Bazy Danych**
```bash
# Test stanu bazy danych
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/debug/database-status"
```

### 📞 Kontakt i Wsparcie

#### **Gdy Wszystko Zawodzi:**
1. **Sprawdź logi serwera** - mogą zawierać szczegóły błędu
2. **Sprawdź uprawnienia** - czy użytkownik ma dostęp do API
3. **Sprawdź wersje** - WordPress, PHP, MySQL
4. **Sprawdź cache** - wyczyść cache WordPress i serwera

#### **Informacje do Zgłoszenia:**
- Wersja WordPress: `6.8.2`
- Wersja PHP: `7.4.33`
- Wersja MySQL: `5.5.5`
- Plugin: `kaszuby24-push-notifications`
- Endpoint: `/events/filters/active`
- Błąd: [opis błędu]
- Logi: [skopiuj logi z konsoli]

### 🎯 Szybkie Testy

#### **Test 1: Podstawowe Połączenie**
```bash
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/test"
```

#### **Test 2: Wydarzenia**
```bash
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/events?per_page=1"
```

#### **Test 3: Filtry**
```bash
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/events/filters/active"
```

#### **Test 4: Debug**
```bash
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/debug/database-status"
```

### 📊 Status Endpointów

| Endpoint | Status | Oczekiwana Odpowiedź |
|----------|--------|----------------------|
| `/test` | ✅ | `{"success": true}` |
| `/events` | ✅ | `{"events": [...]}` |
| `/events/filters/active` | ✅ | `{"categories": [...], "objects": [...]}` |
| `/debug/database-status` | ✅ | `{"wordpress_version": "6.8.2"}` |

### 🔄 Proces Naprawy

1. **Zidentyfikuj problem** - użyj narzędzi diagnostycznych
2. **Sprawdź logi** - serwer, aplikacja, konsola
3. **Przetestuj endpointy** - użyj cURL lub pliku HTML
4. **Napraw kod** - jeśli to problem po stronie aplikacji
5. **Sprawdź serwer** - jeśli to problem po stronie API
6. **Zweryfikuj naprawę** - uruchom testy ponownie

---

**💡 Wskazówka:** Zawsze zaczynaj od testu podstawowego połączenia, a następnie przechodź do bardziej złożonych endpointów!
