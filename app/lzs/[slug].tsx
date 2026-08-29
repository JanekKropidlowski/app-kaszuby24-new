import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Linking,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Share2,
  Calendar as CalendarIcon,
  CalendarPlus,
  MapPin,
  Clock,
  User,
  FileText,
  ExternalLink,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '@/store/themeStore';
import GlobalTabBar from '@/components/GlobalTabBar';
import calendarService from '@/services/calendarService';
import {
  fetchLzsEventBySlug,
  LZS_FALLBACK_IMAGE,
  type LzsRawEvent,
} from '@/services/lzsEvents';
import { safeFormatDate, safeFormatTime } from '@/utils/dateFormatter';

const LZS_GREEN = '#1e9346';
const LZS_GREEN_DARK = '#16703a';
const LZS_LOGO = 'https://lzs-pomorski.pl/wp-content/uploads/2025/03/Logo_LZS_RGB.png';

// Native detail screen dla wydarzeń pobranych z feedu LZS Pomorskiego. Kontener
// `kalendarz` na panel.kaszuby24.pl nie zawiera tych rekordów, więc nie da się
// otworzyć ich w istniejącym `event/[id]`. Slug jest unikalny w obrębie LZS
// (WP post_name), więc filtrujemy `LZS_FEED_URL?per_page=100` klient-side.
export default function LzsEventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { theme } = useThemeStore();

  const [event, setEvent] = useState<LzsRawEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      // Slug w URL może mieć prefix `lzs-` (gdy podany z listy kalendarza).
      // Feed LZS używa surowych slugów — strip prefix zanim szukamy.
      const rawSlug = slug.replace(/^lzs-/, '');
      const data = await fetchLzsEventBySlug(rawSlug);
      if (cancelled) return;
      if (!data) {
        setError('Nie znaleziono wydarzenia');
      } else {
        setEvent(data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleBack = () => router.back();

  // Buduje sztuczny ISO timestamp z `date_unix + godzina` żeby formattery
  // (safeFormatDate/Time) miały sensowne wejście. Bez `godzina` data leci na
  // północ UTC, co po konwersji do Europe/Warsaw da już lokalną.
  const buildIso = (): string | null => {
    if (!event?.date_unix) return null;
    const m = event.godzina?.trim().match(/^(\d{1,2}):(\d{2})$/);
    const h = m ? Math.max(0, Math.min(23, Number(m[1]))) : 0;
    const mm = m ? Math.max(0, Math.min(59, Number(m[2]))) : 0;
    const d = new Date((event.date_unix + h * 3600 + mm * 60) * 1000);
    return d.toISOString();
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        title: event.title,
        message: `${event.title}\n\n${event.link}`,
        url: event.link,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleAddToCalendar = async () => {
    if (!event) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const iso = buildIso();
      const fakeEventData = {
        date: iso || new Date().toISOString(),
        title: { rendered: event.title },
        meta: {
          miasto: event.miejscowosc,
          'opis-wydarzenia': event.description_text || event.description_html || '',
          'link-do-wydarzenia': event.link,
        },
      };
      const calEvent = calendarService.createEventFromEventData(fakeEventData);
      const ok = await calendarService.addEventToCalendar(calEvent);
      if (!ok) Alert.alert('Błąd', 'Nie udało się dodać wydarzenia do kalendarza');
    } catch (e) {
      console.error('Calendar error:', e);
      Alert.alert('Błąd', 'Nie udało się dodać wydarzenia do kalendarza');
    }
  };

  const handleOpenOriginal = () => {
    if (event?.link) Linking.openURL(event.link).catch(() => {});
  };

  const handleOpenRegulamin = () => {
    if (event?.regulamin) Linking.openURL(event.regulamin).catch(() => {});
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={LZS_GREEN} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          {error || 'Nie znaleziono wydarzenia'}
        </Text>
        <TouchableOpacity onPress={handleBack} style={styles.errorBackBtn}>
          <ArrowLeft size={20} color="#fff" />
          <Text style={styles.errorBackText}>Wróć</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const iso = buildIso();
  const hasImage = !!event.image;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Floating header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn} hitSlop={10}>
          <ArrowLeft size={24} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn} hitSlop={10}>
            <Share2 size={24} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddToCalendar} style={styles.headerBtn} hitSlop={10}>
            <CalendarIcon size={24} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero image / LZS green placeholder */}
        <View style={styles.heroWrap}>
          {hasImage ? (
            <Image
              source={{ uri: event.image as string }}
              style={styles.hero}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={[LZS_GREEN, LZS_GREEN_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Image source={{ uri: LZS_LOGO }} style={styles.heroLogoBg} contentFit="contain" />
            </LinearGradient>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.2)', 'transparent', 'transparent', 'rgba(0,0,0,0.55)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Data badge top-left */}
          {iso && (
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeDay}>{new Date(iso).getDate()}</Text>
              <Text style={styles.dateBadgeMonth}>
                {new Date(iso).toLocaleDateString('pl-PL', { month: 'short' })}
              </Text>
            </View>
          )}

          {/* LZS logo bubble bottom-right */}
          <View style={styles.lzsBubble}>
            <Image source={{ uri: LZS_LOGO }} style={styles.lzsBubbleImg} contentFit="contain" />
          </View>

          {/* LZS tag bottom-left */}
          <View style={styles.lzsTag}>
            <Text style={styles.lzsTagText}>LZS POMORSKI</Text>
          </View>
        </View>

        {/* Content */}
        <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{event.title}</Text>

          {/* Meta tiles */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tilesRow}
          >
            {iso && (
              <View style={[styles.tile, { backgroundColor: theme.colors.card }]}>
                <CalendarIcon size={20} color={LZS_GREEN} />
                <Text style={[styles.tileText, { color: theme.colors.text }]}>
                  {safeFormatDate(iso)}
                </Text>
              </View>
            )}
            {event.godzina && (
              <View style={[styles.tile, { backgroundColor: theme.colors.card }]}>
                <Clock size={20} color={LZS_GREEN} />
                <Text style={[styles.tileText, { color: theme.colors.text }]}>{event.godzina}</Text>
              </View>
            )}
            {event.miejscowosc ? (
              <View style={[styles.tile, { backgroundColor: theme.colors.card }]}>
                <MapPin size={20} color={LZS_GREEN} />
                <Text style={[styles.tileText, { color: theme.colors.text }]}>
                  {event.miejscowosc}
                </Text>
              </View>
            ) : null}
            {event.categories?.[0] && (
              <View style={[styles.tile, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.tileText, { color: LZS_GREEN, fontFamily: 'Poppins_SemiBold' }]}>
                  {event.categories[0].name}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Organizator */}
          {event.organizator ? (
            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
              <View style={styles.sectionHeader}>
                <User size={18} color={LZS_GREEN} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Organizator</Text>
              </View>
              <Text style={[styles.sectionBody, { color: theme.colors.text }]}>
                {event.organizator}
              </Text>
            </View>
          ) : null}

          {/* Description */}
          {(event.description_text || event.description_html) ? (
            <View style={styles.descSection}>
              <Text style={[styles.descTitle, { color: theme.colors.text }]}>Opis</Text>
              <Text style={[styles.descText, { color: theme.colors.text }]}>
                {(event.description_text || event.description_html || '')
                  .replace(/<[^>]*>/g, '')
                  .replace(/&nbsp;/g, ' ')
                  .trim()}
              </Text>
            </View>
          ) : null}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {event.regulamin ? (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: LZS_GREEN }]}
                onPress={handleOpenRegulamin}
                activeOpacity={0.85}
              >
                <FileText size={18} color={LZS_GREEN} />
                <Text style={[styles.actionBtnText, { color: LZS_GREEN }]}>
                  Pobierz regulamin
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.actionBtnPrimary, { backgroundColor: LZS_GREEN }]}
              onPress={handleOpenOriginal}
              activeOpacity={0.9}
            >
              <ExternalLink size={18} color="#fff" />
              <Text style={styles.actionBtnPrimaryText}>
                Zobacz na lzs-pomorski.pl
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: theme.colors.text, opacity: 0.85 }]}
              onPress={handleAddToCalendar}
              activeOpacity={0.85}
            >
              <CalendarPlus size={18} color={theme.colors.text} />
              <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>
                Dodaj do kalendarza
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom spacer pod TabBar (~110px iOS / ~100-120px Android) — bez tego
              ostatni przycisk siedzi za paskiem zakładek. */}
          <View style={{ height: 160 }} />
        </View>
      </ScrollView>

      <GlobalTabBar activeTab="kalendarz" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16 },
  errorText: { fontFamily: 'Poppins_Medium', fontSize: 16, textAlign: 'center' },
  errorBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: LZS_GREEN,
  },
  errorBackText: { color: '#fff', fontFamily: 'Poppins_SemiBold', fontSize: 14 },

  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroWrap: { width: '100%', height: 240, backgroundColor: LZS_GREEN, position: 'relative' },
  hero: { width: '100%', height: '100%' },
  heroLogoBg: { width: 140, height: 140, alignSelf: 'center', marginTop: 50, opacity: 0.35 },

  dateBadge: {
    position: 'absolute',
    top: 100,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 56,
  },
  dateBadgeDay: {
    fontFamily: 'Poppins_Bold',
    fontSize: 22,
    color: '#111',
    lineHeight: 24,
  },
  dateBadgeMonth: {
    fontFamily: 'Poppins_SemiBold',
    fontSize: 10,
    color: LZS_GREEN,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },

  lzsBubble: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  lzsBubbleImg: { width: '100%', height: '100%' },

  lzsTag: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    backgroundColor: LZS_GREEN,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  lzsTagText: {
    color: '#fff',
    fontFamily: 'Poppins_Bold',
    fontSize: 11,
    letterSpacing: 1.2,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: {
    fontFamily: 'Poppins_Bold',
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 18,
  },

  tilesRow: { gap: 8, paddingRight: 20 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  tileText: { fontFamily: 'Poppins_Medium', fontSize: 13 },

  section: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: { fontFamily: 'Poppins_Bold', fontSize: 14 },
  sectionBody: { fontFamily: 'Poppins_Regular', fontSize: 14, lineHeight: 21 },

  descSection: { marginTop: 24 },
  descTitle: { fontFamily: 'Poppins_Bold', fontSize: 16, marginBottom: 10 },
  descText: { fontFamily: 'Poppins_Regular', fontSize: 14, lineHeight: 22 },

  actionsContainer: { marginTop: 24, gap: 10 },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnPrimaryText: { color: '#fff', fontFamily: 'Poppins_Bold', fontSize: 14 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  actionBtnText: { fontFamily: 'Poppins_SemiBold', fontSize: 14 },
});
