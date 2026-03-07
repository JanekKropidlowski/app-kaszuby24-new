# Integracja z Kalendarzem - Kaszuby24 App

## Funkcjonalność

Aplikacja Kaszuby24 została wyposażona w funkcjonalność dodawania wydarzeń do lokalnego kalendarza urządzenia. Użytkownicy mogą teraz:

- Dodawać wydarzenia do swojego kalendarza bezpośrednio z aplikacji
- Otrzymywać powiadomienia o wydarzeniach
- Synchronizować wydarzenia z kalendarzem Google (jako fallback)

## Jak to działa

### 1. Dodawanie do kalendarza lokalnego
- Aplikacja używa `expo-calendar` do dostępu do kalendarza urządzenia
- Automatycznie prosi o uprawnienia przy pierwszym użyciu
- Dodaje wydarzenia do domyślnego kalendarza użytkownika

### 2. Fallback do kalendarza online
- Jeśli kalendarz lokalny nie jest dostępny, otwiera Google Calendar w przeglądarce
- Umożliwia dodanie wydarzenia przez stronę internetową

### 3. Obsługiwane dane wydarzeń
- **Tytuł**: Nazwa wydarzenia (z dekodowaniem HTML)
- **Data i czas**: Automatycznie ustawiane na podstawie danych z API
- **Lokalizacja**: Miasto wydarzenia
- **Opis**: Szczegółowy opis wydarzenia (oczyszczony z HTML)
- **Link**: Link do szczegółów wydarzenia

## Implementacja techniczna

### Pliki główne:
- `services/calendarService.ts` - Główny serwis obsługujący kalendarz
- `app/event/[id].tsx` - Szczegóły wydarzenia z przyciskiem kalendarza
- `app/(tabs)/kalendarz.tsx` - Lista wydarzeń z funkcją kalendarza
- `components/ModernEventList.tsx` - Komponent listy z przyciskiem kalendarza
- `components/WeekendEventsSlider.tsx` - Slider weekendowy z kalendarzem

### Uprawnienia:
- **iOS**: `NSCalendarsUsageDescription` w app.json
- **Android**: `READ_CALENDAR`, `WRITE_CALENDAR` w app.json

### Zależności:
- `expo-calendar` - Dostęp do kalendarza urządzenia
- `expo-haptics` - Wibracje przy dodawaniu wydarzeń

## Użycie

### Dla użytkowników:
1. Otwórz wydarzenie w aplikacji
2. Kliknij przycisk "Zapisz w kalendarzu" lub ikonę kalendarza
3. Potwierdź uprawnienia jeśli po raz pierwszy
4. Wydarzenie zostanie dodane do Twojego kalendarza

### Dla programistów:
```typescript
import calendarService from '@/services/calendarService';

// Dodaj wydarzenie do kalendarza
const event = calendarService.createEventFromEventData(eventData);
const success = await calendarService.addEventToCalendar(event);
```

## Obsługiwane formaty danych

Aplikacja automatycznie obsługuje:
- Dekodowanie encji HTML (&amp;, &quot;, etc.)
- Oczyszczanie znaczników HTML z opisu
- Bezpieczne parsowanie dat
- Obsługę błędów i fallbacków

## Testowanie

Funkcjonalność można przetestować:
1. Otwierając dowolne wydarzenie w aplikacji
2. Klikając przycisk kalendarza
3. Sprawdzając czy wydarzenie pojawiło się w kalendarzu urządzenia

## Rozwiązywanie problemów

### Jeśli kalendarz nie działa:
1. Sprawdź uprawnienia w ustawieniach aplikacji
2. Upewnij się, że urządzenie ma dostęp do internetu (dla fallback)
3. Sprawdź czy kalendarz urządzenia jest skonfigurowany

### Logi debugowania:
- Sprawdź konsolę dla błędów związanych z `calendarService`
- Użyj `console.log` w funkcjach kalendarza do debugowania 