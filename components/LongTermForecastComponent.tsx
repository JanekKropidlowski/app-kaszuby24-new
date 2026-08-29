import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarDays,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Sun,
  Cloud,
  CloudSnow,
  Eye,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { WeatherIcons } from './WeatherIcons';

const { width } = Dimensions.get('window');

interface LongTermForecastProps {
  forecastData: any;
}

export const LongTermForecastComponent: React.FC<LongTermForecastProps> = ({
  forecastData,
}) => {
  const { theme } = useThemeStore();

  // Enhanced data validation
  if (!forecastData?.daily) {
    console.log('LongTermForecastComponent: No daily forecast data available');
    return (
      <View style={styles.container}>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Brak danych prognostycznych</Text>
          <Text style={styles.noDataSubtext}>Sprawdź połączenie z internetem</Text>
        </View>
      </View>
    );
  }

  const getWeatherTrend = (temps: number[]) => {
    if (!Array.isArray(temps) || temps.length === 0) {
      return { trend: 'stable', text: 'Stabilna', color: '#4ECDC4' };
    }
    const firstTemp = temps[0] || 0;
    const lastTemp = temps[temps.length - 1] || 0;
    const diff = lastTemp - firstTemp;
    
    if (Math.abs(diff) < 2) return { trend: 'stable', text: 'Stabilna', color: '#4ECDC4' };
    if (diff > 0) return { trend: 'rising', text: 'Rosnąca', color: '#FF6B6B' };
    return { trend: 'falling', text: 'Spadkowa', color: '#45B7D1' };
  };

  const getConditionSummary = (codes: number[]) => {
    if (!Array.isArray(codes)) {
      return { condition: 'sunny', text: 'Słonecznie', icon: Sun, color: '#FFD700' };
    }
    const sunny = codes.filter(c => c <= 1).length;
    const cloudy = codes.filter(c => c > 1 && c <= 3).length;
    const rainy = codes.filter(c => c >= 51 && c <= 67).length;
    const snowy = codes.filter(c => c >= 71 && c <= 77).length;
    
    if (rainy > cloudy && rainy > sunny) return { condition: 'rainy', text: 'Deszczowo', icon: CloudRain, color: '#4682B4' };
    if (snowy > 0) return { condition: 'snowy', text: 'Śnieżnie', icon: CloudSnow, color: '#87CEEB' };
    if (cloudy > sunny) return { condition: 'cloudy', text: 'Pochmurno', icon: Cloud, color: '#8B8B8B' };
    return { condition: 'sunny', text: 'Słonecznie', icon: Sun, color: '#FFD700' };
  };

  const getDayName = (dateStr: string, index: number) => {
    if (!dateStr) return 'Nieznany';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Nieznany';
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      if (index === 0) return 'Dzisiaj';
      if (index === 1) return 'Jutro';
      
      return date.toLocaleDateString('pl-PL', { weekday: 'long' }).charAt(0).toUpperCase() + 
             date.toLocaleDateString('pl-PL', { weekday: 'long' }).slice(1);
    } catch (error) {
      return 'Nieznany';
    }
  };

  // Bezpieczne pobieranie danych
  const daily = forecastData.daily || {};
  const extendedDays = Array.isArray(daily.time) ? daily.time.slice(0, 14) : [];
  const temps = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max.slice(0, 14) : [];
  const weatherCodes = Array.isArray(daily.weathercode) ? daily.weathercode.slice(0, 14) : [];
  
  // Debug: sprawdź ile dni jest dostępnych
  console.log('LongTermForecastComponent: Available days:', daily.time?.length || 0);
  console.log('LongTermForecastComponent: Extended days:', extendedDays.length);
  console.log('LongTermForecastComponent: Temperatures:', temps.length);
  
  const tempsTrend = getWeatherTrend(temps);
  const conditionSummary = getConditionSummary(weatherCodes);

  return (
    <View style={styles.container}>
      {/* Header z trendem */}
      <LinearGradient
        colors={[tempsTrend.color, tempsTrend.color + '80']}
        style={styles.trendHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.trendInfo}>
          <CalendarDays size={24} color="white" fill="white" />
          <View style={styles.trendText}>
            <Text style={styles.trendTitle}>Prognoza 14-dniowa</Text>
            <Text style={styles.trendSubtitle}>
              Tendencja temperatur: {tempsTrend.text}
            </Text>
          </View>
          {tempsTrend.trend === 'rising' ? (
            <TrendingUp size={20} color="white" />
          ) : tempsTrend.trend === 'falling' ? (
            <TrendingDown size={20} color="white" />
          ) : (
            <View style={styles.stableTrend} />
          )}
        </View>
        
        <View style={styles.summaryRow}>
          <conditionSummary.icon size={20} color="white" fill="white" />
          <Text style={styles.summaryText}>Dominuje: {conditionSummary.text}</Text>
        </View>
      </LinearGradient>

      {/* Prognoza 14-dniowa */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.forecastScroll}
        contentContainerStyle={styles.forecastScrollContent}
      >
        {extendedDays.map((day: string, index: number) => {
          const maxTemp = Math.round(daily.temperature_2m_max?.[index] || 0);
          const minTemp = Math.round(daily.temperature_2m_min?.[index] || 0);
          const rainProb = Math.round(daily.precipitation_probability_max?.[index] || 0);
          const weatherCode = daily.weathercode?.[index] || 1;
          const windSpeed = Math.round(daily.windspeed_10m_max?.[index] || 0);
          const uvIndex = Math.round(daily.uv_index_max?.[index] || 0);

          const isToday = index === 0;
          const isWeekend = [0, 6].includes(new Date(day || '').getDay());

          return (
            <TouchableOpacity 
              key={day || index} 
              style={[
                styles.dayCard, 
                isToday && styles.todayCard,
                isWeekend && styles.weekendCard
              ]}
            >
              <Text style={[styles.dayName, isToday && styles.todayText]}>
                {getDayName(day, index)}
              </Text>
              
              <Text style={styles.date}>
                {day ? new Date(day).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) : '--'}
              </Text>

              <View style={styles.iconContainer}>
                <WeatherIcons wmoCode={weatherCode} size={52} />
              </View>

              <View style={styles.tempContainer}>
                <Text style={[styles.tempMax, isToday && styles.todayTemp]}>
                  {maxTemp}°
                </Text>
                <Text style={styles.tempMin}>{minTemp}°</Text>
              </View>

              <View style={styles.detailsContainer}>
                {rainProb > 0 && (
                  <View style={styles.detailRow}>
                    <CloudRain size={38} color="#4682B4" fill="#4682B4" />
                    <Text style={styles.detailText}>{rainProb}%</Text>
                  </View>
                )}
                
                {windSpeed > 5 && (
                  <View style={styles.detailRow}>
                    <Wind size={38} color="#45B7D1" fill="#45B7D1" />
                    <Text style={styles.detailText}>{windSpeed}km/h</Text>
                  </View>
                )}
                
                {uvIndex > 3 && (
                  <View style={styles.detailRow}>
                    <Zap size={38} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.detailText}>UV{uvIndex}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Statystyki miesięczne */}
      <View style={styles.monthlyStats}>
        <Text style={styles.statsTitle}>Tendencje miesięczne</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Thermometer size={20} color="#FF6B6B" fill="#FF6B6B" />
            <Text style={styles.statLabel}>Śr. maks.</Text>
            <Text style={styles.statValue}>
              {temps.length > 0 ? Math.round(temps.reduce((a: number, b: number) => a + b, 0) / temps.length) : 0}°C
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Droplets size={20} color="#4ECDC4" fill="#4ECDC4" />
            <Text style={styles.statLabel}>Opady</Text>
            <Text style={styles.statValue}>
              {Array.isArray(daily.precipitation_probability_max) && daily.precipitation_probability_max.length > 0 
                ? Math.round(daily.precipitation_probability_max.slice(0, 14).reduce((a: number, b: number) => a + b, 0) / 14)
                : 0}%
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Wind size={20} color="#45B7D1" fill="#45B7D1" />
            <Text style={styles.statLabel}>Wiatr</Text>
            <Text style={styles.statValue}>
              {Array.isArray(daily.windspeed_10m_max) && daily.windspeed_10m_max.length > 0
                ? Math.round(daily.windspeed_10m_max.slice(0, 14).reduce((a: number, b: number) => a + b, 0) / 14)
                : 0}km/h
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Zap size={20} color="#FFD700" fill="#FFD700" />
            <Text style={styles.statLabel}>UV maks.</Text>
            <Text style={styles.statValue}>
              {Array.isArray(daily.uv_index_max) && daily.uv_index_max.length > 0
                ? Math.max(...daily.uv_index_max.slice(0, 14))
                : 0}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  trendHeader: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  trendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendText: {
    flex: 1,
    marginLeft: 16,
  },
  trendTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_Bold',
    color: 'white',
    marginBottom: 4,
  },
  trendSubtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_Medium',
    color: 'rgba(255,255,255,0.9)',
  },
  stableTrend: {
    width: 20,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 15,
    fontFamily: 'Poppins_Medium',
    color: 'white',
    marginLeft: 10,
  },
  forecastScroll: {
    marginBottom: 20,
  },
  forecastScrollContent: {
    paddingHorizontal: 16,
    paddingRight: 32,
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
    marginRight: 16,
    minWidth: 140,
    width: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  todayCard: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
    shadowColor: '#4ECDC4',
    shadowOpacity: 0.3,
  },
  weekendCard: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFD700',
  },
  dayName: {
    fontSize: 13,
    fontFamily: 'Poppins_SemiBold',
    color: '#333',
    marginBottom: 6,
    textAlign: 'center',
  },
  todayText: {
    color: 'white',
    fontFamily: 'Poppins_Bold',
  },
  date: {
    fontSize: 11,
    fontFamily: 'Poppins_Medium',
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: 12,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tempContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  tempMax: {
    fontSize: 18,
    fontFamily: 'Poppins_Bold',
    color: '#333',
    marginBottom: 2,
  },
  todayTemp: {
    color: 'white',
  },
  tempMin: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
    color: '#666',
  },
  detailsContainer: {
    gap: 6,
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    fontFamily: 'Poppins_Medium',
    color: '#666',
  },
  monthlyStats: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_Bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
    color: '#666',
    marginTop: 6,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Poppins_Bold',
    color: '#333',
    textAlign: 'center',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noDataText: {
    fontSize: 16,
    fontFamily: 'Poppins_SemiBold',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    color: '#94A3B8',
    textAlign: 'center',
  },
});
