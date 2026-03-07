# Sprawdzanie logów PHP

## JavaScript wysyła poprawnie:
✅ `news_api_url: "https://miasto.reda.pl/wp-json/wp/v2"`
✅ `news_category_id: 11`

## Teraz sprawdź logi PHP:

### 1. Włącz debug w WordPress (jeśli nie jest włączony)

Edytuj `wp-config.php` i dodaj:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

### 2. Sprawdź plik logów

Połącz się przez FTP/SSH i otwórz:
```
/wp-content/debug.log
```

### 3. Zapisz ponownie dane w panelu

Kliknij "Zapisz Wszystko" jeszcze raz i sprawdź w `debug.log`:

```
K24 Waste: Saving meta for reda: Array ( [source_url] => ... [news_api_url] => https://miasto.reda.pl/wp-json/wp/v2 [news_category_id] => 11 )
K24 Waste: Updated city meta: Array ( ... )
K24 Waste: update_option result: true
```

### 4. Jeśli nie ma logów

Znaczy że funkcja `ajax_save_regions` w PHP nie jest wywoływana.

Sprawdź czy plik `class-admin.php` został zaktualizowany na serwerze:
- Data modyfikacji powinna być najnowsza
- Wyczyść cache LiteSpeed: Admin → LiteSpeed Cache → Purge All
- Wyczyść cache przeglądarki: Ctrl+Shift+R

### 5. Test ręczny przez SQL

Jeśli logi pokazują że zapisuje ale nadal nie działa, zaktualizuj bezpośrednio w bazie:

```sql
-- Sprawdź aktualną wartość
SELECT * FROM wp_options WHERE option_name = 'k24_waste_cities';

-- Zaktualizuj ręcznie
UPDATE wp_options 
SET option_value = '[{"id":"695a6cb305fd5","name":"Reda","slug":"reda","source_url":"","source_type":"manual","news_api_url":"https://miasto.reda.pl/wp-json/wp/v2","news_category_id":11}]'
WHERE option_name = 'k24_waste_cities';
```

### 6. Sprawdź API po zapisie

```bash
curl "https://kaszuby24.pl/wp-json/kaszuby24/v2/waste-cities"
```

Powinno zwrócić:
```json
[{
  "id": "695a6cb305fd5",
  "name": "Reda",
  "slug": "reda",
  "news_api_url": "https://miasto.reda.pl/wp-json/wp/v2",
  "news_category_id": 11
}]
```

## Prześlij mi wynik z debug.log!
