import React from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';
import { X, Calendar, Thermometer, Droplets, Wind, SunMedium, TrendingUp, MapPin, Info } from 'lucide-react-native';
import { WeatherIcon } from '@/components/WeatherIcon';

interface WeeklyForecastDay {
  date: string;
  wmoCode: number;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
}

interface WeeklyForecastModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDay: WeeklyForecastDay | null;
  dayIndex: number;
}

export const WeeklyForecastModal: React.FC<WeeklyForecastModalProps> = ({
  visible,
  onClose,
  selectedDay,
  dayIndex,
}) => {
  const { theme } = useThemeStore();
  const { height: screenHeight } = Dimensions.get('window');

  // Debug logging
  console.log('WeeklyForecastModal render:', { visible, selectedDay, dayIndex });

  if (!visible || !selectedDay) {
    console.log('Modal not visible or no selected day');
    return null;
  }

  console.log('Modal data:', selectedDay);

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDayName = (dateString: string, index: number) => {
    if (index === 0) return 'Dzisiaj';
    if (index === 1) return 'Jutro';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { weekday: 'long' });
  };

  const getTemperatureColor = (temp: number, isMax: boolean) => {
    if (isMax) {
      if (temp >= 25) return '#ef4444';
      if (temp >= 15) return '#f59e0b';
      if (temp >= 5) return '#3b82f6';
      return '#06b6d4';
    } else {
      if (temp >= 20) return '#f97316';
      if (temp >= 10) return '#0ea5e9';
      if (temp >= 0) return '#0891b2';
      return '#0369a1';
    }
  };

  const getPrecipitationLevel = (precip: number) => {
    if (precip > 5) return { level: 'Wysokie', color: '#3b82f6', description: 'Możliwe opady', icon: '🌧️' };
    if (precip > 1) return { level: 'Umiarkowane', color: '#06b6d4', description: 'Lekkie opady', icon: '🌦️' };
    return { level: 'Niskie', color: '#10b981', description: 'Bez opadów', icon: '☀️' };
  };

  const getWeatherDescription = (wmoCode: number) => {
    // Basic weather descriptions based on WMO codes
    if (wmoCode === 0) return 'Bezchmurnie';
    if (wmoCode >= 1 && wmoCode <= 3) return 'Częściowo zachmurzone';
    if (wmoCode >= 4 && wmoCode <= 6) return 'Zachmurzone';
    if (wmoCode >= 7 && wmoCode <= 9) return 'Mgła';
    if (wmoCode >= 10 && wmoCode <= 12) return 'Opady deszczu';
    if (wmoCode >= 13 && wmoCode <= 15) return 'Opady śniegu';
    if (wmoCode >= 16 && wmoCode <= 19) return 'Burze';
    if (wmoCode >= 20 && wmoCode <= 22) return 'Opady gradu';
    if (wmoCode >= 23 && wmoCode <= 25) return 'Opady deszczu ze śniegiem';
    if (wmoCode >= 26 && wmoCode <= 29) return 'Opady śniegu z deszczem';
    if (wmoCode >= 30 && wmoCode <= 35) return 'Burze z opadami';
    if (wmoCode >= 36 && wmoCode <= 39) return 'Burze z gradem';
    if (wmoCode >= 40 && wmoCode <= 49) return 'Mgła z opadami';
    if (wmoCode >= 50 && wmoCode <= 59) return 'Opady mżawki';
    if (wmoCode >= 60 && wmoCode <= 69) return 'Opady deszczu';
    if (wmoCode >= 70 && wmoCode <= 79) return 'Opady śniegu';
    if (wmoCode >= 80 && wmoCode <= 89) return 'Przelotne opady';
    if (wmoCode >= 90 && wmoCode <= 99) return 'Burze z opadami';
    return 'Nieznane';
  };

  const getTemperatureAdvice = (maxTemp: number, minTemp: number) => {
    if (maxTemp >= 25) return 'Ubierz się lekko, weź wodę';
    if (maxTemp >= 15) return 'Lekkie ubranie, może być przyjemnie';
    if (maxTemp >= 5) return 'Średnie ubranie, może być chłodno';
    return 'Ciepłe ubranie, zimno';
  };

  const precipitationLevel = getPrecipitationLevel(selectedDay.precipitation);
  const dayName = formatDayName(selectedDay.date, dayIndex);
  const fullDate = formatFullDate(selectedDay.date);
  const weatherDescription = getWeatherDescription(selectedDay.wmoCode);
  const temperatureAdvice = getTemperatureAdvice(selectedDay.maxTemp, selectedDay.minTemp);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={[styles.modalContainer, { 
          backgroundColor: theme.colors.background || '#FFFFFF' 
        }]}>
          <View style={[styles.handleBar, { 
            backgroundColor: theme.colors.border || '#E2E8F0' 
          }]} />
          
          <Pressable 
            style={[styles.closeButton, { 
              backgroundColor: theme.colors.card || '#FFFFFF' 
            }]}
            onPress={onClose}
          >
            <X size={20} color={theme.colors.text || '#000000'} />
          </Pressable>

          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <LinearGradient
                colors={['#FECC0020', '#FECC0005']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.headerContent}>
                  <View style={styles.iconContainer}>
                    <WeatherIcon 
                      wmoCode={selectedDay.wmoCode} 
                      size={24}
                    />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={[styles.dayName, { 
                      color: theme.colors.text || '#000000' 
                    }]}>
                      {dayName}
                    </Text>
                    <Text style={[styles.fullDate, { 
                      color: theme.colors.textSecondary || '#666666' 
                    }]}>
                      {fullDate}
                    </Text>
                    <View style={[styles.weatherBadge, { 
                      backgroundColor: (theme.colors.primary || '#224A96') + '20' 
                    }]}>
                      <Text style={[styles.weatherText, { 
                        color: theme.colors.primary || '#224A96' 
                      }]}>
                        {weatherDescription}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Temperature Section */}
            <View style={styles.temperatureSection}>
              <View style={styles.temperatureHeader}>
                <Thermometer size={32} color={theme.colors.primary || '#224A96'} />
                <Text style={[styles.sectionTitle, { 
                  color: theme.colors.text || '#000000' 
                }]}>
                  Temperatura
                </Text>
              </View>
              
              <View style={styles.temperatureGrid}>
                <View style={[styles.tempCard, { 
                  backgroundColor: theme.colors.card || '#FFFFFF', 
                  borderColor: getTemperatureColor(selectedDay.maxTemp, true) + '20' 
                }]}>
                  <Text style={[styles.tempLabel, { 
                    color: theme.colors.textSecondary || '#666666' 
                  }]}>Maksymalna</Text>
                  <Text style={[styles.tempValue, { 
                    color: getTemperatureColor(selectedDay.maxTemp, true) 
                  }]}>
                    {Math.round(selectedDay.maxTemp)}°
                  </Text>
                  <TrendingUp size={24} color={getTemperatureColor(selectedDay.maxTemp, true)} />
                </View>
                
                <View style={[styles.tempCard, { 
                  backgroundColor: theme.colors.card || '#FFFFFF', 
                  borderColor: getTemperatureColor(selectedDay.minTemp, false) + '20' 
                }]}>
                  <Text style={[styles.tempLabel, { 
                    color: theme.colors.textSecondary || '#666666' 
                  }]}>Minimalna</Text>
                  <Text style={[styles.tempValue, { 
                    color: getTemperatureColor(selectedDay.minTemp, false) 
                  }]}>
                    {Math.round(selectedDay.minTemp)}°
                  </Text>
                  <TrendingUp size={24} color={getTemperatureColor(selectedDay.minTemp, false)} style={{ transform: [{ rotate: '180deg' }] }} />
                </View>
              </View>
              
              {/* Temperature Advice */}
              <View style={[styles.adviceCard, { 
                backgroundColor: theme.colors.card || '#FFFFFF' 
              }]}>
                <Info size={20} color={theme.colors.primary || '#224A96'} />
                <Text style={[styles.adviceText, { 
                  color: theme.colors.text || '#000000' 
                }]}>
                  {temperatureAdvice}
                </Text>
              </View>
            </View>

            {/* Precipitation Section */}
            <View style={styles.precipitationSection}>
              <View style={styles.precipitationHeader}>
                <Droplets size={32} color={theme.colors.primary || '#224A96'} />
                <Text style={[styles.sectionTitle, { 
                  color: theme.colors.text || '#000000' 
                }]}>
                  Opady
                </Text>
              </View>
              
              <View style={[styles.precipitationCard, { 
                backgroundColor: theme.colors.card || '#FFFFFF', 
                borderColor: precipitationLevel.color + '20' 
              }]}>
                <View style={styles.precipitationInfo}>
                  <Text style={[styles.precipitationValue, { 
                    color: precipitationLevel.color 
                  }]}>
                    {Math.round(selectedDay.precipitation)} mm
                  </Text>
                  <Text style={[styles.precipitationUnit, { 
                    color: theme.colors.textSecondary || '#666666' 
                  }]}>
                    opadów
                  </Text>
                </View>
                
                <View style={styles.precipitationDetails}>
                  <View style={[styles.levelBadge, { 
                    backgroundColor: precipitationLevel.color + '20' 
                  }]}>
                    <Text style={[styles.levelText, { 
                      color: precipitationLevel.color 
                    }]}>
                      {precipitationLevel.level}
                    </Text>
                  </View>
                  <Text style={[styles.descriptionText, { 
                    color: theme.colors.textSecondary || '#666666' 
                  }]}>
                    {precipitationLevel.description}
                  </Text>
                </View>
              </View>
            </View>

            {/* Weather Details */}
            <View style={styles.weatherDetailsSection}>
              <View style={styles.weatherDetailsHeader}>
                <SunMedium size={24} color={theme.colors.primary} />
                <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                  Szczegóły pogodowe
                </Text>
              </View>
              
              <View style={[styles.detailsCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Kod WMO:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{selectedDay.wmoCode}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Różnica temp:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {Math.round(selectedDay.maxTemp - selectedDay.minTemp)}°
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Średnia temp:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {Math.round((selectedDay.maxTemp + selectedDay.minTemp) / 2)}°
                  </Text>
                </View>
              </View>
            </View>

            {/* Additional Info */}
            <View style={styles.additionalInfo}>
              <View style={styles.infoHeader}>
                <Calendar size={24} color={theme.colors.textSecondary} />
                <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                  Informacje dodatkowe
                </Text>
              </View>
              
              <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  Prognoza pogody na podstawie danych meteorologicznych. Temperatury maksymalne i minimalne 
                  mogą się różnić w zależności od lokalizacji i pory dnia. Opady są prognozowane na cały dzień.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
    minHeight: '60%',
    zIndex: 1000,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  headerSection: {
    width: '100%',
    marginBottom: 24,
  },
  headerGradient: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FECC0020',
  },
  dayName: {
    fontSize: 24,
    fontFamily: 'Poppins_SemiBold',
    marginBottom: 4,
  },
  fullDate: {
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    marginBottom: 8,
    opacity: 0.8,
  },
  weatherBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  weatherText: {
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
    textAlign: 'center',
  },
  temperatureSection: {
    marginBottom: 24,
  },
  temperatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_SemiBold',
  },
  temperatureGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  tempCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 120,
    justifyContent: 'center',
  },
  tempLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  tempValue: {
    fontSize: 32,
    fontFamily: 'Poppins_SemiBold',
    marginBottom: 8,
  },
  adviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  adviceText: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
    flex: 1,
  },
  precipitationSection: {
    marginBottom: 24,
  },
  precipitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  precipitationCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  precipitationInfo: {
    alignItems: 'center',
  },
  precipitationValue: {
    fontSize: 36,
    fontFamily: 'Poppins_SemiBold',
    marginBottom: 4,
  },
  precipitationUnit: {
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    opacity: 0.8,
  },
  precipitationDetails: {
    alignItems: 'flex-end',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 12,
    fontFamily: 'Poppins_Regular',
    textAlign: 'right',
    opacity: 0.8,
  },
  weatherDetailsSection: {
    marginBottom: 24,
  },
  weatherDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  detailsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins_SemiBold',
  },
  additionalInfo: {
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_Medium',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    lineHeight: 20,
    opacity: 0.8,
    textAlign: 'center',
  },
});
