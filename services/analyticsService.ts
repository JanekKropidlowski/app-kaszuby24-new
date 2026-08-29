import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

let analytics: any = null;
let nativeAvailable = false;

// Firebase Analytics has been removed to fix iOS build issues
// Using Google Analytics Measurement Protocol fallback for all platforms
console.log('[Analytics] Using Measurement Protocol fallback (Firebase Analytics removed)');

/**
 * Firebase Analytics Service for Kaszuby24 App
 *
 * Tracks user behavior and app usage to improve user experience
 * and understand content performance.
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

  /**
   * Initialize Analytics
   * Call this once during app startup
   */
  async initialize() {
    try {
      const manifest = (Constants as any).expoConfig || (Constants as any).manifest || {};
      const appVersion = String(manifest.version || 'unknown');

      if (nativeAvailable && analytics) {
        await analytics().setAnalyticsCollectionEnabled(true);
        await analytics().setUserProperty('app_platform', Platform.OS);
        await analytics().setUserProperty('app_version', appVersion);
        console.log('[Analytics] Native Firebase Analytics initialized');
      } else {
        // Setup Measurement Protocol fallback (for Expo Go / web)
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
        // Wcześniej ustawiał je tylko martwy branch Firebase powyżej, więc
        // do GA4 nigdy nie docierały, a app_version było zaszyte na 1.0.40.
        this.userProperties['app_platform'] = Platform.OS;
        this.userProperties['app_version'] = appVersion;
        this.userProperties['app_os_version'] = String(Platform.Version ?? 'unknown');
        console.log('[Analytics] Measurement Protocol fallback initialized', {
          measurementId: this.measurementId ? 'present' : 'missing',
          app_platform: Platform.OS,
          app_version: appVersion,
        });
      }
    } catch (error) {
      console.warn('[Analytics] Failed to initialize:', error);
      this.isEnabled = false;
    }
  }

  private async getOrCreateClientId() {
    try {
      const key = '@kaszuby24:ga_client_id';
      let id = await AsyncStorage.getItem(key);
      if (!id) {
        id = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        await AsyncStorage.setItem(key, id);
      }
      return id;
    } catch (e) {
      console.warn('[Analytics] Failed to get/create client id:', e);
      return `cid-${Date.now()}`;
    }
  }

  /** Nowa sesja po 30 minutach bezczynności — tak samo jak liczy je GA4. */
  private static readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  private sessionParams(): { session_id: string; engagement_time_msec: number } {
    const now = Date.now();
    const elapsed = this.lastEventAt ? now - this.lastEventAt : 0;
    if (!this.sessionId || elapsed > AnalyticsService.SESSION_TIMEOUT_MS) {
      this.sessionId = String(now);
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
    const body: any = {
      client_id: this.clientId,
      events: [
        {
          name: eventName,
          params: {
            ...params,
            ...this.sessionParams(),
          },
        },
      ],
    };

    if (Object.keys(this.userProperties).length > 0) {
      body.user_properties = Object.fromEntries(
        Object.entries(this.userProperties).map(([k, v]) => [k, { value: String(v) }])
      );
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.warn('[Analytics] MP send failed:', e);
    }
  }

  private async sendEvent(eventName: string, params: { [k: string]: any } = {}) {
    if (!this.isEnabled) return;
    if (nativeAvailable && analytics) {
      try {
        await analytics().logEvent(eventName, params);
      } catch (e) {
        console.warn('[Analytics] Native logEvent failed:', e);
      }
    } else {
      await this.sendToMeasurementProtocol(eventName, params);
      console.log(`[Analytics] MP event sent: ${eventName}`);
    }
  }

  /**
   * Track screen view
   */
  async logScreenView(screenName: string, screenClass?: string) {
    await this.sendEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
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
      await this.sendEvent('page_view', {
        page_location: `https://kaszuby24.pl/${slug}`,
        page_title: title,
        page_referrer: 'app',
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
        page_location: `https://kaszuby24.pl/nekrolog/${slug}`,
        page_title: `Nekrolog: ${deceased}`,
        page_referrer: 'app',
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
   * Track event view from calendar. Web używa `/wydarzenia/<id>` jako URL —
   * mirror w page_view dla atrybucji.
   */
  async logEventView(eventId: number, eventTitle: string, eventType?: string) {
    await this.sendEvent('page_view', {
      page_location: `https://kaszuby24.pl/wydarzenia/${eventId}`,
      page_title: eventTitle,
      page_referrer: 'app',
    });
    await this.sendEvent('calendar_event_view', {
      event_id: eventId,
      event_title: eventTitle,
      event_type: eventType || 'general',
      content_type: 'event',
    });
  }

  /**
   * Track transport search
   */
  async logTransportSearch(query: string, agency?: string, results?: number) {
    await this.sendEvent('transport_search', {
      search_term: query,
      agency: agency || 'all',
      results_count: results || 0,
    });
  }

  /**
   * Track timetable view
   */
  async logTimetableView(stopName: string, agency: string, lineNumber?: string) {
    await this.sendEvent('timetable_view', {
      stop_name: stopName,
      agency: agency,
      line_number: lineNumber || 'unknown',
    });
  }

  /**
   * Track weather check
   */
  async logWeatherCheck(location: string, source: string = 'manual') {
    await this.sendEvent('weather_check', {
      location: location,
      source: source,
    });
  }

  /**
   * Track waste schedule setup
   */
  async logWasteScheduleSetup(city: string, street: string) {
    await this.sendEvent('waste_schedule_setup', {
      city: city,
      street: street,
    });
  }

  /**
   * Track waste notification settings
   */
  async logWasteNotificationSettings(enabled: boolean, hour: number, dayOffset: number) {
    await this.sendEvent('waste_notification_settings', {
      enabled: enabled,
      notification_hour: hour,
      day_offset: dayOffset,
    });
  }

  /**
   * Track search query
   */
  async logSearch(searchTerm: string, contentType: string = 'general') {
    await this.sendEvent('search', {
      search_term: searchTerm,
      content_type: contentType,
    });
  }

  /**
   * Track share action
   */
  async logShare(contentType: string, contentId: string, method?: string) {
    await this.sendEvent('share', {
      content_type: contentType,
      content_id: contentId,
      method: method || 'unknown',
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
   * Set user location preference
   */
  async setUserLocation(location: string, locationId?: number) {
    if (!this.isEnabled) return;

    try {
      if (nativeAvailable && analytics) {
        await analytics().setUserProperty('preferred_location', location);
        if (locationId) {
          await analytics().setUserProperty('location_id', locationId.toString());
        }
      }
      // MP doesn't support user properties in the same way, we'd need to send them with events
      this.userProperties['preferred_location'] = location;
      if (locationId) this.userProperties['location_id'] = locationId;
      console.log(`[Analytics] User location set: ${location}`);
    } catch (error) {
      console.warn('[Analytics] Failed to set user location:', error);
    }
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
      if (nativeAvailable && analytics) {
        await analytics().resetAnalyticsData();
      }
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
      if (nativeAvailable && analytics) {
        await analytics().setAnalyticsCollectionEnabled(enabled);
      }
      this.isEnabled = enabled;
      console.log(`[Analytics] Analytics ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.warn('[Analytics] Failed to set analytics enabled:', error);
    }
  }
}

export const analyticsService = new AnalyticsService();
