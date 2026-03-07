# 📊 Google Analytics Setup Guide - Kaszuby24

## Status: ✅ Kod gotowy, wymaga aktywacji w Firebase Console

---

## 🎯 CO ZOSTAŁO ZROBIONE

### 1. Zainstalowane pakiety
```bash
✓ @react-native-firebase/app
✓ @react-native-firebase/analytics
```

### 2. Utworzony serwis Analytics
**Plik:** `services/analyticsService.ts`

Zawiera gotowe metody do trackowania:
- `logArticleView()` - wyświetlenie artykułu
- `logNekrologView()` - wyświetlenie nekrologu
- `logEventView()` - wyświetlenie wydarzenia z kalendarza
- `logTransportSearch()` - wyszukiwanie transportu
- `logTimetableView()` - sprawdzenie rozkładu jazdy
- `logWeatherCheck()` - sprawdzenie pogody
- `logWasteScheduleSetup()` - ustawienie harmonogramu odpadów
- `logWasteNotificationSettings()` - konfiguracja powiadomień o odpadach
- `logSearch()` - wyszukiwanie
- `logShare()` - udostępnianie
- `logNotificationOpen()` - otwarcie powiadomienia
- `logScreenView()` - wyświetlenie ekranu
- `logAppOpen()` - otwarcie aplikacji

---

## 🚀 CO MUSISZ ZROBIĆ (10 MINUT)

### KROK 1: Włącz Google Analytics w Firebase Console

1. **Przejdź do Firebase Console:**
   ```
   https://console.firebase.google.com/
   ```

2. **Wybierz projekt:** `kaszuby24-app`

3. **Idź do Settings:**
   - Kliknij ikonę ⚙️ (Settings) w lewym górnym rogu
   - Wybierz "Project Settings"

4. **Włącz Google Analytics:**
   - Zakładka "Integrations"
   - Znajdź "Google Analytics"
   - Kliknij "Enable" / "Link"

5. **Połącz z kontem Analytics:**
   - Jeśli masz już konto Google Analytics: Wybierz je z listy
   - Jeśli nie masz: Kliknij "Create new Google Analytics account"
   - Nazwa konta: `Kaszuby24`
   - Zatwierdź połączenie

6. **Poczekaj 2-3 minuty** na aktywację

---

### KROK 2: Pobierz zaktualizowane pliki konfiguracyjne

**WAŻNE:** Po włączeniu Analytics, pliki konfiguracyjne będą zawierać dodatkowe dane!

#### Android:
1. W Firebase Console → Project Settings → General
2. Znajdź swoją aplikację Android (package: `app.kaszuby24`)
3. Kliknij "Download google-services.json"
4. **ZASTĄP** obecny plik:
   ```
   /app-kaszuby24/google-services.json
   /app-kaszuby24/android/app/google-services.json
   ```

#### iOS:
1. W Firebase Console → Project Settings → General
2. Znajdź swoją aplikację iOS (bundle: `app.kaszuby24`)
3. Kliknij "Download GoogleService-Info.plist"
4. **ZASTĄP** obecny plik:
   ```
   /app-kaszuby24/GoogleService-Info.plist
   ```

**Co się zmieni w plikach:**
- Dodany zostanie `MEASUREMENT_ID` (GA4)
- Dodany zostanie `GA_TRACKING_ID`
- Zaktualizowane API keys

---

### KROK 3: Dodaj pluginy do app.json

Otwórz `app.json` i w sekcji `"plugins"` **dodaj na końcu:**

```json
"plugins": [
  [
    "expo-notifications",
    {
      "icon": "./assets/images/icon.png",
      "color": "#ffffff",
      "defaultChannel": "default"
    }
  ],
  "expo-router",
  "expo-web-browser",
  [
    "expo-location",
    {
      "locationAlwaysAndWhenInUsePermission": "Aplikacja potrzebuje dostępu do lokalizacji, aby pokazać pogodę dla Twojej okolicy."
    }
  ],
  "@react-native-firebase/app",
  "@react-native-firebase/analytics"
]
```

