# Audyt wydajności i UI/UX – 15.10.2026

Powód: ANR z Androida 15.10 (motorola edge 40 neo, główny wątek bezczynny w zrzucie). Naprawione od razu
i wypuszczone przez OTA (grupy `cf0497a9` dla 1.1.2, `f76d7786` dla 1.1.1):
- `0aac922` znaczniki Niezbędnika i map tras nie przerysowują się w kółko (`tracksViewChanges`),
- `36b648b` Sentry: release na Androidzie z versionCode, nie z iOS-owego buildNumber.

Cofnięcie OTA: `eas update:republish --group <poprzednia grupa>` (poprzednie: galeria 14.10).

Wszystko poniżej to zmiany tylko w JS (OTA), chyba że zaznaczono serwer. Kod sprawdzony przy czytaniu,
nie na telefonie.

## Paczka 1 – mały nakład, duży efekt

| # | Co | Gdzie | Skutek dla użytkownika |
|---|----|-------|------------------------|
| 1 | Start czeka na sieć: `await` sprawdzenia OTA + restart, analityka (POST bez timeoutu), powiadomienia; Clarity przy imporcie | `app/_layout.tsx:178-229`, `:48` | Splash wisi przy słabym zasięgu, przy nowym OTA apka startuje dwa razy |
| 2 | `useScrollStore()` bez selektora, `lastScrollY` w stanie | `app/(tabs)/index.tsx:270`, `_layout.tsx:22,85`, `saved.tsx:132`, `store/scrollStore.ts` | Każde przewinięcie przerysowuje cały Home i pasek kart – zacięcia |
| 3 | Wyciek GPS: cleanup zwracany z async IIFE, nie z `useEffect` | `components/transport/RouteMapView.tsx:45-56` | GPS (High) działa do zabicia procesu, bateria |
| 4 | Tryb ciemny po restarcie: `theme` nie jest zapisywany ani odtwarzany (brak `onRehydrateStorage`), brak „zgodnie z telefonem” | `store/themeStore.ts` | Po restarcie flaga „ciemny”, kolory jasne |
| 5 | `tfs()` zmniejsza tekst rozkładu na Androidzie do 9–10 pt | `transport_v2.tsx:24` + 9 plików `components/transport/*` | Godziny i linie nieczytelne |
| 6 | Dzwonek w Pogodzie prowadzi do `/(tabs)/preferences` (nie istnieje); w Niezbędniku modale bez `onRequestClose`, nagłówek `top: 50` | `weather.tsx:105`; `SorMap.tsx` karta, numery alarmowe, nagłówek | Ślepa uliczka; Wstecz nie zamyka okien; nagłówek pod wcięciem |
| 7 | Dolny pasek robi `router.push` | `components/GlobalTabBar.tsx:43-67` | Stos ekranów puchnie, Główna ładuje się od nowa |
| 8 | Znaczniki Niezbędnika jako `View`+`Image` (do ~750) – zamienić na `image=` w `Marker`, `onPress` przez id | `SorMap.tsx` | Zacięcia przy przesuwaniu mapy, ryzyko kolejnego ANR |

## Paczka 2 – średnie

- Pogoda: stan startuje z danych przykładowych (odczuwalna 17°, wilgotność 65%, ciśnienie 1013, UV 4, wiatr 45°
  na sztywno); bez sieci pokazuje losowe godziny/dni jak prawdziwe. Bez GPS brak wyboru miejscowości
  (`LocationSelectionModal` istnieje). `weather.tsx:49-62,115-116,225,616,793-834`.
- Rozkład: puste `catch` – błąd wygląda jak „Gotowy na podróż?” / „Nie znaleziono przystanku”; GPS pytany od
  wejścia; „Odjazdy z przystanku” schowane za ikoną bez podpisu + wybór przewoźnika; literówki „Znajdź połącz.”,
  „Jedziemy ?”. `transport_v2.tsx`, `TimetableModal.tsx`.
