import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { 
  Droplets, 
  Wind, 
  SunMedium, 
  Thermometer,
  Eye,
  Compass,
  CloudRain,
  Sunrise,
  Sunset,
  Gauge
} from 'lucide-react-native';

interface DetailedWeatherInfoProps {
  currentWeather?: any;
  synopData?: any;
  hourly?: any;
}

export const DetailedWeatherInfo: React.FC<DetailedWeatherInfoProps> = ({
  currentWeather,
  synopData,
  hourly
}) => {
  const { theme } = useThemeStore();

  const colors = theme?.colors || {
    primary: '#224A96',
    secondary: '#FECC00',
    background: '#F8FAFC',
    card: '#F8FAFC',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  };

  // Extract weather data from various sources with fallbacks
  const weatherData = {
    humidity: synopData?.wilgotnosc_wzgledna ? parseFloat(synopData.wilgotnosc_wzgledna) : 
              currentWeather?.humidity || 0,
    windSpeed: synopData?.predkosc_wiatru ? parseFloat(synopData.predkosc_wiatru) : 
               currentWeather?.windSpeed || 0,
    windDirection: synopData?.kierunek_wiatru ? parseFloat(synopData.kierunek_wiatru) : 
                  currentWeather?.windDirection || 0,
    uvIndex: currentWeather?.uvIndex || 4,
    temperature: synopData?.temperatura ? parseFloat(synopData.temperatura) : 
                currentWeather?.temperature || 0,
    feelsLike: currentWeather?.feelsLike || 0,
    pressure: synopData?.cisnienie ? parseFloat(synopData.cisnienie) : 
              currentWeather?.pressure || 1013,
    visibility: synopData?.widocznosc ? parseFloat(synopData.widocznosc) : 
               currentWeather?.visibility || 10,
    precipitation: currentWeather?.precipitation || 0,
  };

  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const getUVLevel = (uvIndex: number) => {
    if (uvIndex <= 2) return { level: 'Niski', color: colors.success };
    if (uvIndex <= 5) return { level: 'Średni', color: colors.warning };
    if (uvIndex <= 7) return { level: 'Wysoki', color: colors.error };
    if (uvIndex <= 10) return { level: 'Bardzo wysoki', color: colors.error };
    return { level: 'Ekstremalny', color: colors.error };
  };

  const getHumidityLevel = (humidity: number) => {
    if (humidity <= 30) return { level: 'Niska', color: colors.warning };
    if (humidity <= 60) return { level: 'Optymalna', color: colors.success };
    return { level: 'Wysoka', color: colors.info };
  };

  const getWindLevel = (windSpeed: number) => {
    if (windSpeed <= 10) return { level: 'Słaby', color: colors.success };
    if (windSpeed <= 20) return { level: 'Umiarkowany', color: colors.warning };
    if (windSpeed <= 30) return { level: 'Silny', color: colors.error };
    return { level: 'Bardzo silny', color: colors.error };
  };

  // Don't render if no weather data is available
  if (!synopData && !currentWeather) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Szczegółowe informacje pogodowe
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Kompletne dane meteorologiczne
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.infoContainer}
      >
        {/* Temperature Details */}
        <View style={styles.infoCard}>
          <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
            <Thermometer size={24} color={colors.error} />
          </View>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Temperatura</Text>
          <Text style={[styles.infoValue, { color: colors.error }]}>
            {weatherData.temperature}°C
          </Text>
          <Text style={[styles.infoSubtext, { color: colors.textSecondary }]}>
            Odczuwalna: {weatherData.feelsLike}°C
          </Text>
        </View>

        {/* Humidity Details */}
        <View style={styles.infoCard}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Droplets size={24} color={colors.primary} />
          </View>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Wilgotność</Text>
          <Text style={[styles.infoValue, { color: colors.primary }]}>
            {weatherData.humidity}%
          </Text>
          <Text style={[styles.infoSubtext, { color: colors.textSecondary }]}>
            {getHumidityLevel(weatherData.humidity).level}
          </Text>
        </View>

        {/* Wind Details */}
        <View style={styles.infoCard}>
          <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '20' }]}>
            <Wind size={24} color={colors.secondary} />
          </View>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Wiatr</Text>
          <Text style={[styles.infoValue, { color: colors.secondary }]}>
            {weatherData.windSpeed} km/h
          </Text>
          <Text style={[styles.infoSubtext, { color: colors.textSecondary }]}>
            {getWindDirection(weatherData.windDirection)} • {getWindLevel(weatherData.windSpeed).level}
          </Text>
        </View>

        {/* UV Index Details */}
        <View style={styles.infoCard}>
          <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
            <SunMedium size={24} color={colors.warning} />
          </View>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Indeks UV</Text>
          <Text style={[styles.infoValue, { color: colors.warning }]}>
            {weatherData.uvIndex}
          </Text>
          <Text style={[styles.infoSubtext, { color: colors.textSecondary }]}>
            {getUVLevel(weatherData.uvIndex).level}
          </Text>
        </View>

        {/* Pressure Details */}
        <View style={styles.infoCard}>
          <View style={[styles.iconContainer, { backgroundColor: colors.info + '20' }]}>
            <Gauge size={24} color={colors.info} />
          </View>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Ciśnienie</Text>
          <Text style={[styles.infoValue, { color: colors.info }]}>
            {weatherData.pressure} hPa
          </Text>
          <Text style={[styles.infoSubtext, { color: colors.textSecondary }]}>
            {weatherData.pressure > 1020 ? 'Wysokie' : 
             weatherData.pressure > 1000 ? 'Normalne' : 'Niskie'}
          </Text>
        </View>

        {/* Visibility Details */}
        <View style={styles.infoCard}>
          <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
            <Eye size={24} color={colors.success} />
          </View>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Widoczność</Text>
          <Text style={[styles.infoValue, { color: colors.success }]}>
            {weatherData.visibility} km
          </Text>
          <Text style={[styles.infoSubtext, { color: colors.textSecondary }]}>
            {weatherData.visibility > 8 ? 'Dobra' : 
             weatherData.visibility > 4 ? 'Umiarkowana' : 'Słaba'}
          </Text>
        </View>

        {/* Precipitation Details */}
        <View style={styles.infoCard}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <CloudRain size={24} color={colors.primary} />
          </View>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Opady</Text>
          <Text style={[styles.infoValue, { color: colors.primary }]}>
            {weatherData.precipitation} mm
          </Text>
          <Text style={[styles.infoSubtext, { color: colors.textSecondary }]}>
            {weatherData.precipitation === 0 ? 'Brak opadów' : 
             weatherData.precipitation < 2.5 ? 'Lekkie' : 
             weatherData.precipitation < 7.5 ? 'Umiarkowane' : 'Intensywne'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  infoContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  infoSubtext: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
