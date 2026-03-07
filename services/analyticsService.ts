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
  private measurementId: string | null = null;
  private apiSecret: string | null = null;

  /**
   * Initialize Analytics
   * Call this once during app startup
   */
  async initialize() {
    try {
      if (nativeAvailable && analytics) {
        await analytics().setAnalyticsCollectionEnabled(true);
        await analytics().setUserProperty('platform', Platform.OS);
        await analytics().setUserProperty('app_version', '1.0.40');
        console.log('[Analytics] Native Firebase Analytics initialized');
      } else {
        // Setup Measurement Protocol fallback (for Expo Go / web)
        const manifest = (Constants as any).expoConfig || (Constants as any).manifest || {};
        const extra = manifest.extra || {};
        this.measurementId = extra.gaMeasurementId || null;
        this.apiSecret = extra.gaApiSecret || null;
        this.clientId = await this.getOrCreateClientId();
        console.log('[Analytics] Measurement Protocol fallback initialized', {
          measurementId: this.measurementId ? 'present' : 'missing',
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

  private async sendToMeasurementProtocol(eventName: string, params: { [k: string]: any } = {}) {
    if (!this.measurementId || !this.apiSecret || !this.clientId) return;

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;
    const body: any = {
      client_id: this.clientId,
      events: [
        {
          name: eventName,
          params: params,
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
   * Track article view
   */
  async logArticleView(articleId: number, title: string, categoryId?: number) {
    await this.sendEvent('article_view', {
      article_id: articleId,
      article_title: title,
      category_id: categoryId || null,
      content_type: 'article',
    });
  }

  /**
   * Track nekrolog view
   */
  async logNekrologView(nekrologId: number, deceased: string) {
    await this.sendEvent('nekrolog_view', {
      nekrolog_id: nekrologId,
      deceased_name: deceased,
      content_type: 'nekrolog',
    });
  }

  /**
   * Track event view from calendar
   */
  async logEventView(eventId: number, eventTitle: string, eventType?: string) {
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
