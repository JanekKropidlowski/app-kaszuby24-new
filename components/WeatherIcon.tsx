import React from 'react';
import { Svg, Path, G, Circle } from 'react-native-svg';
import { useThemeStore } from '@/store/themeStore';

const Sunny = ({ size }) => (
  <Svg viewBox="0 0 64 64" width={size} height={size}>
    <G fill="none" stroke="#fec534" strokeWidth="4" strokeMiterlimit="10">
      <Circle cx="32" cy="32" r="9"/>
      <Path d="M32 45.5V51.5"/>
      <Path d="M32 12.5V18.5"/>
      <Path d="M45.5 32h-6"/>
      <Path d="M18.5 32h-6"/>
      <Path d="M42.4 42.4l-4.2-4.2"/>
      <Path d="M21.6 21.6l-4.2-4.2"/>
      <Path d="M42.4 21.6l-4.2 4.2"/>
      <Path d="M21.6 42.4l-4.2-4.2"/>
    </G>
  </Svg>
);

const PartlyCloudy = ({ size }) => (
    <Svg viewBox="0 0 64 64" width={size} height={size}>
        <Path fill="#e0e0e0" d="M51.5 44.5h-39a9 9 0 01-9-9 9 9 0 019-9h.5a12.5 12.5 0 0124-5 9.5 9.5 0 019 9.5 7.5 7.5 0 017.5 7.5 7.5 7.5 0 01-2 5z"/>
        <Path fill="#f5f5f5" d="M51.5 44.5h-39a9 9 0 01-9-9 9 9 0 019-9h.5a12.5 12.5 0 0124-5 9.5 9.5 0 019 9.5 7.5 7.5 0 017.5 7.5 7.5 7.5 0 01-2 5z" transform="translate(-10 -8)"/>
    </Svg>
);

const Cloudy = ({ size }) => (
    <Svg viewBox="0 0 64 64" width={size} height={size}>
        <Path fill="#e0e0e0" d="M51.5 44.5h-39a9 9 0 01-9-9 9 9 0 019-9h.5a12.5 12.5 0 0124-5 9.5 9.5 0 019 9.5 7.5 7.5 0 017.5 7.5 7.5 7.5 0 01-2 5z"/>
    </Svg>
);

const Rain = ({ size }) => (
  <Svg viewBox="0 0 64 64" width={size} height={size}>
    <G>
      <Path fill="#e0e0e0" d="M51.5 44.5h-39a9 9 0 01-9-9 9 9 0 019-9h.5a12.5 12.5 0 0124-5 9.5 9.5 0 019 9.5 7.5 7.5 0 017.5 7.5 7.5 7.5 0 01-2 5z"/>
      <Path fill="none" stroke="#54a0ff" strokeWidth="4" strokeLinecap="round" d="M27 50v8m10-8v8m10-8v8"/>
    </G>
  </Svg>
);

export const WeatherIcon = ({ wmoCode, size = 64 }) => {
  // WMO Weather interpretation codes
  // 0, 1: Sunny
  // 2: Partly Cloudy
  // 3: Cloudy
  // 51-67, 80-82: Rain
  // 71-77: Snow (using Rain icon for now)
  // Default: Cloudy
  if (wmoCode <= 1) return <Sunny size={size} />;
  if (wmoCode === 2) return <PartlyCloudy size={size} />;
  if (wmoCode === 3) return <Cloudy size={size} />;
  if ((wmoCode >= 51 && wmoCode <= 67) || (wmoCode >= 80 && wmoCode <= 82) || (wmoCode >= 71 && wmoCode <= 77)) {
    return <Rain size={size} />; // Using Rain for Snow as well for simplicity
  }
  return <Cloudy size={size} />;
}; 