// Zbiera dane tanie/lokalne + słowniki + seed treści i zapisuje do shared storage
// czytanego przez widgety (iOS App Group przez ExtensionStorage, Android AsyncStorage).
// Wołane przy starcie apki i przy powrocie na pierwszy plan (app/_layout.tsx). Best-effort.
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchForecast } from '@/services/weatherService';
import { wasteScheduleService } from '@/services/WasteScheduleService';
import { fetchCategories } from '@/services/api';
import {
  WIDGET_APP_GROUP,
  WK,
  REGION_CATEGORIES,
  EXCLUDED_CATEGORY_IDS,
  type WidgetWaste,
  type WidgetDicts,
} from './widget-shared';
import { normalizeOpenMeteo, fetchAirForWidget, fetchArticlesForWidget, fetchEventsForWidget } from './widget-data';

// Fallback: centrum powiatu puckiego, gdy brak znanej lokalizacji.
const DEFAULT_COORDS = { lat: 54.7206, lon: 18.4103 };
const WASTE_SELECTION_KEY = '@kaszuby24_waste_selection';

async function resolveCoords(): Promise<{ lat: number; lon: number }> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      const last = await Location.getLastKnownPositionAsync();
      if (last?.coords) return { lat: last.coords.latitude, lon: last.coords.longitude };
    }
  } catch {
    /* brak modułu/uprawnień — fallback */
  }
  return DEFAULT_COORDS;
}

async function resolveCity(lat: number, lon: number): Promise<string> {
  try {
    const r = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    return r?.[0]?.city || r?.[0]?.subregion || r?.[0]?.region || '';
  } catch {
    return '';
  }
}

async function buildWaste(updatedAt: string): Promise<WidgetWaste> {
  try {
    const raw = await AsyncStorage.getItem(WASTE_SELECTION_KEY);
    if (!raw) return { empty: true, reason: 'no-address', updatedAt };
    const sel = JSON.parse(raw) as { cityId?: string; regionId?: string | number; street?: string };
    if (sel.regionId == null) return { empty: true, reason: 'no-address', updatedAt };
    const data = await wasteScheduleService.getRegionWithSchedule(sel.regionId);
    const region = data?.regions?.[0];
    if (!data || !region) return { empty: true, reason: 'no-address', updatedAt };
    const today = new Date().toISOString().slice(0, 10);
    const next = region.schedule
      .filter((s) => s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4)
      .map((s) => ({ date: s.date, fraction: s.types.join(', ') }));
    return { empty: false, gmina: data.city || String(sel.cityId ?? ''), next, updatedAt };
  } catch {
    return { empty: true, reason: 'no-address', updatedAt };
  }
}

async function buildDicts(): Promise<WidgetDicts> {
  try {
    const cats: any[] = await fetchCategories();
    const dzialy = (Array.isArray(cats) ? cats : [])
      .filter((c) => c && c.id != null && !EXCLUDED_CATEGORY_IDS.includes(Number(c.id)) && (c.count ?? 1) > 0)
      .map((c) => ({ id: Number(c.id), name: String(c.name ?? '') }))
      .filter((c) => c.name);
    return { regions: REGION_CATEGORIES, dzialy };
  } catch {
    return { regions: REGION_CATEGORIES, dzialy: [] };
  }
}

function writeKey(key: string, value: unknown): Promise<void> | void {
  const json = JSON.stringify(value);
  if (Platform.OS === 'ios') {
    try {
      const { ExtensionStorage } = require('@bacons/apple-targets');
      const storage = new ExtensionStorage(WIDGET_APP_GROUP);
      storage.set(key, json);
    } catch {
      /* brak natywnego modułu (build bez widgetu) — cicho */
    }
  } else {
    return AsyncStorage.setItem(key, json);
  }
}

let inFlight: Promise<void> | null = null;

/** Pobiera dane i zapisuje do shared storage + odświeża widgety. Debounce: jedno na raz. */
export async function syncWidget(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const updatedAt = new Date().toISOString();
      const { lat, lon } = await resolveCoords();
      const city = await resolveCity(lat, lon);
      const [fc, waste, dicts, posts, events] = await Promise.all([
        fetchForecast({ latitude: lat, longitude: lon }).catch(() => null),
        buildWaste(updatedAt),
        buildDicts(),
        fetchArticlesForWidget({ regionId: null, dzialId: null, sort: 'date' }).catch(() => []),
        fetchEventsForWidget(null).catch(() => []),
      ]);
      const weather = normalizeOpenMeteo(fc, city, updatedAt);
      const air = await fetchAirForWidget(lat, lon, city, updatedAt);

      await Promise.all([
        writeKey(WK.weather, weather),
        writeKey(WK.air, air),
        writeKey(WK.waste, waste),
        writeKey(WK.dicts, dicts),
        writeKey(WK.posts, posts),
        writeKey(WK.events, events),
      ]);

      if (Platform.OS === 'ios') {
        try {
          const { ExtensionStorage } = require('@bacons/apple-targets');
          ExtensionStorage.reloadWidget();
        } catch {
          /* cicho */
        }
      } else {
        try {
          const { refreshAndroidWidgets } = require('../widgets/android');
          await refreshAndroidWidgets();
        } catch {
          /* moduł widgetu nie w tym buildzie — cicho */
        }
      }
    } catch {
      /* sync jest best-effort, nigdy nie wywala apki */
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
