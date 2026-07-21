// Widgety Androida (react-native-android-widget). Renderują się w JS (task handler).
// Dane tanie/lokalne czytane z shared storage (AsyncStorage, zapis: lib/widget-sync);
// artykuły/wydarzenia self-fetchowane wg konfiguracji per-widgetId. Klik → deep link kaszuby24://…
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FlexWidget,
  ImageWidget,
  TextWidget,
  requestWidgetUpdate,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';
import {
  WK,
  androidCfgKey,
  type WidgetWeather,
  type WidgetAir,
  type WidgetWaste,
  type WidgetPost,
  type WidgetEvent,
  type ArticlesConfig,
} from '../lib/widget-shared';
import { fetchArticlesForWidget, fetchEventsForWidget } from '../lib/widget-data';

const BRAND = '#224A96';
const FG = '#FFFFFF';
const ACCENT = '#FECC00';
const RADIUS = 20;

// ---- helpery koloru/formatu ----
function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const n = parseInt(c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function withAlpha(hex: string, a: number): `rgba(${number}, ${number}, ${number}, ${number})` {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function darker(hex: string, amount = 0.16): `#${string}` {
  const [r, g, b] = hexToRgb(hex);
  const d = (x: number) => Math.max(0, Math.round(x - amount * 255)).toString(16).padStart(2, '0');
  return `#${d(r)}${d(g)}${d(b)}` as `#${string}`;
}
function hhmmddmm(iso: string): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
}
function timeAgo(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (isNaN(min)) return '';
  if (min < 1) return 'przed chwilą';
  if (min < 60) return `${min} min temu`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} godz. temu`;
  return `${Math.round(h / 24)} dni temu`;
}
/** Kod ikony OpenWeatherMap → emoji (Android nie ma SF Symbols). */
function owmEmoji(code: string): string {
  const c = (code || '').slice(0, 2);
  const night = (code || '').endsWith('n');
  switch (c) {
    case '01':
      return night ? '🌙' : '☀️';
    case '02':
      return night ? '☁️' : '🌤️';
    case '03':
      return '☁️';
    case '04':
      return '☁️';
    case '09':
      return '🌧️';
    case '10':
      return '🌦️';
    case '11':
      return '⛈️';
    case '13':
      return '❄️';
    case '50':
      return '🌫️';
    default:
      return '🌡️';
  }
}

type Store = {
  weather: WidgetWeather | null;
  air: WidgetAir | null;
  waste: WidgetWaste | null;
  posts: WidgetPost[];
  events: WidgetEvent[];
};

// ---- wspólne bloki ----
function WidgetCard({ uri, bg = BRAND, children }: { uri: string; bg?: string; children: React.ReactNode }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        padding: 14,
        borderRadius: RADIUS,
        backgroundGradient: { from: bg as `#${string}`, to: darker(bg), orientation: 'TL_BR' },
      }}
    >
      {children}
    </FlexWidget>
  );
}

function BrandHeader({ label }: { label: string }) {
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 'match_parent' }}>
      <TextWidget text="Kaszuby24" style={{ fontSize: 10, fontWeight: 'bold', color: withAlpha(FG, 0.75) }} />
      <TextWidget text={label} style={{ fontSize: 10, color: withAlpha(FG, 0.7) }} maxLines={1} truncate="END" />
    </FlexWidget>
  );
}

// ---- widget: Pogoda ----
function WeatherWidget({ w, wide }: { w: WidgetWeather | null; wide: boolean }) {
  if (!w) {
    return (
      <WidgetCard uri="kaszuby24://weather">
        <BrandHeader label="Pogoda" />
        <TextWidget text="Otwórz apkę" style={{ fontSize: 14, fontWeight: 'bold', color: FG, marginTop: 10 }} />
      </WidgetCard>
    );
  }
  return (
    <WidgetCard uri="kaszuby24://weather">
      <BrandHeader label={w.city || 'Pogoda'} />
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <TextWidget text={owmEmoji(w.icon)} style={{ fontSize: wide ? 34 : 30, marginRight: 8 }} />
        <TextWidget text={`${w.tempC}°`} style={{ fontSize: wide ? 40 : 34, fontWeight: 'bold', color: FG }} />
      </FlexWidget>
      <TextWidget text={w.desc} style={{ fontSize: 12, color: withAlpha(FG, 0.85), marginTop: 2 }} maxLines={1} truncate="END" />
      {w.hi != null && w.lo != null ? (
        <TextWidget text={`↑${w.hi}°  ↓${w.lo}°`} style={{ fontSize: 12, fontWeight: 'bold', color: ACCENT, marginTop: 4 }} />
      ) : null}
    </WidgetCard>
  );
}

