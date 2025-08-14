import React from 'react';
import { 
  Sprout, 
  Thermometer, 
  Droplets, 
  Wind, 
  TrendingUp
} from 'lucide-react-native';
import { UnifiedWeatherWidget } from './UnifiedWeatherWidget';

interface AgriculturalWeatherWidgetProps {
  weatherData: any;
  forecastData: any;
  meteoData: any;
  onPress?: () => void;
}

export const AgriculturalWeatherWidget: React.FC<AgriculturalWeatherWidgetProps> = ({
  weatherData,
  forecastData,
  meteoData,
  onPress
}) => {
  if (!weatherData) return null;

  // Simple agricultural conditions calculation
  const getAgriculturalConditions = () => {
    const temp = parseFloat(weatherData.temperature || weatherData.temp || '0');
    const humidity = parseFloat(weatherData.humidity || '0');
    const windSpeed = parseFloat(weatherData.windSpeed || '0');
    const pressure = parseFloat(weatherData.pressure || '1013');

    return {
      temperature: temp.toFixed(1),
      humidity: humidity.toFixed(0),
      windSpeed: windSpeed.toFixed(1),
      pressure: pressure.toFixed(0)
    };
  };

  const agriculturalConditions = getAgriculturalConditions();

  // Simplified metrics
  const soilTemp = meteoData?.temperatura_gruntu != null && String(meteoData?.temperatura_gruntu).trim() !== ''
    ? Number(meteoData.temperatura_gruntu)
    : null;
  const soilTime = meteoData?.temperatura_gruntu_data || null;
  // 10-minutowe metryki usunięte na życzenie użytkownika
  const humidityFallback = meteoData?.wilgotnosc_wzgledna != null && String(meteoData?.wilgotnosc_wzgledna).trim() !== ''
    ? Number(meteoData.wilgotnosc_wzgledna)
    : null;

  const humidityValue = isNaN(Number(agriculturalConditions.humidity)) && humidityFallback != null
    ? `${humidityFallback}`
    : agriculturalConditions.humidity;

  const metrics = [
    {
      label: 'Temperatura',
      value: `${agriculturalConditions.temperature}°C`,
      icon: Thermometer,
      status: parseFloat(agriculturalConditions.temperature) >= 15 && parseFloat(agriculturalConditions.temperature) <= 25 ? 'excellent' as const : 
             parseFloat(agriculturalConditions.temperature) >= 10 && parseFloat(agriculturalConditions.temperature) <= 30 ? 'good' as const : 
             parseFloat(agriculturalConditions.temperature) >= 5 && parseFloat(agriculturalConditions.temperature) <= 35 ? 'moderate' as const : 'poor' as const,
    },
    {
      label: 'Wilgotność',
      value: `${humidityValue}%`,
      icon: Droplets,
      status: parseFloat(agriculturalConditions.humidity) >= 60 && parseFloat(agriculturalConditions.humidity) <= 80 ? 'excellent' as const : 
             parseFloat(agriculturalConditions.humidity) >= 40 && parseFloat(agriculturalConditions.humidity) <= 90 ? 'good' as const : 
             parseFloat(agriculturalConditions.humidity) >= 20 && parseFloat(agriculturalConditions.humidity) <= 95 ? 'moderate' as const : 'poor' as const,
    },
    ...(soilTemp != null && Number.isFinite(soilTemp) ? [{
      label: 'Temperatura gleby',
      value: `${soilTemp.toFixed(1)}°C`,
      meta: soilTime ? new Date(soilTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : undefined,
      icon: Thermometer,
      status: 'good' as const,
    }] : []),
    {
      label: 'Wiatr',
      value: `${agriculturalConditions.windSpeed} km/h`,
      icon: Wind,
      status: parseFloat(agriculturalConditions.windSpeed) <= 10 ? 'excellent' as const : 
             parseFloat(agriculturalConditions.windSpeed) <= 20 ? 'good' as const : 
             parseFloat(agriculturalConditions.windSpeed) <= 30 ? 'moderate' as const : 'poor' as const,
    },
    
    {
      label: 'Indeks wzrostu',
      value: `${Math.round((parseFloat(agriculturalConditions.temperature) + 10) * 2 + (parseFloat(agriculturalConditions.humidity) * 0.3))}/100`,
      icon: TrendingUp,
      status: parseFloat(agriculturalConditions.temperature) >= 15 && parseFloat(agriculturalConditions.humidity) >= 60 ? 'excellent' as const : 
             parseFloat(agriculturalConditions.temperature) >= 10 && parseFloat(agriculturalConditions.humidity) >= 40 ? 'good' as const : 'moderate' as const,
    }
  ];

  // Simple last update
  const getLastUpdate = () => {
    return 'Aktualizacja: teraz';
  };

  return (
    <UnifiedWeatherWidget
      title="Pogoda dla Rolnictwa"
      subtitle="Warunki upraw i hodowli"
      icon={Sprout}
      gradientColors={['#16a34a', '#22c55e', '#4ade80']}
      metrics={metrics}
      onPress={onPress}
      lastUpdate={getLastUpdate()}
    />
  );
};

export default AgriculturalWeatherWidget;
