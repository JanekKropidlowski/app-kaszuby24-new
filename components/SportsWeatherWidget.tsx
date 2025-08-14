import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { 
  Activity, 
  Sun, 
  Wind, 
  Thermometer, 
  Droplets, 
  Eye,
  AlertTriangle,
  Zap,
  Clock,
  MapPin,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info,
  Shield,
  Heart,
  Gauge,
  Compass,
  Star,
  Bike,
  Target
} from 'lucide-react-native';
import { UnifiedWeatherWidget } from './UnifiedWeatherWidget';

interface SportsWeatherWidgetProps {
  weatherData: any;
  forecastData: any;
  airQualityData: any;
  onPress?: () => void;
}

export const SportsWeatherWidget: React.FC<SportsWeatherWidgetProps> = ({ 
  weatherData, 
  forecastData, 
  airQualityData,
  onPress
}) => {
  if (!weatherData) return null;

  // Enhanced sports conditions calculation
  const getSportsConditions = () => {
    const temp = parseFloat(weatherData.temperature || weatherData.temp || '0');
    const humidity = weatherData.humidity || 0;
    const windSpeed = weatherData.windSpeed || 0;
    const uvIndex = forecastData?.daily?.uv_index_max?.[0] || 0;
    const airQuality = airQualityData?.aqi || 0;
    
    // Enhanced sports conditions calculation
    let activityLevel = 'Optymalny';
    if (temp < 5 || temp > 30) {
      activityLevel = 'Niski';
    } else if (temp >= 15 && temp <= 25) {
      activityLevel = 'Optymalny';
    } else if (temp >= 10 && temp <= 28) {
      activityLevel = 'Dobry';
    } else {
      activityLevel = 'Umiarkowany';
    }
    
    // Running conditions
    let runningConditions = 'Dobre';
    if (temp < 5 || temp > 25 || humidity > 80) {
      runningConditions = 'Umiarkowane';
    } else if (temp < 0 || temp > 30) {
      runningConditions = 'Niekorzystne';
    }
    
    // Cycling conditions
    let cyclingConditions = 'Dobre';
    if (windSpeed > 20 || temp < 5 || temp > 30) {
      cyclingConditions = 'Umiarkowane';
    } else if (windSpeed > 30 || temp < 0 || temp > 35) {
      cyclingConditions = 'Niekorzystne';
    }
    
    // Team sports conditions
    let teamSportsConditions = 'Dobre';
    if (temp < 10 || temp > 28 || humidity > 85) {
      teamSportsConditions = 'Umiarkowane';
    } else if (temp < 5 || temp > 32) {
      teamSportsConditions = 'Niekorzystne';
    }
    
    // Hydration recommendations
    let hydrationRecommendation = 'Normalne';
    if (temp > 25 || humidity > 70) {
      hydrationRecommendation = 'Zwiększone';
    } else if (temp > 30) {
      hydrationRecommendation = 'Wysokie';
    }
    
    return {
      temperature: temp,
      humidity,
      windSpeed,
      uvIndex,
      airQuality,
      activityLevel,
      runningConditions,
      cyclingConditions,
      teamSportsConditions,
      hydrationRecommendation
    };
  };

  const sportsConditions = getSportsConditions();

  // Enhanced metrics
  const metrics = [
    {
      label: 'Temperatura',
      value: `${sportsConditions.temperature.toFixed(1)}°C`,
      icon: Thermometer,
      status: sportsConditions.temperature >= 15 && sportsConditions.temperature <= 25 ? 'excellent' as const :
             sportsConditions.temperature >= 10 && sportsConditions.temperature <= 28 ? 'good' as const : 'moderate' as const,
    },
    {
      label: 'Indeks UV',
      value: `${sportsConditions.uvIndex}/11`,
      icon: Sun,
      status: sportsConditions.uvIndex <= 2 ? 'excellent' as const :
             sportsConditions.uvIndex <= 5 ? 'good' as const :
             sportsConditions.uvIndex <= 7 ? 'moderate' as const : 'poor' as const,
    },
    {
      label: 'Jakość powietrza',
      value: `${sportsConditions.airQuality}/500`,
      icon: Shield,
      status: sportsConditions.airQuality <= 50 ? 'excellent' as const :
             sportsConditions.airQuality <= 100 ? 'good' as const :
             sportsConditions.airQuality <= 150 ? 'moderate' as const : 'poor' as const,
    },
    {
      label: 'Warunki treningu',
      value: sportsConditions.activityLevel,
      icon: Activity,
      status: sportsConditions.activityLevel === 'Optymalny' ? 'excellent' as const :
             sportsConditions.activityLevel === 'Dobry' ? 'good' as const : 'moderate' as const,
    }
  ];

  return (
    <UnifiedWeatherWidget
      title="Pogoda dla Sportu"
      subtitle="Warunki treningowe i aktywności"
      icon={Activity}
      gradientColors={['#f59e0b', '#fbbf24', '#fcd34d']}
      metrics={metrics}
      onPress={onPress}
    />
  );
};

const styles = StyleSheet.create({
  // Empty - no styles needed for this component
});