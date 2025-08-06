import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl, TouchableOpacity, Modal, FlatList, Dimensions, StatusBar, Alert, Animated, TextInput, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  MapPin, AlertTriangle, CloudRain, Wind, Thermometer, Droplets, Sun, Calendar, Clock, X, ChevronRight, Cloud, CloudFog, CloudSnow, CloudLightning, Gauge, ChevronDown, Waves, Zap, Sunrise, Sunset, Eye, Compass
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { useThemeStore } from '@/store/themeStore';
import LoadingIndicator from '@/components/LoadingIndicator';
import { WeatherSection } from '@/components/WeatherSection';
import { HydroStationCard } from '@/components/HydroStationCard';
import { MeteoStationCard } from '@/components/MeteoStationCard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { TemperatureChart } from '@/components/TemperatureChart';
import { AirQualityCard } from '@/components/AirQualityCard';
import { RadarMap } from '@/components/RadarMap';
import {
  SynopData, WarningData, HydroData, MeteoData, StationInfo
} from '@/types/weather';
import {
  fetchSynopData,
  fetchAllWarnings,
  fetchForecast,
  fetchAirQuality,
  findNearestSynopStation,
  findNearestStation,
  findNearestStations,
  fetchHydroData,
  fetchMeteoData,
  clearWeatherCache,
  SYNOP_STATIONS
} from '@/services/weatherService';

