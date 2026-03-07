# Kaszuby24 Events API - Dokumentacja

## Przegląd

Dodano nowe API endpointy do istniejącego pluginu Kaszuby24 Push Notifications, które umożliwiają pobieranie kategorii i obiektów wydarzeń z aktualnymi nadchodzącymi wydarzeniami.

## Endpointy

### 1. Kategorie z aktualnymi wydarzeniami

**URL:** `GET /wp-json/kaszuby24/v1/events/categories/active`

**Opis:** Zwraca tylko kategorie wydarzeń, które mają aktualne wydarzenia w określonym zakresie dat.

**Parametry:**
- `date_from` (opcjonalny): Data od w formacie Y-m-d (domyślnie: dzisiaj)
- `date_to` (opcjonalny): Data do w formacie Y-m-d (domyślnie: za 90 dni)
- `per_page` (opcjonalny): Liczba wyników na stronę (domyślnie: 100, max: 1000)

**Przykład:**
```
GET /wp-json/kaszuby24/v1/events/categories/active?date_from=2024-01-01&date_to=2024-03-31
```

**Odpowiedź:**
```json
{
  "categories": [
    {
      "id": 123,
      "name": "Koncerty",
      "slug": "koncerty",
      "description": "Wydarzenia muzyczne",
      "count": 15,
      "parent": 0,
      "link": "https://example.com/kategoria/koncerty"
    }
  ],
  "total": 1,
  "date_range": {
    "from": "2024-01-01",
    "to": "2024-03-31"
  }
}
```

### 2. Obiekty z aktualnymi wydarzeniami

**URL:** `GET /wp-json/kaszuby24/v1/events/objects/active`

**Opis:** Zwraca tylko obiekty wydarzeń, które mają aktualne wydarzenia w określonym zakresie dat.

**Parametry:** (identyczne jak w kategoriach)

### 3. Aktywne filtry dla aplikacji mobilnej (NOWY)

**URL:** `GET /wp-json/kaszuby24/v1/events/filters/active`

**Opis:** Zwraca aktywne kategorie i obiekty w jednym wywołaniu - idealne dla aplikacji mobilnej.

**Parametry:**
- `date_from` (opcjonalny): Data od w formacie Y-m-d
- `date_to` (opcjonalny): Data do w formacie Y-m-d

**Odpowiedź:**
```json
{
  "success": true,
  "categories": [...],
  "objects": [...],
  "total_categories": 5,
  "total_objects": 3,
  "date_range": {
    "from": "2024-01-01",
    "to": "2024-03-31"
  }
}
```

### 4. Wszystkie kategorie wydarzeń

**URL:** `GET /wp-json/kaszuby24/v1/events/categories`

**Opis:** Zwraca wszystkie kategorie wydarzeń (hierarchiczne lub płaskie).

**Parametry:**
- `hierarchical` (opcjonalny): Czy zwrócić hierarchiczną strukturę (domyślnie: true)

### 5. Wszystkie obiekty wydarzeń

**URL:** `GET /wp-json/kaszuby24/v1/events/objects`

**Opis:** Zwraca wszystkie obiekty wydarzeń (hierarchiczne lub płaskie).

**Parametry:** (identyczne jak w kategoriach)

### 6. Wydarzenia z filtrami

**URL:** `GET /wp-json/kaszuby24/v1/events`

**Opis:** Zwraca wydarzenia z możliwością filtrowania po kategoriach, obiektach i datach.

**Parametry:**
- `date_from` (opcjonalny): Data od w formacie Y-m-d
- `date_to` (opcjonalny): Data do w formacie Y-m-d
- `category` (opcjonalny): ID kategorii (może być lista oddzielona przecinkami)
- `object` (opcjonalny): ID obiektu (może być lista oddzielona przecinkami)
- `per_page` (opcjonalny): Liczba wyników na stronę (domyślnie: 20)
- `page` (opcjonalny): Numer strony (domyślnie: 1)

### 7. Endpoint diagnostyczny - stan bazy danych (NOWY)

**URL:** `GET /wp-json/kaszuby24/v1/debug/database-status`

**Opis:** Zwraca szczegółowe informacje o stanie bazy danych, typach postów, taksonomiach i meta polach.

**Parametry:** Brak

**Odpowiedź:**
```json
{
  "success": true,
  "database_status": {
    "wordpress_version": "6.4.2",
    "php_version": "8.1.0",
    "mysql_version": "8.0.0",
    "post_types": {
      "kalendarz": {
        "name": "kalendarz",
        "label": "Kalendarz",
        "count": 25,
        "total": 30
      }
    },
    "taxonomies": {
      "kategoria-wydarzenia": {
        "name": "kategoria-wydarzenia",
        "label": "Kategoria wydarzenia",
        "terms_count": 8,
        "sample_terms": [...]
      }
    },
    "meta_fields": {...},
    "sample_posts": [...]
  }
}
```

