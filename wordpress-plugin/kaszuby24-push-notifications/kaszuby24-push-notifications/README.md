# Kaszuby24 Push Notifications Plugin

Plugin WordPress do wysyłania powiadomień push do aplikacji mobilnej Kaszuby24.

## Funkcje

- Rejestracja tokenów Expo Push
- Wysyłanie powiadomień push z obrazkami i ikonami
- Filtrowanie odbiorców według regionów i kategorii
- Automatyczne pobieranie miniatur artykułów
- Statystyki wysyłania
- Panel administracyjny

## Nowe funkcje (v2.0)

### Obrazki w powiadomieniach
- **Automatyczne pobieranie miniatur**: Jeśli powiadomienie dotyczy artykułu (`articleId`), plugin automatycznie pobiera miniaturę artykułu
- **Własne obrazy**: Możliwość podania własnego URL obrazka w polu `image`
- **Ikona aplikacji**: Automatyczne ustawienie ikony aplikacji lub możliwość podania własnej

### API Endpoint: `/wp-json/kaszuby24/v1/send-push-notification`

#### Parametry:
```json
{
  "title": "Tytuł powiadomienia",
  "body": "Treść powiadomienia",
  "articleId": 123,           // ID artykułu (opcjonalne)
  "regions": [1, 2, 3],      // ID regionów (opcjonalne)
  "categories": [4, 5, 6],    // ID kategorii (opcjonalne)
  "image": "https://...",     // URL obrazka (opcjonalne)
  "icon": "https://..."       // URL ikony (opcjonalne)
}
```

#### Przykład użycia:
```bash
curl -X POST "https://kaszuby24.pl/wp-json/kaszuby24/v1/send-push-notification" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Nowy artykuł",
    "body": "Sprawdź najnowsze wiadomości z regionu",
    "articleId": 123,
    "regions": [2583],
    "categories": [17]
  }'
```

#### Odpowiedź:
```json
{
  "success": true,
  "message": "Notifications sent",
  "sent_count": 150,
  "failed_count": 2,
  "total_tokens": 152,
  "image_used": "https://kaszuby24.pl/wp-content/uploads/2024/01/article-thumbnail.jpg",
  "icon_used": "https://kaszuby24.pl/wp-content/uploads/2024/01/app-icon.png"
}
```

## Instalacja

1. Skopiuj pliki pluginu do katalogu `/wp-content/plugins/kaszuby24-push-notifications/`
2. Aktywuj plugin w panelu administracyjnym WordPress
3. Skonfiguruj uprawnienia w ustawieniach pluginu

## Konfiguracja

### Wymagane uprawnienia:
- `manage_options` - do wysyłania powiadomień
- `edit_posts` - do dostępu do API

### Ustawienia:
- **Batch Size**: Liczba tokenów przetwarzanych jednocześnie (domyślnie: 100)
- **Rate Limit**: Opóźnienie między batchami w milisekundach (domyślnie: 600ms)

## Obsługa błędów

Plugin automatycznie:
- Dezaktywuje nieprawidłowe tokeny
- Loguje błędy wysyłania
- Próbuje ponownie w przypadku błędów sieciowych

## Wsparcie techniczne

W przypadku problemów sprawdź:
1. Logi błędów WordPress
2. Uprawnienia API
3. Konfigurację Expo Push Service
4. Poprawność tokenów push 