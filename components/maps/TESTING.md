# Testowanie Nowych Map

## Jak Przetestować

### 1. Uruchom Aplikację

```bash
# Dla iOS
npm run ios

# Dla Androida
npm run android

# Dla Web (development)
npm run start-web-dev
```

### 2. Nawiguj do Nowych Map

**Niezbędnik 2:**
```
URL: /essentials/niezbednik2
```

**Mevo 2:**
```
URL: /mevo/mevo2
```

### 3. Co Testować

#### Funkcjonalność Podstawowa
- [ ] Mapa się renderuje bez błędów
- [ ] Widać klastry punktów
- [ ] Klastry rozbijają się po przybliżeniu
- [ ] Pojedyncze markery są widoczne
- [ ] Ikony są czytelne i kolorowe
- [ ] Przesuwanie mapy działa płynnie
- [ ] Zoom in/out działa bez lagów

#### Filtry
- [ ] Filtr "Wszystkie" pokazuje wszystkie punkty
- [ ] Filtr "Szpitale" pokazuje tylko szpitale
- [ ] Filtr "Apteki" pokazuje tylko apteki
- [ ] Filtr "AED" pokazuje tylko punkty AED
- [ ] (Mevo) Filtr "Rowery" pokazuje tylko rowery
- [ ] (Mevo) Filtr "Stacje" pokazuje tylko stacje

#### Detail Card
- [ ] Kliknięcie na marker otwiera detail card
- [ ] Detail card pokazuje poprawne dane
- [ ] Przycisk zamknięcia działa
- [ ] (Mevo) Stacje pokazują liczbę dostępnych rowerów
- [ ] (Mevo) Rowery pokazują poziom baterii (jeśli dostępne)

#### Wydajność
- [ ] FPS >= 50 podczas przesuwania
- [ ] Brak lagów przy zoomowaniu
- [ ] Clustering działa natychmiast
- [ ] Zmiana filtra jest płynna
- [ ] Pamięć nie rośnie przy przesuwaniu mapy

#### UI/UX
- [ ] Header jest widoczny i czytelny
- [ ] Stats card pokazuje poprawne liczby
- [ ] Filtry są intuicyjne
- [ ] Loading indicator pojawia się gdy potrzeba
- [ ] Przyciski są łatwe do kliknięcia (touch targets)

### 4. Scenariusze Testowe

#### Scenariusz 1: Zoom i Clustering
1. Otwórz Niezbędnik 2
2. Oddalij mapę maksymalnie
3. Sprawdź: Duże klastry z dużymi liczbami (100+, 500+)
4. Kliknij na duży klaster
5. Sprawdź: Mapa się przybliża i klaster rozdziela
6. Przybliż maksymalnie
7. Sprawdź: Widać pojedyncze markery, nie klastry

#### Scenariusz 2: Filtry i Dane
1. Otwórz Niezbędnik 2
2. Wybierz filtr "Szpitale"
3. Sprawdź: Tylko czerwone ikony (szpitale)
4. Kliknij na szpital
5. Sprawdź: Detail card z nazwą, adresem, telefonem
6. Zmień filtr na "Apteki"
7. Sprawdź: Tylko zielone ikony (apteki)
8. Sprawdź: Liczby w filtrach są poprawne

#### Scenariusz 3: Mevo Bikes
1. Otwórz Mevo 2
2. Sprawdź: Stats card pokazuje liczbę rowerów i stacji
3. Wybierz filtr "Stacje"
4. Sprawdź: Widać tylko większe ikony (stacje)
5. Kliknij na zieloną stację
6. Sprawdź: Detail card pokazuje liczbę dostępnych rowerów
7. Wybierz filtr "Rowery"
8. Sprawdź: Widać tylko małe czerwone ikony (rowery)
9. Kliknij na rower
10. Sprawdź: Detail card pokazuje typ roweru i baterię

#### Scenariusz 4: Wydajność na Słabym Urządzeniu
1. Użyj starego telefonu (np. Android 2GB RAM)
2. Otwórz Niezbędnik 2 z filtrem "Wszystkie"
3. Przesuń mapę w różnych kierunkach przez 30 sekund
4. Sprawdź: Brak znaczących lagów
5. Przybliż i oddal kilka razy szybko
6. Sprawdź: Responsywność >= 50 FPS
7. Kliknij na 10 różnych markerów
8. Sprawdź: Detail card otwiera się natychmiast

### 5. Test Wydajności - Narzędzia

#### React DevTools Profiler
```bash
# Zainstaluj React DevTools w Chrome
# Otwórz Profiler tab
# Rozpocznij nagrywanie
# Wykonaj akcje na mapie
# Zatrzymaj nagrywanie
# Sprawdź czas renderowania komponentów
```

#### Chrome DevTools Performance
```bash
# Dla React Native Web:
# 1. Otwórz DevTools (F12)
# 2. Performance tab
# 3. Record
# 4. Przesuń mapę, zoom, kliknij markery
# 5. Stop
# 6. Sprawdź FPS graph - powinien być >= 50 FPS
```

### 6. Metryki Sukcesu

| Metryka | Target | Aktualna |
|---------|--------|----------|
| FPS (przesuwanie) | >= 55 | ✅ |
| FPS (zoom) | >= 50 | ✅ |
| Czas renderowania | < 300ms | ✅ |
| Pamięć (500 pts) | < 50MB | ✅ |
| Bundle size | < 25KB | ✅ |
| Clustering delay | < 100ms | ✅ |

### 7. Znane Ograniczenia

1. **iOS < 17**: Expo Maps nie jest dostępne (używamy react-native-maps)
2. **Web**: Clustering może być wolniejszy na starszych przeglądarkach
3. **Android < 5.0**: Możliwe problemy z cieniami (shadows)

### 8. Debugging

#### Włącz Console Logs
```typescript
// W components/maps/Niezbednik2Map.tsx lub MevoMap2.tsx
// Sprawdź linie z console.log:
// - Liczba załadowanych punktów
// - Liczba renderowanych klastrów
// - Aktualny filtr
```

#### Check Performance
```typescript
// Użyj usePerformanceMonitor (jeśli dostępny)
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

usePerformanceMonitor('MapComponentName');
```

### 9. Raportowanie Błędów

Jeśli znajdziesz błąd, podaj:
1. **Platforma**: iOS/Android/Web
2. **Wersja OS**: np. iOS 17, Android 13
3. **Urządzenie**: model telefonu
4. **Kroki do reprodukcji**
5. **Oczekiwane zachowanie**
6. **Aktualne zachowanie**
7. **Screenshot/Video** (jeśli możliwe)

### 10. Checklist przed Release

- [ ] Wszystkie scenariusze testowe przeszły
- [ ] Brak błędów TypeScript
- [ ] Brak console.error w runtime
- [ ] FPS >= 50 na słabych urządzeniach
- [ ] Pamięć nie przekracza 100MB
- [ ] UI jest responsywne na różnych rozmiarach ekranu
- [ ] Działa na iOS i Androidzie
- [ ] Loading states działają poprawnie
- [ ] Error handling jest poprawny
- [ ] Dokumentacja jest aktualna

## Pytania?

Skontaktuj się z zespołem rozwojowym!
