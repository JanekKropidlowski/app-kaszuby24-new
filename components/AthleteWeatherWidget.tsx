import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { 
  Activity, 
  Thermometer, 
  Droplets, 
  SunMedium, 
  Wind, 
  Gauge,
  AlertTriangle,
  Clock,
  Heart
} from 'lucide-react-native';

interface AthleteWeatherWidgetProps {
  currentWeather?: any;
  synopData?: any;
  hourly?: any;
}

export const AthleteWeatherWidget: React.FC<AthleteWeatherWidgetProps> = ({
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

  // Extract weather data relevant for athletes
  const weatherData = {
    temperature: synopData?.temperatura ? parseFloat(synopData.temperatura) : 
                currentWeather?.temperature || 0,
    humidity: synopData?.wilgotnosc_wzgledna ? parseFloat(synopData.wilgotnosc_wzgledna) : 
             currentWeather?.humidity || 0,
    windSpeed: synopData?.predkosc_wiatru ? parseFloat(synopData.predkosc_wiatru) : 
               currentWeather?.windSpeed || 0,
    pressure: synopData?.cisnienie ? parseFloat(synopData.cisnienie) : 
              currentWeather?.pressure || 1013,
    uvIndex: currentWeather?.uvIndex || 4,
    visibility: synopData?.widocznosc ? parseFloat(synopData.widocznosc) : 
               currentWeather?.visibility || 10,
  };

  const getTrainingConditions = (temp: number, humidity: number, wind: number) => {
    if (temp >= 15 && temp <= 22 && humidity >= 40 && humidity <= 70 && wind <= 15) {
      return { condition: 'Idealne', color: colors.success, risk: 'Niskie' };
    }
    if (temp >= 10 && temp <= 25 && humidity >= 30 && humidity <= 80 && wind <= 20) {
      return { condition: 'Dobre', color: colors.warning, risk: 'Średnie' };
    }
    return { condition: 'Trudne', color: colors.error, risk: 'Wysokie' };
  };

  const getHeatIndex = (temp: number, humidity: number) => {
    // Simplified heat index calculation
    if (temp <= 20) return { level: 'Niski', color: colors.success };
    if (temp <= 25) return { level: 'Średni', color: colors.warning };
    if (temp <= 30) return { level: 'Wysoki', color: colors.error };
    return { level: 'Bardzo wysoki', color: colors.error };
  };

  const getUVRisk = (uvIndex: number) => {
    if (uvIndex <= 2) return { risk: 'Niskie', color: colors.success };
    if (uvIndex <= 5) return { risk: 'Średnie', color: colors.warning };
    if (uvIndex <= 7) return { risk: 'Wysokie', color: colors.error };
    return { risk: 'Bardzo wysokie', color: colors.error };
  };

  const getHydrationNeed = (temp: number, humidity: number) => {
    if (temp >= 25 || humidity <= 40) return { need: 'Wysokie', color: colors.error };
    if (temp >= 20 || humidity <= 50) return { need: 'Średnie', color: colors.warning };
    return { need: 'Niskie', color: colors.success };
  };

  const getPerformanceImpact = (temp: number, humidity: number, wind: number) => {
    if (temp >= 15 && temp <= 22 && humidity >= 40 && humidity <= 70) {
      return { impact: 'Pozytywny', color: colors.success };
    }
    if (temp >= 10 && temp <= 25 && humidity >= 30 && humidity <= 80) {
      return { impact: 'Neutralny', color: colors.warning };
    }
    return { impact: 'Negatywny', color: colors.error };
  };

  const trainingConditions = getTrainingConditions(weatherData.temperature, weatherData.humidity, weatherData.windSpeed);
  const heatIndex = getHeatIndex(weatherData.temperature, weatherData.humidity);
  const uvRisk = getUVRisk(weatherData.uvIndex);
  const hydrationNeed = getHydrationNeed(weatherData.temperature, weatherData.humidity);
  const performanceImpact = getPerformanceImpact(weatherData.temperature, weatherData.humidity, weatherData.windSpeed);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
          <Activity size={24} color={colors.error} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            Pogoda dla sportowców
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Warunki treningowe i wydajność
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Main Training Conditions */}
        <View style={styles.mainConditions}>
          <View style={styles.mainConditionCard}>
            <Text style={[styles.mainLabel, { color: colors.textSecondary }]}>Warunki treningu</Text>
            <Text style={[styles.mainValue, { color: trainingConditions.color }]}>
              {trainingConditions.condition}
            </Text>
            <Text style={[styles.mainSubtext, { color: trainingConditions.color }]}>
              Ryzyko: {trainingConditions.risk}
            </Text>
          </View>
          
          <View style={styles.mainConditionCard}>
            <Text style={[styles.mainLabel, { color: colors.textSecondary }]}>Wpływ na wydajność</Text>
            <Text style={[styles.mainValue, { color: performanceImpact.color }]}>
              {performanceImpact.impact}
            </Text>
          </View>
        </View>

        {/* Performance Factors */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Heart size={20} color={colors.error} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Czynniki wydajności</Text>
          </View>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceItem}>
              <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>Indeks cieplny</Text>
              <Text style={[styles.performanceValue, { color: heatIndex.color }]}>
                {heatIndex.level}
              </Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>Ryzyko UV</Text>
              <Text style={[styles.performanceValue, { color: uvRisk.color }]}>
                {uvRisk.risk}
              </Text>
            </View>
          </View>
        </View>

        {/* Weather Details Grid */}
        <View style={styles.weatherGrid}>
          <View style={[styles.weatherCard, { backgroundColor: colors.card }]}>
            <Thermometer size={20} color={colors.error} />
            <Text style={[styles.weatherValue, { color: colors.text }]}>
              {weatherData.temperature}°C
            </Text>
            <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>Temperatura</Text>
          </View>

          <View style={[styles.weatherCard, { backgroundColor: colors.card }]}>
            <Droplets size={20} color={colors.primary} />
            <Text style={[styles.weatherValue, { color: colors.text }]}>
              {weatherData.humidity}%
            </Text>
            <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>Wilgotność</Text>
          </View>

          <View style={[styles.weatherCard, { backgroundColor: colors.card }]}>
            <Wind size={20} color={colors.secondary} />
            <Text style={[styles.weatherValue, { color: colors.text }]}>
              {weatherData.windSpeed} km/h
            </Text>
            <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>Wiatr</Text>
          </View>

          <View style={[styles.weatherCard, { backgroundColor: colors.card }]}>
            <SunMedium size={20} color={colors.warning} />
            <Text style={[styles.weatherValue, { color: colors.text }]}>
              {weatherData.uvIndex}
            </Text>
            <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>Indeks UV</Text>
          </View>
        </View>

        {/* Special Alerts */}
        <View style={styles.alertsContainer}>
          <View style={[styles.alertCard, { backgroundColor: hydrationNeed.color + '10' }]}>
            <Droplets size={16} color={hydrationNeed.color} />
            <Text style={[styles.alertText, { color: colors.text }]}>
              Potrzeba nawodnienia: {hydrationNeed.need}
            </Text>
          </View>
          
          <View style={[styles.alertCard, { backgroundColor: uvRisk.color + '10' }]}>
            <SunMedium size={16} color={uvRisk.color} />
            <Text style={[styles.alertText, { color: colors.text }]}>
              Ochrona UV: {uvRisk.risk}
            </Text>
          </View>
        </View>

        {/* Training Recommendations */}
        <View style={[styles.recommendationsContainer, { backgroundColor: colors.warning + '10' }]}>
          <Clock size={16} color={colors.warning} />
          <Text style={[styles.recommendationsText, { color: colors.text }]}>
            {trainingConditions.condition === 'Idealne' ? 'Optymalny czas na intensywny trening' :
             trainingConditions.condition === 'Dobre' ? 'Możliwy trening z dostosowaniem intensywności' :
             'Zalecany lekki trening lub aktywność w pomieszczeniu'}
          </Text>
        </View>
      </View>
    </View>
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
  performanceGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: 'Poppins_Medium',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_Bold',
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weatherCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minHeight: 80,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  weatherValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
    fontFamily: 'Poppins_Bold',
  },
  weatherLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Poppins_Medium',
  },
  alertsContainer: {
    gap: 8,
  },
  alertCard: {
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
  alertText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    fontFamily: 'Poppins_Medium',
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
});