### 8. Endpoint diagnostyczny - test zapytań (NOWY)

**URL:** `GET /wp-json/kaszuby24/v1/debug/test-query`

**Opis:** Testuje konkretne zapytania do bazy danych i zwraca szczegółowe informacje o wynikach.

**Parametry:**
- `post_type` (opcjonalny): Typ postu do przetestowania (domyślnie: 'kalendarz')
- `meta_key` (opcjonalny): Klucz meta pola do przetestowania (domyślnie: 'sama-data')
- `taxonomy` (opcjonalny): Taksonomia do przetestowania (domyślnie: 'kategoria-wydarzenia')

**Odpowiedź:**
```json
{
  "success": true,
  "query_args": {...},
  "query_sql": "SELECT SQL_CALC_FOUND_ROWS...",
  "found_posts": 15,
  "max_pages": 2,
  "results": [...],
  "terms_count": 8,
  "sample_terms": [...]
}
```

## Struktura danych

### Kategoria/Obiekt
```json
{
  "id": 123,
  "name": "Nazwa",
  "slug": "nazwa",
  "description": "Opis",
  "count": 5,
  "parent": 0,
  "link": "https://example.com/...",
  "children": [] // Tylko dla struktury hierarchicznej
}
```

### Wydarzenie
```json
{
  "id": 789,
  "title": "Tytuł wydarzenia",
  "content": "Treść wydarzenia",
  "excerpt": "Skrót",
  "date": "2024-01-15",
  "time": "19:00",
  "end_date": "2024-01-15",
  "end_time": "22:00",
  "location": "Miasto",
  "price": "50 zł",
  "link": "https://example.com/wydarzenie/...",
  "featured_image": "https://example.com/image.jpg",
  "categories": ["Koncerty", "Muzyka"],
  "objects": ["Teatr", "Sala koncertowa"]
}
```

## Uwagi techniczne

1. **Typ postu:** Endpointy używają typu postu `kalendarz` (nie `wydarzenie`)
2. **Taksonomie:** Endpointy używają istniejących taksonomii WordPress:
   - `kategoria-wydarzenia` - dla kategorii wydarzeń
   - `obiekt` - dla obiektów wydarzeń

3. **Meta pola:** Wydarzenia używają następujących meta pól:
   - `sama-data` - data wydarzenia (timestamp)
   - `czas` - godzina rozpoczęcia
   - `data-koniec` - data zakończenia
   - `czas-koniec` - godzina zakończenia
   - `miasto` - lokalizacja
   - `cena` - cena biletu

4. **Filtrowanie:** Endpointy automatycznie filtrują tylko wydarzenia z opublikowanym statusem (`publish`)

5. **Sortowanie:** Kategorie i obiekty są sortowane malejąco po liczbie wydarzeń

6. **Paginacja:** Endpointy wydarzeń obsługują paginację z domyślnie 20 wynikami na stronę

## Przykłady użycia w aplikacji mobilnej

### Pobieranie aktywnych filtrów (zalecane)
```javascript
const response = await fetch('/wp-json/kaszuby24/v1/events/filters/active');
const data = await response.json();
// data.categories zawiera tylko kategorie z aktualnymi wydarzeniami
// data.objects zawiera tylko obiekty z aktualnymi wydarzeniami
```

### Pobieranie aktywnych kategorii
```javascript
const response = await fetch('/wp-json/kaszuby24/v1/events/categories/active');
const data = await response.json();
// data.categories zawiera tylko kategorie z aktualnymi wydarzeniami
```

### Pobieranie wydarzeń z filtrami
```javascript
const response = await fetch('/wp-json/kaszuby24/v1/events?category=123&date_from=2024-01-01');
const data = await response.json();
// data.events zawiera wydarzenia z kategorii 123 od 1 stycznia 2024
```

## Bezpieczeństwo

- Wszystkie endpointy są publiczne (`permission_callback: '__return_true'`)
- Dane są sanitizowane przed zwróceniem
- Obsługiwane są błędy z odpowiednimi kodami HTTP
- Endpointy są chronione przed bezpośrednim dostępem przez `ABSPATH` check

## Najnowsze zmiany (v1.1)

- ✅ Poprawiono typ postu z `wydarzenie` na `kalendarz`
- ✅ Poprawiono meta pole z `data_wydarzenia` na `sama-data`
- ✅ Dodano nowy endpoint `/events/filters/active` dla aplikacji mobilnej
- ✅ Poprawiono obsługę dat (timestamp zamiast DATE)
- ✅ Zoptymalizowano filtrowanie kategorii i obiektów
