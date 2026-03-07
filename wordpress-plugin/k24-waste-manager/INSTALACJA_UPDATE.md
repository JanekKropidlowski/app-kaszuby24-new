## Instrukcja aktualizacji pluginu na serwerze

### Pliki do przesłania przez FTP:

1. **`includes/class-api.php`** - zawiera nową metodę get_cities() z news_api_url
2. **`includes/class-admin.php`** - obsługa zapisywania news_api_url i news_category_id
3. **`includes/class-db.php`** - domyślne wartości dla news pól
4. **`admin/js/admin-script.js`** - zapisywanie news pól z formularza

### Kroki:

1. **Prześlij pliki przez FTP** do:
   ```
   /wp-content/plugins/k24-waste-manager/
   ```

2. **Wyczyść cache:**
   - WordPress Admin → LiteSpeed Cache → Purge All

3. **Ustaw dane dla Redy:**
   
   **OPCJA A - Przez panel (ZALECANE):**
   - Wejdź: https://kaszuby24.pl/wp-admin → Odpady Manager
   - Kliknij "Zarządzaj" przy Reda
   - Zakładka "Regiony i Ulice"
   - Sekcja "📰 Konfiguracja Aktualności":
     - URL: `https://miasto.reda.pl/wp-json/wp/v2`
     - ID Kategorii: `11`
   - Kliknij "Zapisz Wszystko"

   **OPCJA B - Przez SQL (szybkie):**
   ```sql
   UPDATE wp_options 
   SET option_value = REPLACE(
       option_value,
       '{"id":"695a6cb305fd5","name":"Reda","slug":"reda","source_url":"","source_type":"manual"}',
       '{"id":"695a6cb305fd5","name":"Reda","slug":"reda","source_url":"","source_type":"manual","news_api_url":"https://miasto.reda.pl/wp-json/wp/v2","news_category_id":11}'
   )
   WHERE option_name = 'k24_waste_cities';
   ```

4. **Sprawdź API:**
   ```bash
   curl "https://kaszuby24.pl/wp-json/kaszuby24/v2/waste-cities"
   ```
   
   Powinieneś zobaczyć:
   ```json
   [{
     "id": "695a6cb305fd5",
     "name": "Reda",
     "slug": "reda",
     "news_api_url": "https://miasto.reda.pl/wp-json/wp/v2",
     "news_category_id": 11
   }]
   ```

5. **Przetestuj w aplikacji:**
   - Przeładuj aplikację
   - Wejdź w Odpady → Reda
   - Powinna pojawić się ikona 📰 Newspaper w prawym górnym rogu

### Debugowanie:

Jeśli ikona się nie pokazuje, sprawdź logi w konsoli:
```
[WasteNews] Fetching for city: Reda URL: ... Category: ...
[WasteNews] Fetched X articles
```

Jeśli pokazuje "No news_api_url configured" - dane nie zostały zapisane w bazie.