export default function WeatherScreen() {
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  // Location and Station State
  const [locationData, setLocationData] = useState<Location.LocationObjectCoords | null>(null);
  const [userLocation, setUserLocation] = useState('Pobieranie lokalizacji...');
  const [selectedSynopStation, setSelectedSynopStation] = useState<StationInfo>(SYNOP_STATIONS[0]);
  const [showStationModal, setShowStationModal] = useState(false);

  // Weather Data State
  const [synopData, setSynopData] = useState<SynopData | null>(null);
  const [hydroData, setHydroData] = useState<HydroData[]>([]);
  const [meteoData, setMeteoData] = useState<MeteoData[]>([]);
  const [warnings, setWarnings] = useState<WarningData[]>([]);
  const [forecastData, setForecastData] = useState<any>(null);
  const [airQualityData, setAirQualityData] = useState<any>(null);
  const [nearestHydroStation, setNearestHydroStation] = useState<HydroData | null>(null);
  const [nearestMeteoStation, setNearestMeteoStation] = useState<MeteoData | null>(null);
  const [nearbyHydroStations, setNearbyHydroStations] = useState<HydroData[]>([]);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [searchStationQuery, setSearchStationQuery] = useState('');
  const [hasShownAutoSelectAlert, setHasShownAutoSelectAlert] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastErrorShown, setLastErrorShown] = useState<string | null>(null);
  const [selectedWarning, setSelectedWarning] = useState<WarningData | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showWarningsListModal, setShowWarningsListModal] = useState(false);
  const warningModalAnimation = useRef(new Animated.Value(0)).current;
  const warningsListModalAnimation = useRef(new Animated.Value(0)).current;
  const [canScrollWarningModal, setCanScrollWarningModal] = useState(false);

  // Animation for weather icon - moved to component level
  const iconAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(iconAnimation, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [iconAnimation]);

  // Zabezpieczenie przed undefined theme
  if (!theme) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Ładowanie...</Text>
      </View>
    );
  }
  
  const styles = getStyles(theme, screenHeight, insets);

  useEffect(() => {
    initializeWeather();
  }, []);

  useEffect(() => {
    // Only fetch data when station changes after initialization
    if (!isInitializing && (locationData || !userLocation.includes('Pobieranie'))) {
      console.log('Station changed, fetching new data...');
      fetchAllData();
    }
  }, [selectedSynopStation, isInitializing, locationData, userLocation]);

  const initializeWeather = async () => {
    setLoading(true);
    try {
      console.log('Initializing weather - requesting location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied, using default location');
        // Just log instead of showing alert every time
        console.log('Location permission denied, using default location (Gdańsk)');
        setUserLocation('Gdańsk, Pomorze (domyślna)');
        setLocationData(null);
        // Keep default station (Gdańsk)
      } else {
        console.log('Location permission granted, getting current position...');
        try {
          const location = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Balanced
          });
          
          console.log('Got location:', location.coords);
          setLocationData(location.coords);
          
          // Get city name from coordinates
          try {
            const [reverseGeocode] = await Location.reverseGeocodeAsync(location.coords);
            const cityName = reverseGeocode?.city || reverseGeocode?.subregion || reverseGeocode?.region || 'Nieznana lokalizacja';
            setUserLocation(`${cityName} (automatycznie)`);
          } catch (geocodeError) {
            console.log('Reverse geocoding failed, using coordinates');
            setUserLocation(`${location.coords.latitude.toFixed(3)}, ${location.coords.longitude.toFixed(3)} (automatycznie)`);
          }
          
          // Find nearest station
          const nearestStation = findNearestSynopStation(location.coords);
          console.log('Selected nearest station:', nearestStation.name);
          setSelectedSynopStation(nearestStation);
          
          // Just log the auto-selected station instead of showing alert
          console.log(`Auto-selected nearest station: ${nearestStation.name} (${nearestStation.distance?.toFixed(1)} km)`);
          
        } catch (locationError) {
          console.error('Failed to get current position:', locationError);
          // Just log the error instead of showing alert
          console.log('Failed to get current position, using default station (Gdańsk)');
          setUserLocation('Gdańsk, Pomorze (domyślna)');
          setLocationData(null);
        }
      }
    } catch (error) {
      console.error('Error initializing weather:', error);
      // Just log the error instead of showing alert
      console.log('Error initializing weather, using default station');
      setUserLocation('Gdańsk, Pomorze (domyślna)');
      setLocationData(null);
    } finally {
      // Always fetch data regardless of location success
      setIsInitializing(false); // Mark initialization as complete
      fetchAllData();
    }
  };

  const fetchBasicData = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      console.log('Fetching basic weather data...');
      const coords = locationData || { latitude: selectedSynopStation.lat, longitude: selectedSynopStation.lon };
      console.log('Using coordinates:', coords);
      console.log('Selected station:', selectedSynopStation.name);
      
      // Load only essential data for fast initial display
      const promises = [
        fetchSynopData().catch(error => {
          console.error('Synop data fetch failed:', error);
          return []; // Return empty array on error
        }),
        fetchForecast(coords).catch(error => {
          console.error('Forecast fetch failed:', error);
          return null; // Return null on error
        })
      ];
      
      const [synop, forecast] = await Promise.all(promises);
      console.log('Synop data length:', Array.isArray(synop) ? synop.length : 'not array');
      console.log('Forecast data available:', !!forecast);

      // Find current station data
      const currentSynop = Array.isArray(synop) ? 
        synop.find(s => s.id_stacji === selectedSynopStation.id) : null;
      
      if (currentSynop) {
        console.log('Found synop data for station:', currentSynop.stacja);
        setSynopData(currentSynop);
      } else {
        console.warn('No synop data found for station:', selectedSynopStation.id);
        setSynopData(null);
      }
      
      if (forecast) {
        setForecastData(forecast);
      } else {
        console.warn('No forecast data available');
        setForecastData(null);
      }

      const loadTime = Date.now() - startTime;
      console.log(`Basic weather data loaded in ${loadTime}ms`);
      
      setLastUpdate(new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }));
      
      // Load additional data in background
      fetchAdditionalData();
      
      // Show success message if we got at least some data
      if (currentSynop || forecast) {
        console.log('Weather data loaded successfully');
      } else {
        console.warn('No weather data available - some APIs may be down');
        // Don't show alert immediately, just log the issue
      }
      
    } catch (error) {
      console.error("Error fetching basic data:", error);
      
      // Check if it's a network error and avoid showing same error repeatedly
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorKey = errorMessage?.includes('Network request failed') ? 'network' : 'general';
      
      // Only show error alert if we haven't shown this type recently
      if (lastErrorShown !== errorKey) {
        setLastErrorShown(errorKey);
        
        // Clear the error flag after 30 seconds
        setTimeout(() => setLastErrorShown(null), 30000);
        
        if (errorMessage?.includes('Network request failed') || errorMessage?.includes('TypeError')) {
          Alert.alert(
            'Błąd połączenia', 
            'Sprawdź połączenie internetowe i spróbuj ponownie. Aplikacja spróbuje użyć zapisanych danych.',
            [
              { text: 'Spróbuj ponownie', onPress: () => fetchBasicData() },
              { text: 'OK' }
            ]
          );
        } else {
          Alert.alert(
            'Błąd pobierania danych', 
            'Wystąpił błąd podczas pobierania danych pogodowych. Spróbuj odświeżyć.',
            [
              { text: 'Odśwież', onPress: () => fetchBasicData() },
              { text: 'OK' }
            ]
          );
        }
      } else {
        // Just log if we've already shown this error recently
        console.log('Error already shown recently, skipping alert:', errorKey);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAdditionalData = async () => {
    try {
      console.log('Fetching additional weather data...');
      const coords = locationData || { latitude: selectedSynopStation.lat, longitude: selectedSynopStation.lon };
      
      // Load additional data in background without blocking UI
      const promises = [
        fetchAllWarnings().catch(error => {
          console.error('Warnings fetch failed:', error);
          return []; // Return empty array on error
        }),
        fetchHydroData().catch(error => {
          console.error('Hydro data fetch failed:', error);
          return []; // Return empty array on error
        }),
        fetchMeteoData().catch(error => {
          console.error('Meteo data fetch failed:', error);
          return []; // Return empty array on error
        }),
        fetchAirQuality(coords).catch(error => {
          console.error('Air quality fetch failed:', error);
          return null; // Return null on error
        })
      ];
      
      const [warnings, hydro, meteo, airQuality] = await Promise.all(promises);
      
      console.log('Additional data loaded:');
      console.log('- Warnings:', Array.isArray(warnings) ? warnings.length : 'error');
      console.log('- Hydro stations:', Array.isArray(hydro) ? hydro.length : 'error');
      console.log('- Meteo stations:', Array.isArray(meteo) ? meteo.length : 'error');
      console.log('- Air quality:', !!airQuality ? 'available' : 'unavailable');

      // Set data even if some failed
      setWarnings(Array.isArray(warnings) ? warnings : []);
      setHydroData(Array.isArray(hydro) ? hydro : []);
      setMeteoData(Array.isArray(meteo) ? meteo : []);
      setAirQualityData(airQuality);

      // Find nearest stations if we have location and data
      if (locationData && Array.isArray(hydro) && hydro.length > 0) {
        const nearestHydro = findNearestStation(locationData, hydro);
        setNearestHydroStation(nearestHydro);
        console.log('Nearest hydro station:', nearestHydro?.stacja || 'none found');
        
        const nearbyHydro = findNearestStations(locationData, hydro, 3);
        setNearbyHydroStations(nearbyHydro);
        console.log('Nearby hydro stations:', nearbyHydro.length);
      }
      
      if (locationData && Array.isArray(meteo) && meteo.length > 0) {
        const nearestMeteo = findNearestStation(locationData, meteo);
        setNearestMeteoStation(nearestMeteo);
        console.log('Nearest meteo station:', nearestMeteo?.nazwa_stacji || 'none found');
      }
      
      console.log('Additional weather data processing completed');
    } catch (error) {
      console.error("Error fetching additional data:", error);
      // Don't show error alert for additional data as it's not critical
    }
  };

  const fetchAllData = fetchBasicData;

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // Filter stations based on search query
  const filteredStations = SYNOP_STATIONS.filter(station => 
    station.name.toLowerCase().includes(searchStationQuery.toLowerCase()) ||
    (station.region && station.region.toLowerCase().includes(searchStationQuery.toLowerCase()))
  );

  const selectStation = (station: StationInfo) => {
    console.log('Selecting new station:', station.name);
    setSelectedSynopStation(station);
    setShowStationModal(false);
    setSearchStationQuery('');
    // fetchAllData will be called automatically by useEffect when selectedSynopStation changes
  };

  const getWeatherUIMeta = (code: number, isDay: boolean = true) => {
    const descriptions: { [key: number]: string } = {
        0: 'Bezchmurnie', 1: 'Prawie bezchmurnie', 2: 'Częściowo pochmurno', 3: 'Pochmurno',
        45: 'Mgła', 48: 'Mgła z szronem', 51: 'Lekka mżawka', 53: 'Mżawka', 55: 'Intensywna mżawka',
        61: 'Lekki deszcz', 63: 'Deszcz', 65: 'Intensywny deszcz', 71: 'Lekki śnieg', 73: 'Śnieg',
        75: 'Intensywny śnieg', 95: 'Burza',
    };
  
    const icons: { [key: number]: any } = {
        0: Sun, 1: Sun, 2: Cloud, 3: Cloud, 45: CloudFog, 48: CloudFog, 51: CloudRain,
        53: CloudRain, 55: CloudRain, 61: CloudRain, 63: CloudRain, 65: CloudRain,
        71: CloudSnow, 73: CloudSnow, 75: CloudSnow, 95: CloudLightning,
    };

    const dayGradient = {
        'clear': ['#4792FF', '#005CFF'],
        'cloudy': ['#77A3D7', '#5A89C7'],
        'rainy': ['#617892', '#43576B'],
        'snowy': ['#B0C7DE', '#8A9EB5'],
        'stormy': ['#3E4C5A', '#2A343E'],
    }

    const nightGradient = {
        'clear': ['#0B1527', '#1C2E4A'],
        'cloudy': ['#2A3B53', '#1D2A3C'],
        'rainy': ['#3E4C5A', '#2A343E'],
        'snowy': ['#4E5B6A', '#343D46'],
        'stormy': ['#222831', '#1A1F26'],
    }
    
    let condition = 'cloudy';
    if ([0, 1].includes(code)) condition = 'clear';
    if ([51, 53, 55, 61, 63, 65].includes(code)) condition = 'rainy';
    if ([71, 73, 75].includes(code)) condition = 'snowy';
    if ([95].includes(code)) condition = 'stormy';

    const gradients = isDay ? dayGradient : nightGradient;
  
    return {
      description: descriptions[code] || 'Brak danych',
      Icon: icons[code] || Cloud,
      gradient: gradients[condition as keyof typeof gradients] || gradients.cloudy,
    };
  };

  // RENDER FUNCTIONS
  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Pogoda</Text>
        <Text style={styles.headerSubtitle}>{selectedSynopStation?.name || userLocation}</Text>
      </View>
      <TouchableOpacity style={styles.locationButton} onPress={() => setShowStationModal(true)}>
        <MapPin size={24} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderCurrentWeather = () => {
    if (!synopData || !forecastData) return <LoadingIndicator />;
    
    const weatherCode = forecastData?.weathercode?.[0] || 3;
    // Simple day/night check
    const isDay = new Date().getHours() > 6 && new Date().getHours() < 20;
    const { Icon, description, gradient } = getWeatherUIMeta(weatherCode, isDay);
    
    const iconTransform = {
      transform: [
        {
          translateY: iconAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -10],
          }),
        },
      ],
    };

    return (
        <LinearGradient colors={gradient as [string, string]} style={styles.currentWeatherCard}>
            <View style={styles.currentWeatherHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.stationName}>{synopData.stacja}</Text>
                    <Text style={styles.currentTemp}>{parseFloat(synopData.temperatura).toFixed(1)}°</Text>
                    <Text style={styles.currentTempLabel}>{description}</Text>
                    <View style={styles.feelsLikeContainer}>
                        <Text style={styles.feelsLikeText}>Odczuwalna: {(parseFloat(synopData.temperatura) - 2).toFixed(1)}°</Text>
                    </View>
                </View>
                <Animated.View style={iconTransform}>
                    <Icon size={100} color="#fff" />
                </Animated.View>
            </View>
            
            <View style={styles.currentWeatherFooter}>
                <View style={styles.metricItem}>
                    <Wind size={16} color="#fff" />
                    <Text style={styles.metricValue}>{synopData.predkosc_wiatru} km/h</Text>
                </View>
                <View style={styles.metricItem}>
                    <Droplets size={16} color="#fff" />
                    <Text style={styles.metricValue}>{synopData.wilgotnosc_wzgledna}%</Text>
                </View>
                <View style={styles.metricItem}>
                    <Gauge size={16} color="#fff" />
                    <Text style={styles.metricValue}>{synopData.cisnienie} hPa</Text>
                </View>
                <View style={styles.metricItem}>
                    <Compass size={16} color="#fff" />
                    <Text style={styles.metricValue}>{synopData.kierunek_wiatru}°</Text>
                </View>
            </View>
            
            <View style={styles.additionalInfo}>
                <View style={styles.infoRow}>
                    <CloudRain size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.feelsLikeText}>Opady: {synopData.suma_opadu} mm</Text>
                </View>
                <View style={styles.infoRow}>
                    <Eye size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.feelsLikeText}>Widoczność: dobra</Text>
                </View>
            </View>
        </LinearGradient>
    );
  };
  
  const renderWarnings = () => {
    if (!warnings || warnings.length === 0) {
      return (
        <WeatherSection title="Ostrzeżenia" icon={<AlertTriangle size={24} color={theme.colors.warning} />}>
          <View style={styles.noWarningsCard}>
            <Cloud size={32} color={theme.colors.success} />
            <Text style={styles.noWarningsText}>Brak aktywnych ostrzeżeń</Text>
            <Text style={styles.noWarningsSubtext}>Bezpieczna pogoda w Twojej okolicy</Text>
          </View>
        </WeatherSection>
      );
    }

    // Filter warnings for user's location/region if available
    let localWarnings = warnings;
    
    // If we have location data, try to filter by region
    if (locationData || selectedSynopStation) {
      const userRegion = selectedSynopStation?.region || 'Pomorze'; // Default to Pomorze
      
      // Filter warnings that affect user's region
      const regionFilteredWarnings = warnings.filter(warning => {
        if (!warning.regions || warning.regions.length === 0) {
          return true; // Show warnings without specific regions (general warnings)
        }
        
        // Check if warning affects user's region
        return warning.regions.some(region => 
          region.toLowerCase().includes(userRegion.toLowerCase()) ||
          userRegion.toLowerCase().includes(region.toLowerCase()) ||
          (userRegion === 'Pomorze' && (
            region.toLowerCase().includes('pomorsk') ||
            region.toLowerCase().includes('gdańsk') ||
            region.toLowerCase().includes('gdansk') ||
            region.toLowerCase().includes('słupsk') ||
            region.toLowerCase().includes('slupsk')
          ))
        );
      });
      
      localWarnings = regionFilteredWarnings.length > 0 ? regionFilteredWarnings : warnings.slice(0, 3);
      console.log(`Filtered warnings for region ${userRegion}: ${regionFilteredWarnings.length} out of ${warnings.length}`);
    } else {
      localWarnings = warnings.slice(0, 3); // Fallback to first 3
    }
    
    const hasMoreWarnings = localWarnings.length > 3;
    const displayWarnings = localWarnings.slice(0, 3);
    
    const getWarningIcon = (type: string, level: number) => {
      if (type === 'hydro') {
        return <Waves size={24} color="#3B82F6" />;
      }
      if (level >= 3) {
        return <Zap size={24} color="#DC2626" />;
      }
      if (level >= 2) {
        return <CloudLightning size={24} color="#F59E0B" />;
      }
      return <CloudRain size={24} color="#8B5CF6" />;
    };

    const getWarningColor = (level: number) => {
      if (level >= 3) return '#DC2626'; // Red
      if (level >= 2) return '#F59E0B'; // Orange
      if (level >= 1) return '#8B5CF6'; // Purple
      return '#3B82F6'; // Blue
    };

    return (
      <WeatherSection title="Ostrzeżenia" icon={<AlertTriangle size={24} color={theme.colors.warning} />}>
        <View style={styles.warningsContainer}>
          {displayWarnings.map((warning, index) => {
            const warningColor = getWarningColor(warning.level);
            const Icon = getWarningIcon(warning.type, warning.level);
            
            return (
              <TouchableOpacity 
                key={`warning-${warning.id}-${index}`} 
                style={[styles.warningBlock, { borderColor: warningColor }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedWarning(warning);
                  setShowWarningModal(true);
                  Animated.timing(warningModalAnimation, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                  }).start();
                }}
              >
                <View style={[styles.warningHeader, { backgroundColor: `${warningColor}15` }]}>
                  {Icon}
                  <View style={styles.warningHeaderText}>
                    <Text style={[styles.warningType, { color: warningColor }]}>
                      {warning.type === 'meteo' ? 'Meteorologiczne' : 'Hydrologiczne'}
                    </Text>
                    <Text style={styles.warningLevel}>Stopień {warning.level}</Text>
                  </View>
                </View>
                
                <Text style={styles.warningTitle} numberOfLines={2}>
                  {warning.title}
                </Text>
                
                <View style={styles.warningFooter}>
                  <View style={styles.warningTime}>
                    <Clock size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.warningTimeText}>
                      Do: {new Date(warning.validUntil || '').toLocaleDateString('pl-PL')}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {hasMoreWarnings && (
          <TouchableOpacity 
            style={styles.showMoreButton}
            onPress={() => {
              // Show list of all warnings for the region
              setShowWarningsListModal(true);
              Animated.timing(warningsListModalAnimation, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }).start();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={styles.showMoreText}>
              Pokaż więcej ({localWarnings.length - 3} więcej)
            </Text>
            <ChevronDown size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </WeatherSection>
    );
  };

  const renderHydroSection = () => (
    <WeatherSection title="Stan wód" icon={<Waves size={24} color={theme.colors.info} />} defaultCollapsed>
        {nearestHydroStation ? <HydroStationCard station={nearestHydroStation} /> : <Text style={styles.infoText}>Nie znaleziono stacji hydrologicznej w pobliżu.</Text>}
    </WeatherSection>
  );

  const renderMeteoSection = () => (
    <WeatherSection title="Dane telemetryczne" icon={<Zap size={24} color={theme.colors.success} />} defaultCollapsed>
        {nearestMeteoStation ? <MeteoStationCard station={nearestMeteoStation} /> : <Text style={styles.infoText}>Nie znaleziono stacji telemetrycznej w pobliżu.</Text>}
    </WeatherSection>
  );
  
  const renderWeeklyForecast = () => {
    if (!forecastData?.daily) return null;
    
    const days = ['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
    const fullDays = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    const today = new Date().getDay();
    
    // Get all 7 days
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (today + i) % 7;
      const isWeekend = dayIndex === 6 || dayIndex === 0;
      const isToday = i === 0;
      const date = new Date(forecastData.daily.time[i]);
      
      weekDays.push({
        index: i,
        dayName: isToday ? 'Dziś' : days[dayIndex],
        fullDayName: fullDays[dayIndex],
        dayNumber: date.getDate(),
        month: date.toLocaleDateString('pl-PL', { month: 'short' }),
        date: forecastData.daily.time[i],
        weatherCode: forecastData.daily.weathercode[i],
        maxTemp: forecastData.daily.temperature_2m_max[i],
        minTemp: forecastData.daily.temperature_2m_min[i],
        precipProb: forecastData.daily.precipitation_probability_max[i],
        isWeekend: isWeekend,
        isToday: isToday,
        windSpeed: forecastData.daily.windspeed_10m_max?.[i],
        uvIndex: forecastData.daily.uv_index_max?.[i],
      });
    }
    
        const showDayDetails = (day: any) => {
      const { description, Icon } = getWeatherUIMeta(day.weatherCode, true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedDay({ ...day, description, Icon });
      setShowDayModal(true);
    };
    
    return (
      <View style={styles.weeklyContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weeklySlider}
          snapToInterval={120}
          decelerationRate="fast"
        >
          {weekDays.map((day, index) => {
            const { Icon, gradient } = getWeatherUIMeta(day.weatherCode, true);
            const tempRange = day.maxTemp - day.minTemp;
            const tempBarHeight = ((day.maxTemp + 10) / 50) * 100; // Normalize temp to percentage
            
            return (
    <TouchableOpacity 
                key={index} 
      style={[
                  styles.weeklyCardNew,
                  day.isToday && styles.weeklyCardToday,
                  day.isWeekend && styles.weeklyCardWeekend,
                ]}
                onPress={() => showDayDetails(day)}
      activeOpacity={0.8}
    >
                {/* Day Label */}
                <View style={styles.weeklyHeader}>
        <Text style={[
                    styles.weeklyDayText,
                    day.isToday && styles.weeklyDayTextToday,
                    day.isWeekend && styles.weeklyDayTextWeekend,
        ]}>
                    {day.dayName}
        </Text>
        <Text style={[
                    styles.weeklyDateText,
                    day.isToday && styles.weeklyDateTextToday,
        ]}>
                    {day.dayNumber}
        </Text>
      </View>
                
                {/* Weather Icon */}
                <View style={styles.weeklyIconContainer}>
                  <Icon 
                    size={day.isToday ? 32 : 28} 
                    color={day.isToday ? theme.colors.primary : theme.colors.text} 
                  />
        </View>
          
                {/* Temperature */}
                <View style={styles.weeklyTempContainer}>
                  <Text style={[
                    styles.weeklyMaxTemp,
                    day.isToday && styles.weeklyMaxTempToday,
                  ]}>
                    {day.maxTemp?.toFixed(0)}°
            </Text>
                  <Text style={styles.weeklyMinTemp}>
                    {day.minTemp?.toFixed(0)}°
                    </Text>
      </View>

                
                
                {/* Today Badge */}
                {day.isToday && (
                  <View style={styles.todayBadge}>
                    <View style={styles.todayDot} />
          </View>
        )}
            </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        {/* Legend */}
        <View style={styles.weeklyLegend}>
          <View style={styles.weeklyLegendItem}>
            <View style={[styles.weeklyLegendDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={styles.weeklyLegendText}>Dziś</Text>
          </View>
          <View style={styles.weeklyLegendItem}>
            <View style={[styles.weeklyLegendDot, { backgroundColor: '#FFD700' }]} />
            <Text style={styles.weeklyLegendText}>Weekend</Text>
          </View>
        </View>

        {/* Day Details Modal */}
        <Modal
          visible={showDayModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDayModal(false)}
        >
            <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDayModal(false)}
          >
            <View style={styles.modalContent}>
              {selectedDay && (
                <>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>
                        {selectedDay.fullDayName}
                  </Text>
                      <Text style={styles.modalSubtitle}>
                        {selectedDay.dayNumber} {selectedDay.month}
                    </Text>
              </View>
                    {/* X button removed */}
                    {/* <TouchableOpacity onPress={() => setShowDayModal(false)}>
                      <X size={24} color={theme.colors.text} />
            </TouchableOpacity> */}
          </View>
                  
                  <View style={styles.modalBody}>
                    <View style={styles.modalIconSection}>
                      <selectedDay.Icon size={64} color={theme.colors.primary} />
                      <Text style={styles.modalDescription}>
                        {selectedDay.description}
                      </Text>
          </View>
            
                    <View style={styles.modalDetailsGrid}>
                      <View style={styles.modalDetailItem}>
                        <Thermometer size={20} color={theme.colors.textSecondary} />
                        <Text style={styles.modalDetailLabel}>Temperatura</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedDay.maxTemp?.toFixed(0)}° / {selectedDay.minTemp?.toFixed(0)}°
                    </Text>
              </View>
                      
                      <View style={styles.modalDetailItem}>
                        <Droplets size={20} color={theme.colors.textSecondary} />
                        <Text style={styles.modalDetailLabel}>Opady</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedDay.precipProb}%
                </Text>
              </View>
            
                      <View style={styles.modalDetailItem}>
                        <Wind size={20} color={theme.colors.textSecondary} />
                        <Text style={styles.modalDetailLabel}>Wiatr</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedDay.windSpeed?.toFixed(0)} km/h
                </Text>
          </View>
                    
                      <View style={styles.modalDetailItem}>
                        <Sun size={20} color={theme.colors.textSecondary} />
                        <Text style={styles.modalDetailLabel}>Indeks UV</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedDay.uvIndex?.toFixed(0)}
                      </Text>
                    </View>
            </View>
            
                    {selectedDay.isWeekend && (
                      <View style={styles.modalWeekendBadge}>
                        <Text style={styles.modalWeekendText}>WEEKEND</Text>
            </View>
                    )}
          </View>
                </>
              )}
            </View>
          </TouchableOpacity>
                </Modal>
                    </View>
    );
  };

  // Auto-detect location function
  const autoDetectLocation = async () => {
    try {
      setShowStationModal(false);
      setLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Brak uprawnień', 
          'Aby automatycznie wykryć lokalizację, musisz zezwolić na dostęp do lokalizacji w ustawieniach.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced
      });
      
      setLocationData(location.coords);
      
      // Get city name
      try {
        const [reverseGeocode] = await Location.reverseGeocodeAsync(location.coords);
        const cityName = reverseGeocode?.city || reverseGeocode?.subregion || reverseGeocode?.region || 'Nieznana lokalizacja';
        setUserLocation(`${cityName} (automatycznie)`);
      } catch {
        setUserLocation(`${location.coords.latitude.toFixed(3)}, ${location.coords.longitude.toFixed(3)} (automatycznie)`);
      }
      
      // Find and select nearest station
      const nearestStation = findNearestSynopStation(location.coords);
      setSelectedSynopStation(nearestStation);
      
      // Just show a console log instead of alert
      console.log(`Auto-detected location and selected station: ${nearestStation.name} (${nearestStation.distance?.toFixed(1)} km)`);
      
    } catch (error) {
      console.error('Auto-detect location failed:', error);
      Alert.alert(
        'Błąd wykrywania lokalizacji', 
        'Nie udało się automatycznie wykryć lokalizacji. Wybierz stację ręcznie.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Station Selection Modal
  const renderStationModal = () => (
    <Modal
      visible={showStationModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowStationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.stationModalContent}>
          <View style={styles.stationModalHeader}>
            <Text style={styles.stationModalTitle}>Wybierz stację pogodową</Text>
            {/* X button removed */}
            {/* <TouchableOpacity onPress={() => setShowStationModal(false)}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity> */}
          </View>
          
          {/* Auto-detect button */}
          <TouchableOpacity style={styles.autoDetectButton} onPress={autoDetectLocation}>
            <MapPin size={20} color={theme.colors.primary} />
            <Text style={styles.autoDetectText}>Wykryj automatycznie</Text>
          </TouchableOpacity>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Szukaj stacji..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchStationQuery}
              onChangeText={setSearchStationQuery}
            />
          </View>
          
          <Text style={styles.stationListHeader}>
            {filteredStations.length} stacji dostępnych
          </Text>
                    
          <FlatList
            data={filteredStations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              // Calculate distance if we have location
              let distance = '';
              if (locationData) {
                const dist = calculateDistance(
                  locationData.latitude, 
                  locationData.longitude, 
                  item.lat, 
                  item.lon
                );
                distance = `${dist.toFixed(1)} km`;
              }
              
              return (
                <TouchableOpacity
                  style={[
                    styles.stationItem,
                    selectedSynopStation.id === item.id && styles.stationItemSelected
                  ]}
                  onPress={() => selectStation(item)}
                >
                  <View style={styles.stationItemContent}>
                    <Text style={[
                      styles.stationItemName,
                      selectedSynopStation.id === item.id && styles.stationNameSelected
                    ]}>
                      {item.name}
                    </Text>
                    <Text style={[
                      styles.stationRegion,
                      selectedSynopStation.id === item.id && styles.stationRegionSelected
                    ]}>
                      {item.region} {distance && `• ${distance}`}
                    </Text>
                  </View>
                  {selectedSynopStation.id === item.id && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.selectedIndicatorText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.stationList}
          />
        </View>
      </View>
    </Modal>
  );
  
  // Helper function for distance calculation (add to component)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Warnings List Modal
  const renderWarningsListModal = () => {
    if (!showWarningsListModal) return null;

    const userRegion = selectedSynopStation?.region || 'Pomorze';
    
    // Get filtered warnings for the region
    let regionWarnings = warnings || [];
    
    if (locationData || selectedSynopStation) {
      const regionFilteredWarnings = regionWarnings.filter((warning: any) => {
        if (!warning.regions || warning.regions.length === 0) {
          return true; // Show warnings without specific regions
        }
        
        return warning.regions.some((region: string) => 
          region.toLowerCase().includes(userRegion.toLowerCase()) ||
          userRegion.toLowerCase().includes(region.toLowerCase()) ||
          (userRegion === 'Pomorze' && (
            region.toLowerCase().includes('pomorsk') ||
            region.toLowerCase().includes('gdańsk') ||
            region.toLowerCase().includes('gdansk') ||
            region.toLowerCase().includes('słupsk') ||
            region.toLowerCase().includes('slupsk')
          ))
        );
      });
      
      regionWarnings = regionFilteredWarnings.length > 0 ? regionFilteredWarnings : regionWarnings.slice(0, 5);
    }

    return (
      <Modal visible={showWarningsListModal} transparent animationType="none">
        <Animated.View 
          style={[
            styles.modalBackdrop,
            {
              opacity: warningsListModalAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            }
          ]}
        />
        <TouchableOpacity
          style={styles.modalBackdropTouchable}
          activeOpacity={1}
          onPress={() => {
            Animated.timing(warningsListModalAnimation, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setShowWarningsListModal(false);
            });
          }}
        />
        <Animated.View 
          style={[
            styles.warningsListModalContainer,
            {
              transform: [{
                translateY: warningsListModalAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [screenHeight, 0],
                }),
              }],
            }
          ]}
        >
          <View style={styles.warningsListModalContent}>
            {/* Drag Handle */}
            <View style={styles.warningModalHandleContainer}>
              <View style={styles.warningModalHandle} />
            </View>
            
            {/* Header */}
            <View style={styles.warningsListHeader}>
              <View style={styles.warningsListHeaderContent}>
                <Text style={styles.warningsListTitle}>
                  Wszystkie ostrzeżenia
                </Text>
                <Text style={styles.warningsListSubtitle}>
                  Region: {userRegion}
                </Text>
              </View>
              {/* X button removed */}
              {/* <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  Animated.timing(warningsListModalAnimation, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                  }).start(() => {
                    setShowWarningsListModal(false);
                  });
                }}
              >
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity> */}
            </View>

            {/* Warnings List */}
            <ScrollView 
              style={styles.warningsListScrollView}
              contentContainerStyle={styles.warningsListScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {regionWarnings.length === 0 ? (
                <View style={styles.noWarningsContainer}>
                  <AlertTriangle size={48} color={theme.colors.textSecondary} />
                  <Text style={styles.noWarningsText}>
                    Brak ostrzeżeń dla Twojego regionu
                  </Text>
                </View>
              ) : (
                regionWarnings.map((warning: any, index: number) => {
                  const warningColor = warning.level === 1 ? '#FFA500' : warning.level === 2 ? '#FF4500' : '#DC143C';
                  const Icon = warning.type === 'hydro' ? 
                    <Waves size={24} color={warningColor} /> : 
                    <CloudRain size={24} color={warningColor} />;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.warningsListItem, { borderLeftColor: warningColor }]}
                      onPress={() => {
                        setSelectedWarning(warning);
                        setShowWarningsListModal(false);
                        setShowWarningModal(true);
                        Animated.timing(warningModalAnimation, {
                          toValue: 1,
                          duration: 300,
                          useNativeDriver: true,
                        }).start();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                    >
                      <View style={styles.warningsListItemIcon}>
                        {Icon}
                      </View>
                      <View style={styles.warningsListItemContent}>
                        <Text style={styles.warningsListItemTitle}>
                          {warning.title}
                        </Text>
                        <Text style={styles.warningsListItemSubtitle}>
                          Stopień {warning.level} • {warning.type === 'meteo' ? 'Meteorologiczne' : 'Hydrologiczne'}
                        </Text>
                        {warning.validFrom && warning.validTo && (
                          <Text style={styles.warningsListItemTime}>
                            {new Date(warning.validFrom).toLocaleDateString('pl-PL', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} - {new Date(warning.validTo).toLocaleDateString('pl-PL', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Text>
                        )}
                      </View>
                      <ChevronRight size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </Modal>
    );
  };

  // Warning Details Modal
  const renderWarningModal = () => {
    if (!selectedWarning) return null;

    const getWarningIcon = (type: string, level: number) => {
      if (type === 'hydro') {
        return <Waves size={48} color="#3B82F6" />;
      }
      if (level >= 3) {
        return <Zap size={48} color="#DC2626" />;
      }
      if (level >= 2) {
        return <CloudLightning size={48} color="#F59E0B" />;
      }
      return <CloudRain size={48} color="#8B5CF6" />;
    };

    const getWarningColor = (level: number) => {
      if (level >= 3) return '#DC2626'; // Red
      if (level >= 2) return '#F59E0B'; // Orange
      if (level >= 1) return '#8B5CF6'; // Purple
      return '#3B82F6'; // Blue
    };

    const warningColor = getWarningColor(selectedWarning.level);
    const Icon = getWarningIcon(selectedWarning.type, selectedWarning.level);

    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pl-PL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return dateString;
      }
    };

    return (
      <Modal
        visible={showWarningModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWarningModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalBackdrop, 
              {
                opacity: warningModalAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.modalBackdropTouchable}
              activeOpacity={1}
              onPress={() => {
                Animated.timing(warningModalAnimation, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start(() => {
                  setShowWarningModal(false);
                });
              }}
            />
          </Animated.View>
          <View style={styles.warningModalContent}>
            {/* Drag Handle */}
            <View style={styles.warningModalHandleContainer}>
              <View style={styles.warningModalHandle} />
            </View>
            
            {/* Fully Scrollable Content */}
            <ScrollView 
              style={styles.warningModalScrollView}
              contentContainerStyle={styles.warningModalScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header Section - now scrollable */}
              <View style={styles.warningModalScrollableHeader}>
                <View style={styles.warningModalHeaderContent}>
                  <Text style={styles.warningModalTitle}>
                    Ostrzeżenie {selectedWarning.type === 'meteo' ? 'meteorologiczne' : 'hydrologiczne'}
                  </Text>
                  <Text style={[styles.warningModalSubtitle, { color: warningColor }]}>
                    Stopień {selectedWarning.level}
                  </Text>
                </View>
                {/* X button removed */}
                {/* <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => {
                    Animated.timing(warningModalAnimation, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: true,
                    }).start(() => {
                      setShowWarningModal(false);
                    });
                  }}
                >
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity> */}
              </View>

              {/* Icon Section */}
              <View style={[styles.warningModalIconSection, { backgroundColor: `${warningColor}15` }]}>
                {Icon}
                <Text style={[styles.warningModalDescription, { color: warningColor }]}>
                  {selectedWarning.title}
                </Text>
              </View>
        
              {/* Details Section */}
              <View style={styles.warningDetailsContainer}>
                <Text style={styles.warningDetailsTitle}>Szczegóły ostrzeżenia:</Text>
                <Text style={styles.warningDetailsText}>
                  {selectedWarning.description || 'Brak dodatkowych szczegółów.'}
                </Text>
              </View>

              {/* Info Grid */}
              <View style={styles.warningModalDetailsGrid}>
                <View style={styles.warningModalDetailItem}>
                  <Clock size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.warningModalDetailLabel}>Obowiązuje od</Text>
                  <Text style={styles.warningModalDetailValue}>
                    {formatDate(selectedWarning.validFrom)}
                  </Text>
                </View>
                
                <View style={styles.warningModalDetailItem}>
                  <AlertTriangle size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.warningModalDetailLabel}>Obowiązuje do</Text>
                  <Text style={styles.warningModalDetailValue}>
                    {formatDate(selectedWarning.validTo || selectedWarning.validUntil || '')}
                  </Text>
                </View>

                {selectedWarning.probability && selectedWarning.probability > 0 && (
                  <View style={styles.warningModalDetailItem}>
                    <Gauge size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.warningModalDetailLabel}>Prawdopodobieństwo</Text>
                    <Text style={styles.warningModalDetailValue}>
                      {selectedWarning.probability}%
                    </Text>
                  </View>
                )}

                <View style={styles.warningModalDetailItem}>
                  <MapPin size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.warningModalDetailLabel}>Typ ostrzeżenia</Text>
                  <Text style={styles.warningModalDetailValue}>
                    {selectedWarning.type === 'meteo' ? 'Meteorologiczne' : 'Hydrologiczne'}
                  </Text>
                </View>
              </View>

              {/* Additional Info Section */}
              <View style={styles.warningAdditionalInfoContainer}>
                {/* Regions */}
                {selectedWarning.regions && selectedWarning.regions.length > 0 && (
                  <View style={styles.warningInfoSection}>
                    <View style={styles.warningInfoHeader}>
                      <MapPin size={18} color={theme.colors.primary} />
                      <Text style={styles.warningInfoTitle}>Obszary objęte ostrzeżeniem</Text>
                    </View>
                    <View style={styles.warningRegionsGrid}>
                      {selectedWarning.regions.map((region, index) => (
                        <View key={index} style={styles.warningRegionChip}>
                          <Text style={styles.warningRegionText}>{region}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Comment */}
                {selectedWarning.comment && (
                  <View style={styles.warningInfoSection}>
                    <View style={styles.warningInfoHeader}>
                      <AlertTriangle size={18} color={theme.colors.warning} />
                      <Text style={styles.warningInfoTitle}>Dodatkowe informacje</Text>
                    </View>
                    <View style={styles.warningCommentBox}>
                      <Text style={styles.warningCommentText}>
                        {selectedWarning.comment}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Level Badge */}
              <View style={[styles.warningLevelBadge, { backgroundColor: warningColor }]}>
                <Text style={styles.warningLevelBadgeText}>
                  STOPIEŃ {selectedWarning.level}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderForecast = () => {
      if (!forecastData?.time?.length) return null;
      return (
        <WeatherSection title="Prognoza na 7 dni" icon={<Calendar size={24} color={theme.colors.primary} />}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {forecastData.time.map((time: string, index: number) => {
                const { Icon } = getWeatherUIMeta(forecastData.weathercode[index]);
                return (
                    <View key={`forecast-${index}-${time}`} style={styles.weeklyCard}>
                        <Text style={styles.weeklyDay}>{new Date(time).toLocaleDateString('pl-PL', { weekday: 'short' })}</Text>
                        <Icon size={32} color={theme.colors.text} />
                        <Text style={styles.weeklyTempMax}>{forecastData.temperature_2m_max[index]?.toFixed(0)}°</Text>
                        <Text style={styles.weeklyTempMin}>{forecastData.temperature_2m_min[index]?.toFixed(0)}°</Text>
              </View>
                )
            })}
            </ScrollView>
        </WeatherSection>
      )
  };

  if (loading && !synopData) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDarkMode ? 'light-content' : 'dark-content'} />
            <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {renderHeader()}
        {synopData ? renderCurrentWeather() : <LoadingIndicator />}
        {/* 7-Day Forecast */}
        {renderForecast()}
        
        {/* Weekly Forecast Highlight */}
        {forecastData?.daily && (
          <WeatherSection title="Pogoda na tydzień" icon={<Calendar size={24} color={theme.colors.primary} />}>
            {renderWeeklyForecast()}
          </WeatherSection>
        )}
        
        {/* Detailed Weather Data */}
        {locationData && renderHydroSection()}
        {locationData && renderMeteoSection()}
        
        {/* Temperature Chart */}
        {forecastData?.hourly && (
          <WeatherSection title="Wykres temperatury (24h)" icon={<Thermometer size={24} color={theme.colors.primary} />} defaultCollapsed>
            <TemperatureChart hourlyData={forecastData.hourly} />
          </WeatherSection>
        )}
        
        {/* Radar Map */}
        {forecastData?.hourly?.precipitation && (
          <WeatherSection title="Radar opadów" icon={<CloudRain size={24} color={theme.colors.primary} />} defaultCollapsed>
            <RadarMap precipitation={forecastData.hourly.precipitation} time={forecastData.hourly.time} />
          </WeatherSection>
        )}
        
        {/* UV Index */}
        {forecastData?.daily?.uv_index_max && (
          <WeatherSection title="Indeks UV" icon={<Sun size={24} color={theme.colors.warning} />} defaultCollapsed>
            <View style={styles.uvContainer}>
              <Text style={styles.uvValue}>
                UV: {forecastData.daily.uv_index_max[0]?.toFixed(1)}
              </Text>
              <Text style={styles.uvDescription}>
                {forecastData.daily.uv_index_max[0] < 3 ? 'Niski' :
                 forecastData.daily.uv_index_max[0] < 6 ? 'Średni' :
                 forecastData.daily.uv_index_max[0] < 8 ? 'Wysoki' :
                 forecastData.daily.uv_index_max[0] < 11 ? 'Bardzo wysoki' : 'Ekstremalny'}
              </Text>
                  </View>
          </WeatherSection>
        )}
        
        {/* Air Quality */}
        {airQualityData && (
          <WeatherSection title="Jakość powietrza" icon={<Wind size={24} color={theme.colors.primary} />} defaultCollapsed>
            <AirQualityCard airQuality={airQualityData} />
          </WeatherSection>
        )}
        
        {/* Warnings */}
        {renderWarnings()}
        
        {/* Data Sources */}
        <View style={styles.dataSourcesContainer}>
          <Text style={styles.dataSourcesTitle}>Źródła danych:</Text>
          <Text style={styles.dataSourcesText}>• IMGW - Instytut Meteorologii i Gospodarki Wodnej</Text>
          <Text style={styles.dataSourcesText}>• Open-Meteo - prognozy i jakość powietrza</Text>
          <Text style={styles.dataSourcesText}>• Ostatnia aktualizacja: {lastUpdate}</Text>
              </View>
        
        <TouchableOpacity style={styles.clearCacheButton} onPress={async () => {
          await clearWeatherCache();
          Alert.alert('Sukces', 'Cache został wyczyszczony');
          fetchAllData();
        }}>
          <Text style={styles.clearCacheText}>Wyczyść cache i odśwież</Text>
              </TouchableOpacity>
        
        <Text style={styles.footerText}>Ostatnia aktualizacja: {lastUpdate}</Text>
      </ScrollView>

      {/* Station Selection Modal */}
      {renderStationModal()}
      
      {/* Warnings List Modal */}
      {renderWarningsListModal()}
      
      {/* Warning Details Modal */}
      {renderWarningModal()}
    </SafeAreaView>
  );
}

const getStyles = (theme: any, screenHeight: number, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
        padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: 'Poppins_Bold',
        fontSize: 34,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontFamily: 'Poppins_Regular',
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  locationButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
        borderColor: theme.colors.border
    },
    currentWeatherCard: {
    borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    currentWeatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    stationName: {
        fontFamily: 'Poppins_Bold',
        fontSize: 22,
        color: '#fff',
        marginBottom: 4,
  },
  currentTemp: {
    fontFamily: 'Poppins_Bold',
    fontSize: 64,
        color: '#fff',
        lineHeight: 72,
    letterSpacing: -2,
  },
  currentTempLabel: {
    fontFamily: 'Poppins_Medium',
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    currentWeatherFooter: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
        paddingTop: 16,
        marginTop: 16,
    },
    metricItem: {
        flexDirection: 'row',
    alignItems: 'center',
        gap: 8,
    },
    metricValue: {
        fontFamily: 'Poppins_SemiBold',
        fontSize: 14,
        color: '#fff',
    },
    warningCard: {
    backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderLeftWidth: 4,
    },
    warningTitle: {
        fontFamily: 'Poppins_Bold',
    fontSize: 16,
        color: theme.colors.text,
        marginBottom: 4,
    },
    warningDescription: {
        fontFamily: 'Poppins_Regular',
        fontSize: 14,
    color: theme.colors.textSecondary,
        lineHeight: 20
    },
    infoText: {
        fontFamily: 'Poppins_Regular',
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingVertical: 20,
    },
    weeklyCard: {
    backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 16,
    alignItems: 'center',
        marginRight: 12,
        width: 90,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
    weeklyDay: {
        fontFamily: 'Poppins_Bold',
        fontSize: 16,
        color: theme.colors.text,
        marginBottom: 8,
    },
    weeklyTempMax: {
    fontFamily: 'Poppins_Bold',
        fontSize: 18,
    color: theme.colors.text,
        marginTop: 8,
  },
    weeklyTempMin: {
    fontFamily: 'Poppins_Regular',
    fontSize: 16,
    color: theme.colors.textSecondary,
    },
    footerText: {
    textAlign: 'center',
        color: theme.colors.textSecondary,
        marginTop: 20,
        fontFamily: 'Poppins_Regular',
        fontSize: 12,
    },
    feelsLikeContainer: {
        marginTop: 4,
    },
    feelsLikeText: {
        fontFamily: 'Poppins_Regular',
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    additionalInfo: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
        paddingTop: 16,
        marginTop: 16,
    flexDirection: 'row',
        justifyContent: 'space-around',
    },
    infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
        gap: 6,
    },
    uvContainer: {
    alignItems: 'center',
        padding: 20,
    },
    uvValue: {
    fontFamily: 'Poppins_Bold',
        fontSize: 36,
    color: theme.colors.text,
        marginBottom: 8,
    },
    uvDescription: {
        fontFamily: 'Poppins_Medium',
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
    clearCacheButton: {
        backgroundColor: theme.colors.subtle,
        borderRadius: 12,
        padding: 12,
    alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    clearCacheText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
        color: theme.colors.primary,
    },
    weekendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    weekendDay: {
    alignItems: 'center',
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 8,
        minWidth: 120,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    weekendDayName: {
    fontFamily: 'Poppins_Bold',
        fontSize: 16,
    color: theme.colors.text,
        marginBottom: 8,
    },
    weekendTemp: {
        fontFamily: 'Poppins_Bold',
        fontSize: 24,
        color: theme.colors.primary,
        marginTop: 4,
  },
  weekendTempMin: {
        fontFamily: 'Poppins_Regular',
    fontSize: 16,
    color: theme.colors.textSecondary,
        marginTop: 2,
    },
    weekendDescription: {
        fontFamily: 'Poppins_Medium',
        fontSize: 12,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
    },
    weekendPrecip: {
    fontFamily: 'Poppins_Regular',
        fontSize: 11,
    color: theme.colors.textSecondary,
        marginTop: 4,
    },
    dataSourcesContainer: {
        backgroundColor: theme.colors.subtle,
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        marginBottom: 10,
    },
    dataSourcesTitle: {
    fontFamily: 'Poppins_Bold',
        fontSize: 16,
    color: theme.colors.text,
        marginBottom: 8,
  },
    dataSourcesText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    noWarningsCard: {
    alignItems: 'center',
        padding: 30,
        backgroundColor: theme.colors.card,
        borderRadius: 16,
      },
    noWarningsSubtext: {
        fontFamily: 'Poppins_Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
        marginTop: 4,
    },
    warningsContainer: {
        gap: 12,
    },
    warningBlock: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        borderWidth: 2,
        padding: 16,
    marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
  },
    warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
        padding: 8,
        borderRadius: 12,
        marginBottom: 12,
        gap: 12,
    },
    warningHeaderText: {
    flex: 1,
    },
    warningType: {
        fontFamily: 'Poppins_Bold',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    warningLevel: {
        fontFamily: 'Poppins_Regular',
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    warningFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.subtle,
    },
    warningTime: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    warningTimeText: {
        fontFamily: 'Poppins_Regular',
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    showMoreButton: {
        flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.subtle,
        borderRadius: 12,
        marginTop: 12,
    },
    showMoreText: {
        fontFamily: 'Poppins_Medium',
        fontSize: 14,
        color: theme.colors.primary,
    },
    // Weekly Forecast Styles
    weeklyForecastContainer: {
    flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    weeklyForecastDay: {
    alignItems: 'center',
    backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        width: '30%',
        minHeight: 140,
        shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    weeklyForecastDayHighlighted: {
    backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        transform: [{ scale: 1.05 }],
    },
    weeklyForecastDayName: {
    fontFamily: 'Poppins_Bold',
        fontSize: 14,
    color: theme.colors.text,
        marginBottom: 6,
        textAlign: 'center',
    },
    weeklyForecastDayNameHighlighted: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    weeklyForecastTemp: {
        fontFamily: 'Poppins_Bold',
        fontSize: 20,
        color: theme.colors.primary,
        marginTop: 4,
    },
    weeklyForecastTempHighlighted: {
        color: '#FFFFFF',
        fontSize: 24,
    },
    weeklyForecastTempMin: {
    fontFamily: 'Poppins_Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
        marginTop: 2,
    },
    weeklyForecastTempMinHighlighted: {
        color: '#FFFFFF',
        opacity: 0.8,
    },
    weeklyForecastDescription: {
        fontFamily: 'Poppins_Medium',
        fontSize: 11,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
    },
    weeklyForecastDescriptionHighlighted: {
        color: '#FFFFFF',
        opacity: 0.9,
    },
    weeklyForecastPrecip: {
        fontFamily: 'Poppins_Regular',
        fontSize: 10,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    weeklyForecastPrecipHighlighted: {
        color: '#FFFFFF',
        opacity: 0.8,
    },
    weekendBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FFD700',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3,
    },
    weekendBadgeText: {
    fontFamily: 'Poppins_Bold',
        fontSize: 8,
        color: '#000000',
        textAlign: 'center',
    },
    // Modern Weekly Forecast Styles
    weeklyContainer: {
        marginVertical: 8,
    },
    weeklySlider: {
        paddingLeft: 2,
        paddingRight: 8,
        paddingVertical: 12,
    },
        weeklyCardNew: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 12,
        marginHorizontal: 5,
        width: 115,
        minHeight: 150,
    alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    weeklyCardToday: {
        borderWidth: 2,
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.subtle,
    },
    weeklyCardWeekend: {
        backgroundColor: theme.isDarkMode ? '#2A2A3E' : '#FFF9E6',
    },
    weeklyHeader: {
        alignItems: 'center',
        marginBottom: 8,
    },
        weeklyDayText: {
    fontFamily: 'Poppins_Bold',
        fontSize: 11,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    weeklyDayTextToday: {
    color: theme.colors.primary,
        fontSize: 12,
  },
    weeklyDayTextWeekend: {
        color: '#FFD700',
  },
    weeklyDateText: {
    fontFamily: 'Poppins_Medium',
        fontSize: 14,
    color: theme.colors.text,
        marginTop: 1,
    },
    weeklyDateTextToday: {
        color: theme.colors.primary,
        fontFamily: 'Poppins_Bold',
    },
    weeklyIconContainer: {
        marginVertical: 4,
        height: 32,
        justifyContent: 'center',
    },
        weeklyTempContainer: {
    alignItems: 'center',
        marginVertical: 2,
        width: '100%',
  },
    weeklyMaxTemp: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    color: theme.colors.text,
  },
    weeklyMaxTempToday: {
        color: theme.colors.primary,
        fontSize: 20,
    },
    weeklyMinTemp: {
    fontFamily: 'Poppins_Regular',
        fontSize: 12,
    color: theme.colors.textSecondary,
        marginTop: -2,
  },
    weeklyRainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.subtle,
        paddingHorizontal: 8,
    paddingVertical: 4,
        borderRadius: 12,
  },
    weeklyRainText: {
    fontFamily: 'Poppins_Medium',
        fontSize: 11,
        color: theme.colors.info,
    },
    todayBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    todayDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    backgroundColor: theme.colors.primary,
    },
    weeklyLegend: {
    flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    weeklyLegendItem: {
        flexDirection: 'row',
    alignItems: 'center',
        gap: 8,
    },
    weeklyLegendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    weeklyLegendText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
    // Old styles kept for compatibility
    weeklyForecastSlider: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    weeklyForecastCard: {
        alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
        marginRight: 12,
        width: 140,
        minHeight: 160,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    weeklyForecastCardHighlighted: {
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        transform: [{ scale: 1.05 }],
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 24,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    modalTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 24,
    color: theme.colors.text,
  },
    modalSubtitle: {
    fontFamily: 'Poppins_Medium',
        fontSize: 16,
    color: theme.colors.textSecondary,
        marginTop: 2,
    },
    modalBody: {
        gap: 24,
    },
    modalIconSection: {
    alignItems: 'center',
        paddingVertical: 20,
    backgroundColor: theme.colors.subtle,
        borderRadius: 16,
  },
    modalDescription: {
    fontFamily: 'Poppins_Medium',
        fontSize: 18,
        color: theme.colors.text,
        marginTop: 12,
    },
    modalDetailsGrid: {
    flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    modalDetailItem: {
        width: '47%',
    backgroundColor: theme.colors.card,
        borderRadius: 16,
    padding: 16,
    alignItems: 'center',
        gap: 8,
  },
    modalDetailLabel: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
    modalDetailValue: {
        fontFamily: 'Poppins_Bold',
        fontSize: 18,
    color: theme.colors.text,
    },
    modalWeekendBadge: {
        backgroundColor: '#FFD700',
    paddingVertical: 12,
        paddingHorizontal: 24,
    borderRadius: 16,
        alignSelf: 'center',
    },
    modalWeekendText: {
        fontFamily: 'Poppins_Bold',
        fontSize: 14,
        color: '#000000',
        letterSpacing: 1,
    },
    // Station Modal Styles
    stationModalContent: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 24,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    stationModalHeader: {
    flexDirection: 'row',
        justifyContent: 'space-between',
    alignItems: 'center',
        marginBottom: 20,
    },
    stationModalTitle: {
        fontFamily: 'Poppins_Bold',
        fontSize: 20,
        color: theme.colors.text,
    },
    searchContainer: {
        marginBottom: 16,
    },
    searchInput: {
    backgroundColor: theme.colors.card,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontFamily: 'Poppins_Regular',
        fontSize: 16,
        color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
    stationList: {
        paddingBottom: 20,
    },
    stationItem: {
    backgroundColor: theme.colors.card,
        borderRadius: 12,
    padding: 16,
        marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
    stationItemSelected: {
        backgroundColor: theme.colors.primary,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    stationItemContent: {
        flex: 1,
    },
    stationItemName: {
        fontFamily: 'Poppins_Bold',
    fontSize: 16,
    color: theme.colors.text,
        marginBottom: 4,
    },
    stationRegion: {
        fontFamily: 'Poppins_Regular',
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    selectedIndicator: {
        backgroundColor: '#FFFFFF',
    borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedIndicatorText: {
        fontFamily: 'Poppins_Bold',
        fontSize: 16,
    color: theme.colors.primary,
  },
  // New styles for improved station selection
  autoDetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.subtle,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  autoDetectText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 16,
    color: theme.colors.primary,
  },
  stationListHeader: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  stationNameSelected: {
    color: '#FFFFFF',
  },
  stationRegionSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Warning Modal Styles - Improved
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalBackdropTouchable: {
    flex: 1,
  },
  warningModalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: screenHeight * 0.85, // Fixed 85% of screen height
    marginTop: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  warningModalHandleContainer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  warningModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  scrollIndicator: {
    opacity: 0.6,
    paddingVertical: 4,
  },

  warningModalTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 20,
    color: theme.colors.text,
    marginBottom: 2,
  },
  warningModalSubtitle: {
    fontFamily: 'Poppins_Medium',
    fontSize: 16,
    marginTop: 2,
  },
  modalCloseButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningModalScrollView: {
    flex: 1,
  },
  warningModalScrollContent: {
    paddingBottom: Math.max(insets.bottom, 40),
    gap: 24,
  },
  warningModalScrollableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  warningModalHeaderContent: {
    flex: 1,
    marginRight: 16,
  },
  warningModalIconSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 0,
    marginHorizontal: 20,
  },
  warningModalDescription: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  warningDetailsContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
    marginHorizontal: 20,
  },
  warningDetailsTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 12,
  },
  warningDetailsText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  warningModalDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 0,
    marginHorizontal: 20,
  },
  warningModalDetailItem: {
    width: '47%',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  warningModalDetailLabel: {
    fontFamily: 'Poppins_Medium',
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  warningModalDetailValue: {
    fontFamily: 'Poppins_Bold',
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },

  warningLevelBadge: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 0,
    marginHorizontal: 20,
  },
  warningLevelBadgeText: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  // New Additional Info Styles
  warningAdditionalInfoContainer: {
    marginHorizontal: 20,
    gap: 16,
  },
  warningInfoSection: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
  },
  warningInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  warningInfoTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
    color: theme.colors.text,
  },
  warningRegionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  warningRegionChip: {
    backgroundColor: theme.colors.subtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  warningRegionText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 13,
    color: theme.colors.text,
  },
  warningCommentBox: {
    backgroundColor: theme.colors.subtle,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  warningCommentText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Warnings List Modal Styles
  warningsListModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.8,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  warningsListModalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  warningsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  warningsListHeaderContent: {
    flex: 1,
    marginRight: 16,
  },
  warningsListTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 20,
    color: theme.colors.text,
    marginBottom: 2,
  },
  warningsListSubtitle: {
    fontFamily: 'Poppins_Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  warningsListScrollView: {
    flex: 1,
  },
  warningsListScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Math.max(insets.bottom, 40),
  },
  noWarningsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  noWarningsText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  warningsListItem: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  warningsListItemIcon: {
    marginRight: 16,
  },
  warningsListItemContent: {
    flex: 1,
    marginRight: 12,
  },
  warningsListItemTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
    lineHeight: 22,
  },
  warningsListItemSubtitle: {
    fontFamily: 'Poppins_Medium',
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  warningsListItemTime: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },

}); 