// ---- widget: Jakość powietrza ----
function AirWidget({ a }: { a: WidgetAir | null }) {
  if (!a || a.index == null) {
    return (
      <WidgetCard uri="kaszuby24://airquality">
        <BrandHeader label="Powietrze" />
        <TextWidget text="Otwórz apkę" style={{ fontSize: 14, fontWeight: 'bold', color: FG, marginTop: 10 }} />
      </WidgetCard>
    );
  }
  return (
    <WidgetCard uri="kaszuby24://airquality">
      <BrandHeader label={a.city || 'Powietrze'} />
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
        <FlexWidget style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: a.color, marginRight: 8 }} />
        <TextWidget text={a.category ?? ''} style={{ fontSize: 18, fontWeight: 'bold', color: FG }} maxLines={1} truncate="END" />
      </FlexWidget>
      <TextWidget text="Jakość powietrza" style={{ fontSize: 11, color: withAlpha(FG, 0.75), marginTop: 4 }} />
    </WidgetCard>
  );
}

// ---- widget: Wywóz odpadów ----
function WasteWidget({ waste }: { waste: WidgetWaste | null }) {
  if (!waste || waste.empty) {
    return (
      <WidgetCard uri="kaszuby24://waste">
        <BrandHeader label="Odpady" />
        <TextWidget text="Ustaw adres w apce" style={{ fontSize: 14, fontWeight: 'bold', color: FG, marginTop: 10 }} maxLines={2} />
      </WidgetCard>
    );
  }
  const first = waste.next[0];
  return (
    <WidgetCard uri="kaszuby24://waste">
      <BrandHeader label={waste.gmina} />
      {first ? (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 8 }}>
          <TextWidget text={hhmmddmm(first.date)} style={{ fontSize: 22, fontWeight: 'bold', color: ACCENT }} />
          <TextWidget text={first.fraction} style={{ fontSize: 13, fontWeight: 'bold', color: FG, marginTop: 2 }} maxLines={2} truncate="END" />
          {waste.next[1] ? (
            <TextWidget
              text={`Potem ${hhmmddmm(waste.next[1].date)} · ${waste.next[1].fraction}`}
              style={{ fontSize: 11, color: withAlpha(FG, 0.75), marginTop: 4 }}
              maxLines={1}
              truncate="END"
            />
          ) : null}
        </FlexWidget>
      ) : (
        <TextWidget text="Brak nadchodzących wywozów" style={{ fontSize: 14, fontWeight: 'bold', color: FG, marginTop: 8 }} maxLines={2} />
      )}
    </WidgetCard>
  );
}

// ---- widget: Najnowsze artykuły ----
function ArticlesWidget({ posts, count }: { posts: WidgetPost[]; count: number }) {
  const items = posts.slice(0, count);
  return (
    <WidgetCard uri="kaszuby24://home">
      <BrandHeader label="Najnowsze" />
      {items.length === 0 ? (
        <TextWidget text="Brak artykułów" style={{ fontSize: 14, fontWeight: 'bold', color: FG, marginTop: 10 }} />
      ) : (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 8 }}>
          {items.map((p, i) => (
            <FlexWidget
              key={p.id}
              clickAction="OPEN_URI"
              clickActionData={{ uri: `kaszuby24://article/${p.slug}` }}
              style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', marginBottom: i < items.length - 1 ? 8 : 0 }}
            >
              {p.imageUrl ? (
                <ImageWidget image={p.imageUrl as `https:${string}`} imageWidth={44} imageHeight={44} radius={8} style={{ marginRight: 8 }} />
              ) : null}
              <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
                <TextWidget text={p.title} style={{ fontSize: 13, fontWeight: 'bold', color: FG }} maxLines={2} truncate="END" />
                <TextWidget
                  text={[p.category, timeAgo(p.date)].filter(Boolean).join(' · ')}
                  style={{ fontSize: 10, color: withAlpha(FG, 0.7), marginTop: 2 }}
                  maxLines={1}
                  truncate="END"
                />
              </FlexWidget>
            </FlexWidget>
          ))}
        </FlexWidget>
      )}
    </WidgetCard>
  );
}

