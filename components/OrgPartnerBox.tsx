import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Building2, ChevronRight } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';

export interface ArticleOrg {
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  website?: string;
}

/**
 * Materiał przygotowany przez organizację (gmina, klub, instytucja) — ta sama
 * sygnatura co na stronie, żeby czytelnik wiedział, kto go dostarczył.
 */
export const OrgPartnerBox = ({ org, theme, isDarkMode }: { org: ArticleOrg; theme: any; isDarkMode: boolean }) => {
  const bg = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f7f8fb';
  const border = isDarkMode ? 'rgba(255,255,255,0.1)' : '#e6e8ef';

  const openProfile = () => {
    WebBrowser.openBrowserAsync(`https://kaszuby24.pl/organizacja/${org.slug}`).catch(() => {});
  };

  return (
    <TouchableOpacity
      onPress={openProfile}
      activeOpacity={0.85}
      style={[styles.box, { backgroundColor: bg, borderColor: border }]}
      accessibilityRole="button"
      accessibilityLabel={`Profil: ${org.name}`}
    >
      {org.logo_url ? (
        <ExpoImage source={{ uri: org.logo_url }} style={styles.logo} contentFit="contain" transition={150} />
      ) : (
        <View style={[styles.logo, styles.logoFallback]}>
          <Building2 size={20} color={theme.colors.textSecondary} />
        </View>
      )}

      <View style={styles.texts}>
        <Text style={[styles.kicker, { color: theme.colors.textSecondary }]}>Materiał partnera</Text>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
          {org.name}
        </Text>
        {!!org.description && (
          <Text style={[styles.desc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {org.description}
          </Text>
        )}
      </View>

      <ChevronRight size={18} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 18,
    gap: 12,
  },
  logo: { width: 46, height: 46, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.04)' },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  kicker: { fontFamily: 'Poppins_Medium', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6 },
  name: { fontFamily: 'Poppins_SemiBold', fontSize: 14.5, lineHeight: 19, marginTop: 1 },
  desc: { fontFamily: 'Poppins_Regular', fontSize: 12, lineHeight: 16, marginTop: 2 },
});

export default OrgPartnerBox;
