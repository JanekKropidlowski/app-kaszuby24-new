# Testowanie API Kaszuby24 Events bez PHP w systemie

## Wprowadzenie

Jeśli nie masz PHP dostępnego w systemie, możesz przetestować API używając przeglądarki, narzędzi online lub innych metod.

## Metoda 1: Testowanie przez przeglądarkę

### 1. Sprawdź stan bazy danych
Otwórz w przeglądarce:
```
https://twoja-domena.pl/wp-json/kaszuby24/v1/debug/database-status
```

**Oczekiwany wynik:**
- Informacje o wersji WordPress, PHP i MySQL
- Lista typów postów z liczbą postów
- Lista taksonomii z liczbą terminów
- Przykłady meta pól dla typu 'kalendarz'

### 2. Testuj konkretne zapytania
Otwórz w przeglądarce:
```
https://twoja-domena.pl/wp-json/kaszuby24/v1/debug/test-query
```

**Opcjonalne parametry:**
```
https://twoja-domena.pl/wp-json/kaszuby24/v1/debug/test-query?post_type=post&meta_key=date&taxonomy=category
```

### 3. Testuj aktywne kategorie
```
https://twoja-domena.pl/wp-json/kaszuby24/v1/events/categories/active
```

### 4. Testuj aktywne obiekty
```
https://twoja-domena.pl/wp-json/kaszuby24/v1/events/objects/active
```

### 5. Testuj nowy endpoint - aktywne filtry
```
https://twoja-domena.pl/wp-json/kaszuby24/v1/events/filters/active
```

## Metoda 2: Użycie narzędzi online

### Postman (https://www.postman.com/)
1. Stwórz nową kolekcję
2. Dodaj requesty GET dla każdego endpointu
3. Ustaw base URL: `https://twoja-domena.pl/wp-json/kaszuby24/v1`
4. Testuj endpointy jeden po drugim

### Insomnia (https://insomnia.rest/)
1. Stwórz nowy projekt
2. Dodaj requesty GET
3. Ustaw base URL
4. Testuj i analizuj odpowiedzi

## Metoda 3: Użycie cURL w PowerShell

Jeśli masz cURL dostępny w PowerShell:

```powershell
# Test stanu bazy danych
curl "https://twoja-domena.pl/wp-json/kaszuby24/v1/debug/database-status"

# Test aktywnego endpointu
curl "https://twoja-domena.pl/wp-json/kaszuby24/v1/events/filters/active"

# Test z parametrami
curl "https://twoja-domena.pl/wp-json/kaszuby24/v1/debug/test-query?post_type=kalendarz"
```

## Metoda 4: Użycie JavaScript w konsoli przeglądarki

Otwórz konsolę deweloperską (F12) na dowolnej stronie WordPress i wykonaj:

```javascript
// Test stanu bazy danych
fetch('/wp-json/kaszuby24/v1/debug/database-status')
  .then(response => response.json())
  .then(data => console.log('Database Status:', data))
  .catch(error => console.error('Error:', error));

// Test aktywnych filtrów
fetch('/wp-json/kaszuby24/v1/events/filters/active')
  .then(response => response.json())
  .then(data => console.log('Active Filters:', data))
  .catch(error => console.error('Error:', error));

// Test konkretnego zapytania
fetch('/wp-json/kaszuby24/v1/debug/test-query?post_type=kalendarz')
  .then(response => response.json())
  .then(data => console.log('Test Query:', data))
  .catch(error => console.error('Error:', error));
```

## Analiza wyników

### Poprawne odpowiedzi

#### Stan bazy danych
```json
{
  "success": true,
  "database_status": {
    "wordpress_version": "6.4.2",
    "post_types": {
      "kalendarz": {
        "count": 25,
        "total": 30
      }
    },
    "taxonomies": {
      "kategoria-wydarzenia": {
        "terms_count": 8
      }
    }
  }
}
```

#### Aktywne filtry
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

1. **404 Not Found** - sprawdź czy plugin jest aktywny
2. **500 Internal Server Error** - sprawdź logi błędów WordPress
3. **Puste wyniki** - sprawdź czy są dane w bazie
4. **Błąd CORS** - sprawdź konfigurację WordPress

## Rozwiązywanie problemów

### Problem: Endpoint zwraca 404
**Rozwiązanie:**
1. Sprawdź czy plugin jest aktywny
2. Sprawdź czy permalinks są ustawione na "Post name"
3. Sprawdź czy REST API jest włączone

### Problem: Endpoint zwraca 500
**Rozwiązanie:**
1. Sprawdź logi błędów WordPress
2. Sprawdź czy typ postu 'kalendarz' istnieje
3. Sprawdź czy taksonomie istnieją

### Problem: Puste wyniki
**Rozwiązanie:**
1. Użyj endpointu diagnostycznego
2. Sprawdź czy są posty w bazie danych
3. Sprawdź czy meta pola mają wartości

## Weryfikacja poprawek

### Przed poprawkami
- ❌ Brak endpointów diagnostycznych
- ❌ Trudne debugowanie problemów
- ❌ Brak szczegółowych informacji o błędach

### Po poprawkach
- ✅ Endpointy diagnostyczne dostępne
- ✅ Szczegółowe logowanie błędów
- ✅ Łatwe testowanie zapytań
- ✅ Informacje o stanie bazy danych

## Kontakt

W przypadku problemów:
1. Użyj endpointów diagnostycznych
2. Sprawdź logi błędów WordPress
3. Sprawdź dokumentację API
4. Użyj narzędzi online do testowania
