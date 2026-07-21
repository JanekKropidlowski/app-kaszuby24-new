// Stałe + typy współdzielone przez warstwę sync (apka) i widgety (iOS/Android).
// iOS czyta te klucze z App Group UserDefaults (ExtensionStorage), Android z AsyncStorage.
export const WIDGET_APP_GROUP = 'group.app.kaszuby24';

/** Klucze w shared storage. Dane pisze apka (lib/widget-sync). */
export const WK = {
  weather: 'kaszuby24.widget.weather',
  air: 'kaszuby24.widget.air',
  waste: 'kaszuby24.widget.waste',
  events: 'kaszuby24.widget.events',
  posts: 'kaszuby24.widget.posts',
  dicts: 'kaszuby24.widget.dicts',
} as const;

/** Config Android per-widget (iOS trzyma config w AppIntent). */
export const androidCfgKey = (widgetId: number): string => `kaszuby24.widget.cfg.${widgetId}`;

export type WidgetWeather = {
  tempC: number;
  icon: string; // kod OWM np. "04d"
  desc: string;
  city: string;
  hi: number | null;
  lo: number | null;
  updatedAt: string;
};

export type WidgetAir = {
  index: number | null; // 1-5 (OWM AQI)
  category: string | null; // np. "Dobra"
  color: `#${string}`;
  city: string;
  updatedAt: string;
};

export type WidgetWaste =
  | { empty: false; gmina: string; next: { date: string; fraction: string }[]; updatedAt: string }
  | { empty: true; reason: 'no-address'; updatedAt: string };

export type WidgetPost = {
  id: number;
  slug: string;
  title: string;
  imageUrl?: string;
  category?: string;
  date: string;
};

export type WidgetEvent = {
  id: number;
  slug: string;
  title: string;
  startsAt: string;
  location?: string;
};

export type WidgetDicts = {
  regions: { id: number; name: string }[];
  dzialy: { id: number; name: string }[];
};

/** Powiaty/regiony = kategorie WP o tych ID (źródło: app/(tabs)/index.tsx regionCategories). */
export const REGION_CATEGORIES: { id: number; name: string }[] = [
  { id: 2583, name: 'Wejherowo' },
  { id: 7, name: 'Trójmiasto' },
  { id: 2128, name: 'Puck' },
  { id: 76797, name: 'Reda' },
  { id: 65546, name: 'Kościerzyna' },
  { id: 65545, name: 'Kartuzy' },
  { id: 65558, name: 'Lębork' },
];

/** Kategorie wykluczane z listy działów (regiony liczone osobno; 3/554 = systemowe/sponsorowane). */
export const EXCLUDED_CATEGORY_IDS: number[] = [3, 554, ...REGION_CATEGORIES.map((r) => r.id)];

/** Konfiguracja widgetu artykułów (Android: per widgetId; iOS: z AppIntent). */
export type ArticlesConfig = { regionId: number | null; dzialId: number | null; sort: 'date' };
