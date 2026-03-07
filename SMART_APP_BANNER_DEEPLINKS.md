# Deep Linki dla Smart App Banner

## 📱 Format Deep Linków

Aplikacja **Kaszuby24** obsługuje **Universal Links** (iOS) i **App Links** (Android) w formacie:

```
https://kaszuby24.pl/...
```

Alternatywnie możesz użyć custom scheme (niezalecane, bo nie działa na wszystkich urządzeniach):
```
kaszuby24://...
```

**⚠️ Zalecany format:** Zawsze używaj `https://kaszuby24.pl/...`

---

## 🔗 Obsługiwane Typy Deep Linków

### **1. Strona Główna**
```
https://kaszuby24.pl/
```

### **2. Artykuły (dynamiczne)**
```
https://kaszuby24.pl/nazwa-artykulu/
```
**Przykład:**
```
https://kaszuby24.pl/jarmark-kaszubski-w-kartuzach/
```

### **3. Wydarzenia (dynamiczne)**
**Format 1 - po slug:**
```
https://kaszuby24.pl/kalendarz/nazwa-wydarzenia/
```
**Format 2 - po ID:**
```
https://kaszuby24.pl/event/123/
```
**Przykłady:**
```
https://kaszuby24.pl/kalendarz/jarmark-kaszubski-2024/
https://kaszuby24.pl/event/567/
```

### **4. Nekrologi (dynamiczne)**
```
https://kaszuby24.pl/nekrolog/nazwa-nekrologu/
```
**Przykład:**
```
https://kaszuby24.pl/nekrolog/jan-kowalski/
```

### **5. Lista Wydarzeń**
```
https://kaszuby24.pl/wydarzenia/
```

### **6. Sekcja Nekrologów**
```
https://kaszuby24.pl/nekrologi-2/
```

### **7. Kategorie (dynamiczne)**
```
https://kaszuby24.pl/category/nazwa-kategorii/
```
**Przykład:**
```
https://kaszuby24.pl/category/wiadomosci/
```

### **8. Wyszukiwanie**
```
https://kaszuby24.pl/search?q=zapytanie
```
**Przykład:**
```
https://kaszuby24.pl/search?q=jarmark
```

### **9. Pogoda**
```
https://kaszuby24.pl/weather/
```

---

## 🎯 Smart App Banner - Implementacja

### **Opcja 1: Dynamiczny Deep Link (REKOMENDOWANE)**

Dla każdej strony możesz użyć odpowiedniego URL jako `app-argument`:

```html
<!-- Dla artykułu -->
<meta name="apple-itunes-app" content="app-id=6748219988, app-argument=https://kaszuby24.pl/nazwa-artykulu/">

<!-- Dla wydarzenia -->
<meta name="apple-itunes-app" content="app-id=6748219988, app-argument=https://kaszuby24.pl/kalendarz/nazwa-wydarzenia/">

<!-- Dla nekrologu -->
<meta name="apple-itunes-app" content="app-id=6748219988, app-argument=https://kaszuby24.pl/nekrolog/nazwa-nekrologu/">

<!-- Dla strony głównej -->
<meta name="apple-itunes-app" content="app-id=6748219988, app-argument=https://kaszuby24.pl/">
```

### **Opcja 2: Jeden Link dla Całej Strony**

Jeśli chcesz użyć jednego linku dla całej strony (aplikacja otworzy się na stronie odpowiadającej obecnej URL w przeglądarce):

```html
<meta name="apple-itunes-app" content="app-id=6748219988">
```

**Uwaga:** Ta opcja może nie działać dobrze, jeśli strona i aplikacja mają różne routingi.

---

## 📝 Przykłady Implementacji

### **WordPress - Funkcja PHP**

```php
function add_smart_app_banner() {
    $current_url = home_url($_SERVER['REQUEST_URI']);
    
    // Upewnij się, że URL używa https://
    $deep_link = str_replace('http://', 'https://', $current_url);
    
    // Usuń trailing slash jeśli nie jest to root
    if ($deep_link !== 'https://kaszuby24.pl/') {
        $deep_link = rtrim($deep_link, '/');
    }
    
    echo '<meta name="apple-itunes-app" content="app-id=6748219988, app-argument=' . esc_attr($deep_link) . '">' . "\n";
}
add_action('wp_head', 'add_smart_app_banner');
```

