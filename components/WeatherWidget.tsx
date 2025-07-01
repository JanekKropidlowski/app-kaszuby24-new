import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, CloudDrizzle } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useRouter } from 'expo-router';

interface WeatherData {
  temperature: number;
  weatherCode: number;
  location: string;
}

export const WeatherWidget = () => {
  const { theme } = useThemeStore();
  const router = useRouter();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeather();
    // Odświeżaj co 10 minut
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  const fetchWeather = async () => {
    try {
      // Domyślnie Gdańsk - później można dodać geolokalizację
      const lat = 54.3520;
      const lon = 18.6466;
      
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Europe/Warsaw`
      );
      
      if (response.ok) {
        const data = await response.json();
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
          location: 'Gdańsk'
        });
      }
    } catch (error) {
      console.log('Weather fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (code: number) => {
    const iconProps = { 
      size: 20, 
      color: theme.isDarkMode ? '#FFFFFF' : '#1E293B',
      strokeWidth: 1.5 
    };
    
    // Mapowanie kodów pogody Open-Meteo na ikony
    if (code === 0 || code === 1) return <Sun {...iconProps} />;
    if (code === 2 || code === 3) return <Cloud {...iconProps} />;
    if ([51, 53, 55, 61, 63, 65].includes(code)) return <CloudRain {...iconProps} />;
    if ([56, 57, 66, 67].includes(code)) return <CloudDrizzle {...iconProps} />;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow {...iconProps} />;
    if ([95, 96, 99].includes(code)) return <Wind {...iconProps} />;
    return <Cloud {...iconProps} />;
  };

  const handlePress = () => {
    // Nawigacja do dashboardu pogody
    router.push('/weather');
  };

  if (loading) {
    return (
      <View style={[styles.container, { 
        backgroundColor: theme.isDarkMode ? 'rgba(254, 204, 0, 0.15)' : 'rgba(254, 204, 0, 0.1)'
      }]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.container, { 
        backgroundColor: theme.isDarkMode ? 'rgba(254, 204, 0, 0.15)' : 'rgba(254, 204, 0, 0.1)'
      }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {weather && (
        <>
          <Text style={[styles.temperature, { 
            color: theme.isDarkMode ? '#FFFFFF' : '#1E293B',
            fontFamily: theme.fontFamily.bold 
          }]}>
            {weather.temperature}°
          </Text>
          {getWeatherIcon(weather.weatherCode)}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 7,
    minWidth: 70,
    justifyContent: 'center',
  },
  temperature: {
    fontSize: 17,
    fontWeight: '700',
  },
}); 