import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { WeatherIcons } from './WeatherIcons';
import { CalendarDays, Thermometer, Droplets, Wind, Eye, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface FourteenDayForecastProps {
  forecastData: any;
  onDayPress?: (dayData: any, index: number) => void;
}

export const FourteenDayForecast: React.FC<FourteenDayForecastProps> = ({
  forecastData,
  onDayPress
}) => {
  const { theme } = useThemeStore();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  if (!forecastData?.daily) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme?.colors?.textSecondary || '#64748B' }]}>
          Brak danych prognostycznych
        </Text>
      </View>
    );
  }

  const daily = forecastData.daily;
  const days = daily.time?.slice(0, 14) || [];
  const maxTemps = daily.temperature_2m_max?.slice(0, 14) || [];
  const minTemps = daily.temperature_2m_min?.slice(0, 14) || [];
  const precipProbs = daily.precipitation_probability_max?.slice(0, 14) || [];
  const precipSums = daily.precipitation_sum?.slice(0, 14) || [];
  const windSpeeds = daily.windspeed_10m_max?.slice(0, 14) || [];
  const weatherCodes = daily.weathercode?.slice(0, 14) || [];
  const uvIndexes = daily.uv_index_max?.slice(0, 14) || [];

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
      
      return date.toLocaleDateString('pl-PL', { weekday: 'short' });
    } catch (error) {
      return 'Nieznany';
    }
  };

  const getDateString = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      
      return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    } catch (error) {
      return '';
    }
  };

  const getTemperatureTrend = (index: number) => {
    if (index === 0) return 'stable';
    const currentTemp = maxTemps[index];
    const prevTemp = maxTemps[index - 1];
    
    if (currentTemp > prevTemp + 2) return 'up';
    if (currentTemp < prevTemp - 2) return 'down';
    return 'stable';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={12} color={theme?.colors?.success || '#10B981'} />;
      case 'down':
        return <TrendingDown size={12} color={theme?.colors?.error || '#EF4444'} />;
      default:
        return <Minus size={12} color={theme?.colors?.textSecondary || '#64748B'} />;
    }
  };

  const getPrecipitationColor = (prob: number) => {
    if (prob < 20) return theme?.colors?.success || '#10B981';
    if (prob < 50) return theme?.colors?.warning || '#F59E0B';
    return theme?.colors?.error || '#EF4444';
  };

  const getWindColor = (speed: number) => {
    if (speed < 15) return theme?.colors?.success || '#10B981';
    if (speed < 25) return theme?.colors?.warning || '#F59E0B';
    return theme?.colors?.error || '#EF4444';
  };

  const handleDayPress = (index: number) => {
    setSelectedDay(selectedDay === index ? null : index);
    if (onDayPress) {
      const dayData = {
        date: days[index],
        maxTemp: maxTemps[index],
        minTemp: minTemps[index],
        precipProb: precipProbs[index],
        precipSum: precipSums[index],
        windSpeed: windSpeeds[index],
        weatherCode: weatherCodes[index],
        uvIndex: uvIndexes[index]
      };
      onDayPress(dayData, index);
    }
  };

  const renderDayCard = (index: number) => {
    const isSelected = selectedDay === index;
    const dayName = getDayName(days[index], index);
    const dateString = getDateString(days[index]);
    const maxTemp = maxTemps[index];
    const minTemp = minTemps[index];
    const precipProb = precipProbs[index];
    const precipSum = precipSums[index];
    const windSpeed = windSpeeds[index];
    const weatherCode = weatherCodes[index];
    const uvIndex = uvIndexes[index];
    const trend = getTemperatureTrend(index);

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayCard,
          {
            backgroundColor: isSelected ? theme?.colors?.primary + '15' : theme?.colors?.card,
            borderColor: isSelected ? theme?.colors?.primary : theme?.colors?.border,
            shadowColor: isSelected ? theme?.colors?.primary : '#000',
            shadowOpacity: isSelected ? 0.15 : 0.08,
          }
        ]}
        onPress={() => handleDayPress(index)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.dayHeader}>
          <Text style={[
            styles.dayName,
            { 
              color: isSelected ? theme?.colors?.primary : theme?.colors?.text,
              fontFamily: isSelected ? 'Poppins_Bold' : 'Poppins_SemiBold'
            }
          ]}>
            {dayName}
          </Text>
          <Text style={[
            styles.dateString,
            { color: theme?.colors?.textSecondary }
          ]}>
            {dateString}
          </Text>
        </View>

        {/* Weather Icon */}
                    <View style={styles.weatherIconContainer}>
              <WeatherIcons wmoCode={weatherCode} size={32} />
            </View>

        {/* Temperature */}
        <View style={styles.temperatureContainer}>
          <Text style={[
            styles.maxTemp,
            { color: theme?.colors?.text }
          ]}>
            {Math.round(maxTemp)}°
          </Text>
          <Text style={[
            styles.minTemp,
            { color: theme?.colors?.textSecondary }
          ]}>
            {Math.round(minTemp)}°
          </Text>
        </View>

        {/* Trend Indicator */}
        <View style={styles.trendContainer}>
          {getTrendIcon(trend)}
        </View>

        {/* Precipitation */}
        <View style={styles.precipitationContainer}>
          <Droplets size={12} color={getPrecipitationColor(precipProb)} />
          <Text style={[
            styles.precipitationText,
            { color: getPrecipitationColor(precipProb) }
          ]}>
            {Math.round(precipProb)}%
          </Text>
        </View>

        {/* Wind */}
        <View style={styles.windContainer}>
          <Wind size={12} color={getWindColor(windSpeed)} />
          <Text style={[
            styles.windText,
            { color: getWindColor(windSpeed) }
          ]}>
            {Math.round(windSpeed)}
          </Text>
        </View>

        {/* UV Index */}
        <View style={styles.uvContainer}>
          <Text style={[
            styles.uvText,
            { color: theme?.colors?.textSecondary }
          ]}>
            UV {Math.round(uvIndex)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailedView = () => {
    if (selectedDay === null) return null;

    const dayData = {
      date: days[selectedDay],
      maxTemp: maxTemps[selectedDay],
      minTemp: minTemps[selectedDay],
      precipProb: precipProbs[selectedDay],
      precipSum: precipSums[selectedDay],
      windSpeed: windSpeeds[selectedDay],
      weatherCode: weatherCodes[selectedDay],
      uvIndex: uvIndexes[selectedDay]
    };

    return (
      <View style={[styles.detailedView, { backgroundColor: theme?.colors?.card }]}>
        <View style={styles.detailedHeader}>
          <Text style={[styles.detailedTitle, { color: theme?.colors?.text }]}>
            {getDayName(days[selectedDay], selectedDay)} - {getDateString(days[selectedDay])}
          </Text>
          <TouchableOpacity onPress={() => setSelectedDay(null)}>
            <Text style={[styles.closeButton, { color: theme?.colors?.primary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailedContent}>
          <View style={styles.detailedRow}>
            <View style={styles.detailedItem}>
              <Thermometer size={20} color={theme?.colors?.primary} />
              <Text style={[styles.detailedLabel, { color: theme?.colors?.textSecondary }]}>
                Temperatura
              </Text>
              <Text style={[styles.detailedValue, { color: theme?.colors?.text }]}>
                {Math.round(dayData.maxTemp)}° / {Math.round(dayData.minTemp)}°
              </Text>
            </View>

            <View style={styles.detailedItem}>
              <Droplets size={20} color={getPrecipitationColor(dayData.precipProb)} />
              <Text style={[styles.detailedLabel, { color: theme?.colors?.textSecondary }]}>
                Opady
              </Text>
              <Text style={[styles.detailedValue, { color: theme?.colors?.text }]}>
                {Math.round(dayData.precipProb)}% ({dayData.precipSum?.toFixed(1) || 0}mm)
              </Text>
            </View>
          </View>

          <View style={styles.detailedRow}>
            <View style={styles.detailedItem}>
              <Wind size={20} color={getWindColor(dayData.windSpeed)} />
              <Text style={[styles.detailedLabel, { color: theme?.colors?.textSecondary }]}>
                Wiatr
              </Text>
              <Text style={[styles.detailedValue, { color: theme?.colors?.text }]}>
                {Math.round(dayData.windSpeed)} km/h
              </Text>
            </View>

            <View style={styles.detailedItem}>
              <Eye size={20} color={theme?.colors?.info} />
              <Text style={[styles.detailedLabel, { color: theme?.colors?.textSecondary }]}>
                UV
              </Text>
              <Text style={[styles.detailedValue, { color: theme?.colors?.text }]}>
                {Math.round(dayData.uvIndex)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CalendarDays size={24} color={theme?.colors?.primary} />
        <Text style={[styles.title, { color: theme?.colors?.text }]}>
          Prognoza 14-dniowa
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((_: any, index: number) => renderDayCard(index))}
      </ScrollView>

      {renderDetailedView()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_SemiBold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dayCard: {
    width: 80,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  dayHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 14,
    fontFamily: 'Poppins_SemiBold',
    marginBottom: 2,
  },
  dateString: {
    fontSize: 11,
    fontFamily: 'Poppins_Regular',
  },
  weatherIconContainer: {
    marginBottom: 8,
  },
  temperatureContainer: {
    alignItems: 'center',
    marginBottom: 6,
  },
  maxTemp: {
    fontSize: 16,
    fontFamily: 'Poppins_Bold',
    marginBottom: 2,
  },
  minTemp: {
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
  },
  trendContainer: {
    marginBottom: 6,
  },
  precipitationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  precipitationText: {
    fontSize: 10,
    fontFamily: 'Poppins_Medium',
  },
  windContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  windText: {
    fontSize: 10,
    fontFamily: 'Poppins_Medium',
  },
  uvContainer: {
    marginTop: 2,
  },
  uvText: {
    fontSize: 9,
    fontFamily: 'Poppins_Regular',
  },
  detailedView: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailedTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_SemiBold',
  },
  closeButton: {
    fontSize: 20,
    fontFamily: 'Poppins_Bold',
    padding: 4,
  },
  detailedContent: {
    gap: 16,
  },
  detailedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailedItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailedLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  detailedValue: {
    fontSize: 14,
    fontFamily: 'Poppins_SemiBold',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Poppins_Medium',
    textAlign: 'center',
  },
});

export default FourteenDayForecast;
