
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings,
  ChevronRight,
  Bus,
  Trash2,
  CloudSun,
  Bike,
  Cross,
  Wind,
  HeartHandshake
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import * as Updates from 'expo-updates';
import * as Application from 'expo-application';
import UpdateChecker from '@/components/UpdateChecker';

export default function MenuHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useThemeStore();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.topHeader, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
        <Image
          source={{
            uri: theme.isDarkMode
              ? 'https://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png'
              : 'https://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png'
          }}
          style={styles.topHeaderLogo}
          resizeMode="contain"
        />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Platform.OS === 'android' ? 10 : 4, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>
          {/* --- OPCJA: NIEZBĘDNIK --- */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.hubCard, styles.halfWidth, { shadowColor: '#0D9488' }]}
            onPress={() => router.push('/essentials/niezbednik2')}
          >
            <LinearGradient
              colors={theme.isDarkMode ? ['#134e4a', '#115e59'] : ['#14B8A6', '#0D9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hubGradient}
            >
              <View style={styles.hubIconCircleSmall}>
                <Cross size={24} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.hubTitleSmall}>Pomoc</Text>
              <Text style={styles.hubDescriptionSmall} numberOfLines={2}>
                Szpitale, apteki, AED
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* --- OPCJA: KOMUNIKACJA --- */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.hubCard, styles.halfWidth, { shadowColor: '#D97706' }]}
            onPress={() => router.push('/transport_v2')}
          >
            <LinearGradient
              colors={theme.isDarkMode ? ['#78350f', '#92400e'] : ['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hubGradient}
            >
              <View style={styles.hubIconCircleSmall}>
                <Bus size={24} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.hubTitleSmall}>Komunikacja</Text>
              <Text style={styles.hubDescriptionSmall} numberOfLines={2}>
                Rozkłady ZTM, ZKM, PKS
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* --- OPCJA: MEVO (ukryta na Androidzie) --- */}
          {Platform.OS !== 'android' && (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.hubCard, styles.halfWidth, { shadowColor: '#DC2626' }]}
              onPress={() => router.push('/mevo/mevo2')}
            >
              <LinearGradient
                colors={theme.isDarkMode ? ['#7f1d1d', '#991b1b'] : ['#DC2626', '#B91C1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hubGradient}
              >
                <View style={styles.hubIconCircleSmall}>
                  <Bike size={24} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <Text style={styles.hubTitleSmall}>Mevo</Text>
                <Text style={styles.hubDescriptionSmall} numberOfLines={2}>
                  Mapa rowerów miejskich
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* --- OPCJA: HARMONOGRAM ODPADÓW --- */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.hubCard, styles.halfWidth, { shadowColor: '#92400E' }]}
            onPress={() => router.push('/waste')}
          >
            <LinearGradient
              colors={theme.isDarkMode ? ['#713f12', '#854d0e'] : ['#b45309', '#92400e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hubGradient}
            >
              <View style={styles.hubIconCircleSmall}>
                <Trash2 size={24} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.hubTitleSmall}>Odpady</Text>
              <Text style={styles.hubDescriptionSmall} numberOfLines={2}>
                Terminy odbioru śmieci
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* --- OPCJA: POGODA --- */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.hubCard, styles.halfWidth, { shadowColor: '#0ea5e9' }]}
            onPress={() => router.push('/weather')}
          >
            <LinearGradient
              colors={theme.isDarkMode ? ['#0c4a6e', '#075985'] : ['#0ea5e9', '#0284c7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hubGradient}
            >
              <View style={styles.hubIconCircleSmall}>
                <CloudSun size={24} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.hubTitleSmall}>Pogoda</Text>
              <Text style={styles.hubDescriptionSmall} numberOfLines={2}>
                Prognoza dla regionu
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* --- OPCJA: JAKOŚĆ POWIETRZA --- */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.hubCard, styles.halfWidth, { shadowColor: '#059669' }]}
            onPress={() => router.push('/(tabs)/airquality')}
          >
            <LinearGradient
              colors={theme.isDarkMode ? ['#064e3b', '#065f46'] : ['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hubGradient}
            >
              <View style={styles.hubIconCircleSmall}>
                <Wind size={24} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.hubTitleSmall}>Powietrze</Text>
              <Text style={styles.hubDescriptionSmall} numberOfLines={2}>
                Jakość powietrza GIOŚ
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* --- OPCJA: KONTAKT I WSPARCIE --- */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.hubCard, styles.halfWidth, { shadowColor: '#0f766e' }]}
            onPress={() => router.push('/contact')}
          >
            <LinearGradient
              colors={theme.isDarkMode ? ['#134e4a', '#0f766e'] : ['#0d9488', '#0f766e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hubGradient}
            >
              <View style={styles.hubIconCircleSmall}>
                <HeartHandshake size={24} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.hubTitleSmall}>Kontakt</Text>
              <Text style={styles.hubDescriptionSmall} numberOfLines={2}>
                Napisz i wesprzyj
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* --- OPCJA: USTAWIENIA --- */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.hubCard, Platform.OS === 'ios' ? styles.halfWidth : styles.fullWidth, { shadowColor: '#64748B' }]}
            onPress={() => router.push('/settings')}
          >
            <LinearGradient
              colors={theme.isDarkMode ? ['#334155', '#1E293B'] : ['#94A3B8', '#64748B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hubGradient}
            >
              <View style={styles.hubIconCircleSmall}>
                <Settings size={24} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.hubTitleSmall}>Ustawienia</Text>
              <Text style={styles.hubDescriptionSmall} numberOfLines={2}>
                Powiadomienia, motyw, regiony
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* --- UPDATE CHECKER --- */}
        <UpdateChecker />

        {/* --- FOOTER BRANDING --- */}
        <View style={styles.developerContainer}>
          <Text style={[styles.developerText, { color: theme.colors.textSecondary }]}>
            Aplikacja stworzona przez
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://kropidlowscy.pl')}>
            <Image
              source={{ uri: 'https://kropidlowscy.pl/LOGO-KROPIDLOWSCY-03.png' }}
              style={styles.developerLogo}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    fontFamily: 'Poppins_Bold',
    marginBottom: 4,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_Regular',
    marginBottom: 24,
    opacity: 0.8,
    paddingHorizontal: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  hubCard: {
    borderRadius: 24,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
  },
  halfWidth: {
    width: '48%',
    height: 160,
  },
  fullWidth: {
    width: '100%',
    height: 160,
    marginTop: 4,
  },
  hubGradient: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  hubGradientRow: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hubIconCircleSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 12,
  },
  hubContent: {
    flex: 1,
    justifyContent: 'center',
  },
  hubTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins_Bold',
    marginBottom: 2,
  },
  hubTitleSmall: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_Bold',
    marginBottom: 4,
  },
  hubDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontFamily: 'Poppins_Regular',
  },
  hubDescriptionSmall: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_Regular',
  },
  arrowContainer: {
    marginLeft: 10,
    opacity: 0.8,
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Poppins_Bold',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  logoFooter: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  logoImg: {
    width: 160,
    height: 48,
    opacity: 0.6,
  },
  topHeader: {
    paddingBottom: Platform.OS === 'android' ? 18 : 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  topHeaderLogo: {
    width: 110,
    height: 30,
    marginTop: Platform.OS === 'android' ? 12 : 8,
    marginBottom: Platform.OS === 'android' ? 4 : 0,
  },
  developerContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    marginTop: 16,
  },
  developerText: {
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
    marginBottom: 8,
    opacity: 0.7,
  },
  developerLogo: {
    width: 160,
    height: 48,
    opacity: 0.8,
  },
});
