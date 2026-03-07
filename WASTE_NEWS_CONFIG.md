# Konfiguracja Aktualności dla Odpadów

## ✅ Zmiany w kodzie - GOTOWE

### 1. Backend WordPress
- Dodano pola `news_api_url` i `news_category_id` do struktury miast
- Rozszerzono formularz w panelu admin o sekcję "📰 Konfiguracja Aktualności"
- Aktualizowano zapisywanie meta danych miast

### 2. Frontend React Native
- Dodano interfejs `WasteNewsArticle` w `WasteScheduleService.ts`
- Dodano metodę `getNewsArticles()` do pobierania artykułów WordPress
- Zaktualizowano komponent `app/waste/index.tsx`:
  - Zamieniono `announcements` na `newsArticles`
  - Dodano wyświetlanie featured image
  - Zmieniono tytuł z "Komunikaty" na "Aktualności"
  - Obsługa pełnej struktury WordPress posts (title.rendered, content.rendered)

## 🔧 Konfiguracja w Panelu WordPress

### Dla miasta Reda:

1. **Wejdź na:** https://kaszuby24.pl/wp-admin → **Odpady Manager**

2. **Kliknij "Zarządzaj"** przy mieście Reda

3. **W zakładce "Regiony i Ulice"** przewiń do sekcji **"📰 Konfiguracja Aktualności (WordPress API)"**

4. **Wypełnij pola:**
   ```
   URL do WordPress REST API: https://miasto.reda.pl/wp-json/wp/v2
   ID Kategorii: 11
   ```

5. **Kliknij "Zapisz Wszystko"**

### Informacje o kategorii:
- **Nazwa:** "Aktualne informacje o odpadach"
- **ID:** 11
- **Link:** https://miasto.reda.pl/category/informacja-o-odpadach/
- **Liczba artykułów:** 61
- **Przykładowe tytuły:**
  - "Zmiana harmonogramu w grudniu (święta) dla sektora 5 i 6"
  - "System Kaucyjny"
  - "Odbiór odpadów wielkogabarytowych"

## 📱 Działanie w aplikacji

Po konfiguracji, w sekcji odpadów:

1. **Ikona dzwonka (🔔)** - pojawi się gdy są artykuły z danego miasta
2. **Przewijane karty** - mini-podgląd artykułów z datą publikacji
3. **"Zobacz wszystkie"** - otwiera modal z listą wszystkich artykułów
4. **Kliknięcie w artykuł** - wyświetla pełną treść z obrazkiem wyróżniającym

### Przykład struktury API:
```json
{
  "id": 97560,
  "date": "2024-12-19T10:30:00",
  "title": {
    "rendered": "Zmiana harmonogramu w grudniu"
  },
  "content": {
    "rendered": "<p>Treść artykułu...</p>"
  },
  "excerpt": {
    "rendered": "<p>Krótki opis...</p>"
  },
  "_embedded": {
    "wp:featuredmedia": [{
      "source_url": "https://miasto.reda.pl/wp-content/uploads/2024/12/odpady.jpg"
    }]
  }
}
```

## 🌆 Dodawanie innych miast

Dla każdego nowego miasta (Gdynia, Wejherowo, etc.):

1. Znajdź URL WordPress API miasta (np. `https://gdynia.pl/wp-json/wp/v2`)
2. Sprawdź kategorie: `curl "https://gdynia.pl/wp-json/wp/v2/categories"`
3. Znajdź ID kategorii związanej z odpadami
4. Wpisz w konfiguracji miasta w panelu admin

## 🔍 Weryfikacja

Sprawdź działanie API:
```bash
# Pobranie artykułów
curl "https://miasto.reda.pl/wp-json/wp/v2/posts?categories=11&per_page=5&_embed"

# Lista kategorii
curl "https://miasto.reda.pl/wp-json/wp/v2/categories"
```

## ⚡ Fallback

Jeśli miasto nie ma skonfigurowanego `news_api_url`, aplikacja:
- Nie wyświetli ikony dzwonka
- Nie pokazuje sekcji aktualności
- Działa normalnie z harmonogramem odpadów
