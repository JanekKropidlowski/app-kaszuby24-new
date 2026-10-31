import { parseDeepLink } from '@/utils/linkHandler';

// Expo-router woła to dla każdego linku systemowego (zimny i ciepły start), zanim
// nawiguje. Linki z kaszuby24.pl idą dalej bez zmian do +not-found (slug → id),
// ale tam zostaje już tylko ścieżka, bez hosta. Dlatego subdomeny pogoda. i
// rozklady. (wciąż w associatedDomains starszych binarek) mapujemy tutaj.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (!/^https?:\/\/(pogoda|rozklady)\.kaszuby24\.pl/i.test(path)) return path;
    const info = parseDeepLink(path);
    if (info.type === 'weather') {
      return info.path ? `/weather?city=${encodeURIComponent(info.path)}` : '/weather';
    }
    if (info.type === 'transport') {
      return info.path ? `/transport_v2?route=${encodeURIComponent(info.path)}` : '/transport_v2';
    }
    return path;
  } catch {
    return path;
  }
}
