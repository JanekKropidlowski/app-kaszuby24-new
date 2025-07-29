import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl, TouchableOpacity, Modal, FlatList, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, RefreshCw, AlertTriangle, CloudRain, Wind, Thermometer, Eye, Droplets, Sun, Moon, Calendar, Clock, Share2, Settings, Home, Search, Bookmark } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWeatherData, fetchWeatherWarnings, fetchWeatherStations } from '@/services/api';
import { WeatherData, WeatherWarning, WeatherStation } from '@/types/weather';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useScrollStore } from '@/store/scrollStore';
import LoadingIndicator from '@/components/LoadingIndicator';
import SkeletonLoader from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import { WeatherIcon } from '@/components/WeatherIcon';
import WeatherSummary from '@/components/WeatherSummary';
import WeatherWarnings from '@/components/WeatherWarnings';
import { formatDateTime } from '@/utils/dateFormatter';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const IMGW_API_URL = 'https://danepubliczne.imgw.pl/api/data/synop';
const OPEN_METEO_API_URL = 'https://api.open-meteo.com/v1/forecast';

// Lista głównych stacji IMGW w Polsce
const IMGW_STATIONS = [
  { id: '12155', name: 'Gdańsk', region: 'Pomorze' },
  { id: '12160', name: 'Hel', region: 'Pomorze' },
  { id: '12195', name: 'Koszalin', region: 'Zachodniopomorskie' },
  { id: '12205', name: 'Szczecin', region: 'Zachodniopomorskie' },
  { id: '12210', name: 'Świnoujście', region: 'Zachodniopomorskie' },
  { id: '12235', name: 'Poznań', region: 'Wielkopolskie' },
  { id: '12250', name: 'Wrocław', region: 'Dolnośląskie' },
  { id: '12270', name: 'Legnica', region: 'Dolnośląskie' },
  { id: '12280', name: 'Jelenia Góra', region: 'Dolnośląskie' },
  { id: '12300', name: 'Warszawa', region: 'Mazowieckie' },
  { id: '12330', name: 'Białystok', region: 'Podlaskie' },
  { id: '12345', name: 'Suwałki', region: 'Podlaskie' },
  { id: '12360', name: 'Olsztyn', region: 'Warmińsko-Mazurskie' },
  { id: '12375', name: 'Elbląg', region: 'Warmińsko-Mazurskie' },
  { id: '12400', name: 'Toruń', region: 'Kujawsko-Pomorskie' },
  { id: '12415', name: 'Bydgoszcz', region: 'Kujawsko-Pomorskie' },
  { id: '12418', name: 'Słupsk', region: 'Pomorze' },
  { id: '12424', name: 'Łódź', region: 'Łódzkie' },
  { id: '12435', name: 'Kalisz', region: 'Wielkopolskie' },
  { id: '12465', name: 'Lublin', region: 'Lubelskie' },
  { id: '12488', name: 'Kielce', region: 'Świętokrzyskie' },
  { id: '12510', name: 'Kraków', region: 'Małopolskie' },
  { id: '12530', name: 'Zakopane', region: 'Małopolskie' },
  { id: '12550', name: 'Rzeszów', region: 'Podkarpackie' },
  { id: '12560', name: 'Katowice', region: 'Śląskie' },
  { id: '12566', name: 'Opole', region: 'Opolskie' },
  { id: '12575', name: 'Zielona Góra', region: 'Lubuskie' },
  { id: '12600', name: 'Gorzów Wielkopolski', region: 'Lubuskie' },
];

