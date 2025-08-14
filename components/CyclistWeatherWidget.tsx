import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, StatusBar, Animated } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { 
  Bike, 
  Thermometer, 
  Wind, 
  Eye, 
  CloudRain, 
  SunMedium,
  AlertTriangle,
  Clock,
  MapPin,
  Heart,
  TrendingUp,
  Shield,
  Info,
  Gauge,
  Route,
  X,
  Star,
  CheckCircle,
  AlertCircle,
  Droplets
} from 'lucide-react-native';
import { UnifiedWeatherWidget } from './UnifiedWeatherWidget';
import { LinearGradient } from 'expo-linear-gradient';

interface CyclistWeatherWidgetProps {
  currentWeather?: any;
  synopData?: any;
  hourly?: any;
  forecastData?: any;
}

export const CyclistWeatherWidget: React.FC<CyclistWeatherWidgetProps> = ({
  currentWeather,
  synopData,
  hourly,
  forecastData
}) => {
  const { theme } = useThemeStore();
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Extract weather data relevant for cyclists with proper null checks
  const weatherData = {
    temperature: synopData?.temperatura ? parseFloat(synopData.temperatura) : 
                (currentWeather?.temperature || 0),
    humidity: synopData?.wilgotnosc_wzgledna ? parseFloat(synopData.wilgotnosc_wzgledna) : 
             (currentWeather?.humidity || 0),
    windSpeed: synopData?.predkosc_wiatru ? parseFloat(synopData.predkosc_wiatru) : 
               (currentWeather?.windSpeed || 0),
    visibility: synopData?.widocznosc ? parseFloat(synopData.widocznosc) : 
               (currentWeather?.visibility || 10),
    precipitation: currentWeather?.precipitation || 0,
  };

  // Ensure all values are numbers and have fallbacks
  const safeWeatherData = {
    temperature: typeof weatherData.temperature === 'number' ? weatherData.temperature : 0,
    humidity: typeof weatherData.humidity === 'number' ? weatherData.humidity : 0,
    windSpeed: typeof weatherData.windSpeed === 'number' ? weatherData.windSpeed : 0,
    visibility: typeof weatherData.visibility === 'number' ? weatherData.visibility : 10,
    precipitation: typeof weatherData.precipitation === 'number' ? weatherData.precipitation : 0,
  };

  const getCyclingConditions = (temp: number, wind: number, visibility: number, precip: number) => {
    let level: 'excellent' | 'good' | 'moderate' | 'poor' | 'dangerous' = 'excellent';
    let conditions = 'Doskonałe';
    
    if (temp < -10 || temp > 40 || wind > 50 || visibility < 1 || precip > 20) {
      level = 'dangerous';
      conditions = 'Niebezpieczne';
    } else if (temp < 0 || temp > 35 || wind > 35 || visibility < 2 || precip > 10) {
      level = 'poor';
      conditions = 'Trudne';
    } else if (temp < 5 || temp > 30 || wind > 25 || visibility < 5 || precip > 5) {
      level = 'moderate';
      conditions = 'Umiarkowane';
    } else if (temp >= 15 && temp <= 25 && wind <= 15 && visibility >= 10 && precip <= 2) {
      level = 'excellent';
      conditions = 'Doskonałe';
    } else {
      level = 'good';
      conditions = 'Dobre';
    }
    
    return { level, conditions };
  };

  const getWindResistance = (windSpeed: number) => {
    if (windSpeed <= 10) return { resistance: 'Niska', level: 'excellent' as const };
    if (windSpeed <= 20) return { resistance: 'Średnia', level: 'good' as const };
    if (windSpeed <= 30) return { resistance: 'Wysoka', level: 'moderate' as const };
    return { resistance: 'Bardzo wysoka', level: 'poor' as const };
  };

  const cyclingConditions = getCyclingConditions(
    safeWeatherData.temperature, 
    safeWeatherData.windSpeed, 
    safeWeatherData.visibility, 
    safeWeatherData.precipitation
  );
  
  const windResistance = getWindResistance(safeWeatherData.windSpeed);

  // Przygotuj metryki dla zunifikowanego widgetu
  const metrics = [
    {
      label: 'Temperatura',
      value: `${safeWeatherData.temperature.toFixed(1)}°C`,
      icon: Thermometer,
      status: safeWeatherData.temperature >= 15 && safeWeatherData.temperature <= 25 ? 'excellent' as const :
             safeWeatherData.temperature >= 5 && safeWeatherData.temperature <= 30 ? 'good' as const : 'moderate' as const,
    },
    {
      label: 'Opór wiatru',
      value: windResistance.resistance,
      icon: Wind,
      status: windResistance.level,
    },
    {
      label: 'Widoczność',
      value: `${safeWeatherData.visibility.toFixed(1)}km`,
      icon: Eye,
      status: safeWeatherData.visibility >= 10 ? 'excellent' as const :
             safeWeatherData.visibility >= 5 ? 'good' as const :
             safeWeatherData.visibility >= 2 ? 'moderate' as const : 'poor' as const,
    },
    {
      label: 'Warunki jazdy',
      value: cyclingConditions.conditions,
      icon: Bike,
      status: cyclingConditions.level,
    }
  ];

  const openDetailModal = () => setDetailModalVisible(true);
  const closeDetailModal = () => setDetailModalVisible(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return theme.colors.success;
      case 'good': return theme.colors.info;
      case 'moderate': return theme.colors.warning;
      case 'poor': return theme.colors.error;
      case 'dangerous': return '#dc2626';
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle size={16} color={theme.colors.success} />;
      case 'good': return <Star size={16} color={theme.colors.info} />;
      case 'moderate': return <AlertCircle size={16} color={theme.colors.warning} />;
      case 'poor': return <AlertTriangle size={16} color={theme.colors.error} />;
      case 'dangerous': return <AlertTriangle size={16} color="#dc2626" />;
      default: return <Info size={16} color={theme.colors.textSecondary} />;
    }
  };

  return (
    <>
      <UnifiedWeatherWidget
        title="Pogoda dla Rowerzystów"
        subtitle="Warunki jazdy rowerowej"
        icon={Bike}
        gradientColors={['#dc2626', '#ef4444', '#f87171']}
        metrics={metrics}
        onPress={openDetailModal}
      />

      {/* Detailed Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="none"
        presentationStyle="pageSheet"
        onRequestClose={closeDetailModal}
        transparent
      >
        <StatusBar backgroundColor="rgba(0,0,0,0.8)" barStyle="light-content" />
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header with gradient */}
            <LinearGradient
              colors={['#dc2626', '#ef4444', '#f87171']}
              style={styles.modalHeader}
            >
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalHeaderLeft}>
                  <View style={styles.modalHeaderIcon}>
                    <Bike size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.modalHeaderText}>
                    <Text style={styles.modalTitle}>Pogoda dla Rowerzystów</Text>
                    <Text style={styles.modalSubtitle}>Szczegółowe warunki jazdy rowerowej</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} onPress={closeDetailModal}>
                  <X size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Current Conditions */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Aktualne warunki
                </Text>
                <View style={styles.conditionsGrid}>
                  <View style={[styles.conditionCard, { backgroundColor: theme.colors.card }]}>
                    <View style={[styles.conditionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Thermometer size={20} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.conditionValue, { color: theme.colors.text }]}>
                      {safeWeatherData.temperature.toFixed(1)}°C
                    </Text>
                    <Text style={[styles.conditionLabel, { color: theme.colors.textSecondary }]}>
                      Temperatura
                    </Text>
                  </View>

                  <View style={[styles.conditionCard, { backgroundColor: theme.colors.card }]}>
                    <View style={[styles.conditionIcon, { backgroundColor: '#45B7D1' + '20' }]}>
                      <Wind size={20} color="#45B7D1" />
                    </View>
                    <Text style={[styles.conditionValue, { color: theme.colors.text }]}>
                      {safeWeatherData.windSpeed.toFixed(1)} km/h
                    </Text>
                    <Text style={[styles.conditionLabel, { color: theme.colors.textSecondary }]}>
                      Wiatr
                    </Text>
                  </View>

                  <View style={[styles.conditionCard, { backgroundColor: theme.colors.card }]}>
                    <View style={[styles.conditionIcon, { backgroundColor: '#4ECDC4' + '20' }]}>
                      <Eye size={20} color="#4ECDC4" />
                    </View>
                    <Text style={[styles.conditionValue, { color: theme.colors.text }]}>
                      {safeWeatherData.visibility.toFixed(1)} km
                    </Text>
                    <Text style={[styles.conditionLabel, { color: theme.colors.textSecondary }]}>
                      Widoczność
                    </Text>
                  </View>

                  <View style={[styles.conditionCard, { backgroundColor: theme.colors.card }]}>
                    <View style={[styles.conditionIcon, { backgroundColor: '#96CEB4' + '20' }]}>
                      <CloudRain size={20} color="#96CEB4" />
                    </View>
                    <Text style={[styles.conditionValue, { color: theme.colors.text }]}>
                      {safeWeatherData.precipitation.toFixed(1)} mm
                    </Text>
                    <Text style={[styles.conditionLabel, { color: theme.colors.textSecondary }]}>
                      Opady
                    </Text>
                  </View>
                </View>
              </View>

              {/* Cycling Assessment */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Ocena warunków jazdy
                </Text>
                <View style={[styles.assessmentCard, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.assessmentHeader}>
                    <View style={[styles.assessmentIcon, { backgroundColor: getStatusColor(cyclingConditions.level) + '20' }]}>
                      {getStatusIcon(cyclingConditions.level)}
                    </View>
                    <View style={styles.assessmentInfo}>
                      <Text style={[styles.assessmentTitle, { color: theme.colors.text }]}>
                        {cyclingConditions.conditions}
                      </Text>
                      <Text style={[styles.assessmentDescription, { color: theme.colors.textSecondary }]}>
                        Warunki jazdy rowerowej
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Recommendations */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Rekomendacje
                </Text>
                <View style={styles.recommendationsList}>
                  <View style={[styles.recommendationItem, { backgroundColor: theme.colors.card }]}>
                    <View style={[styles.recommendationIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Route size={16} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.recommendationText, { color: theme.colors.text }]}>
                      Typ trasy: Wszystkie
                    </Text>
                  </View>

                  <View style={[styles.recommendationItem, { backgroundColor: theme.colors.card }]}>
                    <View style={[styles.recommendationIcon, { backgroundColor: theme.colors.warning + '20' }]}>
                      <Shield size={16} color={theme.colors.warning} />
                    </View>
                    <Text style={[styles.recommendationText, { color: theme.colors.text }]}>
                      Ochrona: Kask i odblaski
                    </Text>
                  </View>

                  <View style={[styles.recommendationItem, { backgroundColor: theme.colors.card }]}>
                    <View style={[styles.recommendationIcon, { backgroundColor: theme.colors.info + '20' }]}>
                      <Clock size={16} color={theme.colors.info} />
                    </View>
                    <Text style={[styles.recommendationText, { color: theme.colors.text }]}>
                      Najlepszy czas: 7:00-10:00, 17:00-19:00
                    </Text>
                  </View>

                  <View style={[styles.recommendationItem, { backgroundColor: theme.colors.card }]}>
                    <View style={[styles.recommendationIcon, { backgroundColor: theme.colors.success + '20' }]}>
                      <Droplets size={16} color={theme.colors.success} />
                    </View>
                    <Text style={[styles.recommendationText, { color: theme.colors.text }]}>
                      Nawodnienie: Wymagane
                    </Text>
                  </View>
                </View>
              </View>

              {/* Wind Analysis */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Analiza wiatru
                </Text>
                <View style={[styles.windCard, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.windHeader}>
                    <Wind size={20} color={getStatusColor(windResistance.level)} />
                    <Text style={[styles.windTitle, { color: theme.colors.text }]}>
                      Opór wiatru: {windResistance.resistance}
                    </Text>
                  </View>
                  <Text style={[styles.windDescription, { color: theme.colors.textSecondary }]}>
                    {windResistance.level === 'excellent' ? 'Idealne warunki - minimalny opór wiatru' :
                     windResistance.level === 'good' ? 'Dobre warunki - lekki opór wiatru' :
                     windResistance.level === 'moderate' ? 'Umiarkowany opór - wymaga więcej wysiłku' :
                     'Wysoki opór - rozważ trasę z osłoną przed wiatrem'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '70%',
  },
  modalHeader: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Poppins_SemiBold',
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Poppins_Regular',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: 'Poppins_SemiBold',
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  conditionCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  conditionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  conditionValue: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Poppins_SemiBold',
  },
  conditionLabel: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Poppins_Regular',
  },
  assessmentCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assessmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  assessmentInfo: {
    flex: 1,
  },
  assessmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Poppins_SemiBold',
  },
  assessmentDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recommendationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  recommendationText: {
    fontSize: 16,
    fontFamily: 'Poppins_Medium',
  },
  windCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  windHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  windTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    fontFamily: 'Poppins_SemiBold',
  },
  windDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_Regular',
  },
});