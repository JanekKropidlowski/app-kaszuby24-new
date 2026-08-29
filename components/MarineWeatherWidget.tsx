import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { 
  Anchor, 
  Waves, 
  Wind, 
  Eye, 
  Shield,
  Compass,
  Gauge,
  Thermometer
} from 'lucide-react-native';
import { UnifiedWeatherWidget } from './UnifiedWeatherWidget';

interface MarineWeatherWidgetProps {
  weatherData: any;
  forecastData: any;
  onPress?: () => void;
  marineData?: any | null;
  waterTempC?: number | null;
}

export const MarineWeatherWidget: React.FC<MarineWeatherWidgetProps> = ({ 
  weatherData, 
  forecastData,
  onPress,
  marineData,
  waterTempC
}) => {
  if (!weatherData) return null;

  // Simplified metrics enriched with marine API if available
  const waveHeightKm = (() => {
    const v = weatherData.windSpeed || 0;
    return Math.max(0.1, v * 0.1);
  })();

  const marineWave = (() => {
    const h = marineData?.hourly?.wave_height?.[0];
    return typeof h === 'number' ? h : null;
  })();

  const metrics = [
    {
      label: 'Wysokość fal',
      value: `${(marineWave ?? waveHeightKm).toFixed(1)}m`,
      icon: Waves,
      status: (marineWave ?? waveHeightKm) <= 1.0 ? 'excellent' as const :
             (marineWave ?? waveHeightKm) <= 2.0 ? 'good' as const :
             (marineWave ?? waveHeightKm) <= 3.0 ? 'moderate' as const : 'poor' as const,
    },
    ...(typeof waterTempC === 'number' ? [{
      label: 'Temperatura wody',
      value: `${waterTempC.toFixed(1)}°C`,
      icon: Thermometer,
      status: waterTempC >= 5 && waterTempC <= 25 ? 'good' as const : 'moderate' as const,
    }] : []),
    {
      label: 'Siła wiatru',
      value: `${weatherData.windSpeed || 0} km/h`,
      icon: Wind,
      status: (weatherData.windSpeed || 0) <= 15 ? 'excellent' as const :
             (weatherData.windSpeed || 0) <= 25 ? 'good' as const :
             (weatherData.windSpeed || 0) <= 35 ? 'moderate' as const : 'poor' as const,
    },
    ...(marineData?.hourly?.wave_direction?.[0] ? [{
      label: 'Kierunek fal',
      value: `${Math.round(marineData.hourly.wave_direction[0])}°`,
      icon: Compass,
      status: 'good' as const,
    }] : []),
    ...(marineData?.hourly?.wind_wave_height?.[0] ? [{
      label: 'Fale wiatrowe',
      value: `${(marineData.hourly.wind_wave_height[0] as number).toFixed(1)}m`,
      icon: Waves,
      status: (marineData.hourly.wind_wave_height[0] as number) <= 1.0 ? 'excellent' as const :
             (marineData.hourly.wind_wave_height[0] as number) <= 2.0 ? 'good' as const : 'moderate' as const,
    }] : []),
    ...(marineData?.hourly?.wind_wave_direction?.[0] ? [{
      label: 'Kierunek fal wiatrowych',
      value: `${Math.round(marineData.hourly.wind_wave_direction[0] as number)}°`,
      icon: Compass,
      status: 'good' as const,
    }] : []),
    ...(marineData?.hourly?.wave_period?.[0] ? [{
      label: 'Okres fal',
      value: `${Math.round(marineData.hourly.wave_period[0])} s`,
      icon: Gauge,
      status: 'good' as const,
    }] : []),
    {
      label: 'Widoczność',
      value: `${weatherData.visibility || 10}km`,
      icon: Eye,
      status: (weatherData.visibility || 10) >= 10 ? 'excellent' as const :
             (weatherData.visibility || 10) >= 5 ? 'good' as const :
             (weatherData.visibility || 10) >= 2 ? 'moderate' as const : 'poor' as const,
    },
    {
      label: 'Stan morza',
      value: (weatherData.windSpeed || 0) <= 10 ? 'Spokojne' : (weatherData.windSpeed || 0) <= 20 ? 'Lekko wzburzone' : 'Wzburzone',
      icon: Shield,
      status: (weatherData.windSpeed || 0) <= 15 ? 'excellent' as const :
             (weatherData.windSpeed || 0) <= 25 ? 'good' as const : 'moderate' as const,
    }
  ];

  return (
    <UnifiedWeatherWidget
      title="Pogoda dla Żeglarzy"
      subtitle="Warunki morskie i żegluga"
      icon={Anchor}
      gradientColors={['#0ea5e9', '#38bdf8', '#7dd3fc']}
      metrics={metrics}
      onPress={onPress}
    />
  );
};

const styles = StyleSheet.create({
  // Empty - no styles needed for this component
});