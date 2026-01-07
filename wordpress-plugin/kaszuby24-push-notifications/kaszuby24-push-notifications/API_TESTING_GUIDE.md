# Przewodnik testowania API Kaszuby24 Events

## Wprowadzenie

Ten dokument zawiera instrukcje jak przetestować poprawione API dla kalendarza wydarzeń w pluginie Kaszuby24 Push Notifications.

## Co zostało poprawione

### 1. Poprawki w typach postów
- ✅ Zmieniono typ postu z `wydarzenie` na `kalendarz`
- ✅ Poprawiono meta pole z `data_wydarzenia` na `sama-data`
- ✅ Poprawiono obsługę dat (timestamp zamiast DATE)

### 2. Nowe endpointy
- ✅ Dodano `/events/filters/active` - zwraca aktywne kategorie i obiekty w jednym wywołaniu

### 3. Optymalizacje
- ✅ Kategorie i obiekty pokazują tylko te z aktualnymi wydarzeniami
- ✅ Poprawiono filtrowanie po datach
- ✅ Dodano sortowanie po liczbie wydarzeń

## Jak przetestować

### Krok 1: Aktywuj plugin
Upewnij się, że plugin `Kaszuby24 Push Notifications` jest aktywny w WordPress.

### Krok 2: Użyj pliku testowego
1. Skopiuj plik `test-api.php` do głównego katalogu WordPress
2. Otwórz w przeglądarce: `https://twoja-domena.pl/test-api.php`
3. Zaloguj się jako administrator jeśli wymagane

### Krok 3: Testuj endpointy ręcznie

#### Test 1: Aktywne kategorie
```bash
curl "https://twoja-domena.pl/wp-json/kaszuby24/v1/events/categories/active"
```

#### Test 2: Aktywne obiekty
```bash
curl "https://twoja-domena.pl/wp-json/kaszuby24/v1/events/objects/active"
```

#### Test 3: Nowy endpoint - aktywne filtry
```bash
curl "https://twoja-domena.pl/wp-json/kaszuby24/v1/events/filters/active"
```

#### Test 4: Wydarzenia z filtrami
```bash
curl "https://twoja-domena.pl/wp-json/kaszuby24/v1/events?per_page=5"
```

#### Test 5: Endpoint diagnostyczny - stan bazy danych (NOWY)
```bash
curl "https://twoja-domena.pl/wp-json/kaszuby24/v1/debug/database-status"
```

#### Test 6: Endpoint diagnostyczny - test zapytań (NOWY)
```bash
curl "https://twoja-domena.pl/wp-json/kaszuby24/v1/debug/test-query"
curl "https://twoja-domena.pl/wp-json/kaszuby24/v1/debug/test-query?post_type=post&meta_key=date&taxonomy=category"
```

## Oczekiwane wyniki

### Poprawne odpowiedzi

#### Aktywne kategorie
```json
{
  "categories": [
    {
      "id": 123,
      "name": "Koncerty",
      "count": 15
    }
  ],
  "total": 1
}
```

#### Aktywne filtry (nowy endpoint)
```json
{
  "success": true,
  "categories": [...],
  "objects": [...],
  "total_categories": 5,
  "total_objects": 3
}
```

### Błędy do sprawdzenia

1. **404 Not Found** - sprawdź czy typ postu `kalendarz` istnieje
2. **500 Internal Server Error** - sprawdź logi błędów WordPress
3. **Puste wyniki** - sprawdź czy są wydarzenia w bazie danych

## Rozwiązywanie problemów

### Problem: Brak wydarzeń w wynikach
**Rozwiązanie:**
1. Sprawdź czy istnieją posty typu `kalendarz`
2. Sprawdź czy mają meta pole `sama-data` z datą
3. Sprawdź czy daty są w formacie timestamp

### Problem: Błąd 500
**Rozwiązanie:**
1. Sprawdź logi błędów WordPress
2. Sprawdź czy taksonomie `kategoria-wydarzenia` i `obiekt` istnieją
3. Sprawdź uprawnienia użytkownika

### Problem: Nieprawidłowe daty
**Rozwiązanie:**
1. Sprawdź format meta pola `sama-data`
2. Upewnij się że daty są w formacie timestamp
3. Sprawdź strefę czasową WordPress

### Problem: Endpointy diagnostyczne nie działają
**Rozwiązanie:**
1. Użyj endpointu `/debug/database-status` aby sprawdzić strukturę bazy danych
2. Użyj endpointu `/debug/test-query` aby przetestować konkretne zapytania
3. Sprawdź logi błędów w konsoli WordPress

### Problem: Kategorie pokazują 0 wydarzeń
**Rozwiązanie:**
1. Sprawdź czy taksonomia `kategoria-wydarzenia` ma przypisane posty
2. Sprawdź czy meta pole `sama-data` ma poprawne wartości
3. Użyj endpointu diagnostycznego aby zweryfikować dane

## Integracja z aplikacją mobilną

### Endpoint dla filtrów modalu
Użyj nowego endpointu `/events/filters/active` w aplikacji mobilnej:

```javascript
// Pobierz aktywne filtry
const response = await fetch('/wp-json/kaszuby24/v1/events/filters/active');
const data = await response.json();

// Pokaż tylko kategorie z wydarzeniami
const activeCategories = data.categories;
const activeObjects = data.objects;

// Użyj w filtrze modalu
showFilterModal({
  categories: activeCategories,
  objects: activeObjects
});
```

### Filtrowanie wydarzeń
```javascript
// Pobierz wydarzenia z aktywnych kategorii
const categoryIds = activeCategories.map(cat => cat.id).join(',');
const response = await fetch(`/wp-json/kaszuby24/v1/events?category=${categoryIds}`);
const events = await response.json();
```

## Weryfikacja poprawek

### Przed poprawkami
- ❌ Kategorie pokazywały wszystkie (nawet bez wydarzeń)
- ❌ Używano nieprawidłowego typu postu `wydarzenie`
- ❌ Problemy z formatem dat

### Po poprawkach
- ✅ Kategorie pokazują tylko te z aktualnymi wydarzeniami
- ✅ Używa poprawnego typu postu `kalendarz`
- ✅ Poprawne formatowanie dat (timestamp)
- ✅ Nowy endpoint dla aplikacji mobilnej
- ✅ Optymalne filtrowanie

## Kontakt

W przypadku problemów:
1. Sprawdź logi błędów WordPress
2. Użyj pliku testowego `test-api.php`
3. Sprawdź dokumentację API w `EVENTS_API_README.md`
