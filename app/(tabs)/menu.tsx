
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings,
  ChevronRight,
  MapPin,
  Bus,
  Trash2,
  CloudSun,
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import * as Updates from 'expo-updates';
import * as Application from 'expo-application';

export default function MenuHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useThemeStore();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Menu
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          Wybierz kategorię
        </Text>

        <View style={styles.gridContainer}>
          {/* --- OPCJA: NIEZBĘDNIK --- */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.hubCard, styles.halfWidth, { shadowColor: '#059669' }]}
            onPress={() => router.push('/essentials')}
          >
            <LinearGradient
              colors={theme.isDarkMode ? ['#064e3b', '#065f46'] : ['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hubGradient}
            >
              <View style={styles.hubIconCircleSmall}>
                <MapPin size={24} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.hubTitleSmall}>Niezbędnik</Text>
              <Text style={styles.hubDescriptionSmall} numberOfLines={2}>
                Usługi medyczne i AED
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* --- OPCJA: KOMUNIKACJA --- */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.hubCard, styles.halfWidth, { shadowColor: '#2563EB' }]}
            onPress={() => router.push('/transport')}
          >
            <LinearGradient
              colors={theme.isDarkMode ? ['#1e3a8a', '#1e40af'] : ['#3b82f6', '#2563eb']}
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

          {/* --- OPCJA: USTAWIENIA --- */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.hubCard, styles.fullWidth, { shadowColor: '#64748B' }]}
            onPress={() => router.push('/settings')}
          >
            <LinearGradient
              colors={theme.isDarkMode ? ['#334155', '#1E293B'] : ['#94A3B8', '#64748B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hubGradientRow}
            >
              <View style={[styles.hubIconCircleSmall, { marginBottom: 0, marginRight: 16 }]}>
                <Settings size={28} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <View style={styles.hubContent}>
                <Text style={styles.hubTitle}>Ustawienia</Text>
                <Text style={styles.hubDescription}>
                  Powiadomienia, motyw, regiony
                </Text>
              </View>
              <View style={styles.arrowContainer}>
                <ChevronRight size={24} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* --- UPDATE INFO FOOTER --- */}


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
    height: 100,
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

});