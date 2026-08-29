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
function weekdayShort(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('pl-PL', { weekday: 'short', timeZone: 'Europe/Warsaw' }).replace('.', '');
}

function dayNumber(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return String(d.getDate());
}

/** "Dziś"/"Jutro"/"Za N dni" (<7 dni), dalej data dd.MM — jak w widgecie iOS. */
function heroWhen(iso: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d0 = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  const day = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
  const days = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (days >= 7) return hhmmddmm(iso);
  if (days <= 0) return 'Dziś';
  if (days === 1) return 'Jutro';
  return `Za ${days} dni`;
}

/** Podpis "pon, 27.07". */
function captionDate(iso: string): string {
  return `${weekdayShort(iso)}, ${hhmmddmm(iso)}`;
}

/** Frakcja odpadów → kolor + emoji (parytet z iOS fractionStyle). */
function fractionStyle(name: string): { color: `#${string}`; emoji: string } {
  const n = name.toLowerCase();
  if (n.includes('bio')) return { color: '#7CB342', emoji: '🍃' };
  if (n.includes('papier')) return { color: '#42A5F5', emoji: '📰' };
  if (n.includes('szk')) return { color: '#26A69A', emoji: '🫙' };
  if (n.includes('plastik') || n.includes('tworzywa') || n.includes('metal')) return { color: '#FECC00', emoji: '♻️' };
  if (n.includes('gabaryt') || n.includes('wielko')) return { color: '#AB47BC', emoji: '🛋️' };
  if (n.includes('popi')) return { color: '#8D6E63', emoji: '🔥' };
  return { color: '#90A4AE', emoji: '🗑️' };
}

/** Ludzka podpowiedź do kategorii jakości powietrza (parytet z iOS airTip). */
function airTip(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes('bardzo dobra') || c === 'dobra') return 'idealnie na spacer i rower';
  if (c.includes('umiark')) return 'OK na krótką aktywność';
  if (c.includes('bardzo z')) return 'lepiej zostać w domu';
  if (c.startsWith('z')) return 'ogranicz wysiłek na zewnątrz';
  return 'sprawdź szczegóły w aplikacji';
}

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
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ImageWidget
          image={require('../assets/images/widget-logo-mark.png')}
          imageWidth={14}
          imageHeight={14}
          style={{ marginRight: 5 }}
        />
        <TextWidget text="Kaszuby24" style={{ fontSize: 10, fontWeight: 'bold', color: withAlpha(FG, 0.9) }} />
      </FlexWidget>
      <TextWidget text={label} style={{ fontSize: 10, color: withAlpha(FG, 0.7) }} maxLines={1} truncate="END" />
    </FlexWidget>
  );
}

function SourceCaption({ text }: { text: string }) {
  return <TextWidget text={text} style={{ fontSize: 9, color: withAlpha(FG, 0.55), marginTop: 6 }} />;
}

// Pusty stan: emoji + komunikat, wyśrodkowane w dostępnej przestrzeni (zamiast tekstu przyklejonego do góry).
function EmptyBody({ icon, text }: { icon: string; text: string }) {
  return (
    <FlexWidget style={{ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 'match_parent' }}>
      <TextWidget text={icon} style={{ fontSize: 26, marginBottom: 6 }} />
      <TextWidget text={text} style={{ fontSize: 14, fontWeight: 'bold', color: FG, textAlign: 'center' }} maxLines={2} />
    </FlexWidget>
  );
}