### **JavaScript (Dynamiczne)**

```javascript
(function() {
    const appStoreId = '6748219988';
    const currentUrl = window.location.href.replace(/^http:/, 'https:');
    const deepLink = currentUrl === 'https://kaszuby24.pl' 
        ? currentUrl + '/' 
        : currentUrl.replace(/\/$/, '');
    
    const meta = document.createElement('meta');
    meta.name = 'apple-itunes-app';
    meta.content = `app-id=${appStoreId}, app-argument=${deepLink}`;
    
    document.head.appendChild(meta);
})();
```

### **HTML (Statyczny dla konkretnej strony)**

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Dla strony głównej -->
    <meta name="apple-itunes-app" content="app-id=6748219988, app-argument=https://kaszuby24.pl/">
    
    <!-- Dla konkretnego artykułu -->
    <meta name="apple-itunes-app" content="app-id=6748219988, app-argument=https://kaszuby24.pl/jarmark-kaszubski-w-kartuzach/">
</head>
<body>
    <!-- Zawartość strony -->
</body>
</html>
```

---

## ✅ Weryfikacja

1. **Sprawdź Universal Links:** Upewnij się, że plik `apple-app-site-association` jest dostępny pod:
   - `https://kaszuby24.pl/.well-known/apple-app-site-association`
   - `https://kaszuby24.pl/apple-app-site-association`

2. **Przetestuj na urządzeniu iOS:**
   - Otwórz stronę w Safari na iPhone/iPad
   - Smart App Banner powinien pojawić się na górze
   - Po kliknięciu, aplikacja powinna otworzyć się na odpowiednim ekranie

3. **Walidacja:**
   - [Branch AASA Validator](https://branch.io/resources/aasa-validator/) - sprawdź Universal Links dla iOS
   - [Google Asset Links Tool](https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://kaszuby24.pl&relation=delegate_permission/common.handle_all_urls) - sprawdź App Links dla Androida

---

## 🔄 Routing w Aplikacji

Gdy użytkownik kliknie Smart App Banner, aplikacja:

1. **Otrzyma deep link** (np. `https://kaszuby24.pl/jarmark-kaszubski-w-kartuzach/`)
2. **Sparsuje URL** i określi typ treści (artykuł, wydarzenie, nekrolog itp.)
3. **Pobierze dane** z API używając slug lub ID
4. **Przekieruje użytkownika** na odpowiedni ekran w aplikacji

**Przykład dla artykułu:**
- URL: `https://kaszuby24.pl/jarmark-kaszubski-w-kartuzach/`
- Aplikacja: Pobiera artykuł z API po slug `jarmark-kaszubski-w-kartuzach`
- Routing: `/article/{id}` (gdzie `id` jest pobrane z API)

---

## ⚠️ Ważne Uwagi

1. **Zawsze używaj HTTPS** - Universal Links wymagają HTTPS
2. **Usuwaj trailing slash** dla większości linków (oprócz root `/`)
3. **Upewnij się, że slug istnieje** w systemie CMS - aplikacja może przekierować na stronę główną, jeśli artykuł nie zostanie znaleziony
4. **Dla Android:** Smart App Banner działa tylko na iOS, ale App Links będą działać normalnie
5. **Universal Links:** Mogą wymagać kilku godzin na aktywację po pierwszej konfiguracji

---

## 📞 Dodatkowe Informacje

**App Store ID:** `6748219988`  
**Bundle ID (iOS):** `app.kaszuby24`  
**Package Name (Android):** `app.kaszuby24`  
**Domain:** `kaszuby24.pl` i `www.kaszuby24.pl`

---

**Gotowe! 🎉** Możesz teraz dodać odpowiedni meta-tag na stronę. Jeśli potrzebujesz pomocy z implementacją, daj znać!
