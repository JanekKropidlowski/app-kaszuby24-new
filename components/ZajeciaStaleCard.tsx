import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Building2, ChevronRight } from 'lucide-react-native';
import type { Theme } from '@/store/themeStore';
import { podpisZajec, type Zajecia } from '@/utils/zajecia';

/**
 * Logo instytucji w zaokrąglonym kwadracie z contain – poziome logo WCK
 * w kółku byłoby nieczytelne. Białe tło także w trybie ciemnym, bo logotypy
 * są rysowane pod jasne tło.
 */
export const LogoInstytucji = ({ uri, size, theme }: { uri?: string | null; size: number; theme: Theme }) => (
  <View
    style={[
      styles.logo,
      { width: size, height: size, borderRadius: Math.round(size * 0.24), borderColor: theme.colors.border },
    ]}
  >
    {uri ? (
      <Image source={{ uri }} style={styles.logoImage} contentFit="contain" cachePolicy="memory-disk" transition={150} />
    ) : (
      <Building2 size={Math.round(size * 0.42)} color="#64748B" />
    )}
  </View>
);

/**
 * Karta w Kalendarzu prowadząca do listy zajęć stałych: liczba, miasta i logo
 * instytucji, które je prowadzą. Dane przychodzą z ekranu (fetchZajecia), bo
 * nagłówek listy wydarzeń przerysowuje się razem z nią.
 */
const ZajeciaStaleCard = ({ zajecia, theme }: { zajecia: Zajecia[]; theme: Theme }) => {
  const router = useRouter();

  const { podpis, loga } = useMemo(() => {
    const instytucje = new Map<string, string | null>();
    for (const z of zajecia) {
      if (z.org?.slug && !instytucje.has(z.org.slug)) instytucje.set(z.org.slug, z.org.logo_url || null);
    }
    return { podpis: podpisZajec(zajecia), loga: [...instytucje].slice(0, 3) };
  }, [zajecia]);

  return (
    <TouchableOpacity
      onPress={() => router.push('/zajecia')}
      activeOpacity={0.7}
      style={[styles.card, { backgroundColor: theme.colors.tabBarBackground, borderColor: theme.colors.border }]}
      accessibilityRole="button"
      accessibilityLabel={`Zajęcia stałe, ${podpis}`}
    >
      {loga.length > 0 && (
        <View style={styles.logos}>
          {loga.map(([slug, uri], i) => (
            <View key={slug} style={i > 0 ? styles.logoOverlap : undefined}>
              <LogoInstytucji uri={uri} size={36} theme={theme} />
            </View>
          ))}
        </View>
      )}
      <View style={styles.texts}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Zajęcia stałe</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {podpis}
        </Text>
      </View>
      <ChevronRight size={18} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  logo: {
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logos: { flexDirection: 'row' },
  logoOverlap: { marginLeft: -8 },
  texts: { flex: 1 },
  title: { fontFamily: 'Poppins_SemiBold', fontSize: 15.5, lineHeight: 21 },
  subtitle: { fontFamily: 'Poppins_Regular', fontSize: 13, lineHeight: 18, marginTop: 1 },
});

export default memo(ZajeciaStaleCard);
