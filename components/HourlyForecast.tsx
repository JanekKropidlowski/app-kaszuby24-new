import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { WeatherIcons } from '@/components/WeatherIcons';
import { WeatherDetailModal } from '@/components/WeatherDetailModal';
import { 
  Clock,
  Thermometer,
  Droplets,
  Wind,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle
} from 'lucide-react-native';

interface HourlyForecastProps {
  data: Array<{
    time: string;
    temperature: number;
    wmoCode: number;
    precipitation: number;
    windSpeed: number;
    humidity?: number;
  }>;
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ data }) => {
  const { theme } = useThemeStore();
  const [selectedHour, setSelectedHour] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('pl-PL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getCurrentHourIndex = () => {
    const now = new Date();
    const currentHour = now.getHours();
    return data.findIndex(hour => {
      const hourDate = new Date(hour.time);
      return hourDate.getHours() === currentHour;
    });
  };

  const currentHourIndex = getCurrentHourIndex();
  const displayData = data.slice(0, 24);

  const handleHourPress = (hour: any) => {
    setSelectedHour(hour);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedHour(null);
  };

  return (
    <View style={[styles.container, { marginHorizontal: 16 }] }>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {displayData.map((hour, index) => {
          const isCurrentHour = index === currentHourIndex;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.hourCard, 
                { 
                  borderColor: isCurrentHour ? theme.colors.primary : theme.colors.border,
                  backgroundColor: isCurrentHour ? theme.colors.primary + '15' : theme.colors.card,
                  shadowColor: isCurrentHour ? theme.colors.primary : '#000',
                  shadowOpacity: isCurrentHour ? 0.15 : 0.08,
                }
              ]}
              onPress={() => handleHourPress(hour)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.time, 
                { 
                  color: isCurrentHour ? theme.colors.primary : theme.colors.textSecondary,
                  fontFamily: isCurrentHour ? 'Poppins_Bold' : 'Poppins_SemiBold'
                }
              ]}>
                {formatTime(hour.time)}
              </Text>
              
              <View style={[styles.iconContainer, isCurrentHour && styles.currentHourIconContainer]}>
                <WeatherIcons wmoCode={hour.wmoCode} size={36} />
              </View>
              
              <Text style={[
                styles.temperature, 
                { 
                  color: theme.colors.text,
                  fontFamily: isCurrentHour ? 'Poppins_Bold' : 'Poppins_SemiBold'
                }
              ]}>
                {Math.round(hour.temperature)}°
              </Text>
              
              <View style={styles.metaContainer}>
                {hour.precipitation > 0 && (
                  <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                    {Math.round(hour.precipitation)} mm/h
                  </Text>
                )}
                <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                  {Math.round(hour.windSpeed)} km/h
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedHour && (
        <WeatherDetailModal
          visible={modalVisible}
          onClose={closeModal}
          weatherData={{
            temperatura: selectedHour.temperature.toString(),
            predkosc_wiatru: selectedHour.windSpeed.toString(),
            wilgotnosc_wzgledna: selectedHour.humidity?.toString() || '0',
            suma_opadu: selectedHour.precipitation.toString(),
            wmo_code: selectedHour.wmoCode.toString(),
            data_pomiaru: new Date(selectedHour.time).toLocaleDateString('pl-PL'),
            godzina_pomiaru: new Date(selectedHour.time).getHours().toString()
          }}
          type="forecast"
          location="Prognoza godzinowa"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  hourCard: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 90,
    height: 140,
    borderWidth: 1.5,
  },
  time: {
    fontSize: 12,
    fontFamily: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
    marginBottom: 12,
    textAlign: 'center',
    opacity: 0.9,
  },
  iconContainer: {
    borderRadius: 999,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currentHourIconContainer: {
    shadowColor: 'transparent', // No shadow for the current hour icon
  },
  temperature: {
    fontSize: 18,
    fontFamily: Platform.select({
      default: 'Poppins_Bold',
      android: 'Poppins_Bold',
    }) || 'Poppins_Bold',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  metaContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 4,
    paddingHorizontal: 4,
    minHeight: 40,
  },
  meta: {
    fontSize: 10,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 14,
  },
});