---

### KROK 4: Zainicjuj Analytics w aplikacji

Otwórz `app/_layout.tsx` i dodaj na początku (po innych importach):

```typescript
import { analyticsService } from '@/services/analyticsService';
```

Następnie w `useEffect` po starcie aplikacji dodaj:

```typescript
useEffect(() => {
  // Initialize Analytics
  analyticsService.initialize().catch(console.warn);
  analyticsService.logAppOpen('direct').catch(console.warn);
}, []);
```

---

### KROK 5: Dodaj tracking do kluczowych ekranów

#### Artykuły - `app/article/[id].tsx`
```typescript
import { analyticsService } from '@/services/analyticsService';

// Po załadowaniu artykułu:
useEffect(() => {
  if (article) {
    analyticsService.logArticleView(
      article.id,
      article.title,
      article.category_id
    );
  }
}, [article]);
```

#### Nekrologi - `app/nekrologi/[id].tsx`
```typescript
import { analyticsService } from '@/services/analyticsService';

useEffect(() => {
  if (nekrolog) {
    analyticsService.logNekrologView(
      nekrolog.id,
      nekrolog.deceased_name
    );
  }
}, [nekrolog]);
```

#### Transport - `components/transport/TimetableModal.tsx`
```typescript
import { analyticsService } from '@/services/analyticsService';

// Po otwarciu rozkładu:
const fetchTimetable = async (stop: GeoJSONFeature) => {
  // ... existing code ...

  analyticsService.logTimetableView(
    stop.properties.name,
    stop.properties.agency || 'unknown'
  );
};

// Po wyszukiwaniu:
const handleSearch = (query: string) => {
  setSearchQuery(query);
  if (query.length > 2) {
    analyticsService.logTransportSearch(query);
  }
};
```

#### Pogoda - `app/(tabs)/weather.tsx`
```typescript
import { analyticsService } from '@/services/analyticsService';

useEffect(() => {
  if (location) {
    analyticsService.logWeatherCheck(location.city || 'Unknown');
  }
}, [location]);
```

#### Odpady - `app/waste/index.tsx`
```typescript
import { analyticsService } from '@/services/analyticsService';

// Po wyborze ulicy:
const handleStreetSelection = (street: string, regionId: string) => {
  // ... existing code ...

  if (selectedCity) {
    analyticsService.logWasteScheduleSetup(
      selectedCity.name,
      street
    );
  }
};

// Po zmianie ustawień notyfikacji:
const saveNotificationSettings = async (settings: NotificationSettings) => {
  // ... existing code ...

  analyticsService.logWasteNotificationSettings(
    settings.enabled,
    settings.hour,
    settings.reminderDayOffset
  );
};
```

---

### KROK 6: Rebuild aplikacji

```bash
# W katalogu app-kaszuby24/

# Prebuild (regeneruj native code z nowymi pluginami)
npx expo prebuild --clean

# Build dla Android
eas build --platform android --profile production

# Lub dla iOS
eas build --platform ios --profile production
```

---

## 📊 CO BĘDZIESZ WIDZIAŁ W GOOGLE ANALYTICS

Po wdrożeniu, w Google Analytics zobaczysz:

### Automatyczne eventy (Firebase):
- `screen_view` - wyświetlenia ekranów
- `app_open` - otwarcia aplikacji
- `session_start` - rozpoczęcie sesji
- `first_open` - pierwsze otwarcie (nowi użytkownicy)

### Twoje custom eventy:
- `article_view` - wyświetlenia artykułów
- `nekrolog_view` - wyświetlenia nekrologów
- `calendar_event_view` - wyświetlenia wydarzeń
- `transport_search` - wyszukiwania transportu
- `timetable_view` - sprawdzenia rozkładów
- `weather_check` - sprawdzenia pogody
- `waste_schedule_setup` - konfiguracje harmonogramów odpadów
- `waste_notification_settings` - ustawienia powiadomień o odpadach
- `search` - wyszukiwania ogólne
- `share` - udostępnienia
- `notification_open` - otwarcia powiadomień

