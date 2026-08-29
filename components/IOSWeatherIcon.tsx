import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface IOSWeatherIconProps {
  wmoCode: number;
  size?: number;
  isDay?: boolean;
  style?: any;
}

export const IOSWeatherIcon = ({ 
  wmoCode, 
  size = 36, 
  isDay = true, 
  style 
}: IOSWeatherIconProps) => {
  
  const getWeatherEmoji = (weatherCode: number) => {
    // Clear sky
    if (weatherCode <= 1) {
      return isDay ? '☀️' : '🌙';
    }
    
    // Partly cloudy
    if (weatherCode === 2) {
      return isDay ? '⛅' : '☁️';
    }
    
    // Cloudy
    if (weatherCode === 3) {
      return '☁️';
    }
    
    // Overcast
    if (weatherCode === 4) {
      return '☁️';
    }
    
    // Fog and mist
    if (weatherCode >= 45 && weatherCode <= 48) {
      return '🌫️';
    }
    
    // Drizzle
    if (weatherCode >= 51 && weatherCode <= 55) {
      return '🌦️';
    }
    
    // Rain
    if (weatherCode >= 56 && weatherCode <= 67) {
      return '🌧️';
    }
    
    // Snow
    if (weatherCode >= 71 && weatherCode <= 77) {
      return '🌨️';
    }
    
    // Showers
    if (weatherCode >= 80 && weatherCode <= 82) {
      return '🌦️';
    }
    
    if (weatherCode >= 85 && weatherCode <= 86) {
      return '🌨️';
    }
    
    // Thunderstorm
    if (weatherCode >= 95 && weatherCode <= 99) {
      return '⛈️';
    }
    
    // Default
    return isDay ? '☀️' : '🌙';
  };

  const emoji = getWeatherEmoji(wmoCode);
  const fontSize = Math.max(size * 0.9, 24); // Minimalny rozmiar 24

  // Debug: log do konsoli
  console.log('IOSWeatherIcon render:', { wmoCode, emoji, fontSize, size });

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Text style={[styles.emoji, { fontSize }]}>
        {emoji}
      </Text>
      {/* Debug: pokaż emoji jako tekst */}
      <Text style={{ fontSize: 10, color: 'blue' }}>
        Debug: {emoji} (Code: {wmoCode})
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // Dodane dla debugowania
  },
  emoji: {
    textAlign: 'center',
    lineHeight: 1,
    includeFontPadding: false, // Usuwa dodatkowy padding na Androidzie
    textAlignVertical: 'center', // Centruje pionowo na Androidzie
  },
});
