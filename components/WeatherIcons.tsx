import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { 
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  Wind,
  Zap,
  Eye,
  Droplets
} from 'lucide-react-native';

interface WeatherIconsProps {
  wmoCode: number;
  size?: number;
  isDay?: boolean;
  style?: any;
  animated?: boolean;
}

// Mapowanie WMO kodów do nazw ikon SVG
const getWeatherIconName = (wmoCode: number, isDay: boolean = true): string => {
  // Clear sky
  if (wmoCode <= 1) {
    return isDay ? 'clear-day' : 'clear-night';
  }
  
  // Partly cloudy
  if (wmoCode === 2) {
    return isDay ? 'cloudy-1-day' : 'cloudy-1-night';
  }
  
  // Cloudy
  if (wmoCode === 3) {
    return isDay ? 'cloudy-2-day' : 'cloudy-2-night';
  }
  
  // Overcast
  if (wmoCode === 4) {
    return 'cloudy-3-day';
  }
  
  // Fog and mist
  if (wmoCode >= 45 && wmoCode <= 48) {
    return isDay ? 'fog-day' : 'fog-night';
  }
  
  // Drizzle
  if (wmoCode >= 51 && wmoCode <= 57) {
    return 'rainy-1-day';
  }
  
  // Rain
  if (wmoCode >= 61 && wmoCode <= 67) {
    return 'rainy-2-day';
  }
  
  // Heavy rain
  if (wmoCode >= 80 && wmoCode <= 82) {
    return 'rainy-3-day';
  }
  
  // Snow
  if (wmoCode >= 71 && wmoCode <= 77) {
    return 'snowy-1-day';
  }
  
  // Heavy snow
  if (wmoCode >= 85 && wmoCode <= 86) {
    return 'snowy-2-day';
  }
  
  // Mixed precipitation
  if (wmoCode === 68 || wmoCode === 69) {
    return 'rain-and-snow-mix';
  }
  
  // Thunderstorm
  if (wmoCode >= 95 && wmoCode <= 99) {
    return 'thunderstorms';
  }
  
  // Default - clear day
  return isDay ? 'clear-day' : 'clear-night';
};

// Get icon color based on weather condition and theme
const getIconColor = (wmoCode: number, isDarkMode: boolean): string => {
  if (isDarkMode) {
    if (wmoCode <= 1) return '#FCD34D'; // Sun/Moon - bright yellow
    if (wmoCode >= 45 && wmoCode <= 48) return '#D1D5DB'; // Fog - light gray
    if (wmoCode >= 51 && wmoCode <= 57) return '#93C5FD'; // Drizzle - light blue
    if (wmoCode >= 61 && wmoCode <= 67) return '#60A5FA'; // Rain - blue
    if (wmoCode >= 71 && wmoCode <= 77) return '#F9FAFB'; // Snow - white
    if (wmoCode >= 80 && wmoCode <= 82) return '#60A5FA'; // Showers - blue
    if (wmoCode >= 85 && wmoCode <= 86) return '#F9FAFB'; // Snow showers - white
    if (wmoCode >= 95 && wmoCode <= 99) return '#FBBF24'; // Thunderstorm - amber
    return '#93C5FD'; // Default - light blue
  } else {
    if (wmoCode <= 1) return '#F59E0B'; // Sun/Moon - amber
    if (wmoCode >= 45 && wmoCode <= 48) return '#6B7280'; // Fog - gray
    if (wmoCode >= 51 && wmoCode <= 57) return '#0EA5E9'; // Drizzle - sky blue
    if (wmoCode >= 61 && wmoCode <= 67) return '#2563EB'; // Rain - blue
    if (wmoCode >= 71 && wmoCode <= 77) return '#374151'; // Snow - gray
    if (wmoCode >= 80 && wmoCode <= 82) return '#2563EB'; // Showers - blue
    if (wmoCode >= 85 && wmoCode <= 86) return '#374151'; // Snow showers - gray
    if (wmoCode >= 95 && wmoCode <= 99) return '#D97706'; // Thunderstorm - amber
    return '#0EA5E9'; // Default - sky blue
  }
};

// Renderowanie ikon pogodowych z pięknymi kolorami
const renderWeatherIcon = (iconName: string, size: number) => {
  const iconSize = size;
  
  switch (iconName) {
    case 'clear-day':
      return (
        <Sun size={iconSize} color="#FFD700" strokeWidth={2} />
      );
    
    case 'clear-night':
      return (
        <Moon size={iconSize} color="#4A5568" strokeWidth={2} />
      );
    
    case 'cloudy-1-day':
      return (
        <Cloud size={iconSize} color="#A0AEC0" strokeWidth={2} />
      );
    
    case 'cloudy-2-day':
      return (
        <CloudRain size={iconSize} color="#718096" strokeWidth={2} />
      );
    
    case 'cloudy-3-day':
      return (
        <CloudSnow size={iconSize} color="#4A5568" strokeWidth={2} />
      );
    
    case 'rainy-1-day':
      return (
        <CloudDrizzle size={iconSize} color="#4299E1" strokeWidth={2} />
      );
    
    case 'rainy-2-day':
      return (
        <CloudRain size={iconSize} color="#3182CE" strokeWidth={2} />
      );
    
    case 'rainy-3-day':
      return (
        <CloudRain size={iconSize} color="#2C5282" strokeWidth={2} />
      );
    
    case 'snowy-1-day':
      return (
        <CloudSnow size={iconSize} color="#90CDF4" strokeWidth={2} />
      );
    
    case 'snowy-2-day':
      return (
        <CloudSnow size={iconSize} color="#63B3ED" strokeWidth={2} />
      );
    
    case 'thunderstorms':
      return (
        <CloudLightning size={iconSize} color="#F6AD55" strokeWidth={2} />
      );
    
    case 'fog-day':
    case 'fog-night':
      return (
        <CloudFog size={iconSize} color="#CBD5E0" strokeWidth={2} />
      );
    
    case 'rain-and-snow-mix':
      return (
        <CloudRain size={iconSize} color="#9F7AEA" strokeWidth={2} />
      );
    
    default:
      return (
        <Sun size={iconSize} color="#FFD700" strokeWidth={2} />
      );
  }
};

export const WeatherIcons: React.FC<WeatherIconsProps> = ({
  wmoCode,
  size = 64,
  isDay = true,
  style,
  animated = false
}) => {
  const { theme } = useThemeStore();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      // Subtle scale animation
      Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
            duration: 2000,
          useNativeDriver: true,
        }),
      ])
      ).start();

      // Slow rotation for sun
    if (wmoCode <= 1) {
        Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
            duration: 9000,
          useNativeDriver: true,
        })
        ).start();
      }
    }
  }, [animated, wmoCode, scaleAnim, rotateAnim]);

  const effectiveIsDay = isDay;

  // Get icon name for SVG
  const iconName = getWeatherIconName(wmoCode, effectiveIsDay);

  if (!animated) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        {renderWeatherIcon(iconName, size)}
      </View>
    );
  }

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [
            { scale: scaleAnim },
            { rotate: wmoCode <= 1 ? rotateInterpolate : '0deg' }
          ]
        },
        style
      ]}
    >
      {renderWeatherIcon(iconName, size)}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Alias for backward compatibility
export const MeteoconsWeatherIcon = WeatherIcons;
