import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { 
  Anchor, 
  Wind, 
  Compass, 
  Waves, 
  Thermometer, 
  Eye,
  AlertTriangle,
  MapPin,
  CloudRain,
  Gauge,
  Clock,
  Navigation,
  Ship,
  AlertCircle,
  Info,
  Cloud,
  Sun,
  Moon
} from 'lucide-react-native';
import DetailedWeatherModal from './DetailedWeatherModal';

interface SailorWeatherWidgetProps {
  currentWeather?: any;
  synopData?: any;
  hourly?: any;
  forecastData?: any;
}

export const SailorWeatherWidget: React.FC<SailorWeatherWidgetProps> = ({
  currentWeather,
  synopData,
  hourly,
  forecastData
}) => {
  const { theme } = useThemeStore();
  const [modalVisible, setModalVisible] = useState(false);

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

  // Extract weather data relevant for sailors with proper null checks
  const weatherData = {
    windSpeed: synopData?.predkosc_wiatru ? parseFloat(synopData.predkosc_wiatru) : 
               (currentWeather?.windSpeed || 0),
    windDirection: synopData?.kierunek_wiatru ? parseFloat(synopData.kierunek_wiatru) : 
                  (currentWeather?.windDirection || 0),
    temperature: synopData?.temperatura ? parseFloat(synopData.temperatura) : 
                (currentWeather?.temperature || 0),
    visibility: synopData?.widocznosc ? parseFloat(synopData.widocznosc) : 
               (currentWeather?.visibility || 10),
    pressure: synopData?.cisnienie ? parseFloat(synopData.cisnienie) : 
              (currentWeather?.pressure || 1013),
    humidity: synopData?.wilgotnosc_wzgledna ? parseFloat(synopData.wilgotnosc_wzgledna) : 
             (currentWeather?.humidity || 0),
    precipitation: currentWeather?.precipitation || 0,
  };

  // Ensure all values are numbers and have fallbacks
  const safeWeatherData = {
    windSpeed: typeof weatherData.windSpeed === 'number' ? weatherData.windSpeed : 0,
    windDirection: typeof weatherData.windDirection === 'number' ? weatherData.windDirection : 0,
    temperature: typeof weatherData.temperature === 'number' ? weatherData.temperature : 0,
    visibility: typeof weatherData.visibility === 'number' ? weatherData.visibility : 10,
    pressure: typeof weatherData.pressure === 'number' ? weatherData.pressure : 1013,
    humidity: typeof weatherData.humidity === 'number' ? weatherData.humidity : 0,
    precipitation: typeof weatherData.precipitation === 'number' ? weatherData.precipitation : 0,
  };

  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const getWindDirectionName = (degrees: number) => {
    const directions = [
      'Północny', 'Północno-wschodni', 'Wschodni', 'Południowo-wschodni',
      'Południowy', 'Południowo-zachodni', 'Zachodni', 'Północno-zachodni'
    ];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const getWindForce = (windSpeed: number) => {
    if (windSpeed <= 5) return { force: 'Słaby', color: colors.success, risk: 'Niskie', beaufort: '1-2' };
    if (windSpeed <= 15) return { force: 'Umiarkowany', color: colors.warning, risk: 'Średnie', beaufort: '3-4' };
    if (windSpeed <= 25) return { force: 'Silny', color: colors.error, risk: 'Wysokie', beaufort: '5-6' };
    if (windSpeed <= 35) return { force: 'Bardzo silny', color: colors.error, risk: 'Bardzo wysokie', beaufort: '7-8' };
    return { force: 'Huraganowy', color: colors.error, risk: 'Ekstremalne', beaufort: '9+' };
  };

  const getVisibilityStatus = (visibility: number) => {
    if (visibility > 8) return { status: 'Dobra', color: colors.success, description: 'Idealna do nawigacji' };
    if (visibility > 4) return { status: 'Umiarkowana', color: colors.warning, description: 'Zachowaj ostrożność' };
    return { status: 'Słaba', color: colors.error, description: 'Niebezpieczna dla żeglugi' };
  };

  const getWaveHeight = (windSpeed: number) => {
    if (windSpeed <= 5) return { height: '0.2-0.5m', color: colors.success, description: 'Spokojne morze' };
    if (windSpeed <= 15) return { height: '0.5-1.5m', color: colors.warning, description: 'Lekkie fale' };
    if (windSpeed <= 25) return { height: '1.5-3.0m', color: colors.error, description: 'Średnie fale' };
    if (windSpeed <= 35) return { height: '3.0-5.0m', color: colors.error, description: 'Wysokie fale' };
    return { height: '5.0m+', color: colors.error, description: 'Bardzo wysokie fale' };
  };

  const getSailingConditions = (windSpeed: number, visibility: number, precipitation: number) => {
    let score = 100;
    let condition = 'Idealne';
    let color = colors.success;
    let risk = 'Niskie';
    
    // Wind impact
    if (windSpeed > 25) score -= 40;
    else if (windSpeed > 15) score -= 20;
    
    // Visibility impact
    if (visibility < 2) score -= 50;
    else if (visibility < 4) score -= 30;
    else if (visibility < 6) score -= 15;
    
    // Precipitation impact
    if (precipitation > 5) score -= 20;
    
    if (score >= 80) {
      condition = 'Idealne';
      color = colors.success;
      risk = 'Niskie';
    } else if (score >= 60) {
      condition = 'Dobre';
      color = colors.warning;
      risk = 'Średnie';
    } else if (score >= 40) {
      condition = 'Trudne';
      color = colors.error;
      risk = 'Wysokie';
    } else {
      condition = 'Niebezpieczne';
      color = colors.error;
      risk = 'Bardzo wysokie';
    }
    
    return { condition, color, risk, score };
  };

  // Prognoza pogody dla żeglarzy
  const getSailingForecast = () => {
    if (!forecastData?.hourly) return null;
    
    const next6Hours = forecastData.hourly.slice(0, 6);
    const windTrend = next6Hours.map((hour: any) => hour.windspeed_10m || 0);
    const visibilityTrend = next6Hours.map((hour: any) => hour.visibility || 10);
    
    const maxWind = Math.max(...windTrend);
    const minVisibility = Math.min(...visibilityTrend);
    
    let trend = 'Stabilne';
    let trendColor = colors.success;
    
    if (maxWind > safeWeatherData.windSpeed * 1.5) {
      trend = 'Pogorszenie';
      trendColor = colors.error;
    } else if (maxWind < safeWeatherData.windSpeed * 0.7) {
      trend = 'Poprawa';
      trendColor = colors.success;
    }
    
    return {
      trend,
      trendColor,
      maxWind: maxWind.toFixed(1),
      minVisibility: minVisibility.toFixed(1),
      hours: next6Hours.length
    };
  };

  // Prądy morskie (symulowane dane)
  const getMarineCurrents = () => {
    const currents = {
      surface: { speed: '0.5-1.0', direction: 'NE', description: 'Prąd powierzchniowy' },
      deep: { speed: '0.2-0.5', direction: 'SW', description: 'Prąd głębinowy' },
      tide: { status: 'Przypływ', time: '14:30', height: '0.8m' }
    };
    return currents;
  };

  const windForce = getWindForce(safeWeatherData.windSpeed);
  const visibilityStatus = getVisibilityStatus(safeWeatherData.visibility);
  const waveHeight = getWaveHeight(safeWeatherData.windSpeed);
  const sailingConditions = getSailingConditions(safeWeatherData.windSpeed, safeWeatherData.visibility, safeWeatherData.precipitation);
  const sailingForecast = getSailingForecast();
  const marineCurrents = getMarineCurrents();

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Anchor size={24} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>
              Pogoda dla żeglarzy
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Warunki żeglarskie i bezpieczeństwo
            </Text>
          </View>
        </View>

      <View style={styles.content}>
        {/* Main Conditions */}
        <View style={styles.mainConditions}>
          <View style={styles.mainConditionCard}>
            <Text style={[styles.mainLabel, { color: colors.textSecondary }]}>Warunki żeglowania</Text>
            <Text style={[styles.mainValue, { color: sailingConditions.color }]}>
              {sailingConditions.condition}
            </Text>
            <Text style={[styles.mainSubtext, { color: sailingConditions.color }]}>
              Ocena: {sailingConditions.score}/100
            </Text>
          </View>
          
          <View style={styles.mainConditionCard}>
            <Text style={[styles.mainLabel, { color: colors.textSecondary }]}>Siła wiatru</Text>
            <Text style={[styles.mainValue, { color: windForce.color }]}>
              {windForce.force}
            </Text>
            <Text style={[styles.mainSubtext, { color: windForce.color }]}>
              Skala Beauforta: {windForce.beaufort}
            </Text>
          </View>
        </View>

        {/* Wind Details */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Wind size={20} color={colors.secondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Wiatr</Text>
          </View>
          <View style={styles.windGrid}>
            <View style={styles.windItem}>
              <Text style={[styles.windLabel, { color: colors.textSecondary }]}>Prędkość</Text>
              <Text style={[styles.windValue, { color: colors.text }]}>
                {safeWeatherData.windSpeed} km/h
              </Text>
            </View>
            <View style={styles.windItem}>
              <Text style={[styles.windLabel, { color: colors.textSecondary }]}>Kierunek</Text>
              <Text style={[styles.windValue, { color: colors.text }]}>
                {getWindDirection(safeWeatherData.windDirection)}
              </Text>
              <Text style={[styles.windSubtext, { color: colors.textSecondary }]}>
                {getWindDirectionName(safeWeatherData.windDirection)}
              </Text>
            </View>
          </View>
        </View>

        {/* Maritime Conditions */}
        <View style={styles.maritimeGrid}>
          <View style={[styles.maritimeCard, { backgroundColor: colors.card }]}>
            <Waves size={20} color={colors.info} />
            <Text style={[styles.maritimeValue, { color: colors.text }]}>
              {waveHeight.height}
            </Text>
            <Text style={[styles.maritimeLabel, { color: colors.textSecondary }]}>Wysokość fal</Text>
            <Text style={[styles.maritimeDescription, { color: colors.textSecondary }]}>
              {waveHeight.description}
            </Text>
          </View>

          <View style={[styles.maritimeCard, { backgroundColor: colors.card }]}>
            <Eye size={20} color={colors.success} />
            <Text style={[styles.maritimeValue, { color: colors.text }]}>
              {safeWeatherData.visibility} km
            </Text>
            <Text style={[styles.maritimeLabel, { color: colors.textSecondary }]}>Widoczność</Text>
            <Text style={[styles.maritimeDescription, { color: colors.textSecondary }]}>
              {visibilityStatus.description}
            </Text>
          </View>

          <View style={[styles.maritimeCard, { backgroundColor: colors.card }]}>
            <Thermometer size={20} color={colors.error} />
            <Text style={[styles.maritimeValue, { color: colors.text }]}>
              {safeWeatherData.temperature}°C
            </Text>
            <Text style={[styles.maritimeLabel, { color: colors.textSecondary }]}>Temperatura</Text>
          </View>

          <View style={[styles.maritimeCard, { backgroundColor: colors.card }]}>
            <Gauge size={20} color={colors.primary} />
            <Text style={[styles.maritimeValue, { color: colors.text }]}>
              {safeWeatherData.pressure} hPa
            </Text>
            <Text style={[styles.maritimeLabel, { color: colors.textSecondary }]}>Ciśnienie</Text>
          </View>
        </View>

        {/* Marine Currents */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Navigation size={20} color={colors.info} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Prądy morskie</Text>
          </View>
          <View style={styles.currentsGrid}>
            <View style={styles.currentItem}>
              <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>Powierzchniowy</Text>
              <Text style={[styles.currentValue, { color: colors.text }]}>
                {marineCurrents.surface.speed} m/s {marineCurrents.surface.direction}
              </Text>
            </View>
            <View style={styles.currentItem}>
              <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>Głębinowy</Text>
              <Text style={[styles.currentValue, { color: colors.text }]}>
                {marineCurrents.deep.speed} m/s {marineCurrents.deep.direction}
              </Text>
            </View>
            <View style={styles.currentItem}>
              <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>Pływy</Text>
              <Text style={[styles.currentValue, { color: colors.text }]}>
                {marineCurrents.tide.status} {marineCurrents.tide.time}
              </Text>
              <Text style={[styles.currentSubtext, { color: colors.textSecondary }]}>
                Wysokość: {marineCurrents.tide.height}
              </Text>
            </View>
          </View>
        </View>

        {/* Sailing Forecast */}
        {sailingForecast && (
          <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color={colors.secondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Prognoza 6h</Text>
            </View>
            <View style={styles.forecastGrid}>
              <View style={styles.forecastItem}>
                <Text style={[styles.forecastLabel, { color: colors.textSecondary }]}>Trend</Text>
                <Text style={[styles.forecastValue, { color: sailingForecast.trendColor }]}>
                  {sailingForecast.trend}
                </Text>
              </View>
              <View style={styles.forecastItem}>
                <Text style={[styles.forecastLabel, { color: colors.textSecondary }]}>Maks. wiatr</Text>
                <Text style={[styles.forecastValue, { color: colors.text }]}>
                  {sailingForecast.maxWind} km/h
                </Text>
              </View>
              <View style={styles.forecastItem}>
                <Text style={[styles.forecastLabel, { color: colors.textSecondary }]}>Min. widoczność</Text>
                <Text style={[styles.forecastValue, { color: colors.text }]}>
                  {sailingForecast.minVisibility} km
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Safety Recommendations */}
        <View style={[styles.recommendationsContainer, { backgroundColor: colors.warning + '10' }]}>
          <AlertTriangle size={16} color={colors.warning} />
          <Text style={[styles.recommendationsText, { color: colors.text }]}>
            {sailingConditions.condition === 'Niebezpieczne' ? 'Nie zalecane żeglowanie - wysokie ryzyko' :
             sailingConditions.condition === 'Trudne' ? 'Żeglowanie tylko dla doświadczonych żeglarzy' :
             sailingConditions.condition === 'Dobre' ? 'Zachowaj ostrożność i monitoruj warunki' :
             'Bezpieczne warunki żeglowania - standardowe środki ostrożności'}
          </Text>
        </View>

        {/* Additional Safety Info */}
        <View style={[styles.safetyContainer, { backgroundColor: colors.info + '10' }]}>
          <Info size={16} color={colors.info} />
          <Text style={[styles.safetyText, { color: colors.text }]}>
            Sprawdź lokalne ostrzeżenia morskie i komunikaty nawigacyjne przed wyruszeniem w rejs
          </Text>
        </View>
      </View>
      </TouchableOpacity>

      <DetailedWeatherModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        weatherType="sailing"
        weatherData={synopData || currentWeather}
        forecastData={forecastData}
        synopData={synopData}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 8,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: 'Poppins_Bold',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Poppins_Regular',
  },
  content: {
    gap: 16,
  },
  mainConditions: {
    flexDirection: 'row',
    gap: 12,
  },
  mainConditionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  mainLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Poppins_Medium',
  },
  mainValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Poppins_Bold',
  },
  mainSubtext: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Poppins_SemiBold',
  },
  sectionContainer: {
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_SemiBold',
  },
  windGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  windItem: {
    flex: 1,
    alignItems: 'center',
  },
  windLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: 'Poppins_Medium',
  },
  windValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_Bold',
  },
  windSubtext: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
    fontFamily: 'Poppins_Regular',
  },
  maritimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  maritimeCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minHeight: 90,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  maritimeValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
    fontFamily: 'Poppins_Bold',
  },
  maritimeLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Poppins_Medium',
  },
  maritimeDescription: {
    fontSize: 9,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.8,
    fontFamily: 'Poppins_Regular',
  },
  currentsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  currentItem: {
    flex: 1,
    alignItems: 'center',
  },
  currentLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Poppins_Medium',
  },
  currentValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Poppins_Bold',
  },
  currentSubtext: {
    fontSize: 9,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
    fontFamily: 'Poppins_Regular',
  },
  forecastGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  forecastItem: {
    flex: 1,
    alignItems: 'center',
  },
  forecastLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Poppins_Medium',
  },
  forecastValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Poppins_Bold',
  },
  recommendationsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recommendationsText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    fontFamily: 'Poppins_Medium',
  },
  safetyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  safetyText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    fontFamily: 'Poppins_Medium',
  },
});