- Rozkład: przystanki 3 MB (15 709 szt.) pobierane przy każdym wejściu, 3,8 MB w AsyncStorage (ryzyko
  „Row too big”) – TTL 24 h, plik zamiast AsyncStorage, docelowo odchudzony endpoint (serwer). `transport_v2.tsx:111-190`.
- Home: zmiana kategorii zastępuje cały ekran szkieletem i ponownie pobiera pogodę/kategorie/nekrologi, lista
  ładuje się 2–3 razy (łańcuch deps). `index.tsx:503,575,666,679,842,855,1036`.
- `syncWidget()` przy każdym powrocie do apki (~7 zapytań) – ograniczyć do raz na 15–30 min. `app/_layout.tsx:101-108`.
- Błąd sieci = „brak wyników” w Szukaj (`search.tsx:181,214`), Kalendarz (`kalendarz.tsx:1586`), Odpady
  (`WasteCascadePicker.tsx`) – wariant „Brak internetu” + „Spróbuj ponownie” w `EmptyState`.
- Prośba o wsparcie wyskakuje przy wejściu w artykuł, treść „bez reklam” sprzeczna z `AdBanner`. `article/[id].tsx:551`.
- `services/api.ts`: timeout 30 s × 3 próby (~95 s), na Androidzie `no-cache` + `_=` na wszystko – 10–12 s, 1 ponowienie.

## Paczka 3 – większe

- Rozkład, Niezbędnik, `TimetableModal`, `LegDetail`, `JourneyDetailsModal` ignorują motyw (kilkaset kolorów na
  sztywno); szybko: `<StatusBar style="dark" />` na tych ekranach.
- Kalendarz: 516 KB dla samych dat, LZS po kolei zamiast równolegle; Pogoda: ~1,1 MB IMGW całej Polski (serwer:
  odchudzone endpointy).
- Artykuł: każdy `<iframe>` to od razu WebView – miniatura + WebView po tapnięciu. `article/[id].tsx:244-260`.
- Widgety: Pogoda/Powietrze/Odpady odświeżają się tylko przy otwarciu apki; fetch 12 s + 12 s w headless JS.
- Dostępność: brak `accessibilityLabel` na przyciskach z ikoną, cele dotyku 20–34 pt, brak `maxFontSizeMultiplier`
  (kafelki Menu `height: 160`, pasek zakładek o stałej wysokości).
- `ArticleCard.tsx:35`: `return null` przed hookami (mina „Rendered fewer hooks”).

## Postęp

- 15.10: audyt zrobiony.
- 15.10: Paczka 1 (punkty 1–8) wdrożona w `db7c775`, OTA grupy `f6e7065e` (1.1.2) / `3dd384cb` (1.1.1).
  Nie testowane na telefonie – sprawdzić: start bez sieci, przewijanie Home, tryb ciemny po restarcie,
  Niezbędnik na Androidzie (wielkość ikon z `image=` zależy od gęstości ekranu), Wstecz w modalach.
- 15.10: Paczka 2 wdrożona (`5bdd726`, `aa5e07e`, `b36e9e9`, `27744cc`), OTA grupy `56452ace` (1.1.2) / `cadf8b6e` (1.1.1).
  Zrobione: Pogoda (dane z godziny „teraz”, Wejherowo bez GPS, ekran błędu), Szukaj/Kalendarz/Odpady (błąd ≠ brak
  wyników), Rozkład (stany błędu, cache przystanków v2 + TTL 24 h, GPS dopiero przy „Skąd”, przycisk „Odjazdy z
  przystanku”, literówki), Home (kategorie bez pełnoekranowego szkieletu, start bez podwójnego pobierania), prośba o
  wsparcie po wyjściu z artykułu, api.ts 12 s × 1 ponowienie. Nie testowane na telefonie.
  Odjazdy z przystanku: dopisany tylko podpis przycisku – wyszukiwanie po wszystkich przewoźnikach naraz w
  `TimetableModal` jeszcze NIE zrobione. KeyboardAvoidingView `behavior="padding"` na Androidzie jest celowy
  (komentarz w kodzie, edge-to-edge) – audyt się tu mylił.
  Do zrobienia: Paczka 3 + wyszukiwanie przystanku po wszystkich przewoźnikach.
