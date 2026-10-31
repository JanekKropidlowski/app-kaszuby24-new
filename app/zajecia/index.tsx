import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ChevronRight, Clock } from 'lucide-react-native';
import { useThemeStore, type Theme } from '@/store/themeStore';
import { fetchZajecia } from '@/services/api';
import EmptyState from '@/components/EmptyState';
import GlobalTabBar, { useGlobalTabBarMetrics } from '@/components/GlobalTabBar';
import { LogoInstytucji } from '@/components/ZajeciaStaleCard';
import {
  ODBIORCY,
  adresZajec,
  liczbaZajec,
  podpisZajec,
  terminySkrot,
  wedlugMiast,
  zPolpauza,
  type Zajecia,
} from '@/utils/zajecia';

type Sekcja = { title: string; data: Zajecia[] };

/**
 * Zajęcia stałe w domach kultury (dane z panelu, jak /zajecia/ na stronie).
 * Lista według miast z filtrem „dla kogo”; szczegóły – grupy, ceny, zapisy –
 * otwiera strona zajęć na kaszuby24.pl w przeglądarce w apce.
 */
export default function ZajeciaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeStore((s) => s.theme);
  const { height: tabBarHeight } = useGlobalTabBarMetrics();

  const [zajecia, setZajecia] = useState<Zajecia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [odbiorca, setOdbiorca] = useState<string | null>(null);

  const zaladuj = useCallback(async (odswiez = false) => {
    try {
      setError(false);
      setZajecia(await fetchZajecia(odswiez));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    zaladuj();
  }, [zaladuj]);

  // Chipy tylko dla grup wiekowych, które mają jakiekolwiek zajęcia.
  const chipy = useMemo(
    () =>
      ODBIORCY.map((o) => ({ ...o, liczba: zajecia.filter((z) => z.audiences.includes(o.key)).length })).filter(
        (o) => o.liczba > 0,
      ),
    [zajecia],
  );

  const sekcje = useMemo<Sekcja[]>(() => {
    const widoczne = (odbiorca ? zajecia.filter((z) => z.audiences.includes(odbiorca)) : zajecia)
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, 'pl'));
    return wedlugMiast(widoczne).map(([title, data]) => ({ title, data }));
  }, [zajecia, odbiorca]);

  const podsumowanie = useMemo(() => podpisZajec(zajecia), [zajecia]);

  const wybierz = (klucz: string | null) => {
    if (klucz === odbiorca) return;
    Haptics.selectionAsync().catch(() => {});
    setOdbiorca(klucz);
  };

  const otworz = useCallback((z: Zajecia) => {
    WebBrowser.openBrowserAsync(adresZajec(z)).catch(() => {});
  }, []);

  const naglowekListy = (
    <View style={styles.listHeader}>
      <Text style={[styles.summary, { color: theme.colors.textSecondary }]}>{podsumowanie}</Text>
      {chipy.length > 1 && (
        <>
          <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Dla kogo</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipsScroll}
          >
            <Chip label="Wszyscy" liczba={zajecia.length} aktywny={!odbiorca} onPress={() => wybierz(null)} theme={theme} />
            {chipy.map((o) => (
              <Chip
                key={o.key}
                label={o.label}
                liczba={o.liczba}
                aktywny={odbiorca === o.key}
                onPress={() => wybierz(o.key)}
                theme={theme}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.card }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Wróć"
          hitSlop={8}
        >
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Zajęcia stałe</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error && zajecia.length === 0 ? (
        <EmptyState
          title="Nie udało się pobrać zajęć"
          message="Sprawdź połączenie z internetem i spróbuj ponownie."
          actionLabel="Spróbuj ponownie"
          onAction={() => {
            setLoading(true);
            zaladuj(true);
          }}
        />
      ) : (
        <SectionList
          sections={sekcje}
          keyExtractor={(z) => `${z.citySlug}/${z.slug}`}
          renderItem={({ item }) => <ZajeciaKafel z={item} theme={theme} onPress={otworz} />}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]} accessibilityRole="header">
                {section.title}
              </Text>
              <Text style={[styles.sectionCount, { color: theme.colors.textSecondary }]}>
                {liczbaZajec(section.data.length)}
              </Text>
            </View>
          )}
          ListHeaderComponent={naglowekListy}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>Brak zajęć dla tej grupy.</Text>
          }
          stickySectionHeadersEnabled
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                zaladuj(true);
              }}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}

      <GlobalTabBar activeTab="kalendarz" />
    </View>
  );
}

