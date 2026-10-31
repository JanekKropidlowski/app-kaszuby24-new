import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Analityka idzie wyłącznie przez GA4 Measurement Protocol. Firebase
// Analytics usunięto przy problemach z buildem iOS – stąd brak natywnego SDK.

/**
 * Ekrany apki (poza artykułami i nekrologami) idą jako page_view pod osobnym
 * hostem: GA4 nie myli ich ze stroną, a w raportach widać nazwę ekranu.
 * Klucz = pierwszy człon ścieżki expo-router, wartość = [ścieżka w GA4, tytuł].
 */
const HOST_APKI = 'app.kaszuby24.pl';
const EKRANY_APKI: Record<string, [string, string]> = {
  '': ['start', 'Start'],
  search: ['szukaj', 'Szukaj'],
  saved: ['zapisane', 'Zapisane'],
  menu: ['menu', 'Menu'],
  kalendarz: ['kalendarz', 'Kalendarz'],
  weather: ['pogoda', 'Pogoda'],
  airquality: ['powietrze', 'Jakość powietrza'],
  transport_v2: ['rozklad', 'Rozkład jazdy'],
  essentials: ['niezbednik', 'Niezbędnik'],
  waste: ['odpady', 'Odpady'],
  mevo: ['mevo', 'Rowery Mevo'],
  settings: ['ustawienia', 'Ustawienia'],
  contact: ['kontakt', 'Kontakt'],
  event: ['wydarzenie', 'Wydarzenie'],
  lzs: ['lzs', 'LZS'],
};
/** Ekrany z identyfikatorem w ścieżce (reszta ścieżki zostaje w adresie). */
const EKRANY_Z_ID = new Set(['event', 'lzs']);
/**
 * Źródło sesji w GA4. Measurement Protocol nie niesie źródła wizyty, więc bez
 * `campaign_details` cała apka lądowała w kanale „Unassigned”. Medium `app`
 * GA4 liczy jako „Referral”, `push` jako „Mobile Push Notifications”.
 */
const ZRODLO_APKI = 'kaszuby24_app';

/**
 * Analityka apki Kaszuby24 (GA4 Measurement Protocol).
 */

class AnalyticsService {
  private isEnabled = true;
  private clientId: string | null = null;
  private userProperties: { [key: string]: any } = {};
  /**
   * GA4 liczy użytkowników i sesje TYLKO gdy zdarzenie z Measurement Protocol
   * ma `session_id` oraz `engagement_time_msec`. Bez nich zdarzenia dochodzą
   * (odsłony były widoczne), ale raport pokazywał 0 użytkowników i 0 sesji —
   * czyli aplikacji w praktyce nie dało się zmierzyć.
   */
  private sessionId: string | null = null;
  private lastEventAt = 0;
  private measurementId: string | null = null;
  private apiSecret: string | null = null;
  /** Nowa sesja czeka na `campaign_details` ze źródłem (dokleja go pierwsze zdarzenie sesji). */
  private nowaSesja = false;
  private mediumSesji: 'app' | 'push' = 'app';
  /**
   * Zdarzenia sprzed initialize() — pasek kart montuje się i zgłasza pierwszy
   * ekran, zanim wystartuje analityka. Bez kolejki te zdarzenia przepadały.
   */
  private gotowy = false;
  private kolejka: { name: string; params: { [k: string]: any } }[] = [];

  /**
   * Initialize Analytics
   * Call this once during app startup
   */
  async initialize() {
    try {
      const manifest = (Constants as any).expoConfig || (Constants as any).manifest || {};
      const appVersion = String(manifest.version || 'unknown');

      const extra = manifest.extra || {};
      this.measurementId = extra.gaMeasurementId || null;
      this.apiSecret = extra.gaApiSecret || null;
      this.clientId = await this.getOrCreateClientId();
      // Strumień GA4 dla apki jest typu WEB i karmimy go Measurement
      // Protocolem, więc GA4 wpisuje wszystkim platform=web,
      // deviceCategory=desktop, system=(not set) — apka wtapia się w
      // desktop i nie da się jej odsiać w raportach. Te trzy właściwości
      // użytkownika są jedynym sposobem na segmentację bez przechodzenia
      // na strumienie aplikacyjne (Firebase = nowy build, nie OTA).
      this.userProperties['app_platform'] = Platform.OS;
      this.userProperties['app_version'] = appVersion;
      this.userProperties['app_os_version'] = String(Platform.Version ?? 'unknown');
      console.log('[Analytics] Measurement Protocol initialized', {
        measurementId: this.measurementId ? 'present' : 'missing',
        app_platform: Platform.OS,
        app_version: appVersion,
      });
      this.gotowy = true;
      for (const z of this.kolejka.splice(0)) {
        await this.sendToMeasurementProtocol(z.name, z.params);
      }
    } catch (error) {
      console.warn('[Analytics] Failed to initialize:', error);
      this.isEnabled = false;
    }
  }

