import React from 'react';
import { Svg, Path, G, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useThemeStore } from '@/store/themeStore';

const Sunny = ({ size }) => (
  <Svg viewBox="0 0 64 64" width={size} height={size}>
    <Defs>
      <LinearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFD700" />
        <Stop offset="100%" stopColor="#FFA500" />
      </LinearGradient>
    </Defs>
    <G fill="url(#sunGradient)" stroke="#fec534" strokeWidth="2" strokeMiterlimit="10">
      <Circle cx="32" cy="32" r="12"/>
      <Path d="M32 48V56" stroke="#fec534" strokeWidth="3" strokeLinecap="round"/>
      <Path d="M32 8V16" stroke="#fec534" strokeWidth="3" strokeLinecap="round"/>
      <Path d="M48 32h8" stroke="#fec534" strokeWidth="3" strokeLinecap="round"/>
      <Path d="M8 32h8" stroke="#fec534" strokeWidth="3" strokeLinecap="round"/>
      <Path d="M44.4 44.4l5.6-5.6" stroke="#fec534" strokeWidth="3" strokeLinecap="round"/>
      <Path d="M14 14l5.6-5.6" stroke="#fec534" strokeWidth="3" strokeLinecap="round"/>
      <Path d="M44.4 19.6l5.6 5.6" stroke="#fec534" strokeWidth="3" strokeLinecap="round"/>
      <Path d="M14 50l5.6 5.6" stroke="#fec534" strokeWidth="3" strokeLinecap="round"/>
    </G>
  </Svg>
);

const PartlyCloudy = ({ size }) => (
    <Svg viewBox="0 0 64 64" width={size} height={size}>
        <Defs>
            <LinearGradient id="cloudGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#E8E8E8" />
                <Stop offset="100%" stopColor="#D0D0D0" />
            </LinearGradient>
            <LinearGradient id="sunGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFD700" />
                <Stop offset="100%" stopColor="#FFA500" />
            </LinearGradient>
        </Defs>
        <Circle cx="20" cy="20" r="8" fill="url(#sunGradient2)" opacity="0.8"/>
        <Path fill="url(#cloudGradient)" d="M51.5 44.5h-39a9 9 0 01-9-9 9 9 0 019-9h.5a12.5 12.5 0 0124-5 9.5 9.5 0 019 9.5 7.5 7.5 0 017.5 7.5 7.5 7.5 0 01-2 5z"/>
        <Path fill="url(#cloudGradient)" opacity="0.7" d="M51.5 44.5h-39a9 9 0 01-9-9 9 9 0 019-9h.5a12.5 12.5 0 0124-5 9.5 9.5 0 019 9.5 7.5 7.5 0 017.5 7.5 7.5 7.5 0 01-2 5z" transform="translate(-10 -8)"/>
    </Svg>
);

const Cloudy = ({ size }) => (
    <Svg viewBox="0 0 64 64" width={size} height={size}>
        <Defs>
            <LinearGradient id="cloudGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#E8E8E8" />
                <Stop offset="100%" stopColor="#C0C0C0" />
            </LinearGradient>
        </Defs>
        <Path fill="url(#cloudGradient2)" d="M51.5 44.5h-39a9 9 0 01-9-9 9 9 0 019-9h.5a12.5 12.5 0 0124-5 9.5 9.5 0 019 9.5 7.5 7.5 0 017.5 7.5 7.5 7.5 0 01-2 5z"/>
        <Path fill="url(#cloudGradient2)" opacity="0.8" d="M45 38h-32a7 7 0 01-7-7 7 7 0 017-7h.5a10 10 0 0120-4 7.5 7.5 0 017 7.5 6 6 0 016 6 6 6 0 01-1.5 4z" transform="translate(5 -5)"/>
    </Svg>
);

const Rain = ({ size }) => (
  <Svg viewBox="0 0 64 64" width={size} height={size}>
    <Defs>
        <LinearGradient id="cloudGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E8E8E8" />
            <Stop offset="100%" stopColor="#C0C0C0" />
        </LinearGradient>
        <LinearGradient id="rainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#54A0FF" />
            <Stop offset="100%" stopColor="#2E86AB" />
        </LinearGradient>
    </Defs>
    <G>
      <Path fill="url(#cloudGradient3)" d="M51.5 44.5h-39a9 9 0 01-9-9 9 9 0 019-9h.5a12.5 12.5 0 0124-5 9.5 9.5 0 019 9.5 7.5 7.5 0 017.5 7.5 7.5 7.5 0 01-2 5z"/>
      <Path fill="url(#rainGradient)" stroke="#54a0ff" strokeWidth="2" strokeLinecap="round" d="M25 50v12m8-12v12m8-12v12"/>
    </G>
  </Svg>
);