// ---- widget: Najbliższe wydarzenia ----
function EventsWidget({ events, count }: { events: WidgetEvent[]; count: number }) {
  const items = events.slice(0, count);
  return (
    <WidgetCard uri="kaszuby24://home">
      <BrandHeader label="Wydarzenia" />
      {items.length === 0 ? (
        <TextWidget text="Brak wydarzeń" style={{ fontSize: 14, fontWeight: 'bold', color: FG, marginTop: 10 }} />
      ) : (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 8 }}>
          {items.map((e, i) => (
            <FlexWidget
              key={e.id}
              clickAction="OPEN_URI"
              clickActionData={{ uri: `kaszuby24://event/${e.slug}` }}
              style={{ flexDirection: 'row', alignItems: 'flex-start', width: 'match_parent', marginBottom: i < items.length - 1 ? 8 : 0 }}
            >
              <TextWidget text={hhmmddmm(e.startsAt)} style={{ fontSize: 13, fontWeight: 'bold', color: ACCENT, width: 48 }} />
              <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
                <TextWidget text={e.title} style={{ fontSize: 13, fontWeight: 'bold', color: FG }} maxLines={2} truncate="END" />
                {e.location ? (
                  <TextWidget text={e.location} style={{ fontSize: 10, color: withAlpha(FG, 0.7), marginTop: 2 }} maxLines={1} truncate="END" />
                ) : null}
              </FlexWidget>
            </FlexWidget>
          ))}
        </FlexWidget>
      )}
    </WidgetCard>
  );
}

const WIDGET_NAMES = ['Pogoda', 'Artykuly', 'Powietrze', 'Odpady', 'Wydarzenia'] as const;

export function renderByName(name: string, store: Store, widthDp?: number, heightDp?: number): React.ReactElement {
  const wide = (widthDp ?? 0) >= 200;
  const listCount = (heightDp ?? 0) >= 240 ? 4 : 2;
  switch (name) {
    case 'Powietrze':
      return <AirWidget a={store.air} />;
    case 'Odpady':
      return <WasteWidget waste={store.waste} />;
    case 'Artykuly':
      return <ArticlesWidget posts={store.posts} count={listCount} />;
    case 'Wydarzenia':
      return <EventsWidget events={store.events} count={listCount} />;
    default:
      return <WeatherWidget w={store.weather} wide={wide} />;
  }
}

async function readStore(): Promise<Store> {
  const get = async <T,>(key: string, fallback: T): Promise<T> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const [weather, air, waste, posts, events] = await Promise.all([
    get<WidgetWeather | null>(WK.weather, null),
    get<WidgetAir | null>(WK.air, null),
    get<WidgetWaste | null>(WK.waste, null),
    get<WidgetPost[]>(WK.posts, []),
    get<WidgetEvent[]>(WK.events, []),
  ]);
  return { weather, air, waste, posts, events };
}

async function readArticlesConfig(widgetId: number): Promise<ArticlesConfig> {
  try {
    const raw = await AsyncStorage.getItem(androidCfgKey(widgetId));
    if (raw) return JSON.parse(raw) as ArticlesConfig;
  } catch {
    /* fallback */
  }
  return { regionId: null, dzialId: null, sort: 'date' };
}

/** Wymuszenie odświeżenia wszystkich placowanych widgetów (po zapisie danych przez sync). */
export async function refreshAndroidWidgets(): Promise<void> {
  const store = await readStore();
  for (const name of WIDGET_NAMES) {
    await requestWidgetUpdate({
      widgetName: name,
      renderWidget: () => renderByName(name, store),
      widgetNotFound: () => {
        /* nie ma tego widgetu na ekranie — pomiń */
      },
    });
  }
}

/** Task handler — wołany przez system (dodanie/aktualizacja/resize/klik/usunięcie). */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetName, widgetId, width, height } = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const store = await readStore();
      // Artykuły/Wydarzenia: self-fetch wg konfiguracji per-widget (świeżość bez otwierania apki).
      if (widgetName === 'Artykuly') {
        const cfg = await readArticlesConfig(widgetId);
        const fresh = await fetchArticlesForWidget(cfg).catch(() => []);
        if (fresh.length) store.posts = fresh;
      } else if (widgetName === 'Wydarzenia') {
        const cfg = await readArticlesConfig(widgetId);
        const fresh = await fetchEventsForWidget(cfg.regionId).catch(() => []);
        if (fresh.length) store.events = fresh;
      }
      props.renderWidget(renderByName(widgetName, store, width, height));
      break;
    }
    case 'WIDGET_DELETED':
      await AsyncStorage.removeItem(androidCfgKey(widgetId)).catch(() => {});
      break;
    default:
      break;
  }
}