  private async getOrCreateClientId() {
    try {
      const key = '@kaszuby24:ga_client_id';
      // GA4 oczekuje formatu <liczba>.<liczba> (jak ciasteczko _ga). Stare
      // identyfikatory „czas-losowa” zamieniamy raz na „czas.losowa”.
      let id = await AsyncStorage.getItem(key);
      if (id && !/^\d+\.\d+$/.test(id)) {
        id = /^\d+-\d+$/.test(id) ? id.replace('-', '.') : null;
        if (id) await AsyncStorage.setItem(key, id);
      }
      if (!id) {
        id = `${Math.floor(Math.random() * 1e9)}.${Math.floor(Date.now() / 1000)}`;
        await AsyncStorage.setItem(key, id);
      }
      return id;
    } catch (e) {
      console.warn('[Analytics] Failed to get/create client id:', e);
      return `${Math.floor(Math.random() * 1e9)}.${Math.floor(Date.now() / 1000)}`;
    }
  }

  /** Nowa sesja po 30 minutach bezczynności — tak samo jak liczy je GA4. */
  private static readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  private sessionParams(): { session_id: string; engagement_time_msec: number } {
    const now = Date.now();
    const elapsed = this.lastEventAt ? now - this.lastEventAt : 0;
    if (!this.sessionId || elapsed > AnalyticsService.SESSION_TIMEOUT_MS) {
      this.sessionId = String(now);
      this.nowaSesja = true;
    }
    this.lastEventAt = now;
    // Czas zaangażowania: odstęp od poprzedniego zdarzenia, przycięty do
    // rozsądnego maksimum, żeby przerwa w tle nie zawyżała statystyk.
    const engagement = this.sessionId === String(now) ? 1 : Math.min(elapsed, 60_000);
    return { session_id: this.sessionId, engagement_time_msec: Math.max(engagement, 1) };
  }

  private async sendToMeasurementProtocol(eventName: string, params: { [k: string]: any } = {}) {
    if (!this.measurementId || !this.apiSecret || !this.clientId) return;

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;
    const sesja = this.sessionParams();
    const events: any[] = [];
    // campaign_details w tym samym żądaniu i przed zdarzeniem: GA4 przypisuje
    // źródło zdarzeniom o czasie >= czasu campaign_details, czyli całej sesji.
    // Flagę zdejmujemy dopiero po udanym wysłaniu: bez sieci na starcie źródło sesji poszłoby w próżnię.
    const zrodloSesji = this.nowaSesja;
    if (zrodloSesji) {
      events.push({
        name: 'campaign_details',
        params: {
          source: ZRODLO_APKI,
          medium: this.mediumSesji,
          campaign: this.mediumSesji === 'push' ? 'powiadomienie' : 'aplikacja',
          session_id: sesja.session_id,
        },
      });
    }
    events.push({ name: eventName, params: { ...params, ...sesja } });
    const body: any = { client_id: this.clientId, events };

    if (Object.keys(this.userProperties).length > 0) {
      body.user_properties = Object.fromEntries(
        Object.entries(this.userProperties).map(([k, v]) => [k, { value: String(v) }])
      );
    }

    try {
      const odp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (zrodloSesji && odp.ok) {
        this.nowaSesja = false;
        this.mediumSesji = 'app';
      }
    } catch (e) {
      console.warn('[Analytics] MP send failed:', e);
    }
  }

  private async sendEvent(eventName: string, params: { [k: string]: any } = {}) {
    if (!this.isEnabled) return;
    if (!this.gotowy) {
      if (this.kolejka.length < 30) this.kolejka.push({ name: eventName, params });
    } else {
      await this.sendToMeasurementProtocol(eventName, params);
      console.log(`[Analytics] MP event sent: ${eventName}`);
    }
  }

  /**
   * Wejście przez dotknięcie powiadomienia. Gdy zaczyna nową wizytę (start apki
   * albo powrót po 30 min), sesja dostaje medium `push`. W trakcie trwającej
   * wizyty źródła nie zmieniamy, tak jak GA4 na stronie.
   */
  oznaczWejscieZPowiadomienia() {
    const bezczynnosc = this.lastEventAt ? Date.now() - this.lastEventAt : Infinity;
    if (!this.sessionId || bezczynnosc > AnalyticsService.SESSION_TIMEOUT_MS) {
      this.mediumSesji = 'push';
    }
  }