// ---- widget: Pogoda ----
function WeatherWidget({ w, wide }: { w: WidgetWeather | null; wide: boolean }) {
  if (!w) {
    return (
      <WidgetCard uri="kaszuby24://weather">
        <BrandHeader label="Pogoda" />
        <EmptyBody icon="📍" text="Otwórz apkę, by zobaczyć pogodę" />
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
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        {w.hi != null && w.lo != null ? (
          <TextWidget text={`↑${w.hi}° ↓${w.lo}°`} style={{ fontSize: 11, fontWeight: 'bold', color: ACCENT, marginRight: 6 }} />
        ) : null}
        {w.feels != null ? (
          <TextWidget text={`odcz. ${w.feels}°`} style={{ fontSize: 11, color: withAlpha(FG, 0.7) }} />
        ) : null}
      </FlexWidget>
      {wide && w.hours && w.hours.length > 1 ? (
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', marginTop: 8 }}>
          {w.hours.slice(0, 6).map((h, i) => (
            <FlexWidget key={`${h.h}-${i}`} style={{ flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <TextWidget text={`${h.t}°`} style={{ fontSize: 11, fontWeight: 'bold', color: FG }} />
              <TextWidget text={owmEmoji(h.icon)} style={{ fontSize: 12, marginTop: 1 }} />
              <TextWidget text={h.h} style={{ fontSize: 8, color: withAlpha(FG, 0.55), marginTop: 1 }} />
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : (
        <SourceCaption text="Źródło: Open-Meteo" />
      )}
    </WidgetCard>
  );
}

// ---- widget: Jakość powietrza ----
function AirWidget({ a, wide }: { a: WidgetAir | null; wide?: boolean }) {
  if (!a || a.index == null) {
    return (
      <WidgetCard uri="kaszuby24://airquality">
        <BrandHeader label="Powietrze" />
        <EmptyBody icon="🌬️" text="Otwórz apkę, by sprawdzić powietrze" />
      </WidgetCard>
    );
  }
  const cat = a.category ?? '';
  const idx = Math.min(a.index, 100);
  const SCALE: `#${string}`[] = ['#10B981', '#84CC16', '#F59E0B', '#EF4444', '#7C3AED'];
  return (
    <WidgetCard uri="kaszuby24://airquality">
      <BrandHeader label={a.city || 'Powietrze'} />
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <TextWidget text={String(a.index)} style={{ fontSize: 30, fontWeight: 'bold', color: FG, marginRight: 10 }} />
        <FlexWidget style={{ flexDirection: 'column' }}>
          <FlexWidget style={{ borderRadius: 99, backgroundColor: a.color, paddingLeft: 10, paddingRight: 10, paddingTop: 2, paddingBottom: 2 }}>
            <TextWidget text={cat} style={{ fontSize: 11, fontWeight: 'bold', color: '#13306B' }} maxLines={1} />
          </FlexWidget>
          <TextWidget text={airTip(cat)} style={{ fontSize: 10, color: withAlpha(FG, 0.65), marginTop: 3 }} maxLines={1} truncate="END" />
        </FlexWidget>
      </FlexWidget>
      {wide ? (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 10 }}>
          <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', height: 12, alignItems: 'center' }}>
            {SCALE.map((c, i) => (
              <FlexWidget key={c} style={{ flex: 1, height: 8, backgroundColor: c, borderRadius: i === 0 || i === SCALE.length - 1 ? 4 : 0, marginRight: i < SCALE.length - 1 ? 1 : 0 }} />
            ))}
          </FlexWidget>
          <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
            {idx > 2 ? <FlexWidget style={{ flex: idx }} /> : null}
            <TextWidget text="▲" style={{ fontSize: 9, color: FG }} />
            <FlexWidget style={{ flex: Math.max(1, 100 - idx) }} />
          </FlexWidget>
          <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
            <TextWidget text="0 dobra" style={{ fontSize: 8, color: withAlpha(FG, 0.55) }} />
            <TextWidget text="100+ bardzo zła" style={{ fontSize: 8, color: withAlpha(FG, 0.55) }} />
          </FlexWidget>
        </FlexWidget>
      ) : (
        <SourceCaption text="Źródło: Open-Meteo" />
      )}
    </WidgetCard>
  );
}

// ---- widget: Wywóz odpadów ----
function WasteWidget({ waste, wide }: { waste: WidgetWaste | null; wide?: boolean }) {
  if (!waste || waste.empty) {
    return (
      <WidgetCard uri="kaszuby24://waste">
        <BrandHeader label="Odpady" />
        <EmptyBody icon="🗑️" text="Ustaw adres w apce" />
      </WidgetCard>
    );
  }
  const first = waste.next[0];
  if (!first) {
    return (
      <WidgetCard uri="kaszuby24://waste">
        <BrandHeader label={waste.gmina} />
        <EmptyBody icon="🗑️" text="Brak nadchodzących wywozów" />
      </WidgetCard>
    );
  }
  const st = fractionStyle(first.fraction);
  const rest = waste.next.slice(1, wide ? 4 : 2);
  return (
    <WidgetCard uri="kaszuby24://waste">
      <BrandHeader label={waste.gmina} />
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', marginTop: 8 }}>
        <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FlexWidget style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: st.color, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
              <TextWidget text={st.emoji} style={{ fontSize: 15 }} />
            </FlexWidget>
            <FlexWidget style={{ flexDirection: 'column' }}>
              <TextWidget text={heroWhen(first.date)} style={{ fontSize: 19, fontWeight: 'bold', color: ACCENT }} maxLines={1} />
              <TextWidget text={first.fraction} style={{ fontSize: 12, fontWeight: 'bold', color: FG }} maxLines={1} truncate="END" />
            </FlexWidget>
          </FlexWidget>
          <TextWidget text={captionDate(first.date)} style={{ fontSize: 10, color: withAlpha(FG, 0.6), marginTop: 4 }} maxLines={1} />
        </FlexWidget>
        {wide && rest.length > 0 ? (
          <FlexWidget style={{ flexDirection: 'column', flex: 1, marginLeft: 10 }}>
            <TextWidget text="KOLEJNE" style={{ fontSize: 8, fontWeight: 'bold', color: withAlpha(FG, 0.5), letterSpacing: 1, marginBottom: 3 }} />
            {rest.map((it, i) => (
              <FlexWidget key={`${it.date}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', marginTop: i > 0 ? 4 : 0 }}>
                <FlexWidget style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: fractionStyle(it.fraction).color, marginRight: 6 }} />
                <TextWidget text={weekdayShort(it.date)} style={{ fontSize: 11, fontWeight: 'bold', color: withAlpha(FG, 0.95), width: 30 }} maxLines={1} />
                <TextWidget text={it.fraction} style={{ fontSize: 11, color: withAlpha(FG, 0.7) }} maxLines={1} truncate="END" />
              </FlexWidget>
            ))}
          </FlexWidget>
        ) : null}
      </FlexWidget>
      {!wide && rest[0] ? (
        <TextWidget text={`Potem: ${weekdayShort(rest[0].date)} · ${rest[0].fraction}`} style={{ fontSize: 10, color: withAlpha(FG, 0.6), marginTop: 4 }} maxLines={1} truncate="END" />
      ) : null}
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
        <EmptyBody icon="📰" text="Brak artykułów" />
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
      <BrandHeader label="Najbliższe w okolicy" />
      {items.length === 0 ? (
        <EmptyBody icon="📅" text="Brak wydarzeń" />
      ) : (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 8 }}>
          {items.map((e, i) => (
            <FlexWidget
              key={e.id}
              clickAction="OPEN_URI"
              clickActionData={{ uri: `kaszuby24://event/${e.slug}` }}
              style={{ flexDirection: 'row', alignItems: 'flex-start', width: 'match_parent', marginBottom: i < items.length - 1 ? 8 : 0 }}
            >
              <FlexWidget style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: '#FFFFFF', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <TextWidget text={weekdayShort(e.startsAt).toUpperCase()} style={{ fontSize: 7, fontWeight: 'bold', color: '#D6452D' }} />
                <TextWidget text={dayNumber(e.startsAt)} style={{ fontSize: 14, fontWeight: 'bold', color: '#13306B' }} />
              </FlexWidget>
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
      return <AirWidget a={store.air} wide={wide} />;
    case 'Odpady':
      return <WasteWidget waste={store.waste} wide={wide} />;
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