export default function WeatherScreen() {
  const { theme } = useThemeStore();
  const styles = getStyles(theme);
  const [locationStatus, setLocationStatus] = useState('Sprawdzam lokalizację...');
  const [locationData, setLocationData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [warnings, setWarnings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStation, setSelectedStation] = useState(IMGW_STATIONS[0]);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [currentLocation, setCurrentLocation] = useState('Aktualna lokalizacja');

  useEffect(() => {
    initializeWeather();
  }, []);

  useEffect(() => {
    if (locationData) {
      fetchWeatherData();
    }
  }, [locationData, selectedStation]);

  const initializeWeather = async () => {
    try {
      setLocationStatus('Proszę o uprawnienia do lokalizacji...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationStatus('Brak uprawnień do lokalizacji');
        return;
      }

      setLocationStatus('Pobieram lokalizację...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocationData(location.coords);
      setLocationStatus('Lokalizacja pobrana');
      
      // Pobierz nazwę miejscowości
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          const locationName = place.city || place.subregion || place.region || 'Nieznana lokalizacja';
          setCurrentLocation(locationName);
        }
      } catch (error) {
        console.log('Nie udało się pobrać nazwy miejscowości');
      }
      
      findNearestStation(location.coords);
    } catch (error) {
      setLocationStatus(`Błąd lokalizacji: ${error.message}`);
    }
  };

  const findNearestStation = (coords) => {
    let nearestStation = IMGW_STATIONS[0];
    let minDistance = Infinity;

    IMGW_STATIONS.forEach(station => {
      const stationCoords = getStationCoordinates(station.id);
      if (stationCoords) {
        const distance = calculateDistance(coords.latitude, coords.longitude, stationCoords.lat, stationCoords.lon);
        if (distance < minDistance) {
          minDistance = distance;
          nearestStation = station;
        }
      }
    });

    setSelectedStation(nearestStation);
  };

  const getStationCoordinates = (stationId) => {
    const coordinates = {
      '12155': { lat: 54.3776, lon: 18.6202 },
      '12300': { lat: 52.2297, lon: 21.0122 },
      '12510': { lat: 50.0647, lon: 19.9450 },
      '12250': { lat: 51.1079, lon: 17.0385 },
      '12235': { lat: 52.4064, lon: 16.9252 },
      '12424': { lat: 51.7592, lon: 19.4559 },
      '12465': { lat: 51.2465, lon: 22.5684 },
      '12560': { lat: 50.2613, lon: 19.0239 },
    };
    return coordinates[stationId];
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchWeatherData = async () => {
    if (!locationData) return;

    setLoading(true);

    try {
      const [imgwResponse, meteoResponse, warningsResponse] = await Promise.allSettled([
        fetch(`${IMGW_API_URL}/id/${selectedStation.id}`),
        fetch(`${OPEN_METEO_API_URL}?latitude=${locationData.latitude}&longitude=${locationData.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FWarsaw`),
        fetch('https://danepubliczne.imgw.pl/api/data/warningsmeteo')
      ]);

      if (imgwResponse.status === 'fulfilled' && imgwResponse.value.ok) {
        const imgwData = await imgwResponse.value.json();
        setWeatherData(imgwData);
      }

      if (meteoResponse.status === 'fulfilled' && meteoResponse.value.ok) {
        const meteoData = await meteoResponse.value.json();
        setForecastData(meteoData.daily);
      }

      if (warningsResponse.status === 'fulfilled' && warningsResponse.value.ok) {
        const warningsData = await warningsResponse.value.json();
        setWarnings(warningsData);
      }

    } catch (error) {
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWeatherData();
    setRefreshing(false);
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
          precipitation: forecastData.precipitation_probability_max?.[i]
        });
      }
    }
    
    return weekendDays;
  };

  const getWeatherDescription = (code) => {
    const descriptions = {
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
    return descriptions[code] || 'Nieznane';
  };

  const getWeatherIcon = (code) => {
    const iconMap = {
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

  const handleDetailPress = (detail) => {
    setSelectedDetail(detail);
    setShowDetailModal(true);
  };

  const renderStationItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.stationItem, 
        selectedStation.id === item.id && styles.selectedStationItem
      ]}
      onPress={() => {
        setSelectedStation(item);
        setShowStationModal(false);
      }}
      activeOpacity={0.7}
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
          <Text style={styles.selectedIndicatorText}>●</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderWeatherMetric = ({ icon: Icon, label, value, unit, color, description, details }) => (
    <TouchableOpacity 
      style={styles.metricCard}
      onPress={() => handleDetailPress({ icon: Icon, label, value, unit, color, description, details })}
      activeOpacity={0.8}
    >
      <View style={[styles.metricIcon, { backgroundColor: color }]}>
        <Icon size={24} color="white" />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}{unit}</Text>
      </View>
      <ChevronRight size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderLocationOption = ({ item }) => (
    <TouchableOpacity 
      style={styles.locationOption}
      onPress={() => {
        setCurrentLocation(item.name);
        setShowLocationModal(false);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.locationOptionContent}>
        <MapPin size={20} color={theme.colors.primary} />
        <View style={styles.locationOptionText}>
          <Text style={styles.locationOptionName}>{item.name}</Text>
          <Text style={styles.locationOptionRegion}>{item.region}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.topBarTitle}>Pogoda</Text>
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={() => setShowLocationModal(true)}
              activeOpacity={0.8}
            >
              <MapPin size={16} color={theme.colors.primary} />
              <Text style={styles.locationText}>{currentLocation}</Text>
              <Settings size={14} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.stationButton}
            onPress={() => setShowStationModal(true)}
            activeOpacity={0.8}
          >
            <Navigation size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Current Weather Hero */}
        {weatherData && (
          <View style={styles.heroSection}>
            <View style={styles.heroContent}>
              <View style={styles.heroLeft}>
                <Text style={styles.currentTemp}>{weatherData.temperatura}°</Text>
                <Text style={styles.currentTempLabel}>Aktualna temperatura</Text>
                <Text style={styles.stationInfo}>Stacja: {weatherData.stacja}</Text>
              </View>
              <View style={styles.heroRight}>
                <View style={styles.weatherIconContainer}>
                  {forecastData && (
                    (() => {
                      const WeatherIconComponent = getWeatherIcon(forecastData.weathercode?.[0] ?? 0);
                      return <WeatherIconComponent size={48} color={theme.colors.primary} />;
                    })()
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Weather Warnings */}
        {warnings && warnings.length > 0 && (
          <View style={styles.warningsContainer}>
            <WeatherWarnings warnings={warnings} />
          </View>
        )}

        {/* Weather Summary */}
        {weatherData && forecastData && (
          <View style={styles.summaryContainer}>
            <WeatherSummary 
              weatherData={weatherData} 
              stationName={weatherData.stacja} 
              currentWmoCode={forecastData.weathercode?.[0] ?? 0} 
            />
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <SkeletonLoader type="home" count={3} immediate={true} />
        )}

        {/* Error State */}
        {!loading && !weatherData && (
          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <View style={styles.errorIconContainer}>
                <Cloud size={32} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.errorText}>Nie udało się pobrać danych pogodowych</Text>
              <Text style={styles.errorSubtext}>Sprawdź połączenie z internetem</Text>
            </View>
          </View>
        )}

        {/* Weather Metrics Grid */}
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
                value: weatherData.temperatura,
                unit: '°C',
                color: '#EF4444',
                description: 'Aktualna temperatura powietrza',
                details: `Temperatura ${weatherData.temperatura}°C została zmierzona na wysokości 2 metrów nad ziemią. Jest to standardowa wysokość pomiaru temperatury w meteorologii.`
              })}
              
              {renderWeatherMetric({
                icon: Eye,
                label: 'Ciśnienie',
                value: weatherData.cisnienie,
                unit: ' hPa',
                color: '#10B981',
                description: 'Ciśnienie atmosferyczne',
                details: `Ciśnienie atmosferyczne wynosi ${weatherData.cisnienie} hPa (hektopaskali). Normalne ciśnienie na poziomie morza to około 1013 hPa.`
              })}
              
              {renderWeatherMetric({
                icon: Droplets,
                label: 'Wilgotność',
                value: weatherData.wilgotnosc_wzgledna,
                unit: '%',
                color: '#3B82F6',
                description: 'Wilgotność względna powietrza',
                details: `Wilgotność względna powietrza wynosi ${weatherData.wilgotnosc_wzgledna}%. Wartość 100% oznacza powietrze nasycone parą wodną.`
              })}
              
              {weatherData.predkosc_wiatru && renderWeatherMetric({
                icon: Wind,
                label: 'Wiatr',
                value: weatherData.predkosc_wiatru,
                unit: ' km/h',
                color: '#8B5CF6',
                description: 'Prędkość wiatru',
                details: `Prędkość wiatru wynosi ${weatherData.predkosc_wiatru} km/h. Kierunek wiatru: ${weatherData.kierunek_wiatru || 'nieznany'}.`
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
              {getWeekendForecast().map((day, index) => {
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
                      <Text style={styles.weekendTempMax}>{day.max}°</Text>
                      <Text style={styles.weekendTempMin}>{day.min}°</Text>
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
        {forecastData && (
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
              {forecastData.temperature_2m_max?.slice(0, 7).map((max, index) => {
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
                    
                    <Text style={styles.weeklyTempMax}>{max}°</Text>
                    <Text style={styles.weeklyTempMin}>{min}°</Text>
                    
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
      </ScrollView>

      {/* Station Selection Modal */}
      <Modal
        visible={showStationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wybierz stację IMGW</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowStationModal(false)}
                activeOpacity={0.8}
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

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wybierz lokalizację</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowLocationModal(false)}
                activeOpacity={0.8}
              >
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={[
                { name: 'Aktualna lokalizacja', region: 'GPS' },
                ...IMGW_STATIONS
              ]}
              renderItem={renderLocationOption}
              keyExtractor={(item, index) => index.toString()}
              style={styles.locationList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.detailModalHeader}>
              <View style={[styles.detailModalIcon, { backgroundColor: selectedDetail?.color }]}>
                {selectedDetail && <selectedDetail.icon size={32} color="white" />}
              </View>
              <View style={styles.detailModalTitleSection}>
                <Text style={styles.detailModalTitle}>{selectedDetail?.label}</Text>
                <Text style={styles.detailModalValue}>{selectedDetail?.value}{selectedDetail?.unit}</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowDetailModal(false)}
                activeOpacity={0.8}
              >
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.detailModalBody}>
              <Text style={styles.detailModalDescription}>{selectedDetail?.description}</Text>
              <Text style={styles.detailModalDetails}>{selectedDetail?.details}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  topBarLeft: {
    flex: 1,
  },
  topBarTitle: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 28,
    color: theme.colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  locationText: {
    fontFamily: theme.fontFamily.medium,
    fontSize: 14,
    color: theme.colors.text,
  },
  stationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  heroSection: {
    marginBottom: 24,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroLeft: {
    flex: 1,
  },
  heroRight: {
    alignItems: 'center',
  },
  currentTemp: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 56,
    color: theme.colors.text,
    lineHeight: 60,
    letterSpacing: -2,
  },
  currentTempLabel: {
    fontFamily: theme.fontFamily.regular,
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  stationInfo: {
    fontFamily: theme.fontFamily.medium,
    fontSize: 14,
    color: theme.colors.primary,
  },
  weatherIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingText: {
    fontFamily: theme.fontFamily.medium,
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontFamily: theme.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  metricsContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 20,
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontFamily: theme.fontFamily.medium,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  weekendContainer: {
    marginBottom: 24,
  },
  weekendGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  weekendCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  weekendHeader: {
    marginBottom: 16,
  },
  weekendDay: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 4,
  },
  weekendDate: {
    fontFamily: theme.fontFamily.regular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  weekendWeather: {
    alignItems: 'center',
    marginBottom: 16,
  },
  weekendIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  weekendDescription: {
    fontFamily: theme.fontFamily.medium,
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
  },
  weekendTemp: {
    alignItems: 'center',
    marginBottom: 12,
  },
  weekendTempMax: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 28,
    color: theme.colors.text,
  },
  weekendTempMin: {
    fontFamily: theme.fontFamily.medium,
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
    fontFamily: theme.fontFamily.regular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  weeklyContainer: {
    marginBottom: 24,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weeklySlider: {
    paddingRight: 20,
  },
  weeklyCard: {
    width: 100,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  weeklyDay: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  weeklyDate: {
    fontFamily: theme.fontFamily.regular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  weeklyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  weeklyTempMax: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  weeklyTempMin: {
    fontFamily: theme.fontFamily.medium,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  weeklyPrecipitation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  weeklyPrecipitationText: {
    fontFamily: theme.fontFamily.regular,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 20,
    color: theme.colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationList: {
    padding: 20,
  },
  locationList: {
    padding: 20,
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.card,
  },
  selectedStationItem: {
    backgroundColor: theme.colors.primary,
  },
  stationItemContent: {
    flex: 1,
  },
  stationName: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },
  selectedStationName: {
    color: 'white',
  },
  stationRegion: {
    fontFamily: theme.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  selectedStationRegion: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: 'white',
    fontSize: 14,
    fontFamily: theme.fontFamily.bold,
  },
  locationOption: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.card,
  },
  locationOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  locationOptionName: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },
  locationOptionRegion: {
    fontFamily: theme.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailModalContent: {
    backgroundColor: theme.colors.background,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  detailModalTitleSection: {
    flex: 1,
  },
  detailModalTitle: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 20,
    color: theme.colors.text,
    marginBottom: 4,
  },
  detailModalValue: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 24,
    color: theme.colors.primary,
  },
  detailModalBody: {
    padding: 20,
  },
  detailModalDescription: {
    fontFamily: theme.fontFamily.medium,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
  },
  detailModalDetails: {
    fontFamily: theme.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
}); 