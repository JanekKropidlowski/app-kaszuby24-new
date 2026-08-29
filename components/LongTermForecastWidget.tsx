import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { 
  Calendar, 
  Thermometer, 
  Droplets, 
  Wind, 
  ChevronRight,
  ChevronLeft,
  Sun
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WeatherIcons } from './WeatherIcons';

interface LongTermForecastWidgetProps {
  forecastData: any;
  location?: string;
  onPress?: () => void;
}

export const LongTermForecastWidget = ({ 
  forecastData, 
  location = 'Nieznana lokalizacja',
  onPress 
}: LongTermForecastWidgetProps) => {
  const { theme } = useThemeStore();
  const styles = getStyles(theme);
  const [currentWeek, setCurrentWeek] = useState(0);

  if (!forecastData || !forecastData.daily) return null;

  const dailyData = forecastData.daily;
  const weeks = [];
  
  // Group daily data into weeks
  for (let i = 0; i < dailyData.time.length; i += 7) {
    weeks.push(dailyData.time.slice(i, i + 7));
  }

  const currentWeekData = weeks[currentWeek] || [];
  const maxWeeks = weeks.length;

  const getWeatherIcon = (weatherCode: number) => {
    return (
      <WeatherIcons 
        wmoCode={weatherCode} 
        size={28} 
        animated={false}
      />
    );
  };

  const getWeatherDescription = (weatherCode: number) => {
    if (weatherCode <= 1) return 'Słonecznie';
    if (weatherCode === 2) return 'Częściowo pochmurno';
    if (weatherCode === 3) return 'Pochmurno';
    if (weatherCode >= 45 && weatherCode <= 48) return 'Mgliście';
    if (weatherCode >= 51 && weatherCode <= 55) return 'Mżawka';
    if (weatherCode >= 56 && weatherCode <= 67) return 'Deszcz';
    if (weatherCode >= 71 && weatherCode <= 77) return 'Śnieg';
    if (weatherCode >= 80 && weatherCode <= 82) return 'Przelotne opady';
    if (weatherCode >= 85 && weatherCode <= 86) return 'Opady śniegu';
    if (weatherCode >= 95 && weatherCode <= 99) return 'Burza';
    return 'Pochmurno';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Dzisiaj';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Jutro';
    } else {
      return date.toLocaleDateString('pl-PL', { 
        weekday: 'short', 
        day: 'numeric',
        month: 'short'
      });
    }
  };

  const getTemperatureColor = (temp: number) => {
    if (temp >= 25) return '#fef3c7'; // Hot - light yellow
    if (temp >= 15) return '#fde68a'; // Warm - yellow
    if (temp >= 5) return '#dbeafe'; // Cool - light blue
    return '#e0f2fe'; // Cold - lighter blue
  };

  const getPrecipitationColor = (precip: number) => {
    if (precip > 10) return '#3b82f6'; // High
    if (precip > 5) return '#06b6d4'; // Medium
    return '#10b981'; // Low
  };

  const getWindColor = (windSpeed: number) => {
    if (windSpeed > 15) return '#ef4444'; // Strong
    if (windSpeed > 10) return '#f59e0b'; // Moderate
    return '#10b981'; // Light
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={['#7c3aed', '#8b5cf6']} style={styles.gradient}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Calendar size={24} color="#fff" />
            <Text style={styles.title}>Prognoza 30-dniowa</Text>
          </View>
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>{location}</Text>
          </View>
        </View>

        {/* Week Navigation */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity 
            style={[styles.navButton, currentWeek === 0 && styles.navButtonDisabled]} 
            onPress={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
            disabled={currentWeek === 0}
          >
            <ChevronLeft size={16} color={currentWeek === 0 ? 'rgba(255, 255, 255, 0.5)' : '#fff'} />
          </TouchableOpacity>
          
          <Text style={styles.weekIndicator}>
            Tydzień {currentWeek + 1} z {maxWeeks}
          </Text>
          
          <TouchableOpacity 
            style={[styles.navButton, currentWeek === maxWeeks - 1 && styles.navButtonDisabled]} 
            onPress={() => setCurrentWeek(Math.min(maxWeeks - 1, currentWeek + 1))}
            disabled={currentWeek === maxWeeks - 1}
          >
            <ChevronRight size={16} color={currentWeek === maxWeeks - 1 ? 'rgba(255, 255, 255, 0.5)' : '#fff'} />
          </TouchableOpacity>
        </View>

        {/* Weekly Forecast */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weeklyScroll}>
          {currentWeekData.map((date: string, index: number) => {
            const dayIndex = currentWeek * 7 + index;
            const weatherCode = dailyData.weathercode?.[dayIndex] || 0;
            const maxTemp = dailyData.temperature_2m_max?.[dayIndex] || 0;
            const minTemp = dailyData.temperature_2m_min?.[dayIndex] || 0;
            const precipitation = dailyData.precipitation_sum?.[dayIndex] || 0;
            const windSpeed = dailyData.windspeed_10m_max?.[dayIndex] || 0;
            const uvIndex = dailyData.uv_index_max?.[dayIndex] || 0;

            const WeatherIcon = getWeatherIcon(weatherCode);
            const isToday = index === 0;

            return (
              <View key={date} style={[
                styles.dayCard,
                isToday && styles.todayCard
              ]}>
                <Text style={[styles.dayText, isToday && styles.todayText]}>
                  {formatDate(date)}
                </Text>
                
                            <View style={[styles.weatherIconContainer, isToday && styles.todayIconContainer]}>
              {getWeatherIcon(weatherCode)}
            </View>
                
                <Text style={[styles.weatherDescription, isToday && styles.todayDescription]}>
                  {getWeatherDescription(weatherCode)}
                </Text>
                
                <View style={styles.temperatureContainer}>
                  <Text style={[styles.maxTemp, { color: isToday ? "#fff" : getTemperatureColor(maxTemp) }]}>
                    {maxTemp.toFixed(0)}°
                  </Text>
                  <Text style={[styles.minTemp, { color: isToday ? "rgba(255,255,255,0.8)" : getTemperatureColor(minTemp) }]}>
                    {minTemp.toFixed(0)}°
                  </Text>
                </View>
                
                <View style={styles.metricsContainer}>
                  {precipitation > 0 && (
                    <View style={styles.metric}>
                      <Droplets size={12} color={getPrecipitationColor(precipitation)} />
                      <Text style={[styles.metricText, { color: getPrecipitationColor(precipitation) }]}>
                        {precipitation.toFixed(1)}mm
                      </Text>
                    </View>
                  )}
                  
                  {windSpeed > 5 && (
                    <View style={styles.metric}>
                      <Wind size={12} color={getWindColor(windSpeed)} />
                      <Text style={[styles.metricText, { color: getWindColor(windSpeed) }]}>
                        {windSpeed.toFixed(0)}m/s
                      </Text>
                    </View>
                  )}
                  
                  {uvIndex > 3 && (
                    <View style={styles.metric}>
                      <Sun size={12} color="#f59e0b" />
                      <Text style={[styles.metricText, { color: '#f59e0b' }]}>
                        UV {uvIndex.toFixed(0)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Monthly Summary */}
        <View style={styles.monthlySummary}>
          <Text style={styles.summaryTitle}>Podsumowanie miesiąca:</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Thermometer size={16} color="#fff" />
              <Text style={styles.summaryLabel}>Średnia temp.</Text>
              <Text style={styles.summaryValue}>
                {dailyData.temperature_2m_max && dailyData.temperature_2m_min ? 
                  ((dailyData.temperature_2m_max.reduce((a: number, b: number) => a + b, 0) / dailyData.temperature_2m_max.length + 
                    dailyData.temperature_2m_min.reduce((a: number, b: number) => a + b, 0) / dailyData.temperature_2m_min.length) / 2).toFixed(1) + '°C' : 
                  'N/A'
                }
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Droplets size={16} color="#fff" />
              <Text style={styles.summaryLabel}>Suma opadów</Text>
              <Text style={styles.summaryValue}>
                {dailyData.precipitation_sum ? 
                  dailyData.precipitation_sum.reduce((a: number, b: number) => a + b, 0).toFixed(0) + 'mm' : 
                  'N/A'
                }
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Wind size={16} color="#fff" />
              <Text style={styles.summaryLabel}>Średni wiatr</Text>
              <Text style={styles.summaryValue}>
                {dailyData.windspeed_10m_max ? 
                  (dailyData.windspeed_10m_max.reduce((a: number, b: number) => a + b, 0) / dailyData.windspeed_10m_max.length).toFixed(1) + 'm/s' : 
                  'N/A'
                }
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    borderRadius: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontFamily: 'Poppins_Bold',
    fontSize: 20,
    color: '#fff',
  },
  locationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  locationText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  weekIndicator: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: '#fff',
  },
  weeklyScroll: {
    marginBottom: 16,
  },
  dayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    minWidth: 90,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: 'rgba(255, 255, 255, 0.3)',
    shadowOpacity: 0.2,
  },
  dayText: {
    fontFamily: 'Poppins_Bold',
    fontSize: 12,
    color: '#fff',
    marginBottom: 8,
  },
  todayText: {
    color: '#fff',
    fontFamily: 'Poppins_Bold',
  },
  weatherIconContainer: {
    marginBottom: 8,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  todayIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: 6,
  },
  weatherDescription: {
    fontFamily: 'Poppins_Regular',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 8,
  },
  todayDescription: {
    color: '#fff',
    fontFamily: 'Poppins_Medium',
  },
  temperatureContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  maxTemp: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
  },
  minTemp: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    opacity: 0.7,
  },
  metricsContainer: {
    alignItems: 'center',
    gap: 4,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 10,
  },
  monthlySummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  summaryTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: 'Poppins_Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    marginBottom: 2,
  },
  summaryValue: {
    fontFamily: 'Poppins_Bold',
    fontSize: 14,
    color: '#fff',
  },
});
