# Konfiguracja serwera dla Universal Links (iOS) i App Links (Android)

Aby linki `https://kaszuby24.pl/...` otwierały się w aplikacji mobilnej, należy umieścić na serwerze dwa pliki konfiguracyjne.

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
        "paths": ["*"]
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
    "sha256_cert_fingerprints": ["B3:26:2A:42:0B:A9:63:39:6C:C5:3C:93:31:73:7D:81:4A:A4:4E:2A:80:A2:35:0E:64:99:95:67:3E:C5:9F:8A"]
  }
}]
```
*Uwaga: Odcisk palca SHA256 został pobrany z Twojego konta Expo dla builda produkcyjnego.*

**Krok 3: Umieść plik na serwerze**

Plik musi być dostępny pod adresem:
- `https://kaszuby24.pl/.well-known/assetlinks.json`

**Ważne:** Serwer musi serwować ten plik z nagłówkiem `Content-Type: application/json` i nie może być żadnych przekierowań.

---

### **Weryfikacja**

Po umieszczeniu plików, możesz użyć oficjalnych walidatorów, aby sprawdzić, czy wszystko jest poprawnie skonfigurowane:
- **Walidator dla iOS**: [Branch AASA Validator](https://branch.io/resources/aasa-validator/)
- **Walidator dla Androida**: [Google Asset Links Tool](https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://kaszuby24.pl&relation=delegate_permission/common.handle_all_urls)

Po wykonaniu tych kroków, linki powinny zacząć działać w aplikacji po kilku godzinach (systemy Apple i Google potrzebują czasu na odświeżenie). 