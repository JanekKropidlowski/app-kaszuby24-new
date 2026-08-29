# Google News & Discover - Indeksowanie i Optymalizacja

## 📰 Przegląd

Google **NIE oferuje dedykowanego API** dla Google News i Top Stories, ale ma kilka narzędzi i praktyk, które mogą zwiększyć widoczność treści w:
- **Google News**
- **Google Discover**
- **Top Stories** w wynikach wyszukiwania

---

## 🎯 1. Google Publisher Center (Wymagane)

**Google Publisher Center** to główne narzędzie do rejestracji portalu informacyjnego w Google News.

### Rejestracja:

1. **Przejdź do:** [Google Publisher Center](https://publishercenter.google.com/)
2. **Zaloguj się** kontem Google
3. **Zarejestruj publikację:**
   - Nazwa publikacji: `Kaszuby24`
   - URL strony: `https://kaszuby24.pl`
   - Język: `Polski (pl)`
   - Kategorie: `News`, `Regional News`
   - Logo i ikona publikacji
   - Informacje kontaktowe

4. **Zweryfikuj własność domeny:**
   - Dodaj plik HTML do serwera
   - Lub użyj Google Search Console (zalecane)

5. **Dodaj RSS Feed:**
   - URL: `https://kaszuby24.pl/feed/`
   - Format: RSS 2.0 lub Atom
   - **WAŻNE:** Feed musi zawierać minimum 10 artykułów z ostatnich 5 dni

### Wymagania techniczne:

✅ **Responsywność:** Strona musi być zoptymalizowana na mobile  
✅ **Szybkość:** Core Web Vitals powinny być zielone  
✅ **Unikalne URL:** Każdy artykuł musi mieć unikalny, statyczny URL  
✅ **Aktywność:** Minimum 10 nowych artykułów tygodniowo  
✅ **Jakość treści:** Oryginalne, wartościowe artykuły  

---

## 📊 2. Structured Data (Schema.org)

**Dane strukturalne** pomagają Google zrozumieć treść artykułów i zwiększają szanse na pojawienie się w Top Stories.

### NewsArticle Schema dla WordPress

Dodaj do pliku `functions.php` w WordPress:

```php
/**
 * Dodaj NewsArticle Structured Data do artykułów
 */
function kaszuby24_add_newsarticle_schema() {
    if (!is_single() || !is_singular('post')) {
        return;
    }
    
    global $post;
    
    // Pobierz dane artykułu
    $post_id = $post->ID;
    $author = get_the_author_meta('display_name', $post->post_author);
    $post_date = get_the_date('c', $post_id);
    $modified_date = get_the_modified_date('c', $post_id);
    $featured_image = get_the_post_thumbnail_url($post_id, 'full');
    $categories = wp_get_post_categories($post_id, array('fields' => 'names'));
    
    // Pobierz zdjęcie featured
    if (!$featured_image) {
        $featured_image = get_template_directory_uri() . '/assets/images/default-image.jpg';
    }
    
    // Przygotuj schema
    $schema = array(
        '@context' => 'https://schema.org',
        '@type' => 'NewsArticle',
        'headline' => get_the_title($post_id),
        'description' => wp_trim_words(get_the_excerpt($post_id), 30, '...'),
        'image' => array(
            '@type' => 'ImageObject',
            'url' => $featured_image,
            'width' => 1200,
            'height' => 630
        ),
        'datePublished' => $post_date,
        'dateModified' => $modified_date,
        'author' => array(
            '@type' => 'Person',
            'name' => $author
        ),
        'publisher' => array(
            '@type' => 'Organization',
            'name' => 'Kaszuby24',
            'logo' => array(
                '@type' => 'ImageObject',
                'url' => 'https://kaszuby24.pl/wp-content/uploads/logo.png',
                'width' => 600,
                'height' => 60
            )
        ),
        'mainEntityOfPage' => array(
            '@type' => 'WebPage',
            '@id' => get_permalink($post_id)
        ),
        'articleSection' => !empty($categories) ? $categories[0] : 'News',
        'keywords' => implode(', ', $categories)
    );
    
    // Wyświetl JSON-LD
    echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
}
add_action('wp_head', 'kaszuby24_add_newsarticle_schema');
```

### Alternatywnie: Article Schema (prostsze)

Jeśli chcesz prostszą wersję:

```php
function kaszuby24_add_article_schema() {
    if (!is_single() || !is_singular('post')) {
        return;
    }
    
    global $post;
    $schema = array(
        '@context' => 'https://schema.org',
        '@type' => 'Article',
        'headline' => get_the_title(),
        'description' => wp_trim_words(get_the_excerpt(), 30, '...'),
        'image' => get_the_post_thumbnail_url(get_the_ID(), 'full'),
        'datePublished' => get_the_date('c'),
        'dateModified' => get_the_modified_date('c'),
        'author' => array(
            '@type' => 'Person',
            'name' => get_the_author()
        ),
        'publisher' => array(
            '@type' => 'Organization',
            'name' => 'Kaszuby24',
            'logo' => array(
                '@type' => 'ImageObject',
                'url' => 'https://kaszuby24.pl/wp-content/uploads/logo.png'
            )
        )
    );
    
    echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
}
add_action('wp_head', 'kaszuby24_add_article_schema');
```

### Weryfikacja Structured Data:

- **Google Rich Results Test:** [https://search.google.com/test/rich-results](https://search.google.com/test/rich-results)
- **Schema.org Validator:** [https://validator.schema.org/](https://validator.schema.org/)

---

## 📡 3. RSS/Atom Feeds dla Google Discover "Obserwuj"

**Google Discover** pozwala użytkownikom "obserwować" strony i otrzymywać najnowsze aktualizacje.

### Dodaj linki RSS do `<head>`:

```php
/**
 * Dodaj linki RSS dla Google Discover Follow
 */
function kaszuby24_add_rss_links() {
    // Główny feed
    echo '<link rel="alternate" type="application/rss+xml" title="' . esc_attr(get_bloginfo('name')) . ' - RSS Feed" href="' . esc_url(get_feed_link()) . '">' . "\n";
    
    // Feed Atom
    echo '<link rel="alternate" type="application/atom+xml" title="' . esc_attr(get_bloginfo('name')) . ' - Atom Feed" href="' . esc_url(get_feed_link('atom')) . '">' . "\n";
    
    // Feed dla kategorii (opcjonalnie)
    $categories = get_categories();
    foreach ($categories as $category) {
        echo '<link rel="alternate" type="application/rss+xml" title="' . esc_attr($category->name) . ' - RSS Feed" href="' . esc_url(get_category_feed_link($category->term_id)) . '">' . "\n";
    }
}
add_action('wp_head', 'kaszuby24_add_rss_links');
```

### Wymagania RSS Feed:

✅ **Minimum 10 artykułów** w feedzie  
✅ **Aktualizacje** minimum 3 razy w tygodniu  
✅ **Poprawny format** RSS 2.0 lub Atom  
✅ **Pełne treści** lub dokładne excerpt (zalecane pełne treści)  
✅ **Obrazy** w każdym artykule (minimum 1200x630px)  

---

## 🗺️ 4. XML Sitemap dla Newsów

**News XML Sitemap** pomaga Google szybciej znajdować nowe artykuły.

### Automatyczne generowanie (Yoast SEO / Rank Math):

Jeśli używasz Yoast SEO lub Rank Math, włącz:
- **News XML Sitemap** w ustawieniach
- **Automatyczne przesyłanie** do Google Search Console

### Ręczne utworzenie News Sitemap:

```php
/**
 * Generuj News XML Sitemap
 */
function kaszuby24_generate_news_sitemap() {
    $posts = get_posts(array(
        'post_type' => 'post',
        'posts_per_page' => 1000,
        'post_status' => 'publish',
        'date_query' => array(
            'after' => '2 days ago'
        ),
        'orderby' => 'date',
        'order' => 'DESC'
    ));
    
    header('Content-Type: application/xml; charset=utf-8');
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">' . "\n";
    
    foreach ($posts as $post) {
        $publication_date = get_the_date('c', $post->ID);
        $categories = wp_get_post_categories($post->ID, array('fields' => 'names'));
        $category = !empty($categories) ? $categories[0] : 'News';
        
        echo '  <url>' . "\n";
        echo '    <loc>' . esc_url(get_permalink($post->ID)) . '</loc>' . "\n";
        echo '    <news:news>' . "\n";
        echo '      <news:publication>' . "\n";
        echo '        <news:name>Kaszuby24</news:name>' . "\n";
        echo '        <news:language>pl</news:language>' . "\n";
        echo '      </news:publication>' . "\n";
        echo '      <news:publication_date>' . esc_html($publication_date) . '</news:publication_date>' . "\n";
        echo '      <news:title>' . esc_html(get_the_title($post->ID)) . '</news:title>' . "\n";
        echo '      <news:keywords>' . esc_html($category) . '</news:keywords>' . "\n";
        echo '    </news:news>' . "\n";
        echo '  </url>' . "\n";
    }
    
    echo '</urlset>';
    exit;
}
add_action('init', function() {
    if (isset($_GET['news_sitemap']) && $_GET['news_sitemap'] === 'xml') {
        kaszuby24_generate_news_sitemap();
    }
});
```

**Dostęp:** `https://kaszuby24.pl/?news_sitemap=xml`

### Dodaj do Google Search Console:

1. **Google Search Console** → **Sitemaps**
2. **Dodaj nową mapę:** `https://kaszuby24.pl/?news_sitemap=xml`
3. **Zweryfikuj** czy Google może przeczytać sitemap

---

## ⚡ 5. Google Indexing API (Opcjonalne)

**Google Indexing API** pozwala na **szybkie zgłaszanie** nowych/zmienionych treści do indeksacji.

### ⚠️ Ważne:

- **Oficjalnie wspierane:** JobPosting, LiveStream, BroadcastEvent
- **Unofficial:** Można użyć dla innych treści, ale Google może wstrzymać wsparcie
- **Wymaga weryfikacji:** OAuth 2.0 + weryfikacja własności w Google Search Console

### Implementacja:

```php
/**
 * Zgłoś artykuł do Google Indexing API
 * Wymaga: Service Account JSON + weryfikacja w Search Console
 */
function kaszuby24_notify_google_indexing($post_id) {
    // Tylko dla nowo opublikowanych artykułów
    if (get_post_status($post_id) !== 'publish' || get_post_type($post_id) !== 'post') {
        return;
    }
    
    $url = get_permalink($post_id);
    $service_account_json = get_option('kaszuby24_google_service_account_json');
    
    if (!$service_account_json) {
        return; // Service account nie skonfigurowany
    }
    
    // Pobierz access token z Google OAuth
    $access_token = kaszuby24_get_google_access_token($service_account_json);
    
    if (!$access_token) {
        return;
    }
    
    // Wyślij request do Indexing API
    $api_url = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
    
    $body = array(
        'url' => $url,
        'type' => 'URL_UPDATED' // lub 'URL_DELETED' dla usuniętych
    );
    
    $response = wp_remote_post($api_url, array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $access_token,
            'Content-Type' => 'application/json'
        ),
        'body' => json_encode($body),
        'timeout' => 10
    ));
    
    if (is_wp_error($response)) {
        error_log('Google Indexing API error: ' . $response->get_error_message());
    }
}
add_action('publish_post', 'kaszuby24_notify_google_indexing', 10, 1);

/**
 * Pobierz access token z Google OAuth 2.0
 */
function kaszuby24_get_google_access_token($service_account_json) {
    // Implementacja OAuth 2.0 JWT flow
    // Wymaga: google/auth library lub ręczna implementacja JWT
    // ...
    return $access_token;
}
```

### Konfiguracja Google Indexing API:

1. **Google Cloud Console:**
   - Utwórz projekt
   - Włącz **Indexing API**
   - Utwórz **Service Account**
   - Pobierz **JSON key**

2. **Google Search Console:**
   - Dodaj Service Account jako właściciela
   - Zweryfikuj własność domeny

3. **WordPress:**
   - Zapisz JSON key w opcjach (bezpiecznie!)
   - Użyj biblioteki `google/auth` do OAuth

---

## 📱 6. Optymalizacja dla Aplikacji Mobilnej

### Deep Links dla Artykułów:

Upewnij się, że wszystkie artykuły mają **Universal Links**:
- Format: `https://kaszuby24.pl/nazwa-artykulu/`
- Aplikacja otwiera artykuł zamiast strony web (jeśli zainstalowana)

### App Indexing (Google Search):

Aplikacja mobilna może pojawiać się w wynikach wyszukiwania Google, jeśli:

1. **App Links skonfigurowane** (już masz ✅)
2. **Deep links w treści** artykułów
3. **Structured Data z linkami do aplikacji:**

```php
function kaszuby24_add_app_links_to_schema() {
    if (!is_single() || !is_singular('post')) {
        return;
    }
    
    $schema = array(
        '@context' => 'https://schema.org',
        '@type' => 'NewsArticle',
        // ... reszta schema ...
        'mainEntityOfPage' => array(
            '@type' => 'WebPage',
            '@id' => get_permalink(),
            'potentialAction' => array(
                '@type' => 'ViewAction',
                'target' => array(
                    '@type' => 'EntryPoint',
                    'urlTemplate' => 'https://kaszuby24.pl/' . get_post_field('post_name', get_the_ID()) . '/',
                    'actionPlatform' => array(
                        'https://schema.org/MobileWebPlatform',
                        'https://schema.org/AndroidPlatform',
                        'https://schema.org/IOSPlatform'
                    )
                ),
                'appName' => 'Kaszuby24',
                'appId' => array(
                    'ios' => '6748219988', // App Store ID
                    'android' => 'app.kaszuby24'
                )
            )
        )
    );
    
    echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
}
```

---

## ✅ 7. Checklist Optymalizacji

### Wymagane:

- [ ] **Rejestracja w Google Publisher Center**
- [ ] **NewsArticle/Article Structured Data** na każdej stronie artykułu
- [ ] **RSS Feed** dostępny i aktywny (`/feed/`)
- [ ] **Responsywność** na mobile (zalecane: mobile-first)
- [ ] **Szybkość** - Core Web Vitals w zielonym zakresie
- [ ] **Unikalne URL** dla każdego artykułu
- [ ] **Obrazy** minimum 1200x630px w każdym artykule

### Zalecane:

- [ ] **News XML Sitemap** (`/?news_sitemap=xml`)
- [ ] **Google Search Console** skonfigurowane
- [ ] **Indexing API** dla szybkiej indeksacji (opcjonalnie)
- [ ] **App Links** w Structured Data
- [ ] **RSS linki** w `<head>` dla Discover Follow
- [ ] **Aktywne publikowanie** - minimum 10 artykułów/tydzień

---

## 🔍 8. Monitorowanie i Weryfikacja

### Google Search Console:

1. **Coverage:** Sprawdź ile stron jest zindeksowanych
2. **Performance:** Monitoruj trafienia z Google News
3. **Sitemaps:** Zweryfikuj czy News Sitemap jest poprawny

### Narzędzia do weryfikacji:

- **Rich Results Test:** [https://search.google.com/test/rich-results](https://search.google.com/test/rich-results)
- **Schema Markup Validator:** [https://validator.schema.org/](https://validator.schema.org/)
- **RSS Feed Validator:** [https://validator.w3.org/feed/](https://validator.w3.org/feed/)
- **PageSpeed Insights:** [https://pagespeed.web.dev/](https://pagespeed.web.dev/)

---

## ⚠️ 9. Ważne Uwagi

1. **Brak gwarancji:** Google nie gwarantuje pojawienia się w Top Stories/Discover
2. **Algorytmy:** Decyzje podejmuje algorytm na podstawie wielu czynników
3. **Jakość treści:** Najważniejsze - publikuj wartościowe, oryginalne treści
4. **Czas:** Indeksacja może zająć kilka dni/tygodni
5. **SEO:** Optymalizacja Google News nie zastępuje ogólnego SEO

---

## 📞 10. Linki i Zasoby

- **Google Publisher Center:** [https://publishercenter.google.com/](https://publishercenter.google.com/)
- **Google Search Console:** [https://search.google.com/search-console](https://search.google.com/search-console)
- **Google News Guidelines:** [https://support.google.com/news/publisher-center/answer/9606710](https://support.google.com/news/publisher-center/answer/9606710)
- **Schema.org NewsArticle:** [https://schema.org/NewsArticle](https://schema.org/NewsArticle)
- **Google Indexing API:** [https://developers.google.com/search/apis/indexing-api](https://developers.google.com/search/apis/indexing-api)
- **Google Discover Guidelines:** [https://developers.google.com/search/docs/appearance/google-discover](https://developers.google.com/search/docs/appearance/google-discover)

---

**Gotowe! 🎉** Po implementacji tych kroków Twoja strona będzie gotowa na indeksację przez Google News i może pojawiać się w Top Stories oraz Google Discover.

