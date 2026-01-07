# Kalendarz Kaszuby24 - Ulepszone Filtry

## Przegląd

Filtry kalendarza zostały znacząco ulepszone, aby pokazywać tylko te kategorie i obiekty, które mają faktycznie aktywne, nadchodzące wydarzenia. Zamiast pobierać wszystkie dostępne kategorie i obiekty z WordPress, aplikacja teraz używa dedykowanych endpointów API, które filtrują dane po stronie serwera.

## Nowe Endpointy API

### 1. `/events/filters/active` (Zalecany)
- **URL**: `https://kaszuby24.pl/wp-json/kaszuby24/v1/events/filters/active`
- **Opis**: Pobiera wszystkie aktywne filtry (kategorie i obiekty) za jednym wywołaniem
- **Odpowiedź**: 
```json
{
  "success": true,
  "filters": {
    "categories": [...],
    "objects": [...]
  }
}
```

### 2. `/events/categories/active`
- **URL**: `https://kaszuby24.pl/wp-json/kaszuby24/v1/events/categories/active`
- **Opis**: Pobiera tylko aktywne kategorie z nadchodzącymi wydarzeniami
- **Odpowiedź**:
```json
{
  "success": true,
  "categories": [
    {
      "id": 123,
      "name": "Koncerty",
      "slug": "koncerty",
      "parent": 0,
      "events_count": 5
    }
  ]
}
```

### 3. `/events/objects/active`
- **URL**: `https://kaszuby24.pl/wp-json/kaszuby24/v1/events/objects/active`
- **Opis**: Pobiera tylko aktywne obiekty z nadchodzącymi wydarzeniami
- **Odpowiedź**:
```json
{
  "success": true,
  "objects": [
    {
      "id": 456,
      "name": "Hala Sportowa",
      "slug": "hala-sportowa",
      "parent": 0,
      "events_count": 3
    }
  ]
}
```

## Funkcjonalności w Aplikacji

### Przycisk "Odśwież"
- Nowy przycisk w interfejsie filtrów
- Odświeża dane filtrów z API
- Pokazuje stan ładowania (spinner + "Ładowanie...")
- Automatycznie wyłącza się podczas ładowania

### Inteligentne Pobieranie
1. **Pierwsza próba**: Endpoint `/events/filters/active`
2. **Fallback**: Jeśli się nie powiedzie, używa indywidualnych endpointów
3. **Obsługa błędów**: Szczegółowe logowanie w konsoli

### Lepsze Informacje
- Liczba dostępnych kategorii: `Kategoria (15)`
- Liczba dostępnych obiektów: `Obiekt (8)`
- Stan ładowania w przyciskach filtrów
- Automatyczne odświeżanie po zmianach

## Korzyści

### Dla Użytkowników
- **Szybsze ładowanie**: Mniej niepotrzebnych danych
- **Lepsze filtry**: Tylko aktywne kategorie/obiekty
- **Jasne informacje**: Liczba dostępnych opcji
- **Responsywność**: Stan ładowania w czasie rzeczywistym

### Dla Deweloperów
- **Optymalizacja API**: Mniej zapytań do bazy danych
- **Fallback system**: Odporność na błędy
- **Szczegółowe logowanie**: Łatwiejsze debugowanie
- **Modułowość**: Łatwe dodawanie nowych filtrów

## Techniczne Szczegóły

### Struktura Danych
```typescript
interface EventCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number; // events_count z API
  description?: string;
}

interface Object {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number; // events_count z API
}
```

### Logowanie
Wszystkie operacje są logowane w konsoli z emoji:
- 🔄 - Operacja w toku
- ✅ - Sukces
- ⚠️ - Ostrzeżenie
- ❌ - Błąd

### Obsługa Błędów
1. **Timeout**: Automatyczny fallback po błędzie
2. **Retry**: Próba ponownego pobrania
3. **Graceful degradation**: Aplikacja działa nawet z błędami API

## Testowanie

### W Przeglądarce
```bash
# Test głównego endpointu
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/events/filters/active"

# Test kategorii
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/events/categories/active"

# Test obiektów
curl "https://kaszuby24.pl/wp-json/kaszuby24/v1/events/objects/active"
```

### W Aplikacji
1. Otwórz zakładkę Kalendarz
2. Kliknij przycisk "Odśwież"
3. Sprawdź konsolę deweloperską
4. Zweryfikuj liczbę kategorii/obiektów w przyciskach

## Rozwiązywanie Problemów

### Brak Danych
- Sprawdź logi w konsoli
- Zweryfikuj endpointy API
- Sprawdź połączenie z serwerem

### Wolne Ładowanie
- Użyj endpointu `/events/filters/active`
- Sprawdź cache WordPress
- Zweryfikuj wydajność bazy danych

### Błędy API
- Sprawdź logi serwera
- Zweryfikuj uprawnienia użytkownika
- Sprawdź konfigurację WordPress

## Przyszłe Ulepszenia

- [ ] Cache filtrów po stronie klienta
- [ ] Automatyczne odświeżanie co X minut
- [ ] Filtry geolokalizacyjne
- [ ] Personalizowane filtry użytkownika
- [ ] Synchronizacja z kalendarzem systemowym
