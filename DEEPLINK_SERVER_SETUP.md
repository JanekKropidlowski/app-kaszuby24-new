# Konfiguracja serwera dla Universal Links (iOS) i App Links (Android)

Aby linki `https://kaszuby24.pl/...` otwierały się w aplikacji mobilnej, należy umieścić na serwerze dwa pliki konfiguracyjne.

---

## ⚠️ **WAŻNE: Aktualizacja wymagana na serwerze**

**Obecny plik `apple-app-site-association` na serwerze ma tylko `"paths": ["*"]`, ale dla lepszej kompatybilności zalecamy zaktualizowanie go zgodnie z poniższymi instrukcjami.**

---

## 1. Konfiguracja dla iOS (Universal Links)

**Krok 1: Utwórz plik**

Nazwij plik `apple-app-site-association` (bez żadnego rozszerzenia, np. `.txt` czy `.json`).

**Krok 2: Wklej poniższą zawartość do pliku**

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "Y73JSC36P8.app.kaszuby24",
        "paths": [
          "*",
          "/nekrolog/*",
          "/kalendarz/*",
          "/wydarzenia",
          "/nekrologi-2"
        ]
      }
    ]
  }
}
```

**Krok 3: Umieść plik na serwerze**

Plik musi być dostępny pod jednym z poniższych adresów:
- `https://kaszuby24.pl/apple-app-site-association`
- `https://kaszuby24.pl/.well-known/apple-app-site-association`

**Ważne:** Serwer musi serwować ten plik z nagłówkiem `Content-Type: application/json`. Nie może być żadnych przekierowań (redirects).

---

## 2. Konfiguracja dla Androida (App Links)

**Krok 1: Utwórz plik**

Nazwij plik `assetlinks.json`.

**Krok 2: Wklej poniższą zawartość do pliku**

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.kaszuby24",
    "sha256_cert_fingerprints": [
      "B3:26:2A:42:0B:A9:63:39:6C:C5:3C:93:31:73:7D:81:4A:A4:4E:2A:80:A2:35:0E:64:99:95:67:3E:C5:9F:8A",
      "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"
    ]
  }
}]
```
*Uwaga: pierwszy odcisk to build produkcyjny, drugi to debug keystore (do testów lokalnych).*

**Krok 3: Umieść plik na serwerze**

Plik musi być dostępny pod adresem:
- `https://kaszuby24.pl/.well-known/assetlinks.json`

**Ważne:** Serwer musi serwować ten plik z nagłówkiem `Content-Type: application/json` i nie może być żadnych przekierowań.

---

## 3. Obsługiwane ścieżki deeplinków

Aplikacja obsługuje następujące typy linków:

### **Strony główne:**
- `https://kaszuby24.pl/` → Strona główna
- `https://kaszuby24.pl/wydarzenia/` → Tab wydarzeń
- `https://kaszuby24.pl/nekrologi-2/` → Sekcja nekrologów

### **Artykuły:**
- `https://kaszuby24.pl/nazwa-artykulu/` → Artykuł po slug

### **Nekrologi:**
- `https://kaszuby24.pl/nekrolog/nazwa-nekrologu/` → Nekrolog po slug

### **Wydarzenia:**
- `https://kaszuby24.pl/kalendarz/nazwa-wydarzenia/` → Wydarzenie po slug
- `https://kaszuby24.pl/event/123/` → Wydarzenie po ID

### **Inne:**
- `https://kaszuby24.pl/search?q=query` → Wyszukiwanie
- `https://kaszuby24.pl/weather/` → Pogoda

---

## 4. Status konfiguracji serwera (stan na 2025-08-15)

### ✅ **Zaimplementowane:**
- Plik `apple-app-site-association` dostępny pod `/.well-known/`
- Plik `assetlinks.json` dostępny pod `/.well-known/`
- Podstawowa konfiguracja iOS i Android

### ⚠️ **Wymaga aktualizacji:**
- Plik `apple-app-site-association` ma tylko `"paths": ["*"]` zamiast szczegółowych ścieżek
- Zalecana aktualizacja dla lepszej kompatybilności

### 🔧 **Endpointy API działają:**
- ✅ Artykuły: `https://kaszuby24.pl/wp-json/wp/v2/posts?slug=...`
- ✅ Nekrologi: `https://kaszuby24.pl/wp-json/wp/v2/nekrolog?slug=...`
- ✅ Wydarzenia: `https://kaszuby24.pl/wp-json/wp/v2/kalendarz?slug=...`

---

### **Weryfikacja**

Po umieszczeniu plików, możesz użyć oficjalnych walidatorów, aby sprawdzić, czy wszystko jest poprawnie skonfigurowane:
- **Walidator dla iOS**: [Branch AASA Validator](https://branch.io/resources/aasa-validator/)
- **Walidator dla Androida**: [Google Asset Links Tool](https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://kaszuby24.pl&relation=delegate_permission/common.handle_all_urls)

Po wykonaniu tych kroków, linki powinny zacząć działać w aplikacji po kilku godzinach (systemy Apple i Google potrzebują czasu na odświeżenie). 