const Snow = ({ size }) => (
  <Svg viewBox="0 0 64 64" width={size} height={size}>
    <Defs>
        <LinearGradient id="cloudGradient4" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E8E8E8" />
            <Stop offset="100%" stopColor="#C0C0C0" />
        </LinearGradient>
        <LinearGradient id="snowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#E0E0E0" />
        </LinearGradient>
    </Defs>
    <G>
      <Path fill="url(#cloudGradient4)" d="M51.5 44.5h-39a9 9 0 01-9-9 9 9 0 019-9h.5a12.5 12.5 0 0124-5 9.5 9.5 0 019 9.5 7.5 7.5 0 017.5 7.5 7.5 7.5 0 01-2 5z"/>
      <G fill="url(#snowGradient)" stroke="#FFFFFF" strokeWidth="1">
        <Circle cx="25" cy="55" r="2"/>
        <Circle cx="33" cy="55" r="2"/>
        <Circle cx="41" cy="55" r="2"/>
        <Circle cx="29" cy="62" r="2"/>
        <Circle cx="37" cy="62" r="2"/>
      </G>
    </G>
  </Svg>
);

const Thunderstorm = ({ size }) => (
  <Svg viewBox="0 0 64 64" width={size} height={size}>
    <Defs>
        <LinearGradient id="cloudGradient5" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E8E8E8" />
            <Stop offset="100%" stopColor="#A0A0A0" />
        </LinearGradient>
        <LinearGradient id="lightningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFD700" />
            <Stop offset="100%" stopColor="#FFA500" />
        </LinearGradient>
    </Defs>
    <G>
      <Path fill="url(#cloudGradient5)" d="M51.5 44.5h-39a9 9 0 01-9-9 9 9 0 019-9h.5a12.5 12.5 0 0124-5 9.5 9.5 0 019 9.5 7.5 7.5 0 017.5 7.5 7.5 7.5 0 01-2 5z"/>
      <Path fill="url(#lightningGradient)" d="M30 45l-4 8h6l-2 8 8-12h-6l4-4z"/>
    </G>
  </Svg>
);

const Fog = ({ size }) => (
  <Svg viewBox="0 0 64 64" width={size} height={size}>
    <Defs>
        <LinearGradient id="cloudGradient6" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E8E8E8" />
            <Stop offset="100%" stopColor="#C0C0C0" />
        </LinearGradient>
        <LinearGradient id="fogGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#F0F0F0" />
            <Stop offset="100%" stopColor="#D0D0D0" />
        </LinearGradient>
    </Defs>
    <G>
      <Path fill="url(#cloudGradient6)" d="M51.5 44.5h-39a9 9 0 01-9-9 9 9 0 019-9h.5a12.5 12.5 0 0124-5 9.5 9.5 0 019 9.5 7.5 7.5 0 017.5 7.5 7.5 7.5 0 01-2 5z"/>
      <Path fill="url(#fogGradient)" opacity="0.6" d="M10 50h44v4H10z"/>
      <Path fill="url(#fogGradient)" opacity="0.4" d="M15 56h34v3H15z"/>
    </G>
  </Svg>
);

export const WeatherIcon = ({ wmoCode, size = 64 }) => {
  // Enhanced WMO Weather interpretation codes
  // 0: Clear sky
  // 1: Mainly clear
  // 2: Partly cloudy
  // 3: Overcast
  // 45, 48: Foggy
  // 51-55: Drizzle
  // 56-57: Freezing drizzle
  // 61-65: Rain
  // 66-67: Freezing rain
  // 71-75: Snow fall
  // 77: Snow grains
  // 80-82: Rain showers
  // 85-86: Snow showers
  // 95: Thunderstorm
  // 96-99: Thunderstorm with hail

  if (wmoCode === 0) return <Sunny size={size} />;
  if (wmoCode === 1) return <Sunny size={size} />;
  if (wmoCode === 2) return <PartlyCloudy size={size} />;
  if (wmoCode === 3) return <Cloudy size={size} />;
  if (wmoCode === 45 || wmoCode === 48) return <Fog size={size} />;
  if (wmoCode >= 51 && wmoCode <= 55) return <Rain size={size} />;
  if (wmoCode >= 56 && wmoCode <= 57) return <Rain size={size} />;
  if (wmoCode >= 61 && wmoCode <= 65) return <Rain size={size} />;
  if (wmoCode >= 66 && wmoCode <= 67) return <Rain size={size} />;
  if (wmoCode >= 71 && wmoCode <= 75) return <Snow size={size} />;
  if (wmoCode === 77) return <Snow size={size} />;
  if (wmoCode >= 80 && wmoCode <= 82) return <Rain size={size} />;
  if (wmoCode >= 85 && wmoCode <= 86) return <Snow size={size} />;
  if (wmoCode === 95) return <Thunderstorm size={size} />;
  if (wmoCode >= 96 && wmoCode <= 99) return <Thunderstorm size={size} />;
  
  return <Cloudy size={size} />;
}; 