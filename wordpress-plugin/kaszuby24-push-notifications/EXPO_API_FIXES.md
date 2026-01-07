# Poprawki dla problemu z Expo API po aktualizacji WordPressa

## Problem
Po ostatniej aktualizacji WordPressa pojawił się błąd krytyczny przy wywołaniu API do https://exp.host:
```
Fatal error: Uncaught WpOrg\Requests\Exception\InvalidArgument: 
WpOrg\Requests\Transport\Curl::request(): Argument #3 ($data) must be of type array|string, boolean given...
```

## Przyczyna
Biblioteka Requests w nowszym WordPressie wymaga, żeby parametr `body` w wywołaniach `wp_remote_post` był zawsze tablicą lub stringiem, nigdy `false`.

Problem występował w następujących miejscach:
1. **Metody bazy danych** - `get_tokens_by_preferences()`, `get_tokens_for_article()` mogły zwracać `false` zamiast tablicy
2. **Metody Expo Push** - `send_notifications()`, `send_batch()` nie sprawdzały, czy `$tokens` jest tablicą
3. **Wywołania API** - `call_expo_api()`, `get_push_receipt()`, `check_push_receipts()` nie sprawdzały, czy `wp_json_encode()` się powiódł

## Dodatkowy problem - Błąd składni PHP
Wystąpił również błąd składni PHP:
```
Parse error: syntax error, unexpected 'private' (T_PRIVATE) in class-expo-push.php on line 444
```

**Przyczyna:** Metoda `normalize_text()` była błędnie zdefiniowana w środku innej metody `optimize_image_url()`, co jest nieprawidłowe w PHP.

## Zastosowane poprawki

### 1. Naprawa błędu składni PHP
- **Przeniesienie metody `normalize_text()`** - przeniesiono z środka metody `optimize_image_url()` na właściwe miejsce w klasie (po konstruktorze)
- **Poprawienie struktury klasy** - wszystkie metody są teraz poprawnie zdefiniowane na poziomie klasy

### 2. Klasa Expo Push (`class-expo-push.php`)

#### Metoda `send_notifications()`
- Dodano sprawdzenie `!is_array($tokens)` przed przetwarzaniem
- Zwracana jest pusta tablica zamiast `false` w przypadku błędu

#### Metoda `send_batch()`
- Dodano sprawdzenie `!is_array($tokens)` na początku
- Dodano walidację każdego elementu `$token_data`
- Dodano sprawdzenie, czy `$messages` nie jest puste przed wywołaniem API

#### Metoda `call_expo_api()`
- Dodano sprawdzenie `!is_array($messages)` na początku
- Dodano sprawdzenie `wp_json_encode() !== false` przed użyciem w `body`
- Dodano logowanie błędów JSON encoding

#### Metody `get_push_receipt()` i `check_push_receipts()`
- Dodano sprawdzenie `wp_json_encode() !== false` przed użyciem w `body`
- Dodano logowanie błędów JSON encoding

### 3. Klasa Database (`class-database.php`)

#### Metody zwracające wyniki zapytań SQL
- `get_tokens_by_preferences()` - dodano sprawdzenie `$results !== false`
- `get_tokens_for_article()` - dodano sprawdzenie `$results !== false`
- `get_pending_scheduled_notifications()` - dodano sprawdzenie `$results !== false`
- `get_notification_analytics()` - dodano sprawdzenie `$results !== false`
- `get_delivery_stats()` - dodano sprawdzenie `$results !== false`
- `get_stats()` - dodano sprawdzenie dla `by_platform`

Wszystkie metody teraz zwracają pustą tablicę `array()` zamiast `false` w przypadku błędu bazy danych.

## Rezultat
- **Eliminacja błędu krytycznego** - `body` nigdy nie będzie `false`
- **Naprawa błędu składni PHP** - klasa ma poprawną strukturę
- **Lepsze logowanie błędów** - wszystkie problemy są teraz logowane
- **Graceful degradation** - w przypadku błędu zwracane są puste tablice zamiast `false`
- **Zachowanie kompatybilności** - kod działa z nowszą biblioteką Requests

## Testowanie
Po wdrożeniu poprawek:
1. **Sprawdź składnię PHP** - nie powinno być błędów składni
2. **Sprawdź logi błędów** - nie powinno być błędów związanych z `InvalidArgument`
3. **Testuj wysyłanie push notifications** - powinny działać normalnie
4. **W przypadku problemów z bazą danych** - powiadomienia nie będą wysyłane, ale nie spowodują błędu krytycznego

## Uwagi
- Poprawki są wstecznie kompatybilne
- Nie wpływają na funkcjonalność pluginu
- Dodają dodatkowe zabezpieczenia przed błędami
- Poprawiają stabilność integracji z Expo API
- **Krytyczne** - naprawiono błąd składni PHP, który uniemożliwiał działanie pluginu
