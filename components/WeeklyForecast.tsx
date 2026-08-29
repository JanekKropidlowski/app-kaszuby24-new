import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { WeatherIcons } from '@/components/WeatherIcons';
import { WeeklyForecastModal } from '@/components/WeeklyForecastModal';
import { 
  Calendar,
  Thermometer,
  Droplets,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle
} from 'lucide-react-native';

interface WeeklyForecastProps {
  data: Array<{
    date: string;
    wmoCode: number;
    maxTemp: number;
    minTemp: number;
    precipitation: number;
  }>;
}

export const WeeklyForecast: React.FC<WeeklyForecastProps> = ({ data }) => {
  const { theme } = useThemeStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<typeof data[0] | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const handleDayPress = (day: typeof data[0], index: number) => {
    console.log('Day pressed:', { day, index });
    setSelectedDay(day);
    setSelectedDayIndex(index);
    setModalVisible(true);
    console.log('Modal state set to visible');
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedDay(null);
  };

  const formatDay = (dateString: string, index: number) => {
    if (index === 0) return 'Dzisiaj';
    if (index === 1) return 'Jutro';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { weekday: 'short' });
  };

  const getTemperatureColor = (temp: number, isMax: boolean) => {
    if (isMax) {
      if (temp >= 25) return '#ef4444'; // Hot
      if (temp >= 15) return '#f59e0b'; // Warm
      if (temp >= 5) return '#3b82f6'; // Cool
      return '#06b6d4'; // Cold
    } else {
      if (temp >= 20) return '#f97316'; // Warm
      if (temp >= 10) return '#0ea5e9'; // Cool
      if (temp >= 0) return '#0891b2'; // Cold
      return '#0369a1'; // Very cold
    }
  };

  const getPrecipitationColor = (precip: number) => {
    if (precip > 5) return '#3b82f6'; // High
    if (precip > 1) return '#06b6d4'; // Medium
    return '#10b981'; // Low
  };

  return (
    <View style={[styles.container, { marginHorizontal: 16 }]}>
      <View style={[styles.forecastContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        {data.slice(0, 7).map((day, index) => (
          <Pressable
            key={index}
            style={[
              styles.dayCard,
              { 
                backgroundColor: index === 0 ? '#FECC0015' : 'transparent',
                borderBottomColor: theme.colors.border,
                marginBottom: index === 6 ? 0 : 0,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }
            ]}
            onPress={() => handleDayPress(day, index)}
            android_ripple={{ color: theme.colors.primary + '20' }}
          >
            <View style={styles.daySection}>
              <Text style={[
                styles.day, 
                { 
                  color: index === 0 ? '#FECC00' : theme.colors.text,
                  fontFamily: index === 0 ? 'Poppins_SemiBold' : 'Poppins_Medium'
                }
              ]}>
                {formatDay(day.date, index)}
              </Text>
              {index === 0 && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>DZISIAJ</Text>
                </View>
              )}
            </View>
            
            <View style={[
              styles.iconContainer, 
              { 
                backgroundColor: index === 0 ? '#FECC00' : '#e5e7eb',
                borderColor: index === 0 ? '#FECC00' : 'transparent'
              }
            ]}>
              <WeatherIcons 
                wmoCode={day.wmoCode} 
                size={24}
              />
            </View>
            
            <View style={styles.temperatures}>
              <Text style={[styles.maxTemp, { color: getTemperatureColor(day.maxTemp, true) }]}>
                {Math.round(day.maxTemp)}°
              </Text>
              <Text style={[styles.minTemp, { color: getTemperatureColor(day.minTemp, false) }]}>
                {Math.round(day.minTemp)}°
              </Text>
            </View>
            
            <View style={styles.precipitationContainer}>
              {day.precipitation > 0.5 && (
                <View style={[
                  styles.precipitationBadge,
                  { backgroundColor: getPrecipitationColor(day.precipitation) + '20' }
                ]}>
                  <Droplets size={12} color={getPrecipitationColor(day.precipitation)} />
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </View>

      <WeeklyForecastModal
        visible={modalVisible}
        onClose={closeModal}
        selectedDay={selectedDay}
        dayIndex={selectedDayIndex}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  forecastContainer: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  daySection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: 70,
  },
  day: {
    fontSize: 15,
    textAlign: 'left',
    marginBottom: 2,
  },
  todayBadge: {
    backgroundColor: '#FECC00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins_Bold',
    color: '#000',
    textAlign: 'center',
  },
  iconContainer: {
    borderRadius: 25,
    padding: 10,
    marginHorizontal: 12,
    borderWidth: 2,
  },
  temperatures: {
    flexDirection: 'row',
    gap: 20,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maxTemp: {
    fontSize: 18,
    fontFamily: 'Poppins_SemiBold',
  },
  minTemp: {
    fontSize: 15,
    fontFamily: 'Poppins_Medium',
    opacity: 0.9,
  },
  precipitationContainer: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  precipitationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  precipitation: {
    fontSize: 11,
    fontFamily: 'Poppins_Medium',
    textAlign: 'center',
  },
});