### User Properties (właściwości użytkowników):
- `platform` - Android / iOS
- `app_version` - 1.0.40
- `preferred_location` - wybrana lokalizacja użytkownika
- `location_id` - ID lokalizacji

---

## 🔍 JAK SPRAWDZIĆ CZY DZIAŁA?

### 1. W Firebase Console:
```
Firebase Console → Analytics → Dashboard
```
- Po 24h zobaczysz dane użytkowników
- "Real-time" pokaże aktywność na żywo (opóźnienie ~1 min)

### 2. W Google Analytics:
```
analytics.google.com → Twoje konto → Kaszuby24
```
- Raporty: Bardziej zaawansowane analizy
- Real-time: Użytkownicy online
- Events: Wszystkie tracked eventy

### 3. Debug w aplikacji:
W logach (console) zobaczysz:
```
[Analytics] Initialized successfully
[Analytics] Screen view: Home
[Analytics] Article view: 12345
```

---

## 🛡️ GDPR & PRYWATNOŚĆ

Analytics jest zgodny z GDPR, ale musisz:

### 1. Zaktualizować Privacy Policy
Dodaj informacje o:
- Zbieraniu danych analitycznych (Firebase Analytics)
- Google Analytics 4 (GA4)
- Jakie dane są zbierane (eventy, właściwości użytkownika)
- Cel: Poprawa aplikacji, analiza użycia

### 2. Dodać opcję wyłączenia Analytics (opcjonalne)
W ustawieniach aplikacji dodaj przełącznik:

```typescript
// W settingsScreen:
import { analyticsService } from '@/services/analyticsService';

<Switch
  value={analyticsEnabled}
  onValueChange={(value) => {
    setAnalyticsEnabled(value);
    analyticsService.setAnalyticsEnabled(value);
  }}
/>
```

---

## ✅ CHECKLIST

- [ ] Włączony Google Analytics w Firebase Console
- [ ] Pobrane nowe `google-services.json` i `GoogleService-Info.plist`
- [ ] Zastąpione stare pliki konfiguracyjne
- [ ] Dodane pluginy do `app.json`
- [ ] Dodana inicjalizacja w `app/_layout.tsx`
- [ ] Dodany tracking w kluczowych ekranach:
  - [ ] Artykuły
  - [ ] Nekrologi
  - [ ] Wydarzenia
  - [ ] Transport/Rozkłady
  - [ ] Pogoda
  - [ ] Odpady
- [ ] Rebuild aplikacji (`npx expo prebuild --clean`)
- [ ] Build produkcyjny (`eas build`)
- [ ] Zaktualizowana Privacy Policy
- [ ] Sprawdzono dane w Firebase Analytics (24h po publikacji)

---

## 🆘 PROBLEMY?

### "Analytics not working"
1. Sprawdź czy pliki `google-services.json` / `GoogleService-Info.plist` zawierają `MEASUREMENT_ID`
2. Upewnij się że Analytics jest włączony w Firebase Console
3. Poczekaj 24h na pierwsze dane (Real-time działa od razu)
4. Sprawdź logi: `[Analytics] Initialized successfully`

### "Build fails"
1. Uruchom: `npx expo prebuild --clean`
2. Usuń `node_modules` i zainstaluj ponownie
3. Upewnij się że pluginy są poprawnie dodane w `app.json`

### "No data in Analytics"
1. Real-time powinien pokazać dane w ~1 min
2. Standardowe raporty: opóźnienie 24-48h
3. Sprawdź czy aplikacja jest w trybie produkcyjnym (nie debug/development)

---

## 📚 DOKUMENTACJA

- [Firebase Analytics](https://rnfirebase.io/analytics/usage)
- [Google Analytics 4](https://support.google.com/analytics/answer/9304153)
- [React Native Firebase](https://rnfirebase.io/)

---

**Status:** Gotowe do wdrożenia! 🚀
**Czas wdrożenia:** ~15 minut + rebuild (~30 min)
**Koszt:** DARMOWE (Firebase Analytics Free Tier)
