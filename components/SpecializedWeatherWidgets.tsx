import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { 
  Target, Star, Info, X, TrendingUp, TrendingDown, Minus, CheckCircle, 
  AlertTriangle, Shield, Thermometer, Droplets, CloudRain, Wind, Eye, 
  Compass, Zap, Activity, Car, Navigation, Snowflake, AlertCircle, 
  Camera, Heart, Bike, Mountain, Waves, Sprout, Sun, Cloud, Gauge, 
  Leaf, Clock, MountainSnow, CloudLightning, CloudSnow, CloudFog, Anchor,
  CloudDrizzle,
  Moon,
  CloudOff
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import AgriculturalWeatherWidget from './AgriculturalWeatherWidget';
import { MarineWeatherWidget } from './MarineWeatherWidget';
import { SportsWeatherWidget } from './SportsWeatherWidget';
import { DriverWeatherWidget } from './DriverWeatherWidget';

const { width, height } = Dimensions.get('window');

interface SpecializedWeatherWidgetsProps {
  weatherData: any;
  forecastData: any;
  meteoData: any;
  airQualityData: any;
  synopData: any;
  marineData?: any | null;
  showAgricultural?: boolean;
  showMarine?: boolean;
  showDriving?: boolean;
  sourceNotes?: string[];
  dataSources?: { label: string; source: string }[];
}

const SpecializedWeatherWidgets: React.FC<SpecializedWeatherWidgetsProps> = ({
  weatherData,
  forecastData,
  meteoData,
  airQualityData,
  synopData,
  marineData,
  sourceNotes,
  dataSources,
  showAgricultural = true,
  showMarine = true,
  showDriving = true,
}) => {
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(height));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { theme } = useThemeStore();
  
  // Enhanced data processing functions
  const getAgriculturalData = () => {
    if (!weatherData) return null;
    
    const currentTemp = weatherData.temperature || weatherData.temp || 0;
    const humidity = weatherData.humidity || 0;
    const windSpeed = weatherData.windSpeed || 0;
    const pressure = weatherData.pressure || 0;
    const precipitation = weatherData.precipitation || 0;
    // Soil temp: prefer METEO (nearest with soil), fallback to undefined
    const soilTempRaw = meteoData?.temperatura_gruntu ?? null;
    const soilTemp = soilTempRaw != null ? Number(soilTempRaw) : null;
    // removed 10-min metrics per request
    const meteoHumidityRaw = meteoData?.wilgotnosc_wzgledna ?? null;
    const meteoHumidity = meteoHumidityRaw != null ? Number(meteoHumidityRaw) : null;
    
    // Calculate agricultural indices
    const frostRisk = currentTemp < 2 ? 'Średnie' : currentTemp < 0 ? 'Wysokie' : 'Niskie';
    const growthIndex = currentTemp > 15 && humidity > 60 ? 'Optymalny' : 'Umiarkowany';
    const irrigationNeeded = humidity < 50 && precipitation < 5 ? 'Wymagane' : 'Nie wymagane';
    
    return {
      temperature: `${currentTemp.toFixed(1)}°C`,
      humidity: `${(humidity || meteoHumidity || 0)}%`,
      precipitation: `${precipitation}mm`,
      windSpeed: `${windSpeed} km/h`,
      pressure: `${pressure}hPa`,
      soilTemperature: soilTemp != null && Number.isFinite(soilTemp) ? `${soilTemp.toFixed(1)}°C` : '—',
      frostRisk,
      growthIndex,
      irrigationNeeded
    };
  };

  const getMarineData = () => {
    if (!weatherData) return null;
    
    const windSpeed = weatherData.windSpeed || 0;
    const visibility = weatherData.visibility || 10;
    const temperature = weatherData.temperature || weatherData.temp || 0;
    
    // Calculate marine conditions
    const waveHeight = windSpeed > 20 ? '2.5m' : windSpeed > 15 ? '1.8m' : '1.2m';
    const waveDirection = '45°'; // Simplified
    const waterTemp = Math.max(0, temperature - 2).toFixed(1) + '°C';
    const currentSpeed = windSpeed > 15 ? '3 węzły' : '2 węzły';
    const sailingConditions = windSpeed < 25 && visibility > 5 ? 'Dobre' : 'Umiarkowane';
    const warnings = windSpeed > 30 ? 'Silny wiatr' : 'Brak';
    
    return {
      waveHeight,
      waveDirection,
      waterTemp,
      currentSpeed,
      visibility,
      sailingConditions,
      warnings
    };
  };

  const getSportsData = () => {
    if (!weatherData) return null;
    
    const temperature = weatherData.temperature || weatherData.temp || 0;
    const humidity = weatherData.humidity || 0;
    const windSpeed = weatherData.windSpeed || 0;
    const uvIndex = 0; // brak użycia prognoz – tylko dane z API IMGW/aktualne
    const airQuality = weatherData.airQuality || 0;
    
    // Enhanced sports conditions calculation
    let activityLevel = 'Optymalny';
    if (temperature < 5 || temperature > 30) {
      activityLevel = 'Niski';
    } else if (temperature >= 15 && temperature <= 25) {
      activityLevel = 'Optymalny';
    } else if (temperature >= 10 && temperature <= 28) {
      activityLevel = 'Dobry';
    } else {
      activityLevel = 'Umiarkowany';
    }
    
    // Running conditions
    let runningConditions = 'Dobre';
    if (temperature < 5 || temperature > 25 || humidity > 80) {
      runningConditions = 'Umiarkowane';
    } else if (temperature < 0 || temperature > 30) {
      runningConditions = 'Niekorzystne';
    }
    
    // Cycling conditions
    let cyclingConditions = 'Dobre';
    if (windSpeed > 20 || temperature < 5 || temperature > 30) {
      cyclingConditions = 'Umiarkowane';
    } else if (windSpeed > 30 || temperature < 0 || temperature > 35) {
      cyclingConditions = 'Niekorzystne';
    }
    
    // Team sports conditions
    let teamSportsConditions = 'Dobre';
    if (temperature < 10 || temperature > 28 || humidity > 85) {
      teamSportsConditions = 'Umiarkowane';
    } else if (temperature < 5 || temperature > 32) {
      teamSportsConditions = 'Niekorzystne';
    }
    
    // Hydration recommendations
    let hydrationRecommendation = 'Normalne';
    if (temperature > 25 || humidity > 70) {
      hydrationRecommendation = 'Zwiększone';
    } else if (temperature > 30) {
      hydrationRecommendation = 'Wysokie';
    }
    
    return {
      temperature,
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

  const getDrivingData = () => {
    if (!weatherData) return null;
    
    const temperature = weatherData.temperature || weatherData.temp || 0;
    const visibility = weatherData.visibility || 10;
    const precipitation = weatherData.precipitation || 0;
    const windSpeed = weatherData.windSpeed || 0;
    const humidity = weatherData.humidity || 0;
    
    // Enhanced road condition assessment
    let roadCondition = 'Suche';
    let roadStatus: 'excellent' | 'good' | 'moderate' | 'poor' = 'excellent';
    
    if (temperature <= 2 && precipitation > 0) {
      roadCondition = 'Możliwy lód';
      roadStatus = 'poor';
    } else if (temperature <= 0 && humidity > 90) {
      roadCondition = 'Możliwy szron';
      roadStatus = 'moderate';
    } else if (precipitation > 5) {
      roadCondition = 'Mokre';
      roadStatus = 'moderate';
    } else if (precipitation > 0) {
      roadCondition = 'Lekko mokre';
      roadStatus = 'good';
    }
    
    // Safety level calculation
    let safetyLevel = 'Wysokie';
    if (visibility < 2 || (temperature <= 0 && precipitation > 0) || windSpeed > 50) {
      safetyLevel = 'Niskie';
    } else if (visibility < 5 || precipitation > 5 || windSpeed > 30) {
      safetyLevel = 'Średnie';
    }
    
    // Speed recommendations
    let speedRecommendation = 'Normalna';
    if (visibility < 2 || roadStatus === 'poor') {
      speedRecommendation = 'Zmniejsz do 50%';
    } else if (visibility < 5 || roadStatus === 'moderate') {
      speedRecommendation = 'Zmniejsz do 70%';
    }
    
    // Tire recommendations
    let tireRecommendation = 'Letnie';
    if (temperature <= 7) {
      tireRecommendation = 'Zimowe';
    } else if (temperature <= 15) {
      tireRecommendation = 'Przejściowe';
    }
    
    return {
      temperature,
      visibility,
      precipitation,
      windSpeed,
      humidity,
      roadCondition,
      roadStatus,
      safetyLevel,
      speedRecommendation,
      tireRecommendation
    };
  };

  // Animation values
  useEffect(() => {
    console.log('useEffect triggered, modalVisible:', modalVisible);
    if (modalVisible) {
      console.log('Modal is now visible, starting animations...');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      console.log('Modal is closing, resetting animations...');
      fadeAnim.setValue(0);
      slideAnim.setValue(height);
      scaleAnim.setValue(0.95);
    }
  }, [modalVisible]);

  const handleWidgetPress = (widgetType: string) => {
    console.log('Widget pressed:', widgetType);
    console.log('Setting selectedWidget to:', widgetType);
    console.log('Setting modalVisible to true');
    setSelectedWidget(widgetType);
    setModalVisible(true);
    console.log('Modal state after setState:', { selectedWidget: widgetType, modalVisible: true });
  };

  const closeModal = () => {
    console.log('Closing modal...');
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedWidget(null);
    });
  };

  const refreshData = () => {
    // In a real app, you would fetch new data here
    // For now, we'll just update the last refresh time
    setLastRefresh(new Date());
  };

  const getWidgetDetails = (widgetType: string) => {
    switch (widgetType) {
      case 'agricultural':
        const agriData = getAgriculturalData();
        return {
          title: 'Pogoda Rolnicza',
          subtitle: 'Warunki dla upraw i hodowli',
          icon: Sprout,
          color: '#10b981',
          gradient: ['#10b981', '#059669', '#047857'] as const,
          data: {
            'Temperatura': { value: agriData?.temperature || 'N/A', icon: Thermometer, status: 'good' as const },
            'Wilgotność': { value: agriData?.humidity || 'N/A', icon: Droplets, status: 'good' as const },
            'Opady': { value: agriData?.precipitation || 'N/A', icon: CloudRain, status: 'good' as const },
            'Wiatr': { value: agriData?.windSpeed || 'N/A', icon: Wind, status: 'good' as const },
            'Ciśnienie': { value: agriData?.pressure || 'N/A', icon: Gauge, status: 'good' as const },
            ...(agriData?.soilTemperature ? { 'Temperatura gleby': { value: agriData.soilTemperature, icon: Thermometer, status: 'good' as const } } : {}),
          },
          recommendations: {
            'Ryzyko przymrozków': { value: agriData?.frostRisk || 'N/A', icon: Snowflake, status: 'good' as const },
            'Indeks wzrostu': { value: agriData?.growthIndex || 'N/A', icon: TrendingUp, status: 'good' as const },
            'Nawadnianie': { value: agriData?.irrigationNeeded || 'N/A', icon: Droplets, status: 'good' as const },
          },
          additionalInfo: {
            'Ostatnia aktualizacja': { value: lastRefresh.toLocaleTimeString('pl-PL'), icon: Clock, status: 'Aktualne' },
            'Źródła danych': { value: [
              'IMGW (danepubliczne.imgw.pl)',
              ...(Array.isArray(dataSources) ? dataSources.map(d => `${d.label}: ${d.source}`) : [])
            ].join(' • '), icon: Info, status: '' },
            ...(synopData?.stacja ? { 'Stacja IMGW': { value: synopData.stacja, icon: Info, status: '' } } : {}),
          }
        };

      case 'marine':
        const marineData = getMarineData();
        return {
          title: 'Pogoda Morska',
          subtitle: 'Warunki żeglarskie i morskie',
          icon: Waves,
          color: '#3b82f6',
          gradient: ['#3b82f6', '#2563eb', '#1d4ed8'] as const,
          data: {
            'Wysokość fal': { value: marineData?.waveHeight || 'N/A', icon: Waves, status: 'good' as const },
            'Kierunek fal': { value: marineData?.waveDirection || 'N/A', icon: Compass, status: 'good' as const },
            'Temperatura wody': { value: marineData?.waterTemp || 'N/A', icon: Thermometer, status: 'good' as const },
            'Prąd morski': { value: marineData?.currentSpeed || 'N/A', icon: TrendingUp, status: 'good' as const },
            'Widoczność': { value: `${marineData?.visibility || 10}km`, icon: Eye, status: 'good' as const },
          },
          recommendations: {
            'Warunki żeglarskie': { value: marineData?.sailingConditions || 'N/A', icon: Anchor, status: 'good' as const },
            'Ostrzeżenia': { value: marineData?.warnings || 'N/A', icon: AlertTriangle, status: 'good' as const },
            'Bezpieczeństwo': { value: 'Sprawdź przed wyjściem', icon: Shield, status: 'good' as const },
          },
          additionalInfo: {
            'Ostatnia aktualizacja': { value: lastRefresh.toLocaleTimeString('pl-PL'), icon: Clock, status: 'Aktualne' },
            'Źródła danych': { value: [
              'IMGW (danepubliczne.imgw.pl)',
              ...(Array.isArray(dataSources) ? dataSources.map(d => `${d.label}: ${d.source}`) : [])
            ].join(' • '), icon: Info, status: '' },
            ...(synopData?.stacja ? { 'Stacja IMGW': { value: synopData.stacja, icon: Info, status: '' } } : {}),
          }
        };

      case 'driving':
        const drivingData = getDrivingData();
        return {
          title: 'Pogoda dla Kierowców',
          subtitle: 'Warunki drogowe i bezpieczeństwo',
          icon: Car,
          color: '#7c3aed',
          gradient: ['#7c3aed', '#a855f7', '#c084fc'] as const,
          data: {
            'Widoczność': { value: `${drivingData?.visibility || 10}km`, icon: Eye, status: drivingData?.visibility >= 8 ? 'excellent' as const : drivingData?.visibility >= 5 ? 'good' as const : 'moderate' as const },
            'Stan drogi': { value: drivingData?.roadCondition || 'N/A', icon: Navigation, status: drivingData?.roadStatus || 'good' as const },
            'Temperatura': { value: `${drivingData?.temperature || 0}°C`, icon: Thermometer, status: drivingData?.temperature >= 5 && drivingData?.temperature <= 25 ? 'excellent' as const : 'good' as const },
            'Opady': { value: `${drivingData?.precipitation || 0}mm`, icon: CloudRain, status: drivingData?.precipitation === 0 ? 'excellent' as const : drivingData?.precipitation < 5 ? 'good' as const : 'moderate' as const },
            'Wiatr': { value: `${drivingData?.windSpeed || 0} km/h`, icon: Wind, status: drivingData?.windSpeed < 30 ? 'excellent' as const : drivingData?.windSpeed < 50 ? 'good' as const : 'moderate' as const },
          },
          recommendations: {
            'Bezpieczeństwo': { value: drivingData?.safetyLevel || 'N/A', icon: Shield, status: 'good' as const },
            'Prędkość': { value: drivingData?.speedRecommendation || 'N/A', icon: TrendingUp, status: 'good' as const },
            'Opony': { value: drivingData?.tireRecommendation || 'N/A', icon: Car, status: 'good' as const },
          },
          additionalInfo: {
            'Ostatnia aktualizacja': { value: lastRefresh.toLocaleTimeString('pl-PL'), icon: Clock, status: 'Aktualne' },
            'Źródła danych': { value: [
              'IMGW (danepubliczne.imgw.pl)',
              ...(Array.isArray(dataSources) ? dataSources.map(d => `${d.label}: ${d.source}`) : [])
            ].join(' • '), icon: Info, status: '' },
            ...(synopData?.stacja ? { 'Stacja IMGW': { value: synopData.stacja, icon: Info, status: '' } } : {}),
          }
        };

      case 'sports':
        const sportsData = getSportsData();
        return {
          title: 'Pogoda dla Sportu',
          subtitle: 'Warunki treningowe i aktywności',
          icon: Activity,
          color: '#f59e0b',
          gradient: ['#f59e0b', '#fbbf24', '#fcd34d'] as const,
          data: {
            'Temperatura': { value: `${sportsData?.temperature || 0}°C`, icon: Thermometer, status: sportsData?.temperature >= 15 && sportsData?.temperature <= 25 ? 'excellent' as const : 'good' as const },
            'Indeks UV': { value: `${(sportsData?.uvIndex ?? 0)}/11`, icon: Sun, status: (sportsData?.uvIndex ?? 0) <= 5 ? 'excellent' as const : (sportsData?.uvIndex ?? 0) <= 7 ? 'good' as const : 'moderate' as const },
            'Jakość powietrza': { value: `${sportsData?.airQuality || 0}/500`, icon: Shield, status: sportsData?.airQuality <= 100 ? 'excellent' as const : sportsData?.airQuality <= 150 ? 'good' as const : 'moderate' as const },
            'Warunki treningu': { value: sportsData?.activityLevel || 'N/A', icon: Activity, status: 'good' as const },
            'Wilgotność': { value: `${sportsData?.humidity || 0}%`, icon: Droplets, status: sportsData?.humidity >= 40 && sportsData?.humidity <= 70 ? 'excellent' as const : 'good' as const },
          },
          recommendations: {
            'Bieganie': { value: sportsData?.runningConditions || 'N/A', icon: TrendingUp, status: 'good' as const },
            'Kolarstwo': { value: sportsData?.cyclingConditions || 'N/A', icon: Bike, status: 'good' as const },
            'Sporty zespołowe': { value: sportsData?.teamSportsConditions || 'N/A', icon: Activity, status: 'good' as const },
            'Hydratacja': { value: sportsData?.hydrationRecommendation || 'N/A', icon: Droplets, status: 'good' as const },
          },
          additionalInfo: {
            'Ostatnia aktualizacja': { value: lastRefresh.toLocaleTimeString('pl-PL'), icon: Clock, status: 'Aktualne' },
            'Źródła danych': { value: [
              'IMGW (danepubliczne.imgw.pl)',
              ...(Array.isArray(dataSources) ? dataSources.map(d => `${d.label}: ${d.source}`) : [])
            ].join(' • '), icon: Info, status: '' },
            ...(synopData?.stacja ? { 'Stacja IMGW': { value: synopData.stacja, icon: Info, status: '' } } : {}),
          }
        };

      default:
        return {
          title: 'Pogoda',
          subtitle: 'Informacje pogodowe',
          icon: Cloud,
          color: '#6b7280',
          gradient: ['#6b7280', '#9ca3af', '#d1d5db'] as const,
          data: {},
          recommendations: {},
          additionalInfo: {}
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return colors.success;
      case 'optimal': return colors.success;
      case 'good': return colors.success;
      case 'moderate': return colors.warning;
      case 'high': return colors.error;
      case 'low': return '#6b7280';
      case 'safe': return colors.success;
      case 'comfortable': return colors.success;
      case 'stable': return colors.success;
      case 'required': return colors.warning;
      case 'poor': return colors.error;
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return '#6b7280';
    }
  };

  const getTrendIcon = (trend?: string) => {
    if (!trend) return null;
    switch (trend) {
      case 'up': return <TrendingUp size={16} color={colors.success} />;
      case 'down': return <TrendingDown size={16} color={colors.error} />;
      case 'stable': return <Minus size={16} color={colors.warning} />;
      default: return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimal': return <CheckCircle size={16} color={colors.success} />;
      case 'good': return <Star size={16} color={colors.info} />;
      case 'moderate': return <AlertCircle size={16} color={colors.warning} />;
      case 'high': return <AlertTriangle size={16} color={colors.error} />;
      case 'low': return <Info size={16} color={colors.textSecondary} />;
      case 'safe': return <Shield size={16} color={colors.success} />;
      case 'comfortable': return <Star size={16} color={colors.info} />;
      case 'stable': return <CheckCircle size={16} color={colors.success} />;
      case 'required': return <AlertTriangle size={16} color={colors.warning} />;
      default: return <Info size={16} color={colors.textSecondary} />;
    }
  };

  // Get theme colors with fallback
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

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={styles.widgetsContainer}>
        {showAgricultural && (
          <TouchableOpacity
            style={styles.widgetWrapper}
            onPress={() => {
              console.log('Agricultural widget pressed');
              handleWidgetPress('agricultural');
            }}
            activeOpacity={0.8}
          >
            <AgriculturalWeatherWidget
              weatherData={weatherData}
              forecastData={forecastData}
              meteoData={meteoData}
              onPress={() => handleWidgetPress('agricultural')}
            />
          </TouchableOpacity>
        )}

        {showMarine && (
          <View style={styles.widgetWrapper}>
            <MarineWeatherWidget
              weatherData={weatherData}
              forecastData={forecastData}
              marineData={marineData}
              waterTempC={(weatherData as any)?.waterTempC}
              onPress={() => {
                console.log('Marine widget pressed');
                handleWidgetPress('marine');
              }}
            />
          </View>
        )}

        <View style={styles.widgetWrapper}>
          <SportsWeatherWidget
            weatherData={weatherData}
            forecastData={forecastData}
            airQualityData={airQualityData}
            onPress={() => {
              console.log('Sports widget pressed');
              handleWidgetPress('sports');
            }}
          />
        </View>

        {showDriving && (
          <View style={styles.widgetWrapper}>
            <DriverWeatherWidget
              currentWeather={weatherData}
              synopData={synopData}
              forecastData={forecastData}
              onPress={() => {
                console.log('Driver widget pressed');
                handleWidgetPress('driving');
              }}
            />
          </View>
        )}
      </View>

      {/* Enhanced Modal with Better Styling */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <StatusBar backgroundColor="rgba(0,0,0,0.6)" barStyle={theme?.isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={[styles.modalOverlay, { backgroundColor: theme?.isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)' }]}>
          <Animated.View 
            style={[
              styles.modalContent, 
              { 
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            {selectedWidget && (
              <>
                {/* Drag Indicator */}
                <View style={styles.dragIndicator} />

                {/* Clean Header */}
                <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.modalTitleContainer}>
                    <View style={[styles.modalIconContainer, { backgroundColor: getWidgetDetails(selectedWidget).color + '22' }]}> 
                      {React.createElement(getWidgetDetails(selectedWidget).icon, {
                        size: 24,
                        color: getWidgetDetails(selectedWidget).color,
                        style: styles.modalIcon
                      })}
                    </View>
                    <View style={styles.modalTitleTextContainer}>
                      <Text style={[styles.modalTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.bold || 'Poppins_Bold' }]}>
                        {getWidgetDetails(selectedWidget).title}
                      </Text>
                      <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary, fontFamily: theme?.fontFamily?.regular || 'Poppins_Regular' }]}>
                        {getWidgetDetails(selectedWidget).subtitle}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={closeModal} style={[styles.closeButton, { backgroundColor: theme.colors.background + '33' }]} activeOpacity={0.7}>
                    <X size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.modalBody} 
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Main Parameters Section */}
                  <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.semibold || 'Poppins_SemiBold' }]}>
                      Główne Parametry
                    </Text>
                    <View style={styles.dataGrid}>
                      {Object.entries(getWidgetDetails(selectedWidget).data).map(([key, data]: [string, any], index) => (
                        <Animated.View 
                          key={key} 
                          style={[
                            styles.dataCard, 
                            { 
                              backgroundColor: theme.colors.card, 
                              borderColor: theme.colors.border,
                              opacity: fadeAnim,
                              transform: [{ scale: scaleAnim }]
                            }
                          ]}
                        >
                          <View style={styles.dataCardHeader}>
                            <View style={[styles.dataIconContainer, { backgroundColor: getStatusColor(data.status) + '10' }]}>
                              {React.createElement(data.icon, {
                                size: 20,
                                color: getStatusColor(data.status),
                                style: styles.dataIcon
                              })}
                            </View>
                          </View>
                          <Text style={[styles.dataValue, { color: theme.colors.text, fontFamily: theme?.fontFamily?.bold || 'Poppins_Bold' }]}>
                            {data.value}
                          </Text>
                          <Text style={[styles.dataLabel, { color: theme.colors.textSecondary, fontFamily: theme?.fontFamily?.medium || 'Poppins_Medium' }]}>
                            {key}
                          </Text>
                        </Animated.View>
                      ))}
                    </View>
                  </View>

                  {/* Recommendations Section */}
                  <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.semibold || 'Poppins_SemiBold' }]}>
                      Rekomendacje
                    </Text>
                    <View style={styles.recommendationsGrid}>
                      {Object.entries(getWidgetDetails(selectedWidget).recommendations).map(([key, data]: [string, any], index) => (
                        <Animated.View 
                          key={key} 
                          style={[
                            styles.recommendationCard, 
                            { 
                              backgroundColor: theme.colors.card, 
                              borderColor: theme.colors.border,
                              opacity: fadeAnim,
                              transform: [{ scale: scaleAnim }]
                            }
                          ]}
                        >
                          <View style={styles.recommendationHeader}>
                            <View style={[styles.dataIconContainer, { backgroundColor: getStatusColor(data.status || 'good') + '10' }]}>
                              {React.createElement(data.icon, {
                                size: 20,
                                color: getStatusColor(data.status || 'good'),
                                style: styles.dataIcon
                              })}
                            </View>
                          </View>
                          <Text style={[styles.recommendationValue, { color: theme.colors.text, fontFamily: theme?.fontFamily?.bold || 'Poppins_Bold' }]}>
                            {data.value}
                          </Text>
                          <Text style={[styles.recommendationLabel, { color: theme.colors.textSecondary, fontFamily: theme?.fontFamily?.medium || 'Poppins_Medium' }]}>
                            {key}
                          </Text>
                        </Animated.View>
                      ))}
                    </View>
                  </View>

                  {/* Additional Information Section */}
                  {getWidgetDetails(selectedWidget).additionalInfo && (
                    <View style={styles.additionalSection}>
                      <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.semibold || 'Poppins_SemiBold' }]}>
                        Dodatkowe Informacje
                      </Text>
                      <View style={styles.sourcesContainer}>
                        {Object.entries(getWidgetDetails(selectedWidget).additionalInfo).map(([key, data]: [string, any], index) => (
                          <View key={key} style={[styles.sourceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                            <View style={styles.sourceHeader}>
                              <View style={[styles.dataIconContainer, { backgroundColor: (theme.colors.info || '#3b82f6') + '22' }]}> 
                                {React.createElement(data.icon, {
                                  size: 20,
                                  color: theme.colors.info || '#3b82f6',
                                  style: styles.dataIcon
                                })}
                              </View>
                              <Text style={[styles.sourceTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.semibold || 'Poppins_SemiBold' }]}>
                                {key}
                              </Text>
                            </View>
                            <Text style={[styles.sourceText, { color: theme.colors.textSecondary, fontFamily: theme?.fontFamily?.regular || 'Poppins_Regular' }]}>
                              {data.value}
                            </Text>
                            {data.status && (
                              <Text style={[styles.sourceSubtext, { color: theme.colors.textSecondary, fontFamily: theme?.fontFamily?.medium || 'Poppins_Medium' }]}>
                                Status: {data.status}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  widgetsContainer: {
    gap: 16,
  },
  widgetWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    backgroundColor: 'transparent',
    marginBottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxHeight: '98%',
    minHeight: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderBottomWidth: 0,
    paddingTop: Platform.OS === 'ios' ? 10 : 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  dragIndicator: {
    width: 44,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginTop: 6,
    marginBottom: 6,
    alignSelf: 'center',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalIcon: {
    opacity: 0.9,
  },
  modalTitleTextContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    opacity: 0.8,
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  dataCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    minHeight: 100,
  },
  dataCardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 16,
  },
  dataIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataIcon: {
    opacity: 0.9,
  },
  dataValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  dataLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    opacity: 0.7,
    lineHeight: 16,
  },
  recommendationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  recommendationCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    minHeight: 100,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 16,
  },
  recommendationValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  recommendationLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    opacity: 0.7,
    lineHeight: 16,
  },
  additionalSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  sourcesContainer: {
    gap: 12,
  },
  sourceCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sourceText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 6,
    opacity: 0.8,
  },
  sourceSubtext: {
    fontSize: 13,
    lineHeight: 16,
    opacity: 0.6,
  },
});

export default SpecializedWeatherWidgets;

