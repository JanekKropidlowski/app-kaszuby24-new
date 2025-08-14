import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Sun, Moon, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudDrizzle } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useWeatherConfigStore } from '@/store/weatherConfigStore';

interface WeatherIconProps {
  wmoCode: number;
  size?: number;
  isDay?: boolean;
  style?: any;
}

// WMO Weather interpretation codes mapping to weather icon components
const getWeatherIconComponent = (wmoCode: number, isDay: boolean = true) => {
  // Clear sky
  if (wmoCode <= 1) return isDay ? Sun : Moon;
  
  // Partly cloudy
  if (wmoCode === 2) return Cloud;
  
  // Cloudy
  if (wmoCode === 3) return Cloud;
  
  // Overcast
  if (wmoCode === 4) return Cloud;
  
  // Fog
  if (wmoCode >= 45 && wmoCode <= 48) return CloudFog;
  
  // Drizzle
  if (wmoCode >= 51 && wmoCode <= 57) return CloudDrizzle;
  
  // Rain
  if (wmoCode >= 61 && wmoCode <= 67) return CloudRain;
  
  // Snow
  if (wmoCode >= 71 && wmoCode <= 77) return CloudSnow;
  
  // Showers
  if (wmoCode >= 80 && wmoCode <= 82) return CloudRain;
  if (wmoCode >= 85 && wmoCode <= 86) return CloudSnow;
  
  // Thunderstorm
  if (wmoCode >= 95 && wmoCode <= 99) return CloudLightning;
  
  // Default
  return isDay ? Sun : Moon;
};

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  wmoCode,
  size = 64,
  isDay = true,
  style,
}) => {
  const { theme, isDarkMode } = useThemeStore();
  const { config } = useWeatherConfigStore();
  const [useFallback, setUseFallback] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Auto-detect day/night based on current time
  const currentHour = new Date().getHours();
  const isCurrentlyDay = currentHour >= 6 && currentHour <= 18;
  const effectiveIsDay = isDay !== undefined ? isDay : isCurrentlyDay;

  useEffect(() => {
    // Entrance animation
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Subtle scale animation
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    // Rotation animation for sun icons
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 40000,
        useNativeDriver: true,
      })
    );

    scaleAnimation.start();
    
    // Only rotate sun icons
    if (wmoCode <= 1) {
      rotateAnimation.start();
    }

    return () => {
      scaleAnimation.stop();
      rotateAnimation.stop();
    };
  }, [wmoCode]);

  const IconComponent = getWeatherIconComponent(wmoCode, effectiveIsDay);
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Define colors based on weather conditions and theme
  const getIconColor = () => {
    if (isDarkMode) {
      if (wmoCode <= 1) return '#FCD34D'; // Sun/Moon - yellow
      if (wmoCode >= 45 && wmoCode <= 48) return '#9CA3AF'; // Fog - gray
      if (wmoCode >= 51 && wmoCode <= 57) return '#60A5FA'; // Drizzle - blue
      if (wmoCode >= 61 && wmoCode <= 67) return '#3B82F6'; // Rain - blue
      if (wmoCode >= 71 && wmoCode <= 77) return '#E5E7EB'; // Snow - light gray
      if (wmoCode >= 80 && wmoCode <= 82) return '#3B82F6'; // Showers - blue
      if (wmoCode >= 85 && wmoCode <= 86) return '#E5E7EB'; // Snow showers - light gray
      if (wmoCode >= 95 && wmoCode <= 99) return '#F59E0B'; // Thunderstorm - amber
      return '#60A5FA'; // Default - blue
    } else {
      if (wmoCode <= 1) return '#FDB813'; // Sun/Moon - yellow
      if (wmoCode >= 45 && wmoCode <= 48) return '#8B8B8B'; // Fog - gray
      if (wmoCode >= 51 && wmoCode <= 57) return '#87CEEB'; // Drizzle - light blue
      if (wmoCode >= 61 && wmoCode <= 67) return '#4682B4'; // Rain - blue
      if (wmoCode >= 71 && wmoCode <= 77) return '#FFFFFF'; // Snow - white
      if (wmoCode >= 80 && wmoCode <= 82) return '#4682B4'; // Showers - blue
      if (wmoCode >= 85 && wmoCode <= 86) return '#FFFFFF'; // Snow showers - white
      if (wmoCode >= 95 && wmoCode <= 99) return '#FFD700'; // Thunderstorm - gold
      return '#87CEEB'; // Default - light blue
    }
  };

  const getMeteoconsName = (code: number, day: boolean) => {
    // Clear sky
    if (code <= 1) return day ? 'clear-day' : 'clear-night';
    
    // Partly cloudy
    if (code === 2) return day ? 'partly-cloudy-day' : 'partly-cloudy-night';
    
    // Cloudy
    if (code === 3) return 'cloudy';
    
    // Overcast
    if (code === 4) return 'overcast';
    
    // Fog
    if (code >= 45 && code <= 48) return day ? 'fog-day' : 'fog-night';
    
    // Drizzle
    if (code >= 51 && code <= 57) return day ? 'partly-cloudy-day-drizzle' : 'partly-cloudy-night-drizzle';
    
    // Rain
    if (code >= 61 && code <= 67) return day ? 'partly-cloudy-day-rain' : 'partly-cloudy-night-rain';
    
    // Snow
    if (code >= 71 && code <= 77) return day ? 'partly-cloudy-day-snow' : 'partly-cloudy-night-snow';
    
    // Showers
    if (code >= 80 && code <= 82) return day ? 'partly-cloudy-day-rain' : 'partly-cloudy-night-rain';
    if (code >= 85 && code <= 86) return day ? 'partly-cloudy-day-snow' : 'partly-cloudy-night-snow';
    
    // Thunderstorm
    if (code >= 95 && code <= 99) return day ? 'thunderstorms-day' : 'thunderstorms-night';
    
    // Default
    return day ? 'clear-day' : 'clear-night';
  };

  // FORCE FILL VARIANT - always use filled icons
  const iconVariant = 'fill';
  const iconName = getMeteoconsName(wmoCode, effectiveIsDay);
  const meteoconsUri = `https://basmilius.github.io/weather-icons/production/${iconVariant}/all/${iconName}.svg`;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { rotate: wmoCode <= 1 ? rotateInterpolate : '0deg' }],
        },
        style,
      ]}
    >
      {!useFallback ? (
        <SvgUri
          width={size}
          height={size}
          uri={meteoconsUri}
          onError={() => setUseFallback(true)}
        />
      ) : (
        <IconComponent size={size} color={getIconColor()} fill={getIconColor()} strokeWidth={isDarkMode ? 1.5 : 2} />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
