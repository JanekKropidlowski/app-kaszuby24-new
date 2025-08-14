import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { 
  Car, 
  Eye, 
  Thermometer, 
  CloudRain, 
  Wind, 
  Gauge,
  AlertTriangle,
  Clock,
  MapPin,
  Navigation,
  Shield,
  Info,
  Snowflake,
  Sun,
  Cloud,
  Droplets,
  TrendingUp,
  AlertCircle,
  Star,
  CheckCircle,
  Compass
} from 'lucide-react-native';
import { UnifiedWeatherWidget } from './UnifiedWeatherWidget';

interface DriverWeatherWidgetProps {
  currentWeather?: any;
  synopData?: any;
  hourly?: any;
  forecastData?: any;
  onPress?: () => void;
}

export const DriverWeatherWidget: React.FC<DriverWeatherWidgetProps> = ({
  currentWeather,
  synopData,
  hourly,
  forecastData,
  onPress
}) => {
  if (!currentWeather && !synopData) return null;

  // Enhanced weather data extraction
  const weatherData = {
    temperature: parseFloat(synopData?.temperatura || currentWeather?.temperature || '0'),
    visibility: parseFloat(synopData?.widocznosc || currentWeather?.visibility || '10'),
    precipitation: parseFloat(currentWeather?.precipitation || '0'),
    windSpeed: parseFloat(synopData?.predkosc_wiatru || currentWeather?.windSpeed || '0'),
    humidity: parseFloat(synopData?.wilgotnosc || currentWeather?.humidity || '0'),
  };

  // Enhanced road condition assessment
  const getRoadCondition = (temp: number, precip: number, humidity: number) => {
    let roadCondition = 'Suche';
    let roadStatus: 'excellent' | 'good' | 'moderate' | 'poor' = 'excellent';
    
    if (temp <= 2 && precip > 0) {
      roadCondition = 'Możliwy lód';
      roadStatus = 'poor';
    } else if (temp <= 0 && humidity > 90) {
      roadCondition = 'Możliwy szron';
      roadStatus = 'moderate';
    } else if (precip > 5) {
      roadCondition = 'Mokre';
      roadStatus = 'moderate';
    } else if (precip > 0) {
      roadCondition = 'Lekko mokre';
      roadStatus = 'good';
    }
    
    return { roadCondition, roadStatus };
  };

  const roadCondition = getRoadCondition(weatherData.temperature, weatherData.precipitation, weatherData.humidity);

  // Enhanced safety level calculation
  const getSafetyLevel = () => {
    let safetyLevel = 'Wysokie';
    if (weatherData.visibility < 2 || (weatherData.temperature <= 0 && weatherData.precipitation > 0) || weatherData.windSpeed > 50) {
      safetyLevel = 'Niskie';
    } else if (weatherData.visibility < 5 || weatherData.precipitation > 5 || weatherData.windSpeed > 30) {
      safetyLevel = 'Średnie';
    }
    return safetyLevel;
  };

  // Enhanced speed recommendations
  const getSpeedRecommendation = () => {
    let speedRecommendation = 'Normalna';
    if (weatherData.visibility < 2 || roadCondition.roadStatus === 'poor') {
      speedRecommendation = 'Zmniejsz do 50%';
    } else if (weatherData.visibility < 5 || roadCondition.roadStatus === 'moderate') {
      speedRecommendation = 'Zmniejsz do 70%';
    }
    return speedRecommendation;
  };

  // Enhanced tire recommendations
  const getTireRecommendation = () => {
    let tireRecommendation = 'Letnie';
    if (weatherData.temperature <= 7) {
      tireRecommendation = 'Zimowe';
    } else if (weatherData.temperature <= 15) {
      tireRecommendation = 'Przejściowe';
    }
    return tireRecommendation;
  };

  // Enhanced metrics
  const metrics = [
    {
      label: 'Widoczność',
      value: `${weatherData.visibility.toFixed(1)}km`,
      icon: Eye,
      status: weatherData.visibility >= 8 ? 'excellent' as const :
             weatherData.visibility >= 5 ? 'good' as const :
             weatherData.visibility >= 2 ? 'moderate' as const : 'poor' as const,
    },
    {
      label: 'Stan drogi',
      value: roadCondition.roadCondition,
      icon: Navigation,
      status: roadCondition.roadStatus,
    },
    {
      label: 'Temperatura',
      value: `${weatherData.temperature.toFixed(1)}°C`,
      icon: Thermometer,
      status: weatherData.temperature >= 5 && weatherData.temperature <= 25 ? 'excellent' as const : 'good' as const,
    },
    {
      label: 'Bezpieczeństwo',
      value: getSafetyLevel(),
      icon: Car,
      status: getSafetyLevel() === 'Wysokie' ? 'excellent' as const : getSafetyLevel() === 'Dobre' ? 'good' as const : 'moderate' as const,
    }
  ];

  return (
    <UnifiedWeatherWidget
      title="Pogoda dla Kierowców"
      subtitle="Warunki drogowe i bezpieczeństwo"
      icon={Car}
      gradientColors={['#7c3aed', '#a855f7', '#c084fc']}
      metrics={metrics}
      onPress={onPress}
    />
  );
};

const styles = StyleSheet.create({
  // Empty - no styles needed for this component
});