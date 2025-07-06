# Kaszuby24 Push Notifications Plugin

Plugin WordPress do obsługi push notifications dla aplikacji mobilnej Kaszuby24.

## Funkcjonalności

### 🔥 Główne funkcje
- **Rejestracja tokenów Expo Push** z aplikacji mobilnej
- **Targetowane powiadomienia** według regionów i kategorii
- **Automatyczne wysyłanie** przy publikacji artykułów
- **Panel administracyjny** do zarządzania powiadomieniami
- **Statystyki** wysłanych powiadomień
- **Obsługa nekrologów** z osobną logiką

### 📱 Integracja z aplikacją
- Endpoint: `/wp-json/kaszuby24/v1/register-expo-push-token`
- Obsługa preferencji użytkownika (regiony, kategorie)
- Automatyczna dezaktywacja nieważnych tokenów
- Logowanie wszystkich wysłanych powiadomień

## Instalacja

1. Skopiuj folder `kaszuby24-push-notifications` do `/wp-content/plugins/`
2. Aktywuj plugin w panelu administracyjnym WordPress
3. Przejdź do **Push Notifications** w menu administratora

## API Endpoints

### POST `/wp-json/kaszuby24/v1/register-expo-push-token`
Rejestruje token push z aplikacji mobilnej.

**Parametry:**
```json
{
  "pushToken": "ExponentPushToken[...]",
  "platform": "ios|android",
  "location": "Nazwa lokalizacji",
  "locationId": 123,
  "preferences": {
    "regions": [2583, 7, 2128],
    "categories": [3, 16, 24]
  }
}
```

## Targetowanie

Plugin automatycznie targetuje powiadomienia na podstawie:
- **Regionów**: Wejherowo (2583), Trójmiasto (7), Puck (2128), Reda (76797), Kościerzyna (65546), Kartuzy (65545), Lębork (65558)
- **Kategorii**: Bezpieczeństwo (17), Biznes (11), Kultura (16), Religia (22), Sport (24), Zdrowie (2246), Wiadomości (3)

## Autor

Plugin stworzony dla portalu Kaszuby24.pl 