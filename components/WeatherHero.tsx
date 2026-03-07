import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';
import { WeatherIcons } from './WeatherIcons';
import { 
  Info, 
  Droplets, 
  Wind, 
  SunMedium,
  ChevronUp,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle
} from 'lucide-react-native';

interface WeatherHeroProps {
  temperature: number;
  feelsLike: number;
  wmoCode: number;
  humidity?: number;
  windSpeed?: number;
  uvIndex?: number;
  pressure?: number;
  visibility?: number;
  windDirection?: number;
  onDetailsPress?: () => void;
}

export const WeatherHero: React.FC<WeatherHeroProps> = ({ 
  temperature, 
  feelsLike, 
  wmoCode, 
  humidity, 
  windSpeed, 
  uvIndex,
  pressure,
  visibility,
  windDirection,
  onDetailsPress
}) => {
  const { theme, isDarkMode } = useThemeStore();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  const gradientColors: [string, string] = isDarkMode 
    ? ['rgba(34, 74, 150, 0.08)', 'rgba(254, 204, 0, 0.06)']
    : ['rgba(34, 74, 150, 0.04)', 'rgba(254, 204, 0, 0.03)'];

  const getStatIconColor = (type: 'humidity' | 'wind' | 'uv') => {
    switch (type) {
      case 'humidity': return theme.colors.primary;
      case 'wind': return theme.colors.secondary;
      case 'uv': return theme.colors.warning;
      default: return theme.colors.primary;
    }
  };

  return (
    <View style={[styles.container, { height: screenHeight * 0.48 }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Main content row - temperature left, icon right */}
        <View style={styles.mainContentRow}>
          {/* Temperature and feels like on the left */}
          <View style={styles.tempContainer}>
            <Text style={[styles.temperature, { color: theme.colors.text }]}>
              {Math.round(temperature)}°
            </Text>
            <Text style={[styles.feelsLike, { color: theme.colors.textSecondary }]}>
              Odczuwalna {Math.round(feelsLike)}°
            </Text>
          </View>

          {/* Weather icon on the right */}
          <View style={styles.iconContainer}>
            <WeatherIcons wmoCode={wmoCode} size={100} />
          </View>
        </View>

        {/* Enhanced weather stats row (no modals on press) */}
        <View style={styles.statsIconsRow}>
          <View 
            style={[
              styles.statIcon, 
              { backgroundColor: theme.colors.card }
            ]}
          >
            <View style={[styles.statIconBackground, { backgroundColor: getStatIconColor('humidity') + '15' }]}>
              <Droplets size={20} color={getStatIconColor('humidity')} />
            </View>
            <Text style={[styles.statIconValue, { color: theme.colors.text }]}>
              {humidity !== undefined ? `${Math.round(humidity)}%` : '--'}
            </Text>
            <Text style={[styles.statIconLabel, { color: theme.colors.textSecondary }]}>
              Wilgotność
            </Text>
          </View>

          <View 
            style={[
              styles.statIcon, 
              { backgroundColor: theme.colors.card }
            ]}
          >
            <View style={[styles.statIconBackground, { backgroundColor: getStatIconColor('wind') + '15' }]}>
              <Wind size={20} color={getStatIconColor('wind')} />
            </View>
            <Text style={[styles.statIconValue, { color: theme.colors.text }]}>
              {windSpeed !== undefined ? `${Math.round(windSpeed)} km/h` : '--'}
            </Text>
            <Text style={[styles.statIconLabel, { color: theme.colors.textSecondary }]}>
              Wiatr
            </Text>
          </View>

          <View 
            style={[
              styles.statIcon, 
              { backgroundColor: theme.colors.card }
            ]}
          >
            <View style={[styles.statIconBackground, { backgroundColor: getStatIconColor('uv') + '15' }]}>
              <SunMedium size={20} color={getStatIconColor('uv')} />
            </View>
            <Text style={[styles.statIconValue, { color: theme.colors.text }]}>
              {uvIndex !== undefined ? `UV ${uvIndex}` : '--'}
            </Text>
            <Text style={[styles.statIconLabel, { color: theme.colors.textSecondary }]}>
              Indeks UV
            </Text>
          </View>
        </View>

        {/* Details button */}
        <View style={styles.detailsButtonContainer}>
          <Pressable 
            style={({ pressed }) => [
              styles.detailsButton, 
              { 
                backgroundColor: theme.colors.card,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                opacity: pressed ? 0.9 : 1
              }
            ]}
            onPress={onDetailsPress}
          >
            <Info size={16} color={theme.colors.primary} />
            <Text style={[styles.detailsButtonText, { color: theme.colors.textSecondary }]}>
              Szczegóły pogody
            </Text>
            <ChevronUp size={14} color={theme.colors.textSecondary} style={styles.chevronIcon} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Per-stat modals removed in hero */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  gradient: {
    borderRadius: 32,
    padding: 24,
    paddingTop: 20,
    paddingBottom: 24,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContentRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  tempContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 20,
  },
  temperature: {
    fontSize: 64,
    fontFamily: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
    lineHeight: 72,
    marginBottom: 6,
    letterSpacing: -1,
  },
  feelsLike: {
    fontSize: 17,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    opacity: 0.8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 20,
  },
  statsIconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  statIcon: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: Platform.OS === 'android' ? 20 : 18,
    borderWidth: Platform.OS === 'android' ? 1 : 0,
    borderColor: Platform.OS === 'android' ? 'rgba(15,23,42,0.06)' : 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: Platform.OS === 'android' ? 0.12 : 0.08,
    shadowRadius: 6,
    elevation: Platform.OS === 'android' ? 6 : 3,
    minHeight: 100,
    justifyContent: 'center',
    maxWidth: 110,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  statIconBackground: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: Platform.OS === 'android' ? 3 : 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  statIconValue: {
    fontSize: 13,
    fontFamily: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
    marginBottom: 4,
    textAlign: 'center',
  },
  statIconLabel: {
    fontSize: 11,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    textAlign: 'center',
    opacity: 0.8,
  },
  detailsButtonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    width: '100%',
    maxWidth: 300,
  },
  detailsButtonText: {
    fontSize: 14,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    marginLeft: 8,
    marginRight: 4,
  },
  chevronIcon: {
    marginLeft: 4,
  },
});


