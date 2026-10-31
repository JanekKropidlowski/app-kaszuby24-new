// Zajęcia stałe z panelu (/kaszuby24/v1/zajecia, tabela classes) – typy i
// pomocnicze funkcje. Logika jak na stronie (kaszuby24-nextjs src/lib/zajecia.ts),
// żeby apka i strona pokazywały te same zajęcia i te same skróty terminów.

export interface ZajeciaGrupa {
  nazwa: string | null;
  wiek: string | null;
  dni: string[];
  godziny: string | null;
  uwagi: string | null;
}

export interface ZajeciaOrg {
  name: string;
  slug: string;
  logo_url?: string | null;
  website?: string | null;
}

export interface Zajecia {
  slug: string;
  title: string;
  description: string;
  category: string | null;
  audiences: string[];
  days: string[];
  groups: ZajeciaGrupa[];
  age: string | null;
  price: string | null;
  instructor: string | null;
  venue: string | null;
  city: string | null;
  citySlug: string;
  image: string | null;
  updated_at: string;
  org: ZajeciaOrg | null;
}

/** Grupy wiekowe w kolejności ze strony; etykiety skrócone do chipów filtra. */
export const ODBIORCY = [
  { key: 'maluchy', label: 'Maluchy' },
  { key: 'dzieci', label: 'Dzieci' },
  { key: 'mlodziez', label: 'Młodzież' },
  { key: 'dorosli', label: 'Dorośli' },
  { key: 'seniorzy', label: 'Seniorzy' },
] as const;

const DNI_KROTKO: Record<string, string> = { pon: 'pon.', wt: 'wt.', sr: 'śr.', czw: 'czw.', pt: 'pt.', sob: 'sob.', nd: 'niedz.' };

export const dzienKrotko = (d: string) => DNI_KROTKO[d] || d;

/** Panel zapisuje zakresy z dywizem („7-19 lat”) – w tekście półpauza. */
export const zPolpauza = (t: string) => t.replace(/(\d)\s*-\s*(\d)/g, '$1–$2');

/** „wt., czw. · 16:30–17:25” albo „wt., czw. · 4 grupy” – jak scheduleSummary() na stronie. */
export function terminySkrot(z: Pick<Zajecia, 'days' | 'groups'>): string {
  const dni = z.days.map(dzienKrotko).join(', ');
  const zGodzina = z.groups.filter((g) => g.godziny);
  const godziny =
    zGodzina.length === 1
      ? zPolpauza(zGodzina[0].godziny || '')
      : zGodzina.length > 1
        ? `${zGodzina.length} ${zGodzina.length < 5 ? 'grupy' : 'grup'}`
        : '';
  return [dni, godziny].filter(Boolean).join(' · ');
}

/** „47 zajęć”, „3 zajęcia”. */
export const liczbaZajec = (n: number) => {
  const kilka = n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14);
  return `${n} ${n === 1 || kilka ? 'zajęcia' : 'zajęć'}`;
};

// Miejscownik miast z okolicy („w Rumi” – jedno i). Miasta spoza listy:
// wMiastach() zwraca null i podpis wraca do zwykłego wyliczenia.
const MIEJSCOWNIK: Record<string, string> = {
  Wejherowo: 'Wejherowie', Reda: 'Redzie', Rumia: 'Rumi', Puck: 'Pucku', Gdynia: 'Gdyni',
  Władysławowo: 'Władysławowie', Jastarnia: 'Jastarni', Hel: 'Helu', Luzino: 'Luzinie',
  Gniewino: 'Gniewinie', Szemud: 'Szemudzie', Kosakowo: 'Kosakowie', Krokowa: 'Krokowej',
  Choczewo: 'Choczewie', Linia: 'Linii', Łęczyce: 'Łęczycach', Kartuzy: 'Kartuzach',
};

/** „w Wejherowie i Redzie”; null, gdy któregoś miasta nie umiemy odmienić. */
export function wMiastach(miasta: string[]): string | null {
  const odmienione = miasta.map((m) => MIEJSCOWNIK[m]);
  if (!odmienione.length || odmienione.some((m) => !m)) return null;
  return `w ${odmienione.length > 1 ? `${odmienione.slice(0, -1).join(', ')} i ${odmienione[odmienione.length - 1]}` : odmienione[0]}`;
}

/** Miasta od największej liczby zajęć: [[„Wejherowo”, [...]], [„Reda”, [...]]]. */
export function wedlugMiast(lista: Zajecia[]): [string, Zajecia[]][] {
  const mapa = new Map<string, Zajecia[]>();
  for (const z of lista) {
    const miasto = z.city || 'Inne';
    if (!mapa.has(miasto)) mapa.set(miasto, []);
    mapa.get(miasto)!.push(z);
  }
  return [...mapa].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'pl'));
}

/** „46 zajęć w Wejherowie i Redzie” (albo „46 zajęć · Wejherowo, Reda”). */
export function podpisZajec(lista: Zajecia[]): string {
  const miasta = wedlugMiast(lista).map(([m]) => m);
  return `${liczbaZajec(lista.length)} ${wMiastach(miasta) ?? `· ${miasta.join(', ')}`}`;
}

/** /zajecia/reda/tai-chi/ – bez powtórzonego miasta w końcówce adresu (classPath() na stronie). */
export function adresZajec(z: Pick<Zajecia, 'slug' | 'citySlug'>): string {
  const koncowka = `-${z.citySlug}`;
  const krotki = z.citySlug && z.slug.endsWith(koncowka) ? z.slug.slice(0, -koncowka.length) : z.slug;
  return `https://kaszuby24.pl/zajecia/${z.citySlug}/${krotki}/`;
}

// Zajęcia zawieszone („Biały śpiew” w Redzie: „zajęcia zawieszone”, brak dni).
// Przerwa sezonowa, pojedynczy dzień albo wstrzymany nabór to nie zawieszenie –
// lepiej przepuścić zawieszone niż ukryć prowadzone zajęcia (jak na stronie).
// Bez \p{L}: zwykła klasa liter, żeby nie polegać na wsparciu Unicode w Hermesie.
const ZAWIESZONE = /zawieszon|nie odbywaj[aą] si[eę]/i;
const CHWILOWE =
  /wakac|feri|świąt|święt|urlop|\d{1,2}[./]\d{1,2}|(?:^|[^a-ząćęłńóśźż])(?:stycz|lut|mar[cz]|kwie|maj|czerw|lip|sierp|wrze|paźdz|listop|grud|poniedzia|wtor|środ|czwart|piąt|sobot|niedziel)/i;
const NABOR = /nab[oó]r|zapis|rekrutac/i;
const O_ZAJECIACH = /zaj[eę][cć]|grup[ay]|warsztat|spotka|kurs|pr[oó]b/i;

function zawieszoneW(tekst: string | null, trzebaSlowaOZajeciach: boolean): boolean {
  if (!tekst) return false;
  // Zdania osobno („zajęcia raz w miesiącu; zajęcia zawieszone”); kropka w dacie (11.11) nie dzieli.
  return tekst
    .split(/[;!?\n]+|\.(?=\s|$)/)
    .some((s) => ZAWIESZONE.test(s) && !CHWILOWE.test(s) && !NABOR.test(s) && (!trzebaSlowaOZajeciach || O_ZAJECIACH.test(s)));
}

export function czyZawieszone(z: Pick<Zajecia, 'description' | 'groups' | 'price'>): boolean {
  return (
    (z.groups || []).some((g) => zawieszoneW(g.uwagi, false)) ||
    zawieszoneW(z.price, false) ||
    zawieszoneW(z.description, true)
  );
}
