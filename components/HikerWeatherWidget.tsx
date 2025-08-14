import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions, StatusBar } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { 
  Mountain, 
  Thermometer, 
  Wind, 
  Eye, 
  CloudRain, 
  SunMedium,
  AlertTriangle,
  Clock,
  MapPin,
  Heart,
  Compass,
  TreePine,
  TrendingUp,
  Shield,
  Info,
  X,
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';
import { UnifiedWeatherWidget } from './UnifiedWeatherWidget';

import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';

const { height: screenHeight } = Dimensions.get('window');

interface HikerWeatherWidgetProps {
  currentWeather?: any;
  synopData?: any;
  hourly?: any;
  forecastData?: any;
}

export const HikerWeatherWidget: React.FC<HikerWeatherWidgetProps> = ({
  currentWeather,
  synopData,
  hourly,
  forecastData
}) => {
  const { theme } = useThemeStore();
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const colors = theme?.colors || {
    primary: '#224A96',
    secondary: '#FECC00',
    background: '#F8FAFC',
    card: '#F8FAFC',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  };

  // Extract weather data relevant for hikers with proper null checks
  const weatherData = {
    temperature: synopData?.temperatura ? parseFloat(synopData.temperatura) : 
                (currentWeather?.temperature || 0),
    humidity: synopData?.wilgotnosc_wzgledna ? parseFloat(synopData.wilgotnosc_wzgledna) : 
             (currentWeather?.humidity || 0),
    windSpeed: synopData?.predkosc_wiatru ? parseFloat(synopData.predkosc_wiatru) : 
               (currentWeather?.windSpeed || 0),
    visibility: synopData?.widocznosc ? parseFloat(synopData.widocznosc) : 
               (currentWeather?.visibility || 10),
    precipitation: currentWeather?.precipitation || 0,
  };

  // Ensure all values are numbers and have fallbacks
  const safeWeatherData = {
    temperature: typeof weatherData.temperature === 'number' ? weatherData.temperature : 0,
    humidity: typeof weatherData.humidity === 'number' ? weatherData.humidity : 0,
    windSpeed: typeof weatherData.windSpeed === 'number' ? weatherData.windSpeed : 0,
    visibility: typeof weatherData.visibility === 'number' ? weatherData.visibility : 10,
    precipitation: typeof weatherData.precipitation === 'number' ? weatherData.precipitation : 0,
  };

  const getHikingConditions = (temp: number, wind: number, visibility: number, precip: number) => {
    let level: 'excellent' | 'good' | 'moderate' | 'poor' | 'dangerous' = 'excellent';
    let conditions = 'Doskonałe warunki';
    
    if (temp < -5 || temp > 35 || wind > 40 || visibility < 1 || precip > 15) {
      level = 'dangerous';
      conditions = 'Niebezpieczne';
    } else if (temp < 0 || temp > 30 || wind > 25 || visibility < 3 || precip > 8) {
      level = 'poor';
      conditions = 'Trudne';
    } else if (temp < 5 || temp > 25 || wind > 15 || visibility < 5 || precip > 3) {
      level = 'moderate';
      conditions = 'Umiarkowane';
    } else if (temp >= 10 && temp <= 20 && wind <= 10 && visibility >= 10 && precip <= 1) {
      level = 'excellent';
      conditions = 'Doskonałe';
    } else {
      level = 'good';
      conditions = 'Dobre';
    }
    
    return { level, conditions };
  };

  const getTrailDifficulty = (temp: number, wind: number, precip: number) => {
    if (temp < 0 || wind > 30 || precip > 10) return { difficulty: 'Wysoka', level: 'poor' as const };
    if (temp < 10 || wind > 20 || precip > 5) return { difficulty: 'Średnia', level: 'moderate' as const };
    if (temp >= 15 && wind <= 10 && precip <= 2) return { difficulty: 'Niska', level: 'excellent' as const };
    return { difficulty: 'Średnia', level: 'good' as const };
  };

  const hikingConditions = getHikingConditions(
    safeWeatherData.temperature, 
    safeWeatherData.windSpeed, 
    safeWeatherData.visibility, 
    safeWeatherData.precipitation
  );
  
  const trailDifficulty = getTrailDifficulty(
    safeWeatherData.temperature, 
    safeWeatherData.windSpeed, 
    safeWeatherData.precipitation
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return colors.success;
      case 'good': return colors.info;
      case 'moderate': return colors.warning;
      case 'poor': return colors.error;
      case 'dangerous': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle size={16} color={colors.success} />;
      case 'good': return <Star size={16} color={colors.info} />;
      case 'moderate': return <AlertCircle size={16} color={colors.warning} />;
      case 'poor': return <AlertTriangle size={16} color={colors.error} />;
      case 'dangerous': return <AlertTriangle size={16} color={colors.error} />;
      default: return <Info size={16} color={colors.textSecondary} />;
    }
  };

  const handlePress = () => {
    setDetailModalVisible(true);
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
  };

  // Przygotuj metryki dla zunifikowanego widgetu
  const metrics = [
    {
      label: 'Temperatura',
      value: `${safeWeatherData.temperature.toFixed(1)}`,
      unit: '°C',
      icon: Thermometer,
      status: safeWeatherData.temperature >= 10 && safeWeatherData.temperature <= 20 ? 'excellent' as const : 
             safeWeatherData.temperature >= 5 && safeWeatherData.temperature <= 25 ? 'good' as const : 'moderate' as const,
      trend: safeWeatherData.temperature > 25 ? 'up' as const : safeWeatherData.temperature < 5 ? 'down' as const : 'stable' as const,
    },
    {
      label: 'Widoczność',
      value: `${safeWeatherData.visibility.toFixed(1)}`,
      unit: 'km',
      icon: Eye,
      status: safeWeatherData.visibility >= 10 ? 'excellent' as const : 
             safeWeatherData.visibility >= 5 ? 'good' as const : 'moderate' as const,
      trend: safeWeatherData.visibility > 15 ? 'up' as const : safeWeatherData.visibility < 3 ? 'down' as const : 'stable' as const,
    },
    {
      label: 'Wiatr',
      value: `${safeWeatherData.windSpeed.toFixed(1)}`,
      unit: 'km/h',
      icon: Wind,
      status: safeWeatherData.windSpeed <= 10 ? 'excellent' as const : 
             safeWeatherData.windSpeed <= 20 ? 'good' as const : 'moderate' as const,
      trend: safeWeatherData.windSpeed > 25 ? 'up' as const : 'stable' as const,
    },
    {
      label: 'UV',
      value: forecastData?.daily?.uv_index_max?.[0]?.toFixed(1) || 'N/A',
      unit: '',
      icon: SunMedium,
      status: (() => {
        const uv = forecastData?.daily?.uv_index_max?.[0];
        if (!uv) return 'moderate' as const;
        if (uv <= 2) return 'excellent' as const;
        if (uv <= 5) return 'good' as const;
        if (uv <= 7) return 'moderate' as const;
        if (uv <= 10) return 'poor' as const;
        return 'dangerous' as const;
      })(),
      trend: 'stable' as const,
    },
    {
      label: 'Warunki',
      value: hikingConditions.conditions,
      icon: Mountain,
      status: hikingConditions.level,
      trend: hikingConditions.level === 'excellent' ? 'up' as const : 
             hikingConditions.level === 'dangerous' ? 'down' as const : 'stable' as const,
    }
  ];

  // Przygotuj ostrzeżenia na podstawie warunków
  const getAlerts = () => {
    const alerts = [];
    const temp = safeWeatherData.temperature;
    const visibility = safeWeatherData.visibility;
    const windSpeed = safeWeatherData.windSpeed;
    const precip = safeWeatherData.precipitation;
    
    if (temp < -5) alerts.push('Ekstremalny mróz');
    if (temp > 35) alerts.push('Ekstremalny upał');
    if (visibility < 2) alerts.push('Bardzo słaba widoczność');
    if (windSpeed > 30) alerts.push('Silny wiatr');
    if (precip > 10) alerts.push('Intensywne opady');
    
    return alerts;
  };

  // Określ jakość danych
  const getDataQuality = () => {
    const hasSynopData = synopData && Object.keys(synopData).length > 0;
    const hasForecastData = forecastData && forecastData.daily && Array.isArray(forecastData.daily.time) && forecastData.daily.time.length > 0;
    
    if (hasSynopData && hasForecastData) return 'high';
    if (hasSynopData || hasForecastData) return 'medium';
    return 'low';
  };

  // Przygotuj informację o ostatniej aktualizacji
  const getLastUpdate = () => {
    if (synopData?.data_pomiaru) {
      const date = new Date(synopData.data_pomiaru);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffHours === 0) return 'Aktualizacja: teraz';
      if (diffHours === 1) return 'Aktualizacja: 1h temu';
      return `Aktualizacja: ${diffHours}h temu`;
    }
    return 'Aktualizacja: nieznana';
  };

  return (
    <>
      <UnifiedWeatherWidget
        title="Pogoda dla Turystyki Pieszej"
        subtitle="Warunki wędrówek i trekkingu"
        icon={Mountain}
        gradientColors={['#224A96', '#1e40af', '#1d4ed8']}
        metrics={metrics}
        onPress={() => setDetailModalVisible(true)}
        lastUpdate={getLastUpdate()}
        quality={getDataQuality()}
        alerts={getAlerts()}
      />

      {/* Additional Hiking Information Blocks - 2 Columns */}
      <View style={styles.additionalInfoContainer}>
        {/* Safety & Trails Block */}
        <View style={styles.infoBlock}>
          <View style={styles.blockHeader}>
            <Shield size={20} color={colors.success} />
            <Text style={styles.blockTitle}>Bezpieczeństwo i Trasy</Text>
          </View>
          
          <View style={styles.twoColumnGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Trudność Szlaku</Text>
              <Text style={[styles.infoValue, { color: getStatusColor(trailDifficulty.level) }]}>
                {trailDifficulty.difficulty}
              </Text>
              <Text style={styles.infoDescription}>
                {trailDifficulty.level === 'excellent' ? 'Idealne warunki' :
                 trailDifficulty.level === 'good' ? 'Dobre warunki' :
                 trailDifficulty.level === 'moderate' ? 'Wymaga uwagi' : 'Trudne warunki'}
              </Text>
            </View>
            
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Czas Wędrówki</Text>
              <Text style={styles.infoValue}>
                {safeWeatherData.temperature >= 15 && safeWeatherData.windSpeed <= 10 ? 'Optymalny' :
                 safeWeatherData.temperature >= 10 && safeWeatherData.windSpeed <= 15 ? 'Dobry' : 'Wymaga planowania'}
              </Text>
              <Text style={styles.infoDescription}>
                {safeWeatherData.temperature >= 15 && safeWeatherData.windSpeed <= 10 ? 'Szybkie tempo' :
                 safeWeatherData.temperature >= 10 && safeWeatherData.windSpeed <= 15 ? 'Normalne tempo' : 'Wolniejsze tempo'}
              </Text>
            </View>
          </View>
          
          <View style={styles.safetyIndicator}>
            <View style={styles.safetyIcon}>
              {getStatusIcon(hikingConditions.level)}
            </View>
            <Text style={styles.safetyText}>
              Warunki wędrówki: {hikingConditions.conditions}
            </Text>
          </View>
        </View>

        {/* Recommendations Block */}
        <View style={styles.infoBlock}>
          <View style={styles.blockHeader}>
            <Compass size={20} color={colors.info} />
            <Text style={styles.blockTitle}>Rekomendacje</Text>
          </View>
          
          <View style={styles.twoColumnGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Ekwipunek</Text>
              <Text style={styles.infoValue}>
                {safeWeatherData.temperature < 5 ? 'Ciepłe ubranie' :
                 safeWeatherData.temperature > 25 ? 'Lekkie ubranie' : 'Standardowe'}
              </Text>
              <Text style={styles.infoDescription}>
                {safeWeatherData.precipitation > 5 ? 'Płaszcz przeciwdeszczowy' :
                 safeWeatherData.windSpeed > 20 ? 'Kurtka wiatroszczelna' : 'Standardowe wyposażenie'}
              </Text>
            </View>
            
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Nawodnienie</Text>
              <Text style={styles.infoValue}>
                {safeWeatherData.temperature > 20 ? '2-3L wody' :
                 safeWeatherData.temperature > 10 ? '1.5-2L wody' : '1-1.5L wody'}
              </Text>
              <Text style={styles.infoDescription}>
                {safeWeatherData.temperature > 20 ? 'Wysokie zapotrzebowanie' :
                 safeWeatherData.temperature > 10 ? 'Średnie zapotrzebowanie' : 'Standardowe zapotrzebowanie'}
              </Text>
            </View>
          </View>
          
          <View style={styles.recommendationTip}>
            <TreePine size={16} color={colors.success} />
            <Text style={styles.tipText}>
              {safeWeatherData.visibility < 5 ? 'Używaj mapy i kompasu' :
               safeWeatherData.windSpeed > 25 ? 'Unikaj otwartych przestrzeni' :
               safeWeatherData.temperature < 0 ? 'Sprawdź warunki lawinowe' : 'Doskonałe warunki do wędrówki'}
            </Text>
          </View>
        </View>
      </View>

      {/* Long-term Forecast Section */}
      {forecastData && forecastData.daily ? (
        <View style={styles.forecastSection}>
          <View style={styles.forecastHeader}>
            <Clock size={20} color={colors.info} />
            <Text style={styles.forecastTitle}>Prognoza 14-dniowa</Text>
          </View>

          
          {/* Hiking Insights from Long-term Forecast */}
          {forecastData?.daily && forecastData.daily.temperature_2m_max && forecastData.daily.precipitation_probability_max && (
            <View style={styles.hikingInsights}>
              <View style={styles.insightsHeader}>
                <Compass size={18} color={colors.success} />
                <Text style={styles.insightsTitle}>Wskazówki dla Wędrówek</Text>
              </View>
              
              <View style={styles.insightsGrid}>
                <View style={styles.insightCard}>
                  <Text style={styles.insightLabel}>Najlepsze Dni</Text>
                  <Text style={styles.insightValue}>
                    {(() => {
                      const daily = forecastData.daily;
                      if (!daily.temperature_2m_max || !daily.precipitation_probability_max || !daily.windspeed_10m_max) return 'Brak danych';
                      
                      const bestDays = daily.temperature_2m_max
                        .map((temp: number, index: number) => ({
                          temp,
                          precip: daily.precipitation_probability_max?.[index] || 0,
                          wind: daily.windspeed_10m_max?.[index] || 0,
                          date: daily.time?.[index]
                        }))
                        .filter((day: any) => day.temp >= 10 && day.temp <= 25 && day.precip < 30 && day.wind < 20)
                        .slice(0, 3);
                      
                      if (bestDays.length === 0) return 'Brak optymalnych dni';
                      return bestDays.map((day: any) => 
                        new Date(day.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
                      ).join(', ');
                    })()}
                  </Text>
                </View>
                
                <View style={styles.insightCard}>
                  <Text style={styles.insightLabel}>Unikaj Dni</Text>
                  <Text style={styles.insightValue}>
                    {(() => {
                      const daily = forecastData.daily;
                      if (!daily.temperature_2m_max || !daily.precipitation_probability_max || !daily.windspeed_10m_max) return 'Brak danych';
                      
                      const badDays = daily.temperature_2m_max
                        .map((temp: number, index: number) => ({
                          temp,
                          precip: daily.precipitation_probability_max?.[index] || 0,
                          wind: daily.windspeed_10m_max?.[index] || 0,
                          date: daily.time?.[index]
                        }))
                        .filter((day: any) => day.temp < 0 || day.temp > 30 || day.precip > 60 || day.wind > 30)
                        .slice(0, 3);
                      
                      if (badDays.length === 0) return 'Wszystkie dni OK';
                      return badDays.map((day: any) => 
                        new Date(day.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
                      ).join(', ');
                    })()}
                  </Text>
                </View>
              </View>
              
              <View style={styles.weeklyTrend}>
                <Text style={styles.trendLabel}>Trend Tygodniowy:</Text>
                <Text style={styles.trendText}>
                  {(() => {
                    const daily = forecastData.daily;
                    if (!daily.temperature_2m_max) return 'Brak danych';
                    
                    const temps = daily.temperature_2m_max.slice(0, 7);
                    const avgTemp = temps.reduce((sum: number, temp: number) => sum + temp, 0) / temps.length;
                    const nextWeekTemps = daily.temperature_2m_max.slice(7, 14);
                    const nextWeekAvg = nextWeekTemps.reduce((sum: number, temp: number) => sum + temp, 0) / nextWeekTemps.length;
                    
                    if (nextWeekAvg > avgTemp + 2) return 'Ocieplenie w przyszłym tygodniu';
                    if (nextWeekAvg < avgTemp - 2) return 'Ochłodzenie w przyszłym tygodniu';
                    return 'Stabilne temperatury';
                  })()}
                </Text>
              </View>
              
              {/* Detailed Hiking Recommendations */}
              <View style={styles.detailedRecommendations}>
                <Text style={styles.detailedRecommendationsTitle}>Szczegółowe Rekomendacje</Text>
                
                <View style={styles.detailedRecommendationItem}>
                  <View style={styles.detailedRecommendationIcon}>
                    <Mountain size={16} color={colors.success} />
                  </View>
                  <View style={styles.detailedRecommendationContent}>
                    <Text style={styles.detailedRecommendationHeader}>Optymalny Czas Wędrówki</Text>
                    <Text style={styles.detailedRecommendationDescription}>
                      {(() => {
                        const daily = forecastData.daily;
                        if (!daily.temperature_2m_max || !daily.precipitation_probability_max) return 'Sprawdź prognozę przed wyjściem';
                        
                        const morningTemps = daily.temperature_2m_min?.slice(0, 3) || [];
                        const afternoonTemps = daily.temperature_2m_max?.slice(0, 3) || [];
                        const precip = daily.precipitation_probability_max?.slice(0, 3) || [];
                        
                        const avgMorning = morningTemps.reduce((sum: number, temp: number) => sum + temp, 0) / morningTemps.length;
                        const avgAfternoon = afternoonTemps.reduce((sum: number, temp: number) => sum + temp, 0) / afternoonTemps.length;
                        const avgPrecip = precip.reduce((sum: number, prob: number) => sum + prob, 0) / precip.length;
                        
                        if (avgPrecip < 20 && avgAfternoon < 25) return 'Rano i popołudniu - unikaj południa w upalne dni';
                        if (avgPrecip > 40) return 'Sprawdź prognozę godzinową - możliwe przelotne opady';
                        if (avgMorning < 5) return 'Poczekaj na ocieplenie - rano może być zimno';
                        return 'Dobry czas na wędrówki przez cały dzień';
                      })()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailedRecommendationItem}>
                  <View style={styles.detailedRecommendationIcon}>
                    <Shield size={16} color={colors.warning} />
                  </View>
                  <View style={styles.detailedRecommendationContent}>
                    <Text style={styles.detailedRecommendationHeader}>Uwagi Bezpieczeństwa</Text>
                    <Text style={styles.detailedRecommendationDescription}>
                      {(() => {
                        const daily = forecastData.daily;
                        if (!daily.temperature_2m_max || !daily.windspeed_10m_max || !daily.uv_index_max) return 'Zawsze sprawdź aktualne warunki';
                        
                        const maxTemp = Math.max(...daily.temperature_2m_max.slice(0, 7));
                        const maxWind = Math.max(...daily.windspeed_10m_max.slice(0, 7));
                        const maxUV = Math.max(...daily.uv_index_max.slice(0, 7));
                        
                        const warnings = [];
                        if (maxTemp > 30) warnings.push('Upał - zabierz dużo wody');
                        if (maxWind > 25) warnings.push('Silny wiatr - unikaj otwartych przestrzeni');
                        if (maxUV > 7) warnings.push('Wysokie UV - krem z filtrem SPF 50+');
                        if (maxTemp < 0) warnings.push('Mróz - ciepłe ubranie i sprzęt');
                        
                        return warnings.length > 0 ? warnings.join(', ') : 'Brak szczególnych zagrożeń';
                      })()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailedRecommendationItem}>
                  <View style={styles.detailedRecommendationIcon}>
                    <Compass size={16} color={colors.info} />
                  </View>
                  <View style={styles.detailedRecommendationContent}>
                    <Text style={styles.detailedRecommendationHeader}>Planowanie Trasy</Text>
                    <Text style={styles.detailedRecommendationDescription}>
                      {(() => {
                        const daily = forecastData.daily;
                        if (!daily.temperature_2m_max || !daily.precipitation_probability_max) return 'Planuj trasę z uwzględnieniem pogody';
                        
                        const weekendDays = daily.time?.slice(0, 14).filter((date: string, index: number) => {
                          const day = new Date(date).getDay();
                          return day === 0 || day === 6; // Sunday or Saturday
                        }) || [];
                        
                        const weekendTemps = weekendDays.map((date: string) => {
                          const index = daily.time.indexOf(date);
                          return daily.temperature_2m_max?.[index] || 0;
                        });
                        
                        const weekendPrecip = weekendDays.map((date: string) => {
                          const index = daily.time.indexOf(date);
                          return daily.precipitation_probability_max?.[index] || 0;
                        });
                        
                        if (weekendTemps.length === 0) return 'Sprawdź prognozę weekendową';
                        
                        const bestWeekend = weekendTemps.findIndex((temp: number, index: number) => 
                          temp >= 10 && temp <= 25 && weekendPrecip[index] < 30
                        );
                        
                        if (bestWeekend >= 0) {
                          const date = new Date(weekendDays[bestWeekend]);
                          return `Najlepszy weekend: ${date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}`;
                        }
                        
                        return 'Weekendy mogą być trudne - sprawdź szczegóły';
                      })()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.forecastSection}>
          <View style={styles.forecastHeader}>
            <Clock size={20} color={colors.info} />
            <Text style={styles.forecastTitle}>Prognoza 14-dniowa</Text>
          </View>
          <View style={styles.noForecastData}>
            <Text style={styles.noForecastDataText}>Brak danych prognostycznych</Text>
            <Text style={styles.noForecastDataSubtext}>Sprawdź połączenie z internetem i spróbuj ponownie</Text>
          </View>
        </View>
      )}

      {/* Sheets Style Modal for 14-day Forecast */}
      <Modal
        visible={detailModalVisible}
        animationType="none"
        presentationStyle="pageSheet"
        onRequestClose={closeDetailModal}
        transparent
      >
        <StatusBar backgroundColor="rgba(0,0,0,0.8)" barStyle="light-content" />
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header with gradient */}
            <LinearGradient
              colors={['#224A96', '#1e40af', '#1d4ed8']}
              style={styles.modalHeader}
            >
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalHeaderLeft}>
                  <View style={styles.modalHeaderIcon}>
                    <Mountain size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.modalHeaderText}>
                    <Text style={styles.modalTitle}>Prognoza 14-dniowa</Text>
                    <Text style={styles.modalSubtitle}>Szczegółowe warunki dla turystyki pieszej</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} onPress={closeDetailModal}>
                  <X size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Current Conditions Summary */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Aktualne Warunki</Text>
                <View style={styles.currentConditionsGrid}>
                  <View style={styles.conditionCard}>
                    <Thermometer size={24} color={colors.primary} />
                    <Text style={styles.conditionValue}>{safeWeatherData.temperature.toFixed(1)}°C</Text>
                    <Text style={styles.conditionLabel}>Temperatura</Text>
                  </View>
                  <View style={styles.conditionCard}>
                    <Wind size={24} color={colors.primary} />
                    <Text style={styles.conditionValue}>{safeWeatherData.windSpeed.toFixed(1)} km/h</Text>
                    <Text style={styles.conditionLabel}>Wiatr</Text>
                  </View>
                  <View style={styles.conditionCard}>
                    <Eye size={24} color={colors.primary} />
                    <Text style={styles.conditionValue}>{safeWeatherData.visibility.toFixed(1)} km</Text>
                    <Text style={styles.conditionLabel}>Widoczność</Text>
                  </View>
                  <View style={styles.conditionCard}>
                    <CloudRain size={24} color={colors.primary} />
                    <Text style={styles.conditionValue}>{safeWeatherData.precipitation.toFixed(1)} mm</Text>
                    <Text style={styles.conditionLabel}>Opady</Text>
                  </View>
                  <View style={styles.conditionCard}>
                    <SunMedium size={24} color={colors.primary} />
                    <Text style={styles.conditionValue}>
                      {forecastData?.daily?.uv_index_max?.[0]?.toFixed(1) || 'N/A'}
                    </Text>
                    <Text style={styles.conditionLabel}>Indeks UV</Text>
                  </View>
                </View>
              </View>

              {/* Hiking Conditions Assessment */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Ocena Warunków Wędrówki</Text>
                <View style={styles.assessmentCard}>
                  <View style={styles.assessmentHeader}>
                    <View style={[styles.assessmentIcon, { backgroundColor: getStatusColor(hikingConditions.level) + '20' }]}>
                      {getStatusIcon(hikingConditions.level)}
                    </View>
                    <View style={styles.assessmentText}>
                      <Text style={styles.assessmentTitle}>{hikingConditions.conditions}</Text>
                      <Text style={styles.assessmentDescription}>
                        {hikingConditions.level === 'excellent' ? 'Idealne warunki do wędrówek' :
                         hikingConditions.level === 'good' ? 'Dobre warunki do wędrówek' :
                         hikingConditions.level === 'moderate' ? 'Wymaga uwagi i planowania' :
                         hikingConditions.level === 'poor' ? 'Trudne warunki - rozważ przełożenie' :
                         'Niebezpieczne warunki - odradzamy wędrówki'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 14-Day Forecast */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Prognoza 14-dniowa</Text>
      
              </View>

              {/* Safety Recommendations */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Rekomendacje Bezpieczeństwa</Text>
                <View style={styles.recommendationsList}>
                  {getAlerts().map((alert, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <AlertTriangle size={16} color={colors.warning} />
                      <Text style={styles.recommendationText}>{alert}</Text>
                    </View>
                  ))}
                  {getAlerts().length === 0 && (
                    <View style={styles.recommendationItem}>
                      <CheckCircle size={16} color={colors.success} />
                      <Text style={styles.recommendationText}>Brak szczególnych zagrożeń</Text>
                    </View>
                  )}
                </View>
              </View>



              {/* Equipment Recommendations */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Rekomendowany Ekwipunek</Text>
                <View style={styles.equipmentGrid}>
                  <View style={styles.equipmentCard}>
                    <Text style={styles.equipmentTitle}>Odzież</Text>
                    <Text style={styles.equipmentText}>
                      {safeWeatherData.temperature < 5 ? 'Ciepła kurtka, rękawice, czapka' :
                       safeWeatherData.temperature > 25 ? 'Lekkie, przewiewne ubranie' :
                       'Standardowa odzież turystyczna'}
                    </Text>
                  </View>
                  <View style={styles.equipmentCard}>
                    <Text style={styles.equipmentTitle}>Ochrona</Text>
                    <Text style={styles.equipmentText}>
                      {safeWeatherData.precipitation > 5 ? 'Płaszcz przeciwdeszczowy, nieprzemakalne buty' :
                       safeWeatherData.windSpeed > 20 ? 'Kurtka wiatroszczelna' :
                       'Standardowa ochrona'}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 8,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    maxHeight: 600,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: 'Poppins_Bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Poppins_Regular',
    color: '#64748B',
  },
  clickIndicator: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  content: {
    gap: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  ratingTitle: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Poppins_Medium',
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Poppins_Bold',
  },
  ratingDescription: {
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
    fontFamily: 'Poppins_Regular',
    lineHeight: 14,
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  weatherCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minHeight: 90,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weatherIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  weatherValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Poppins_Bold',
    color: '#1E293B',
  },
  weatherLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Poppins_Medium',
    color: '#64748B',
  },
  recommendationsContainer: {
    gap: 12,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
    marginBottom: 8,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_Bold',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    color: '#FFFFFF',
    marginTop: 4,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
    marginBottom: 16,
  },
  currentConditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  conditionCard: {
    flex: 1,
    minWidth: '48%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  conditionValue: {
    fontSize: 24,
    fontFamily: 'Poppins_Bold',
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 4,
  },
  conditionLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  assessmentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  assessmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
  },
  assessmentText: {
    flex: 1,
  },
  assessmentTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  assessmentDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  equipmentCard: {
    flex: 1,
    minWidth: '48%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  equipmentTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
    marginBottom: 8,
  },
  equipmentText: {
    fontSize: 13,
    fontFamily: 'Poppins_Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  // New styles for additional info blocks
  additionalInfoContainer: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 16,
  },
  infoBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  blockTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
  },
  twoColumnGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
    color: '#64748B',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontFamily: 'Poppins_Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    fontFamily: 'Poppins_Regular',
    color: '#64748B',
    lineHeight: 18,
  },
  safetyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  safetyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
  },
  safetyText: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
    color: '#64748B',
    flex: 1,
    lineHeight: 20,
  },
  recommendationTip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
    color: '#64748B',
    flex: 1,
    lineHeight: 20,
  },
  // New styles for forecast section
  forecastSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  forecastTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
  },
  // New styles for hiking insights
  hikingInsights: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  insightsTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  insightCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  insightLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
    color: '#64748B',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 18,
    fontFamily: 'Poppins_Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  weeklyTrend: {
    marginTop: 12,
  },
  trendLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
    color: '#64748B',
    marginBottom: 8,
  },
  trendText: {
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  // Styles for detailed recommendations
  detailedRecommendations: {
    marginTop: 16,
  },
  detailedRecommendationsTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
    marginBottom: 12,
  },
  detailedRecommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  detailedRecommendationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    marginTop: 2,
  },
  detailedRecommendationContent: {
    flex: 1,
  },
  detailedRecommendationHeader: {
    fontSize: 14,
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  detailedRecommendationDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_Regular',
    color: '#64748B',
    lineHeight: 18,
  },
  noForecastData: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noForecastDataText: {
    fontSize: 16,
    fontFamily: 'Poppins_SemiBold',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  noForecastDataSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    color: '#94A3B8',
    textAlign: 'center',
  },
  // New styles for modal overlay and container
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  recommendationText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins_Medium',
    color: '#64748B',
    flex: 1,
    lineHeight: 20,
  },
});