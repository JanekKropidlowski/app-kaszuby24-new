import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
// Location UI usunięte na prośbę użytkownika
import { useThemeStore } from '@/store/themeStore';
import { WeatherIcons } from '@/components/WeatherIcons';

interface WeatherMainCardProps {
  location: string;
  currentWeather: {
    temperature: number;
    condition: string;
    wmoCode: number;
    humidity: number;
    windSpeed: number;
    pressure: number;
    feelsLike: number;
    uvIndex?: number;
    visibility?: number;
  };
  onLocationPress: () => void;
  onDetailsPress: () => void;
}

export const WeatherMainCard: React.FC<WeatherMainCardProps> = ({
  location,
  currentWeather,
  onLocationPress,
  onDetailsPress,
}) => {
  const { theme, isDarkMode } = useThemeStore();
  
  const getAccentColor = (temp: number) => {
    if (temp >= 25) return '#F97316';
    if (temp >= 15) return '#3B82F6';
    if (temp >= 5) return '#10B981';
    return '#6366F1';
  };
  const accent = getAccentColor(currentWeather.temperature);

  const getWeatherDescription = (wmoCode: number) => {
    if (wmoCode <= 1) return 'Bezchmurnie';
    if (wmoCode === 2) return 'Lekko pochmurno';
    if (wmoCode === 3) return 'Pochmurno';
    if (wmoCode === 4) return 'Zachmurzenie całkowite';
    if (wmoCode >= 45 && wmoCode <= 48) return 'Mgliście';
    if (wmoCode >= 51 && wmoCode <= 57) return 'Mżawka';
    if (wmoCode >= 61 && wmoCode <= 67) return 'Deszczowo';
    if (wmoCode >= 71 && wmoCode <= 77) return 'Śnieżnie';
    if (wmoCode >= 80 && wmoCode <= 82) return 'Przelotne opady';
    if (wmoCode >= 95 && wmoCode <= 99) return 'Burza';
    return 'Bezchmurnie';
  };

  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onDetailsPress}
        style={[
          styles.cardContainer,
          {
            backgroundColor: theme.colors.card,
            borderColor: accent,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 3,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Szczegóły pogody"
      >
        {/* Pasek akcentu */}
        <View style={[styles.accentStrip, { backgroundColor: accent + '22' }]} />

        <View style={styles.mainRow}>
          <View style={styles.leftCol}>
            <Text style={[styles.temperature, { color: theme.colors.text }]}>
              {Math.round(currentWeather.temperature)}°
            </Text>
            <Text style={[styles.feelsLike, { color: theme.colors.textSecondary }]}>
              Odczuwalna {Math.round(currentWeather.feelsLike)}°
            </Text>
          </View>
          <View style={styles.rightCol}>
            <WeatherIcons 
              wmoCode={currentWeather.wmoCode} 
              size={48}
            />
            <View style={[styles.conditionPill, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
              <Text style={[styles.condition, { color: accent }]}>
                {getWeatherDescription(currentWeather.wmoCode)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: '5%',
    marginTop: 12,
  },
  cardContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  accentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  locationText: {
    fontSize: 14,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    letterSpacing: 0.2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    alignItems: 'flex-start',
  },
  temperature: {
    fontSize: 42,
    fontFamily: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
    lineHeight: 44,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  feelsLike: {
    fontSize: 13,
    fontFamily: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
    letterSpacing: 0.2,
  },
  rightCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  condition: {
    fontSize: 12,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  conditionPill: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
});
