import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { 
  Car, 
  Trophy, 
  Anchor, 
  Wheat,
  TrendingUp,
  AlertTriangle,
  Sun,
  CloudRain,
  Wind,
  Thermometer
} from 'lucide-react-native';

interface DedicatedWeatherSectionsProps {
  currentWeather?: any;
  synopData?: any;
  hourly?: any;
}

export const DedicatedWeatherSections: React.FC<DedicatedWeatherSectionsProps> = ({
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

  // Extract weather data
  const weatherData = {
    temperature: synopData?.temperatura ? parseFloat(synopData.temperatura) : 
                currentWeather?.temperature || 0,
    humidity: synopData?.wilgotnosc_wzgledna ? parseFloat(synopData.wilgotnosc_wzgledna) : 
              currentWeather?.humidity || 0,
    windSpeed: synopData?.predkosc_wiatru ? parseFloat(synopData.predkosc_wiatru) : 
               currentWeather?.windSpeed || 0,
    visibility: synopData?.widocznosc ? parseFloat(synopData.widocznosc) : 
               currentWeather?.visibility || 10,
    precipitation: currentWeather?.precipitation || 0,
    uvIndex: currentWeather?.uvIndex || 4,
  };

  const getDrivingConditions = () => {
    let conditions = [];
    let riskLevel = 'low';
    
    if (weatherData.visibility < 5) {
      conditions.push('Słaba widoczność');
      riskLevel = 'high';
    }
    if (weatherData.precipitation > 2.5) {
      conditions.push('Intensywne opady');
      riskLevel = 'medium';
    }
    if (weatherData.windSpeed > 25) {
      conditions.push('Silny wiatr');
      riskLevel = 'medium';
    }
    if (weatherData.temperature < 0) {
      conditions.push('Możliwy lód');
      riskLevel = 'high';
    }
    
    if (conditions.length === 0) {
      conditions.push('Dobre warunki jazdy');
    }
    
    return { conditions, riskLevel };
  };

  const getAthleticConditions = () => {
    let conditions = [];
    let recommendation = 'Optymalne';
    
    if (weatherData.temperature > 25) {
      conditions.push('Wysoka temperatura');
      recommendation = 'Umiarkowany wysiłek';
    }
    if (weatherData.humidity > 70) {
      conditions.push('Wysoka wilgotność');
      recommendation = 'Nawodnienie';
    }
    if (weatherData.uvIndex > 7) {
      conditions.push('Wysokie UV');
      recommendation = 'Ochrona przeciwsłoneczna';
    }
    
    if (conditions.length === 0) {
      conditions.push('Idealne warunki');
    }
    
    return { conditions, recommendation };
  };

  const getSailingConditions = () => {
    let conditions = [];
    let impact = 'Minimalny';
    
    if (weatherData.windSpeed > 25) {
      conditions.push('Silny wiatr');
      impact = 'Wysoki';
    }
    if (weatherData.visibility < 5) {
      conditions.push('Słaba widoczność');
      impact = 'Wysoki';
    }
    if (weatherData.precipitation > 2.5) {
      conditions.push('Intensywne opady');
      impact = 'Umiarkowany';
    }
    if (weatherData.temperature < 5) {
      conditions.push('Niska temperatura');
      impact = 'Umiarkowany';
    }
    
    if (conditions.length === 0) {
      conditions.push('Idealne warunki żeglarskie');
    }
    
    return { conditions, impact };
  };

  const getFarmingConditions = () => {
    let conditions = [];
    let activity = 'Optymalna';
    
    if (weatherData.temperature < 5) {
      conditions.push('Zbyt zimno');
      activity = 'Ograniczona';
    }
    if (weatherData.precipitation > 5) {
      conditions.push('Intensywne opady');
      activity = 'Ograniczona';
    }
    if (weatherData.windSpeed > 20) {
      conditions.push('Silny wiatr');
      activity = 'Ograniczona';
    }
    if (weatherData.humidity < 40) {
      conditions.push('Niska wilgotność');
      activity = 'Nawadnianie';
    }
    
    if (conditions.length === 0) {
      conditions.push('Idealne warunki');
    }
    
    return { conditions, activity };
  };

  const driving = getDrivingConditions();
  const athletic = getAthleticConditions();
  const sailing = getSailingConditions();
  const farming = getFarmingConditions();

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      default: return colors.success;
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    if (recommendation.includes('Ograniczona')) return colors.error;
    if (recommendation.includes('Umiarkowany')) return colors.warning;
    if (recommendation.includes('Nawadnianie')) return colors.info;
    return colors.success;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Sekcje dedykowane
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Specjalistyczne informacje pogodowe
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionsContainer}
      >
        {/* Drivers Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Car size={24} color={colors.primary} />
            </View>
            <View style={[styles.riskIndicator, { backgroundColor: getRiskColor(driving.riskLevel) + '20' }]}>
              <Text style={[styles.riskText, { color: getRiskColor(driving.riskLevel) }]}>
                {driving.riskLevel === 'high' ? 'WYSOKIE' : 
                 driving.riskLevel === 'medium' ? 'ŚREDNIE' : 'NISKIE'}
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Kierowcy</Text>
          <View style={styles.conditionsList}>
            {driving.conditions.map((condition, index) => (
              <Text key={index} style={[styles.conditionText, { color: colors.textSecondary }]}>
                • {condition}
              </Text>
            ))}
          </View>
        </View>

        {/* Athletes Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '20' }]}>
              <Trophy size={24} color={colors.secondary} />
            </View>
            <View style={[styles.recommendationIndicator, { backgroundColor: getRecommendationColor(athletic.recommendation) + '20' }]}>
              <Text style={[styles.recommendationText, { color: getRecommendationColor(athletic.recommendation) }]}>
                {athletic.recommendation}
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sportowcy</Text>
          <View style={styles.conditionsList}>
            {athletic.conditions.map((condition, index) => (
              <Text key={index} style={[styles.conditionText, { color: colors.textSecondary }]}>
                • {condition}
              </Text>
            ))}
          </View>
        </View>

        {/* Sailors Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.info + '20' }]}>
              <Anchor size={24} color={colors.info} />
            </View>
            <View style={[styles.impactIndicator, { backgroundColor: getRiskColor(sailing.impact === 'Wysoki' ? 'high' : sailing.impact === 'Umiarkowany' ? 'medium' : 'low') + '20' }]}>
              <Text style={[styles.impactText, { color: getRiskColor(sailing.impact === 'Wysoki' ? 'high' : sailing.impact === 'Umiarkowany' ? 'medium' : 'low') }]}>
                {sailing.impact}
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Żeglarze</Text>
          <View style={styles.conditionsList}>
            {sailing.conditions.map((condition, index) => (
              <Text key={index} style={[styles.conditionText, { color: colors.textSecondary }]}>
                • {condition}
              </Text>
            ))}
          </View>
        </View>

        {/* Farmers Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
              <Wheat size={24} color={colors.success} />
            </View>
            <View style={[styles.activityIndicator, { backgroundColor: getRecommendationColor(farming.activity) + '20' }]}>
              <Text style={[styles.activityText, { color: getRecommendationColor(farming.activity) }]}>
                {farming.activity}
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rolnicy</Text>
          <View style={styles.conditionsList}>
            {farming.conditions.map((condition, index) => (
              <Text key={index} style={[styles.conditionText, { color: colors.textSecondary }]}>
                • {condition}
              </Text>
            ))}
          </View>
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
  sectionsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recommendationIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendationText: {
    fontSize: 10,
    fontWeight: '700',
  },
  impactIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  impactText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activityIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  conditionsList: {
    gap: 4,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
