import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { 
  Sun, 
  Moon, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  CloudFog, 
  CloudDrizzle,
  CloudOff,
  Wind,
  Thermometer,
  Umbrella,
  Snowflake,
  Zap
} from 'lucide-react-native';
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
  if (wmoCode === 4) return CloudOff;
  
  // Fog
  if (wmoCode >= 45 && wmoCode <= 48) return CloudFog;
  
  // Drizzle
  if (wmoCode >= 51 && wmoCode <= 57) return CloudDrizzle;
  
  // Rain
  if (wmoCode >= 61 && wmoCode <= 67) return CloudRain;
  
  // Snow
  if (wmoCode >= 71 && wmoCode <= 77) return Snowflake;
  
  // Showers
  if (wmoCode >= 80 && wmoCode <= 82) return Umbrella;
  if (wmoCode >= 85 && wmoCode <= 86) return Snowflake;
  
  // Thunderstorm
  if (wmoCode >= 95 && wmoCode <= 99) return Zap;
  
  // Default
  return isDay ? Sun : Moon;
};

// Emoji-based weather icons for more friendly appearance
const getWeatherEmoji = (wmoCode: number, isDay: boolean = true) => {
  // Clear sky
  if (wmoCode <= 1) return isDay ? '☀️' : '🌙';
  
  // Partly cloudy
  if (wmoCode === 2) return '⛅';
  
  // Cloudy
  if (wmoCode === 3) return '☁️';
  
  // Overcast
  if (wmoCode === 4) return '☁️';
  
  // Fog
  if (wmoCode >= 45 && wmoCode <= 48) return '🌫️';
  
  // Drizzle
  if (wmoCode >= 51 && wmoCode <= 57) return '🌦️';
  
  // Rain
  if (wmoCode >= 61 && wmoCode <= 67) return '🌧️';
  
  // Snow
  if (wmoCode >= 71 && wmoCode <= 77) return '❄️';
  
  // Showers
  if (wmoCode >= 80 && wmoCode <= 82) return '🌦️';
  if (wmoCode >= 85 && wmoCode <= 86) return '🌨️';
  
  // Thunderstorm
  if (wmoCode >= 95 && wmoCode <= 99) return '⛈️';
  
  // Default
  return isDay ? '☀️' : '🌙';
};

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  wmoCode,
  size = 64,
  isDay = true,
  style,
}) => {
  const { theme, isDarkMode } = useThemeStore();
  const { config } = useWeatherConfigStore();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

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

    // Bounce animation for friendly feel
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle scale animation
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.08,
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

    bounceAnimation.start();
    scaleAnimation.start();
    
    // Only rotate sun icons
    if (wmoCode <= 1) {
      rotateAnimation.start();
    }

    return () => {
      bounceAnimation.stop();
      scaleAnimation.stop();
      rotateAnimation.stop();
    };
  }, [wmoCode]);

  const IconComponent = getWeatherIconComponent(wmoCode, effectiveIsDay);
  const weatherEmoji = getWeatherEmoji(wmoCode, effectiveIsDay);
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bounceInterpolate = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
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

  // Enhanced icon mapping with more specific icons for better visibility
  const getEnhancedWeatherIcon = (code: number, day: boolean) => {
    // Clear sky
    if (code <= 1) return day ? Sun : Moon;
    
    // Partly cloudy
    if (code === 2) return Cloud;
    
    // Cloudy
    if (code === 3) return Cloud;
    
    // Overcast
    if (code === 4) return CloudOff;
    
    // Fog
    if (code >= 45 && code <= 48) return CloudFog;
    
    // Drizzle
    if (code >= 51 && code <= 57) return CloudDrizzle;
    
    // Rain
    if (code >= 61 && code <= 67) return CloudRain;
    
    // Snow
    if (code >= 71 && code <= 77) return Snowflake;
    
    // Showers
    if (code >= 80 && code <= 82) return Umbrella;
    if (code >= 85 && code <= 86) return Snowflake;
    
    // Thunderstorm
    if (code >= 95 && code <= 99) return Zap;
    
    // Default
    return day ? Sun : Moon;
  };

  const EnhancedIconComponent = getEnhancedWeatherIcon(wmoCode, effectiveIsDay);

  // Use emoji for smaller sizes (like in header) and icon for larger sizes
  const useEmoji = size <= 40;

  if (useEmoji) {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            opacity: opacityAnim,
            transform: [
              { scale: scaleAnim }, 
              { translateY: bounceInterpolate },
              { rotate: wmoCode <= 1 ? rotateInterpolate : '0deg' }
            ],
          },
          style,
        ]}
      >
        <Text style={[styles.emojiIcon, { fontSize: size * 0.8 }]}>
          {weatherEmoji}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim }, 
            { translateY: bounceInterpolate },
            { rotate: wmoCode <= 1 ? rotateInterpolate : '0deg' }
          ],
        },
        style,
      ]}
    >
      <EnhancedIconComponent 
        size={size} 
        color={getIconColor()} 
        strokeWidth={isDarkMode ? 2 : 2.5} 
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiIcon: {
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
