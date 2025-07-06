# Instrukcja instalacji - Kaszuby24 Push Notifications Plugin

## 1. Przygotowanie

Przed instalacją upewnij się, że masz:
- WordPress 5.0 lub nowszy
- PHP 7.4 lub nowszy
- Dostęp do panelu administracyjnego WordPress
- Dostęp FTP/SFTP do serwera

## 2. Instalacja pluginu

### Opcja A: Przez panel WordPress (zalecana)
1. Spakuj folder `kaszuby24-push-notifications` do pliku ZIP
2. W panelu WordPress przejdź do **Wtyczki > Dodaj nową**
3. Kliknij **Wyślij wtyczkę na serwer**
4. Wybierz plik ZIP i kliknij **Zainstaluj teraz**
5. Aktywuj plugin

### Opcja B: Przez FTP
1. Skopiuj cały folder `kaszuby24-push-notifications` do `/wp-content/plugins/`
2. W panelu WordPress przejdź do **Wtyczki**
3. Znajdź "Kaszuby24 Push Notifications" i kliknij **Aktywuj**

## 3. Konfiguracja po instalacji

### Sprawdź utworzone tabele
Plugin automatycznie utworzy tabele w bazie danych:
- `wp_kaszuby24_push_tokens`
- `wp_kaszuby24_push_logs`

### Skonfiguruj ustawienia
1. Przejdź do **Push Notifications > Ustawienia**
2. Włącz "Automatyczne wysyłanie"
3. Ustaw rozmiar paczki (zalecane: 100)
4. Ustaw limit czasu (zalecane: 600ms)

## 4. Test działania

### Test 1: Sprawdź API endpoint
Otwórz w przeglądarce:
```
https://twoja-domena.pl/wp-json/kaszuby24/v1/register-expo-push-token
```

Powinieneś zobaczyć błąd 405 (Method Not Allowed) - to oznacza, że endpoint działa.

### Test 2: Wyślij powiadomienie testowe
1. Przejdź do **Push Notifications**
2. W sekcji "Wyślij powiadomienie testowe"
3. Wprowadź token testowy: `ExponentPushToken[test]`
4. Wprowadź tytuł i treść
5. Kliknij "Wyślij test"

### Test 3: Sprawdź logi
1. Przejdź do **Push Notifications > Statystyki**
2. Sprawdź czy logi są zapisywane

## 5. Integracja z aplikacją mobilną

### Endpoint rejestracji
Aplikacja mobilna powinna wysyłać POST na:
```
https://twoja-domena.pl/wp-json/kaszuby24/v1/register-expo-push-token
```

### Przykład żądania z aplikacji
```javascript
fetch('https://kaszuby24.pl/wp-json/kaszuby24/v1/register-expo-push-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    pushToken: 'ExponentPushToken[...]',
    platform: 'ios',
    location: 'Puck',
    locationId: 2128,
    preferences: {
      regions: [2128],
      categories: [3, 16]
    }
  })
});
```

## 6. Rozwiązywanie problemów

### Problem: Plugin nie aktywuje się
- Sprawdź czy PHP jest w wersji 7.4+
- Sprawdź logi błędów WordPress
- Sprawdź czy wszystkie pliki zostały skopiowane

### Problem: Brak menu "Push Notifications"
- Sprawdź czy jesteś zalogowany jako administrator
- Sprawdź czy plugin jest aktywowany
- Wyczyść cache jeśli używasz pluginów cache'ujących

### Problem: Błędy 500 na endpointach API
- Sprawdź logi błędów serwera
- Sprawdź czy rewrite rules są odświeżone (Ustawienia > Stałe odnośniki > Zapisz)
- Sprawdź uprawnienia plików

### Problem: Powiadomienia nie są wysyłane
- Sprawdź ustawienia "Automatyczne wysyłanie"
- Sprawdź czy artykuły nie mają kategorii "Sponsored" (ID: 554)
- Sprawdź logi w **Push Notifications > Statystyki**

## 7. Bezpieczeństwo

### Zalecenia bezpieczeństwa
- Regularnie aktualizuj WordPress
- Używaj silnych haseł
- Ogranicz dostęp do panelu administracyjnego
- Monitoruj logi wysłanych powiadomień

### Backup
Przed instalacją zrób backup:
- Bazy danych
- Plików WordPress
- Konfiguracji serwera

## 8. Wsparcie

W przypadku problemów:
1. Sprawdź logi błędów WordPress (`wp-content/debug.log`)
2. Sprawdź logi serwera
3. Sprawdź dokumentację w pliku `README.md`
4. Skontaktuj się z administratorem systemu

## 9. Aktualizacje

Aby zaktualizować plugin:
1. Dezaktywuj starą wersję
2. Usuń stare pliki pluginu
3. Zainstaluj nową wersję
4. Aktywuj plugin
5. Sprawdź czy wszystko działa poprawnie

**Uwaga:** Tabele bazy danych i dane zostaną zachowane. 