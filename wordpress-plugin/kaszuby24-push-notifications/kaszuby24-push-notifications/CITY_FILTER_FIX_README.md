# Poprawka Filtrowania Po Mieście - Kaszuby24 Plugin

## Problem
Plugin WordPress nie filtrował poprawnie wydarzeń po mieście. Mimo że w URL-u było `?city=Gdynia`, API zwracało wydarzenia z różnych miast (Gdańsk, Gdynia).

## Rozwiązanie
1. **Dodano parametr `city`** do endpointu `/events`
2. **Zaimplementowano filtrowanie po taksonomii `miasto`** zamiast meta field
3. **Poprawiono funkcję `get_events`** żeby używała taksonomii miasta
4. **Dodano test endpoint** `/test-city-taxonomy` do diagnostyki

## Zmiany w Kodzie

### 1. Endpoint `/events` - dodano parametr `city`
```php
'city' => array(
    'required' => false,
    'type' => 'string',
    'description' => 'Nazwa miasta do filtrowania'
)
```

### 2. Funkcja `get_events_with_filters` - dodano filtrowanie po mieście
```php
// Dodaj filtr miasta
if ($city) {
    $tax_queries[] = array(
        'taxonomy' => 'miasto',
        'field' => 'name',
        'terms' => $city
    );
}
```

### 3. Funkcja `get_events` - poprawiono filtrowanie po mieście
Zamieniono meta field na taksonomię:
```php
// Używamy taksonomii miasto zamiast meta field
if (isset($args['tax_query'])) {
    $args['tax_query'][] = array(
        'taxonomy' => 'miasto',
        'field' => 'name',
        'terms' => $city
    );
    $args['tax_query']['relation'] = 'AND';
}
```

## Jak Przetestować

### 1. Uruchom Test Endpoint
```bash
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/test-city-taxonomy"
```

### 2. Przetestuj Filtrowanie Po Mieście
```bash
# Test Gdynia
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/events?city=Gdynia&per_page=5"

# Test Gdańsk
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/events?city=Gdańsk&per_page=5"
```

### 3. Użyj Pliku Testowego
Otwórz `test-city-filter.html` w przeglądarce i uruchom testy.

## Struktura WordPress

### Post Type
- **Nazwa**: `kalendarz`
- **Slug**: `kalendarz`

### Taksonomia Miasta
- **Nazwa**: `miasto`
- **Slug**: `miasto`
- **Typ**: taksonomia (nie meta field)

### Przykład Użycia
```php
// Pobierz wydarzenia z Gdyni
$args = array(
    'post_type' => 'kalendarz',
    'tax_query' => array(
        array(
            'taxonomy' => 'miasto',
            'field' => 'name',
            'terms' => 'Gdynia'
        )
    )
);
```

## Debugowanie

### Logi WordPress
Sprawdź logi WordPress dla komunikatów:
```
Events API Debug - Args: ...
Events API Debug - Tax query: ...
Events API Debug - Found posts: ...
```

### Test Endpoint
Endpoint `/test-city-taxonomy` zwraca:
- Listę wszystkich taksonomii
- Informacje o taksonomii `miasto`
- Listę wszystkich miast
- Przykładowe wydarzenia z ich miastami

## Uwagi
1. **Taksonomia musi istnieć** - upewnij się że taksonomia `miasto` jest zarejestrowana
2. **Wydarzenia muszą mieć przypisane miasta** - sprawdź czy posty typu `kalendarz` mają termy taksonomii `miasto`
3. **Nazwy miast muszą być dokładne** - filtrowanie jest case-sensitive

## Status
✅ **Poprawione** - endpoint `/events` z parametrem `city`
✅ **Poprawione** - endpoint `/events/mobile` z parametrem `city`
✅ **Dodane** - test endpoint `/test-city-taxonomy`
✅ **Dodane** - plik testowy `test-city-filter.html`

## Następne Kroki
1. Przetestuj plugin na stronie
2. Sprawdź czy wszystkie wydarzenia mają przypisane miasta w taksonomii
3. Zweryfikuj czy filtrowanie działa poprawnie
4. Usuń pliki testowe po potwierdzeniu działania
