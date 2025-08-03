import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  Dimensions, 
  StatusBar,
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  MapPin, 
  RefreshCw, 
  AlertTriangle, 
  CloudRain, 
  Wind, 
  Thermometer, 
  Eye, 
  Droplets, 
  Sun, 
  Moon, 
  Calendar, 
  Clock, 
  Settings, 
  Navigation, 
  X, 
  ChevronRight, 
  Cloud, 
  CloudFog, 
  CloudSnow, 
  CloudLightning,
  TrendingUp,
  TrendingDown,
  Gauge,
  Zap,
  ChevronDown
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useScrollStore } from '@/store/scrollStore';
import LoadingIndicator from '@/components/LoadingIndicator';
import SkeletonLoader from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import { WeatherIcon } from '@/components/WeatherIcon';
import { formatDateTime } from '@/utils/dateFormatter';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// API endpoints
const IMGW_API_URL = 'https://danepubliczne.imgw.pl/api/data/synop';
const IMGW_WARNINGS_METEO_URL = 'https://danepubliczne.imgw.pl/api/data/warningsmeteo';
const IMGW_WARNINGS_HYDRO_URL = 'https://danepubliczne.imgw.pl/api/data/warningshydro';
const OPEN_METEO_API_URL = 'https://api.open-meteo.com/v1/forecast';

// Główne stacje IMGW z regionami
const IMGW_STATIONS = [
  { id: '12155', name: 'Gdańsk', region: 'Pomorze', lat: 54.3775, lon: 18.4667 },
  { id: '12135', name: 'Hel', region: 'Pomorze', lat: 54.6083, lon: 18.8011 },
  { id: '12105', name: 'Koszalin', region: 'Zachodniopomorskie', lat: 54.1944, lon: 16.1822 },
  { id: '12205', name: 'Szczecin', region: 'Zachodniopomorskie', lat: 53.4167, lon: 14.6167 },
  { id: '12200', name: 'Świnoujście', region: 'Zachodniopomorskie', lat: 53.9167, lon: 14.2500 },
  { id: '12330', name: 'Poznań', region: 'Wielkopolskie', lat: 52.4167, lon: 16.8333 },
  { id: '12424', name: 'Wrocław', region: 'Dolnośląskie', lat: 51.1167, lon: 17.0333 },
  { id: '12415', name: 'Legnica', region: 'Dolnośląskie', lat: 51.2167, lon: 16.1667 },
  { id: '12500', name: 'Jelenia Góra', region: 'Dolnośląskie', lat: 50.9000, lon: 15.7333 },
  { id: '12375', name: 'Warszawa', region: 'Mazowieckie', lat: 52.2333, lon: 21.0167 },
  { id: '12195', name: 'Suwałki', region: 'Podlaskie', lat: 54.1000, lon: 22.9333 },
  { id: '12272', name: 'Olsztyn', region: 'Warmińsko-Mazurskie', lat: 53.7833, lon: 20.4833 },
  { id: '12250', name: 'Toruń', region: 'Kujawsko-Pomorskie', lat: 53.0167, lon: 18.6000 },
  { id: '12418', name: 'Leszno', region: 'Wielkopolskie', lat: 51.8500, lon: 16.5833 },
  { id: '12465', name: 'Łódź', region: 'Łódzkie', lat: 51.7833, lon: 19.4667 },
  { id: '12495', name: 'Lublin', region: 'Lubelskie', lat: 51.2500, lon: 22.5667 },
  { id: '12570', name: 'Kielce', region: 'Świętokrzyskie', lat: 50.8667, lon: 20.6333 },
  { id: '12566', name: 'Kraków', region: 'Małopolskie', lat: 50.0833, lon: 19.9167 },
  { id: '12625', name: 'Zakopane', region: 'Małopolskie', lat: 49.3000, lon: 19.9500 },
  { id: '12580', name: 'Rzeszów', region: 'Podkarpackie', lat: 50.0333, lon: 22.0000 },
  { id: '12560', name: 'Katowice', region: 'Śląskie', lat: 50.2667, lon: 19.0167 },
  { id: '12530', name: 'Opole', region: 'Opolskie', lat: 50.6667, lon: 17.9333 },
  { id: '12400', name: 'Zielona Góra', region: 'Lubuskie', lat: 51.9333, lon: 15.5000 },
];