  /**
   * Ekran apki jako page_view pod https://app.kaszuby24.pl/app/<ekran>.
   * Wcześniej szły screen_view (w strumieniu WWW to zdarzenie zarezerwowane dla
   * strumieni aplikacyjnych) i page_view z adresem `app://`, którego GA4 nie
   * umie odczytać: puste ścieżki, host „(not set)” i podwójne odsłony.
   * Artykuły i nekrologi pomijamy, bo same wysyłają page_view z adresem strony.
   * Panelu redakcji nie liczymy.
   */
  async logAppScreen(pathname: string) {
    const sciezka = pathname.replace(/^\/+|\/+$/g, '');
    if (/^(article|nekrolog|admin)(\/|$)/.test(sciezka)) return;
    const [pierwszy, ...reszta] = sciezka.split('/');
    const ekran = EKRANY_APKI[pierwszy];
    const adres = ekran
      ? [ekran[0], ...(EKRANY_Z_ID.has(pierwszy) ? reszta : [])].join('/')
      : sciezka;
    await this.sendEvent('page_view', {
      page_location: `https://${HOST_APKI}/app/${adres}`,
      page_title: `Aplikacja – ${ekran ? ekran[1] : sciezka}`,
    });
  }

  /**
   * Track article view.
   *
   * Wysyła DWA eventy:
   * 1) `page_view` z `page_location` matching the web URL — żeby GA4 łączyło
   *    odsłony web + mobile na poziomie property w jednym pageviewie. Dashboard
   *    `getPageViewsMap()` queries `pagePath` dimension i widzi sumarycznie.
   * 2) `article_view` mobile-specific event z bogatszymi parametrami (id, slug,
   *    category) — do funnelów i custom raportów per platform.
   */
  async logArticleView(articleId: number, title: string, slug: string, categoryId?: number) {
    if (slug) {
      // Z ukośnikiem na końcu jak strona (trailingSlash), żeby GA4 liczyło jedną ścieżkę.
      await this.sendEvent('page_view', {
        page_location: `https://kaszuby24.pl/${slug}/`,
        page_title: title,
      });
    }
    await this.sendEvent('article_view', {
      article_id: articleId,
      article_slug: slug || '',
      article_title: title,
      category_id: categoryId || null,
      content_type: 'article',
    });
  }

  /**
   * Track nekrolog view. Same dual-event pattern as articles — page_view
   * z `/nekrolog/<slug>` matching web URL + nekrolog_view z mobile-specific
   * params do funnelów (deceased name, region itp.).
   */
  async logNekrologView(nekrologId: number, deceased: string, slug?: string) {
    if (slug) {
      await this.sendEvent('page_view', {
        page_location: `https://kaszuby24.pl/nekrolog/${slug}/`,
        page_title: `Nekrolog: ${deceased}`,
      });
    }
    await this.sendEvent('nekrolog_view', {
      nekrolog_id: nekrologId,
      nekrolog_slug: slug || '',
      deceased_name: deceased,
      content_type: 'nekrolog',
    });
  }

  /**
   * Track notification interaction
   */
  async logNotificationOpen(notificationType: string, notificationId?: string) {
    await this.sendEvent('notification_open', {
      notification_type: notificationType,
      notification_id: notificationId || 'unknown',
    });
  }

  /**
   * Track app open
   */
  async logAppOpen(source: string = 'direct') {
    await this.sendEvent('app_open', {
      source: source,
    });
  }

  /**
   * Track custom event
   */
  async logCustomEvent(eventName: string, parameters?: { [key: string]: any }) {
    await this.sendEvent(eventName, parameters || {});
  }

  /**
   * Reset analytics data (GDPR compliance)
   */
  async resetAnalyticsData() {
    try {
      this.clientId = null;
      await AsyncStorage.removeItem('@kaszuby24:ga_client_id');
      console.log('[Analytics] Analytics data reset');
    } catch (error) {
      console.warn('[Analytics] Failed to reset analytics data:', error);
    }
  }

  /**
   * Enable/disable analytics collection
   */
  async setAnalyticsEnabled(enabled: boolean) {
    try {
      this.isEnabled = enabled;
      console.log(`[Analytics] Analytics ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.warn('[Analytics] Failed to set analytics enabled:', error);
    }
  }
}

export const analyticsService = new AnalyticsService();