const Chip = ({
  label,
  liczba,
  aktywny,
  onPress,
  theme,
}: {
  label: string;
  liczba: number;
  aktywny: boolean;
  onPress: () => void;
  theme: Theme;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[
      styles.chip,
      aktywny
        ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
        : { backgroundColor: theme.colors.tabBarBackground, borderColor: theme.colors.border },
    ]}
    accessibilityRole="button"
    accessibilityState={{ selected: aktywny }}
    accessibilityLabel={`${label}, ${liczbaZajec(liczba)}`}
  >
    <Text style={[styles.chipText, { color: aktywny ? '#FFFFFF' : theme.colors.text }]}>{label}</Text>
    <Text style={[styles.chipCount, { color: aktywny ? 'rgba(255,255,255,0.75)' : theme.colors.textSecondary }]}>
      {liczba}
    </Text>
  </TouchableOpacity>
);

const ZajeciaKafel = memo(
  ({ z, theme, onPress }: { z: Zajecia; theme: Theme; onPress: (z: Zajecia) => void }) => {
    const terminy = terminySkrot(z);
    const instytucja = z.org?.name || z.venue;
    // Wiek tylko krótki („7–19 lat”); listy grup („6–7 lat, 8–9 lat, …”) są na stronie zajęć.
    const wiek = z.age && z.age.length <= 16 ? zPolpauza(z.age) : null;
    const szczegoly = [wiek, z.price?.trim() || null].filter(Boolean).join(' · ');

    return (
      <TouchableOpacity
        onPress={() => onPress(z)}
        activeOpacity={0.7}
        style={[styles.tile, { backgroundColor: theme.colors.tabBarBackground, borderColor: theme.colors.border }]}
        accessibilityRole="link"
        accessibilityLabel={[z.title, instytucja, terminy].filter(Boolean).join(', ')}
        accessibilityHint="Otwiera stronę zajęć"
      >
        <LogoInstytucji uri={z.org?.logo_url} size={52} theme={theme} />
        <View style={styles.tileTexts}>
          <Text style={[styles.tileTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {z.title}
          </Text>
          {!!instytucja && (
            <Text style={[styles.tileOrg, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {instytucja}
            </Text>
          )}
          {!!terminy && (
            <View style={styles.tileRow}>
              <Clock size={13} color={theme.colors.primary} />
              <Text style={[styles.tileTerms, { color: theme.colors.text }]} numberOfLines={1}>
                {terminy}
              </Text>
            </View>
          )}
          {!!szczegoly && (
            <Text style={[styles.tileMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {szczegoly}
            </Text>
          )}
        </View>
        <ChevronRight size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Poppins_Bold' },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: Platform.OS === 'android' ? 20 : 16 },
  listHeader: { paddingTop: 14, paddingBottom: 4 },
  summary: { fontFamily: 'Poppins_Regular', fontSize: 14, lineHeight: 20 },
  filterLabel: { fontFamily: 'Poppins_SemiBold', fontSize: 14, marginTop: 14, marginBottom: 8 },
  chipsScroll: { marginHorizontal: Platform.OS === 'android' ? -20 : -16 },
  chips: { gap: 8, paddingHorizontal: Platform.OS === 'android' ? 20 : 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipText: { fontFamily: 'Poppins_Medium', fontSize: 13.5 },
  chipCount: { fontFamily: 'Poppins_Regular', fontSize: 12.5 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionTitle: { fontFamily: 'Poppins_SemiBold', fontSize: 18 },
  sectionCount: { fontFamily: 'Poppins_Regular', fontSize: 13 },
  empty: { fontFamily: 'Poppins_Regular', fontSize: 14, textAlign: 'center', marginTop: 32 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tileTexts: { flex: 1 },
  tileTitle: { fontFamily: 'Poppins_SemiBold', fontSize: 15.5, lineHeight: 21 },
  tileOrg: { fontFamily: 'Poppins_Regular', fontSize: 12.5, lineHeight: 17, marginTop: 1 },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  tileTerms: { fontFamily: 'Poppins_Medium', fontSize: 13, lineHeight: 18, flexShrink: 1 },
  tileMeta: { fontFamily: 'Poppins_Regular', fontSize: 12, lineHeight: 17, marginTop: 2 },
});