interface WeatherData {
  id_stacji: string;
  stacja: string;
  data_pomiaru: string;
  godzina_pomiaru: string;
  temperatura: string;
  predkosc_wiatru: string;
  kierunek_wiatru: string;
  wilgotnosc_wzgledna: string;
  suma_opadu: string;
  cisnienie: string;
}

interface WarningData {
  id: string;
  type: string;
  level: number;
  title: string;
  description: string;
  validFrom: string;
  validTo: string;
  regions: string[];
}

export default function WeatherScreen() {
  const { theme } = useThemeStore();
  const styles = getStyles(theme);
  const router = useRouter();
  
  // State
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [allStationsData, setAllStationsData] = useState<WeatherData[]>([]);
  const [warnings, setWarnings] = useState<WarningData[]>([]);
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStation, setSelectedStation] = useState(IMGW_STATIONS[0]);
  const [showStationModal, setShowStationModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('Aktualna lokalizacja');
  const [locationData, setLocationData] = useState<Location.LocationObjectCoords | null>(null);
  const [userLocation, setUserLocation] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [showAllWarnings, setShowAllWarnings] = useState(false);
  const [showWeatherDetails, setShowWeatherDetails] = useState(false);

  useEffect(() => {
    initializeWeather();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      fetchWeatherData();
    }
  }, [selectedStation]);

  const initializeWeather = async () => {
    try {
      setLoading(true);
      
      // Pobierz lokalizację użytkownika
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCurrentLocation('Brak dostępu do lokalizacji');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocationData(location.coords);
      
      // Znajdź najbliższą stację
      const nearestStation = findNearestStation(location.coords);
      setSelectedStation(nearestStation);
      setCurrentLocation(`${nearestStation.name}, ${nearestStation.region}`);
      
      // Ustaw lokalizację użytkownika
      setUserLocation(`${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
      
      // Pobierz wszystkie dane
      await fetchAllWeatherData();
      await fetchWarnings();
      await fetchForecast();
      
      // Ustaw czas aktualizacji
      setLastUpdate(new Date().toLocaleTimeString('pl-PL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
      
    } catch (error) {
      console.error('Error initializing weather:', error);
    } finally {
      setLoading(false);
    }
  };

  const findNearestStation = (coords: Location.LocationObjectCoords) => {
    let nearest = IMGW_STATIONS[0];
    let minDistance = Infinity;

    IMGW_STATIONS.forEach(station => {
      const distance = calculateDistance(
        coords.latitude,
        coords.longitude,
        station.lat,
        station.lon
      );
      
        if (distance < minDistance) {
          minDistance = distance;
        nearest = station;
      }
    });

    return nearest;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Promień Ziemi w km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchAllWeatherData = async () => {
    try {
      const response = await fetch(IMGW_API_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAllStationsData(data || []);
    } catch (error) {
      console.error('Error fetching all weather data:', error);
      setAllStationsData([]);
    }
  };

  const fetchWeatherData = async () => {
    try {
      const response = await fetch(`${IMGW_API_URL}/id/${selectedStation.id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.length > 0) {
        setWeatherData(data[0]);
      } else {
        // Fallback - spróbuj pobrać wszystkie dane i znajdź stację
        const allResponse = await fetch(IMGW_API_URL);
        if (allResponse.ok) {
          const allData = await allResponse.json();
          const stationData = allData.find((station: any) => station.id_stacji === selectedStation.id);
          if (stationData) {
            setWeatherData(stationData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    }
  };

  const fetchWarnings = async () => {
    try {
      // Pobierz ostrzeżenia meteorologiczne
      const meteoResponse = await fetch(IMGW_WARNINGS_METEO_URL);
      const meteoData = await meteoResponse.json();
      
      // Pobierz ostrzeżenia hydrologiczne
      const hydroResponse = await fetch(IMGW_WARNINGS_HYDRO_URL);
      const hydroData = await hydroResponse.json();
      
      // Połącz dane
      const allWarnings = [
        ...(meteoData || []).map((warning: any) => ({
          ...warning,
          type: 'meteo',
          title: warning.nazwa_zdarzenia,
          description: warning.tresc,
          level: parseInt(warning.stopien),
          validFrom: warning.obowiazuje_od,
          validTo: warning.obowiazuje_do,
          regions: warning.teryt || []
        })),
        ...(hydroData || []).map((warning: any) => ({
          ...warning,
          type: 'hydro',
          title: warning.zdarzenie,
          description: warning.przebieg,
          level: parseInt(warning.stopień),
          validFrom: warning.data_od,
          validTo: warning.data_do,
          regions: [warning.wojewodztwo]
        }))
      ];
      
      // Filtruj ostrzeżenia dla lokalizacji użytkownika
      const userWarnings = allWarnings.filter((warning: any) => {
        // Sprawdź czy ostrzeżenie dotyczy lokalizacji użytkownika
        if (warning.type === 'meteo') {
          // Dla ostrzeżeń meteorologicznych sprawdź regiony
          return warning.regions && warning.regions.length > 0;
        } else {
          // Dla ostrzeżeń hydrologicznych sprawdź województwo
          return warning.regions && warning.regions.some((region: string) => 
            region.toLowerCase().includes('pomorskie') || 
            region.toLowerCase().includes('kaszuby') ||
            region.toLowerCase().includes('gdansk') ||
            region.toLowerCase().includes('sopot') ||
            region.toLowerCase().includes('gdynia')
          );
        }
      });
      
      setWarnings(userWarnings);
    } catch (error) {
      console.error('Error fetching warnings:', error);
    }
  };

  const fetchForecast = async () => {
    if (!locationData) {
      console.log('Brak danych lokalizacji dla prognozy');
      // Spróbuj użyć danych z selectedStation jako fallback
      if (selectedStation) {
        console.log('Używam selectedStation jako fallback:', selectedStation);
        const fallbackLocation = {
          latitude: selectedStation.lat,
          longitude: selectedStation.lon
        };
        
        try {
          const response = await fetch(
            `${OPEN_METEO_API_URL}?latitude=${fallbackLocation.latitude}&longitude=${fallbackLocation.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=Europe%2FWarsaw`
          );
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('Otrzymane dane prognozy (fallback):', data);
          
          if (data.daily) {
            setForecastData(data.daily);
            console.log('Ustawiono dane prognozy (fallback):', data.daily);
          }
        } catch (error) {
          console.error('Error fetching forecast (fallback):', error);
        }
      }
      return;
    }
    
    try {
      console.log('Pobieranie prognozy dla:', locationData.latitude, locationData.longitude);
      
      const response = await fetch(
        `${OPEN_METEO_API_URL}?latitude=${locationData.latitude}&longitude=${locationData.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=Europe%2FWarsaw`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Otrzymane dane prognozy:', data);
      
      if (data.daily) {
        setForecastData(data.daily);
        console.log('Ustawiono dane prognozy:', data.daily);
      } else {
        console.log('Brak danych daily w odpowiedzi');
      }
    } catch (error) {
      console.error('Error fetching forecast:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAllWeatherData(),
      fetchWeatherData(),
      fetchWarnings(),
      fetchForecast()
    ]);
    setRefreshing(false);
  };

  const getTemperatureColor = (temp: string) => {
    const temperature = parseFloat(temp);
    if (temperature >= 25) return '#FF6B6B';
    if (temperature >= 15) return '#4ECDC4';
    if (temperature >= 5) return '#1e3a8a'; // Granatowy zamiast niebieskiego
    return '#96CEB4';
  };

  const getWindDescription = (speed: string) => {
    const windSpeed = parseFloat(speed);
    if (windSpeed < 2) return 'Bezwietrznie';
    if (windSpeed < 5) return 'Lekki wiatr';
    if (windSpeed < 10) return 'Umiarkowany wiatr';
    if (windSpeed < 15) return 'Silny wiatr';
    return 'Bardzo silny wiatr';
  };

  const getWeatherDescription = (code: number) => {
    const descriptions: { [key: number]: string } = {
      0: 'Bezchmurnie',
      1: 'Prawie bezchmurnie',
      2: 'Częściowo pochmurno',
      3: 'Pochmurno',
      45: 'Mgła',
      48: 'Mgła z szronem',
      51: 'Lekka mżawka',
      53: 'Mżawka',
      55: 'Intensywna mżawka',
      61: 'Lekki deszcz',
      63: 'Deszcz',
      65: 'Intensywny deszcz',
      71: 'Lekki śnieg',
      73: 'Śnieg',
      75: 'Intensywny śnieg',
      95: 'Burza',
    };
    return descriptions[code] || 'Pochmurno';
  };

  const getWeatherIcon = (code: number) => {
    const iconMap: { [key: number]: any } = {
      0: Sun,
      1: Sun,
      2: Cloud,
      3: Cloud,
      45: CloudFog,
      48: CloudFog,
      51: CloudRain,
      53: CloudRain,
      55: CloudRain,
      61: CloudRain,
      63: CloudRain,
      65: CloudRain,
      71: CloudSnow,
      73: CloudSnow,
      75: CloudSnow,
      95: CloudLightning,
    };
    return iconMap[code] || Sun;
  };

  const getWeekendForecast = () => {
    if (!forecastData) return null;
    
    const today = new Date();
    const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    const weekendDays = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendDays.push({
          day: days[dayOfWeek],
          date: date.toLocaleDateString('pl-PL'),
          max: forecastData.temperature_2m_max?.[i],
          min: forecastData.temperature_2m_min?.[i],
          weatherCode: forecastData.weathercode?.[i],
          precipitation: forecastData.precipitation_probability_max?.[i],
          precipitationSum: forecastData.precipitation_sum?.[i]
        });
      }
    }
    
    return weekendDays;
  };

  const renderWeatherMetric = ({ 
    icon: Icon, 
    label, 
    value, 
    unit, 
    color, 
    description 
  }: { 
    icon: any; 
    label: string; 
    value: string; 
    unit: string; 
    color: string; 
    description: string; 
  }) => (
    <TouchableOpacity 
      style={styles.metricCard}
      activeOpacity={0.8}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(label, description);
      }}
    >
      <View style={[styles.metricIcon, { backgroundColor: `${color}15` }]}>
        <Icon size={24} color={color} />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}{unit}</Text>
      </View>
      <ChevronRight size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderStationItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[
        styles.stationItem, 
        selectedStation.id === item.id && styles.selectedStationItem
      ]}
      onPress={() => {
        setSelectedStation(item);
        setShowStationModal(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.stationItemContent}>
        <Text style={[
          styles.stationName,
          selectedStation.id === item.id && styles.selectedStationName
        ]}>
          {item.name}
        </Text>
        <Text style={[
          styles.stationRegion,
          selectedStation.id === item.id && styles.selectedStationRegion
        ]}>
          {item.region}
        </Text>
      </View>
      {selectedStation.id === item.id && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedIndicatorText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && !weatherData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <LoadingIndicator />
          <Text style={styles.loadingText}>Pobieram dane pogodowe...</Text>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDarkMode ? 'light-content' : 'dark-content'} />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Pogoda</Text>
            <Text style={styles.headerSubtitle}>{userLocation || 'Pobieranie lokalizacji...'}</Text>
          </View>
            <TouchableOpacity 
              style={styles.locationButton}
            onPress={() => setShowStationModal(true)}
              activeOpacity={0.8}
            >
            <MapPin size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
        {/* Location Selection Bar */}
        <View style={styles.locationBar}>
          <View style={styles.locationBarContent}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <Text style={styles.locationBarText}>
              {currentLocation || 'Wybierz lokalizację'}
            </Text>
          <TouchableOpacity 
              style={styles.changeLocationButton}
            onPress={() => setShowStationModal(true)}
              activeOpacity={0.7}
          >
              <Text style={styles.changeLocationText}>Zmień</Text>
          </TouchableOpacity>
          </View>
        </View>

        {/* Current Weather */}
        {weatherData && (
          <View style={styles.currentWeatherContainer}>
            <TouchableOpacity 
              style={styles.currentWeatherCard}
              onPress={() => setShowWeatherDetails(!showWeatherDetails)}
              activeOpacity={0.9}
            >
              <View style={styles.currentWeatherHeader}>
                <View style={styles.currentWeatherInfo}>
                  <Text style={styles.currentTemp}>
                    {parseFloat(weatherData.temperatura).toFixed(1)}°
                  </Text>
                  <Text style={styles.currentTempLabel}>
                    {getWeatherDescription(1)}
                  </Text>
                  <View style={styles.stationInfoContainer}>
                    <Text style={styles.stationInfo}>
                      {weatherData.stacja}
                    </Text>
                    <Text style={styles.updateTime}>
                      Ostatnia aktualizacja: {lastUpdate}
                    </Text>
              </View>
                </View>
                <View style={styles.currentWeatherIcon}>
                  <Sun size={72} color={theme.colors.primary} />
                </View>
              </View>
              
              {showWeatherDetails && (
                <View style={styles.currentWeatherMetrics}>
                  <View style={styles.metricRow}>
                    <View style={styles.metricItem}>
                      <Wind size={20} color={theme.colors.textSecondary} />
                      <Text style={styles.metricLabel}>Wiatr</Text>
                      <Text style={styles.metricValue}>{weatherData.predkosc_wiatru} km/h</Text>
                      <Text style={styles.metricDescription}>{getWindDescription(weatherData.predkosc_wiatru)}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Droplets size={20} color={theme.colors.textSecondary} />
                      <Text style={styles.metricLabel}>Wilgotność</Text>
                      <Text style={styles.metricValue}>{weatherData.wilgotnosc_wzgledna}%</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Gauge size={20} color={theme.colors.textSecondary} />
                      <Text style={styles.metricLabel}>Ciśnienie</Text>
                      <Text style={styles.metricValue}>{weatherData.cisnienie} hPa</Text>
              </View>
            </View>
          </View>
        )}
            </TouchableOpacity>
          </View>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <View style={styles.warningsContainer}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Ostrzeżenia</Text>
          </View>
            
            {warnings.slice(0, showAllWarnings ? warnings.length : 1).map((warning, index) => (
              <View key={warning.id || index} style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <Text style={styles.warningTitle}>{warning.title}</Text>
                  <View style={[
                    styles.warningLevel,
                    { backgroundColor: warning.level >= 2 ? '#ef4444' : '#f59e0b' }
                  ]}>
                    <Text style={styles.warningLevelText}>
                      Stopień {warning.level}
                    </Text>
              </View>
            </View>
                <Text style={styles.warningDescription}>
                  {warning.description}
                </Text>
              </View>
            ))}
            
            {warnings.length > 1 && (
              <TouchableOpacity 
                style={styles.showMoreButton}
                onPress={() => setShowAllWarnings(!showAllWarnings)}
                activeOpacity={0.8}
              >
                <Text style={styles.showMoreText}>
                  {showAllWarnings ? 'Pokaż mniej' : `Pokaż więcej (${warnings.length - 1})`}
                </Text>
                <ChevronDown size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Weather Metrics */}
        {weatherData && (
          <View style={styles.metricsContainer}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Szczegóły pogodowe</Text>
            </View>
            
            <View style={styles.metricsGrid}>
              {renderWeatherMetric({
                icon: Thermometer,
                label: 'Temperatura',
                value: parseFloat(weatherData.temperatura).toFixed(1),
                unit: '°C',
                color: getTemperatureColor(weatherData.temperatura),
                description: `Aktualna temperatura powietrza wynosi ${weatherData.temperatura}°C. Jest to standardowy pomiar na wysokości 2 metrów nad ziemią.`
              })}
              
              {weatherData.cisnienie && renderWeatherMetric({
                icon: Gauge,
                label: 'Ciśnienie',
                value: weatherData.cisnienie,
                unit: ' hPa',
                color: '#10B981',
                description: `Ciśnienie atmosferyczne wynosi ${weatherData.cisnienie} hPa (hektopaskali). Normalne ciśnienie na poziomie morza to około 1013 hPa.`
              })}
              
              {weatherData.wilgotnosc_wzgledna && renderWeatherMetric({
                icon: Droplets,
                label: 'Wilgotność',
                value: parseFloat(weatherData.wilgotnosc_wzgledna).toFixed(0),
                unit: '%',
                color: '#3B82F6',
                description: `Wilgotność względna powietrza wynosi ${weatherData.wilgotnosc_wzgledna}%. Wartość 100% oznacza powietrze nasycone parą wodną.`
              })}
              
              {weatherData.predkosc_wiatru && renderWeatherMetric({
                icon: Wind,
                label: 'Wiatr',
                value: weatherData.predkosc_wiatru,
                unit: ' km/h',
                color: '#8B5CF6',
                description: `Prędkość wiatru wynosi ${weatherData.predkosc_wiatru} km/h. ${getWindDescription(weatherData.predkosc_wiatru)}.`
              })}
              
              {weatherData.suma_opadu && renderWeatherMetric({
                icon: CloudRain,
                label: 'Opady',
                value: parseFloat(weatherData.suma_opadu).toFixed(1),
                unit: ' mm',
                color: '#06B6D4',
                description: `Suma opadów wynosi ${weatherData.suma_opadu} mm. Jest to suma opadów z ostatnich 24 godzin.`
              })}
            </View>
          </View>
        )}

        {/* Weekend Forecast */}
        {forecastData && getWeekendForecast() && (
          <View style={styles.weekendContainer}>
            <View style={styles.sectionHeader}>
              <Calendar size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Pogoda na weekend</Text>
            </View>
            
            <View style={styles.weekendGrid}>
              {getWeekendForecast()!.map((day, index) => {
                const WeatherIconComponent = getWeatherIcon(day.weatherCode);
                return (
                  <View key={index} style={styles.weekendCard}>
                    <View style={styles.weekendHeader}>
                      <Text style={styles.weekendDay}>{day.day}</Text>
                      <Text style={styles.weekendDate}>{day.date}</Text>
                    </View>
                    
                    <View style={styles.weekendWeather}>
                      <View style={styles.weekendIconContainer}>
                        <WeatherIconComponent size={32} color={theme.colors.primary} />
                      </View>
                      <Text style={styles.weekendDescription}>
                        {getWeatherDescription(day.weatherCode)}
                      </Text>
                    </View>
                    
                    <View style={styles.weekendTemp}>
                      <Text style={styles.weekendTempMax}>{day.max?.toFixed(1)}°</Text>
                      <Text style={styles.weekendTempMin}>{day.min?.toFixed(1)}°</Text>
                    </View>
                    
                    {day.precipitation && (
                      <View style={styles.weekendPrecipitation}>
                        <Droplets size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.weekendPrecipitationText}>{day.precipitation}%</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Weekly Forecast Slider */}
        {forecastData && forecastData.temperature_2m_max && (
          <View style={styles.weeklyContainer}>
            <View style={styles.weeklyHeader}>
              <View style={styles.sectionHeader}>
                <Calendar size={20} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Prognoza na tydzień</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weeklySlider}
            >
              {forecastData.temperature_2m_max?.slice(0, 7).map((max: any, index: number) => {
                const min = forecastData.temperature_2m_min?.[index];
                const weatherCode = forecastData.weathercode?.[index];
                const precipitation = forecastData.precipitation_probability_max?.[index];
                const date = new Date();
                date.setDate(date.getDate() + index);
                const dayName = ['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'][date.getDay()];
                const WeatherIconComponent = getWeatherIcon(weatherCode);
                
                return (
                  <View key={index} style={styles.weeklyCard}>
                    <Text style={styles.weeklyDay}>{dayName}</Text>
                    <Text style={styles.weeklyDate}>{date.getDate()}.{date.getMonth() + 1}</Text>
                    
                    <View style={styles.weeklyIconContainer}>
                      <WeatherIconComponent size={24} color={theme.colors.primary} />
                    </View>
                    
                    <Text style={styles.weeklyTempMax}>{max?.toFixed(1)}°</Text>
                    <Text style={styles.weeklyTempMin}>{min?.toFixed(1)}°</Text>
                    
                    {precipitation && (
                      <View style={styles.weeklyPrecipitation}>
                        <Droplets size={10} color={theme.colors.textSecondary} />
                        <Text style={styles.weeklyPrecipitationText}>{precipitation}%</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Debug info */}
        {!forecastData && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>Brak danych prognozy</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && !weatherData && (
          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <View style={styles.errorIconContainer}>
                <Cloud size={32} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.errorText}>Nie udało się pobrać danych pogodowych</Text>
              <Text style={styles.errorSubtext}>Sprawdź połączenie z internetem i spróbuj ponownie</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={initializeWeather}
              >
                <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Station Selection Modal */}
      <Modal
        visible={showStationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wybierz stację</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowStationModal(false)}
              >
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={IMGW_STATIONS}
              renderItem={renderStationItem}
              keyExtractor={(item) => item.id}
              style={styles.stationList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 32,
    color: theme.colors.text,
    marginBottom: 4,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontFamily: 'Poppins_Regular',
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  locationButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 15,
    color: theme.colors.text,
  },
  refreshButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroSection: {
    marginBottom: 32,
  },
  heroGradient: {
    borderRadius: 24,
    padding: 28,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeft: {
    flex: 1,
  },
  heroRight: {
    alignItems: 'center',
  },
  currentTemp: {
    fontFamily: 'Poppins_Bold',
    fontSize: 64,
    color: theme.colors.text,
    lineHeight: 68,
    letterSpacing: -2,
    marginBottom: 16,
  },
  currentTempLabel: {
    fontFamily: 'Poppins_Regular',
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  stationInfo: {
    fontFamily: 'Poppins_Medium',
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
    marginBottom: 2,
  },
  weatherIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${theme.colors.primary}30`,
  },
  warningsContainer: {
    marginBottom: 20,
  },
  summaryContainer: {
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadingText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  errorIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${theme.colors.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${theme.colors.error}30`,
  },
  errorText: {
    fontFamily: 'Poppins_Bold',
    fontSize: 20,
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    fontFamily: 'Poppins_Regular',
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  metricsContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 22,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  metricsGrid: {
    gap: 16,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  metricValue: {
    fontFamily: 'Poppins_Bold',
    fontSize: 20,
    color: theme.colors.text,
  },
  weekendContainer: {
    marginBottom: 32,
  },
  weekendGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  weekendCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  weekendHeader: {
    marginBottom: 20,
  },
  weekendDay: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 4,
  },
  weekendDate: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  weekendWeather: {
    alignItems: 'center',
    marginBottom: 20,
  },
  weekendIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}30`,
  },
  weekendDescription: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
  },
  weekendTemp: {
    alignItems: 'center',
    marginBottom: 16,
  },
  weekendTempMax: {
    fontFamily: 'Poppins_Bold',
    fontSize: 32,
    color: theme.colors.text,
  },
  weekendTempMin: {
    fontFamily: 'Poppins_Medium',
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  weekendPrecipitation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  weekendPrecipitationText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  weeklyContainer: {
    marginBottom: 32,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  weeklySlider: {
    paddingRight: 20,
  },
  weeklyCard: {
    width: 110,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 20,
    marginRight: 16,
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  weeklyDay: {
    fontFamily: 'Poppins_Bold',
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  weeklyDate: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  weeklyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}30`,
  },
  weeklyTempMax: {
    fontFamily: 'Poppins_Bold',
    fontSize: 20,
    color: theme.colors.text,
  },
  weeklyTempMin: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  weeklyPrecipitation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  weeklyPrecipitationText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    maxHeight: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 22,
    color: theme.colors.text,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stationList: {
    padding: 24,
  },
  locationList: {
    padding: 24,
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    backgroundColor: theme.colors.card,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedStationItem: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stationItemContent: {
    flex: 1,
  },
  stationName: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },
  selectedStationName: {
    color: 'white',
  },
  stationRegion: {
    fontFamily: 'Poppins_Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  selectedStationRegion: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  selectedIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Poppins_Bold',
  },
  locationOption: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    backgroundColor: theme.colors.card,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  locationOptionName: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },
  locationOptionRegion: {
    fontFamily: 'Poppins_Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailModalContent: {
    backgroundColor: theme.colors.background,
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailModalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  detailModalTitleSection: {
    flex: 1,
  },
  detailModalTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 22,
    color: theme.colors.text,
    marginBottom: 6,
  },
  detailModalValue: {
    fontFamily: 'Poppins_Bold',
    fontSize: 28,
    color: theme.colors.primary,
  },
  detailModalBody: {
    padding: 24,
  },
  detailModalDescription: {
    fontFamily: 'Poppins_Medium',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 20,
    lineHeight: 24,
  },
  detailModalDetails: {
    fontFamily: 'Poppins_Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  warningCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  warningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    color: theme.colors.text,
  },
  warningLevel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  warningLevelText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: 'white',
  },
  warningDescription: {
    fontFamily: 'Poppins_Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  stationsContainer: {
    marginBottom: 32,
  },
  stationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  stationCard: {
    width: '48%', // Two cards per row
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stationCardName: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
  },
  stationCardTemp: {
    fontFamily: 'Poppins_Bold',
    fontSize: 24,
    color: theme.colors.text,
  },
  stationCardWind: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  retryButtonText: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
    color: 'white',
  },
  currentWeatherContainer: {
    marginBottom: 32,
  },
  currentWeatherCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  currentWeatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  currentWeatherInfo: {
    flex: 1,
  },
  currentWeatherIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  stationInfoContainer: {
    marginTop: 8,
  },
  updateTime: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  currentWeatherMetrics: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 20,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.subtle,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricDescription: {
    fontFamily: 'Poppins_Regular',
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.subtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  showMoreText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.primary,
    marginRight: 8,
  },
  debugContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    marginTop: 20,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  debugText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  locationBar: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 32,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationBarText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
    marginLeft: 12,
  },
  changeLocationButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.subtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  changeLocationText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.primary,
  },
}); 