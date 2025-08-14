import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { 
  Sprout, 
  Thermometer, 
  Droplets, 
  SunMedium, 
  Wind, 
  Gauge,
  AlertTriangle,
  Clock,
  CloudRain,
  TrendingUp,
  Shield,
  Info,
  Leaf,
  Calendar,
  Zap
} from 'lucide-react-native';

interface FarmerWeatherWidgetProps {
  currentWeather?: any;
  synopData?: any;
  hourly?: any;
  meteoData?: any;
}

export const FarmerWeatherWidget: React.FC<FarmerWeatherWidgetProps> = ({
  currentWeather,
  synopData,
  hourly,
  meteoData
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

  // Extract weather data relevant for farmers
  const weatherData = {
    temperature: synopData?.temperatura ? parseFloat(synopData.temperatura) : 
                currentWeather?.temperature || 0,
    soilTemperature: meteoData?.temperatura_gruntu ? parseFloat(meteoData.temperatura_gruntu) : 
                     (currentWeather?.temperature || 0) - 2, // Estimate if not available
    humidity: synopData?.wilgotnosc_wzgledna ? parseFloat(synopData.wilgotnosc_wzgledna) : 
             currentWeather?.humidity || 0,
    precipitation: currentWeather?.precipitation || 0,
    windSpeed: synopData?.predkosc_wiatru ? parseFloat(synopData.predkosc_wiatru) : 
               currentWeather?.windSpeed || 0,
    pressure: synopData?.cisnienie ? parseFloat(synopData.cisnienie) : 
              currentWeather?.pressure || 1013,
    uvIndex: currentWeather?.uvIndex || 4,
  };

  const getGrowingConditions = (temp: number, humidity: number, precip: number) => {
    if (temp >= 15 && temp <= 25 && humidity >= 60 && humidity <= 80) {
      return { condition: 'Idealne', color: colors.success, risk: 'Niskie', description: 'Optymalne warunki dla wzrostu roślin' };
    }
    if (temp >= 10 && temp <= 30 && humidity >= 50 && humidity <= 90) {
      return { condition: 'Dobre', color: colors.warning, risk: 'Średnie', description: 'Dobre warunki z małymi ograniczeniami' };
    }
    return { condition: 'Trudne', color: colors.error, risk: 'Wysokie', description: 'Wymaga uwagi i odpowiednich działań' };
  };

  const getSoilCondition = (soilTemp: number, humidity: number) => {
    if (soilTemp >= 8 && soilTemp <= 25) return { condition: 'Optymalna', color: colors.success, description: 'Idealna temperatura gleby' };
    if (soilTemp >= 5 && soilTemp <= 30) return { condition: 'Dobra', color: colors.warning, description: 'Dobra temperatura gleby' };
    return { condition: 'Nieodpowiednia', color: colors.error, description: 'Temperatura gleby poza optymalnym zakresem' };
  };

  const getIrrigationNeed = (humidity: number, precip: number) => {
    if (humidity < 50 && precip < 1) return { need: 'Wysokie', color: colors.error, description: 'Konieczne nawadnianie' };
    if (humidity < 60 && precip < 2) return { need: 'Średnie', color: colors.warning, description: 'Rozważ nawadnianie' };
    return { need: 'Niskie', color: colors.success, description: 'Nawadnianie niepotrzebne' };
  };

  const getFrostRisk = (temp: number, humidity: number) => {
    if (temp <= 0 && humidity > 80) return { risk: 'Wysokie', color: colors.error, description: 'Wysokie ryzyko przymrozków', icon: AlertTriangle };
    if (temp <= 2 && humidity > 70) return { risk: 'Średnie', color: colors.warning, description: 'Średnie ryzyko przymrozków', icon: AlertTriangle };
    return { risk: 'Niskie', color: colors.success, description: 'Niskie ryzyko przymrozków', icon: Shield };
  };

  const getHarvestConditions = (temp: number, humidity: number, wind: number) => {
    if (temp >= 15 && temp <= 25 && humidity <= 70 && wind <= 15) {
      return { condition: 'Idealne', color: colors.success, description: 'Doskonałe warunki do zbiorów' };
    }
    if (temp >= 10 && temp <= 30 && humidity <= 80 && wind <= 20) {
      return { condition: 'Dobre', color: colors.warning, description: 'Dobre warunki do zbiorów' };
    }
    return { condition: 'Trudne', color: colors.error, description: 'Trudne warunki do zbiorów' };
  };

  const getPesticideApplication = (temp: number, wind: number, precip: number) => {
    if (temp >= 15 && temp <= 25 && wind <= 10 && precip === 0) {
      return { condition: 'Idealne', color: colors.success, description: 'Optymalne warunki do oprysków' };
    }
    if (temp >= 10 && temp <= 30 && wind <= 15 && precip < 1) {
      return { condition: 'Dobre', color: colors.warning, description: 'Dobre warunki do oprysków' };
    }
    return { condition: 'Nieodpowiednie', color: colors.error, description: 'Nieodpowiednie warunki do oprysków' };
  };

  const growingConditions = getGrowingConditions(weatherData.temperature, weatherData.humidity, weatherData.precipitation);
  const soilCondition = getSoilCondition(weatherData.soilTemperature, weatherData.humidity);
  const irrigationNeed = getIrrigationNeed(weatherData.humidity, weatherData.precipitation);
  const frostRisk = getFrostRisk(weatherData.temperature, weatherData.humidity);
  const harvestConditions = getHarvestConditions(weatherData.temperature, weatherData.humidity, weatherData.windSpeed);
  const pesticideApplication = getPesticideApplication(weatherData.temperature, weatherData.windSpeed, weatherData.precipitation);

  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
          <Sprout size={24} color={colors.success} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            Pogoda dla rolników
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Warunki uprawy i prac polowych
          </Text>
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: growingConditions.color + '20' }]}>
          <Text style={[styles.statusText, { color: growingConditions.color }]}>
            {growingConditions.condition}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Enhanced Rating Section */}
        <View style={styles.ratingContainer}>
          <View style={[styles.ratingCard, { backgroundColor: growingConditions.color + '10' }]}>
            <View style={styles.ratingHeader}>
              <TrendingUp size={20} color={growingConditions.color} />
              <Text style={[styles.ratingTitle, { color: colors.textSecondary }]}>Warunki wzrostu</Text>
            </View>
            <Text style={[styles.ratingValue, { color: growingConditions.color }]}>
              {growingConditions.condition}
            </Text>
            <Text style={[styles.ratingDescription, { color: colors.textSecondary }]}>
              {growingConditions.description}
            </Text>
          </View>
          
          <View style={[styles.ratingCard, { backgroundColor: frostRisk.color + '10' }]}>
            <View style={styles.ratingHeader}>
              {React.createElement(frostRisk.icon, { size: 20, color: frostRisk.color })}
              <Text style={[styles.ratingTitle, { color: colors.textSecondary }]}>Ryzyko przymrozków</Text>
            </View>
            <Text style={[styles.ratingValue, { color: frostRisk.color }]}>
              {frostRisk.risk}
            </Text>
            <Text style={[styles.ratingDescription, { color: colors.textSecondary }]}>
              {frostRisk.description}
            </Text>
          </View>
        </View>

        {/* Enhanced Weather Details Grid */}
        <View style={styles.weatherGrid}>
          <View style={[styles.weatherCard, { backgroundColor: colors.card }]}>
            <View style={[styles.weatherIconContainer, { backgroundColor: colors.error + '15' }]}>
              <Thermometer size={20} color={colors.error} />
            </View>
            <Text style={[styles.weatherValue, { color: colors.text }]}>
              {weatherData.temperature}°C
            </Text>
            <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>Temperatura powietrza</Text>
          </View>

          <View style={[styles.weatherCard, { backgroundColor: colors.card }]}>
            <View style={[styles.weatherIconContainer, { backgroundColor: colors.success + '15' }]}>
              <Leaf size={20} color={colors.success} />
            </View>
            <Text style={[styles.weatherValue, { color: colors.text }]}>
              {weatherData.soilTemperature}°C
            </Text>
            <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>Temperatura gleby</Text>
          </View>

          <View style={[styles.weatherCard, { backgroundColor: colors.card }]}>
            <View style={[styles.weatherIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Droplets size={20} color={colors.primary} />
            </View>
            <Text style={[styles.weatherValue, { color: colors.text }]}>
              {weatherData.humidity}%
            </Text>
            <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>Wilgotność</Text>
          </View>

          <View style={[styles.weatherCard, { backgroundColor: colors.card }]}>
            <View style={[styles.weatherIconContainer, { backgroundColor: colors.secondary + '15' }]}>
              <CloudRain size={20} color={colors.secondary} />
            </View>
            <Text style={[styles.weatherValue, { color: colors.text }]}>
              {weatherData.precipitation} mm
            </Text>
            <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>Opady</Text>
          </View>
        </View>

        {/* Enhanced Additional Weather Info */}
        <View style={styles.additionalInfo}>
          <View style={[styles.infoCard, { backgroundColor: colors.info + '10' }]}>
            <Gauge size={16} color={colors.info} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Ciśnienie: {weatherData.pressure} hPa
            </Text>
          </View>
          
          <View style={[styles.infoCard, { backgroundColor: colors.warning + '10' }]}>
            <SunMedium size={16} color={colors.warning} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              UV: {weatherData.uvIndex}/11
            </Text>
          </View>
        </View>

        {/* Enhanced Agricultural Conditions */}
        <View style={styles.conditionsContainer}>
          <View style={[styles.conditionCard, { backgroundColor: soilCondition.color + '10' }]}>
            <Leaf size={16} color={soilCondition.color} />
            <Text style={[styles.conditionTitle, { color: colors.text }]}>Stan gleby:</Text>
            <Text style={[styles.conditionText, { color: colors.text }]}>
              {soilCondition.condition}
            </Text>
            <Text style={[styles.conditionDescription, { color: colors.textSecondary }]}>
              {soilCondition.description}
            </Text>
          </View>
          
          <View style={[styles.conditionCard, { backgroundColor: irrigationNeed.color + '10' }]}>
            <Droplets size={16} color={irrigationNeed.color} />
            <Text style={[styles.conditionTitle, { color: colors.text }]}>Potrzeba nawadniania:</Text>
            <Text style={[styles.conditionText, { color: colors.text }]}>
              {irrigationNeed.need}
            </Text>
            <Text style={[styles.conditionDescription, { color: colors.textSecondary }]}>
              {irrigationNeed.description}
            </Text>
          </View>
        </View>

        {/* Enhanced Work Recommendations */}
        <View style={styles.recommendationsContainer}>
          <View style={[styles.recommendationCard, { backgroundColor: harvestConditions.color + '10' }]}>
            <Calendar size={16} color={harvestConditions.color} />
            <Text style={[styles.recommendationTitle, { color: colors.text }]}>Warunki zbiorów:</Text>
            <Text style={[styles.recommendationText, { color: colors.text }]}>
              {harvestConditions.condition}
            </Text>
            <Text style={[styles.recommendationDescription, { color: colors.textSecondary }]}>
              {harvestConditions.description}
            </Text>
          </View>
          
          <View style={[styles.recommendationCard, { backgroundColor: pesticideApplication.color + '10' }]}>
            <Zap size={16} color={pesticideApplication.color} />
            <Text style={[styles.recommendationTitle, { color: colors.text }]}>Opryski:</Text>
            <Text style={[styles.recommendationText, { color: colors.text }]}>
              {pesticideApplication.condition}
            </Text>
            <Text style={[styles.recommendationDescription, { color: colors.textSecondary }]}>
              {pesticideApplication.description}
            </Text>
          </View>
        </View>

        {/* Enhanced Agricultural Tips */}
        <View style={styles.tipsContainer}>
          <View style={[styles.tipCard, { backgroundColor: colors.warning + '10' }]}>
            <Clock size={16} color={colors.warning} />
            <Text style={[styles.tipText, { color: colors.text }]}>
              {weatherData.temperature >= 15 ? 'Idealny czas na prace polowe' : 
               weatherData.temperature >= 10 ? 'Dobry czas na prace polowe' : 
               'Ograniczone prace polowe ze względu na temperaturę'}
            </Text>
          </View>
          
          <View style={[styles.tipCard, { backgroundColor: colors.success + '10' }]}>
            <Sprout size={16} color={colors.success} />
            <Text style={[styles.tipText, { color: colors.text }]}>
              {weatherData.humidity >= 60 ? 'Wilgotność optymalna dla roślin' : 
               weatherData.humidity >= 40 ? 'Wilgotność dobra' : 
               'Niska wilgotność - rozważ nawadnianie'}
            </Text>
          </View>

          <View style={[styles.tipCard, { backgroundColor: colors.info + '10' }]}>
            <Info size={16} color={colors.info} />
            <Text style={[styles.tipText, { color: colors.text }]}>
              {weatherData.pressure < 1000 ? 'Niskie ciśnienie - możliwe zmiany pogody' : 
               weatherData.pressure > 1020 ? 'Wysokie ciśnienie - stabilna pogoda' : 
               'Normalne ciśnienie atmosferyczne'}
            </Text>
          </View>
        </View>

        {/* Enhanced Safety Warnings */}
        {weatherData.temperature <= 2 && (
          <View style={[styles.warningContainer, { backgroundColor: colors.error + '20' }]}>
            <AlertTriangle size={20} color={colors.error} />
            <Text style={[styles.warningText, { color: colors.error }]}>
              Uwaga na przymrozki - zabezpiecz wrażliwe rośliny
            </Text>
          </View>
        )}

        {weatherData.humidity < 40 && (
          <View style={[styles.warningContainer, { backgroundColor: colors.warning + '20' }]}>
            <Droplets size={20} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              Niska wilgotność - rozważ nawadnianie upraw
            </Text>
          </View>
        )}

        {weatherData.windSpeed > 25 && (
          <View style={[styles.warningContainer, { backgroundColor: colors.info + '20' }]}>
            <Wind size={20} color={colors.info} />
            <Text style={[styles.warningText, { color: colors.info }]}>
              Silny wiatr - unikaj oprysków i prac na wysokości
            </Text>
          </View>
        )}

        {weatherData.precipitation > 5 && (
          <View style={[styles.warningContainer, { backgroundColor: colors.primary + '20' }]}>
            <CloudRain size={20} color={colors.primary} />
            <Text style={[styles.warningText, { color: colors.primary }]}>
              Intensywne opady - ogranicz prace polowe
            </Text>
          </View>
        )}
      </ScrollView>
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
    maxHeight: 600,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_SemiBold',
  },
  content: {
    gap: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  ratingTitle: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Poppins_Medium',
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Poppins_Bold',
  },
  ratingDescription: {
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
    fontFamily: 'Poppins_Regular',
    lineHeight: 14,
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  weatherCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minHeight: 90,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  weatherIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  weatherValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: 'Poppins_Bold',
  },
  weatherLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Poppins_Medium',
  },
  additionalInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    fontFamily: 'Poppins_Medium',
  },
  conditionsContainer: {
    gap: 12,
  },
  conditionCard: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  conditionTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_SemiBold',
  },
  conditionText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_Bold',
  },
  conditionDescription: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Poppins_Regular',
    lineHeight: 16,
  },
  recommendationsContainer: {
    gap: 12,
  },
  recommendationCard: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_SemiBold',
  },
  recommendationText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_Bold',
  },
  recommendationDescription: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Poppins_Regular',
    lineHeight: 16,
  },
  tipsContainer: {
    gap: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tipText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    fontFamily: 'Poppins_Medium',
    lineHeight: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    fontFamily: 'Poppins_SemiBold',
    lineHeight: 20,
  },
});
