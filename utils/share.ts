import { Share, Platform, Alert, Clipboard } from 'react-native';

/**
 * Udostępnianie artykułu z ładną kartą (OG/Twitter po stronie www).
 * - iOS: sam URL (LinkPresentation → najlepszy podgląd)
 * - Android: tytuł + URL
 * - Web: Web Share API, a jak brak → kopiuj do schowka
 */
export async function shareArticle(title: string, url: string) {
  try {
    // 1) Wymuś HTTPS (podglądy często nie działają na http)
    const httpsUrl = url.replace(/^http:\/\//i, 'https://');

    // 2) UTM – nie zmieniają kanonicznego URL, podgląd dalej z og:*
    const shareUrl = `${httpsUrl}${httpsUrl.includes('?') ? '&' : '?'}utm_source=app&utm_medium=share`;

    if (Platform.OS === 'web') {
      // 3) PWA/WWW
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title, text: title, url: shareUrl });
        return;
      }
      // Fallback: kopiuj do schowka
      await navigator.clipboard.writeText(shareUrl);
      Alert.alert('Skopiowano link', 'Możesz wkleić gdzie chcesz.');
      return;
    }

    if (Platform.OS === 'ios') {
      // iOS – sam URL daje natywną kartę z tytułem/zdjęciem/opisem
      await Share.share({ url: shareUrl });
      return;
    }

    // Android – dodajemy tytuł w message (część aplikacji go pokazuje)
    await Share.share({
      title,
      message: `${title}\n${shareUrl}`,
      url: shareUrl, // nie zaszkodzi, część appek go czyta
    });
  } catch (e) {
    // awaryjnie kopiujemy link – user i tak może wkleić
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(url);
      } else {
        Clipboard.setString(url);
      }
      Alert.alert('Ups…', 'Nie udało się udostępnić. Skopiowałem link do schowka.');
    } catch {}
    console.warn('shareArticle error', e);
  }
}
