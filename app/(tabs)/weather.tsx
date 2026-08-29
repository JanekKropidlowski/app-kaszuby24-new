import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Settings,
  AlertCircle,
  WifiOff,
  MapPin,
  Calendar,
  Clock,
  TrendingUp,
  Thermometer,
  Cloud,
  Droplets,
  Wind,
  Eye,
  Sun,
  Info,
  AlertTriangle,
  Bell,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Moon
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useWeatherConfigStore } from '@/store/weatherConfigStore';
import { WeatherHero } from '@/components/WeatherHero';
import { HourlyForecast } from '@/components/HourlyForecast';
import { WeeklyForecast } from '@/components/WeeklyForecast';
import SpecializedWeatherWidgets from '@/components/SpecializedWeatherWidgets';
import { WeatherConfig } from '@/components/WeatherConfig';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import { LocationSelectionModal } from '@/components/LocationSelectionModal';

import { MeteoconsWeatherIcon } from '@/components/WeatherIcons';

import SwipeableModal from '@/components/SwipeableModal';

import * as Location from 'expo-location';
import { fetchForecast, fetchAllWarnings, filterWarningsForPomeranianVoivodeship, fetchAirQuality, fetchSynopData, findNearestSynopStation, fetchMeteoData, findNearestStations, fetchMarineForecast, findNearestStationsWithDistance, fetchHydroData } from '@/services/weatherService';
import { useRouter } from 'expo-router';
import { testNetworkConnectivity } from '@/utils/androidNetworkHelper';

// Simplified mock data
const mockCurrentWeather = {
  temperature: 18.5,
  condition: 'Partly cloudy',
  wmoCode: 3,
  humidity: 65,
  windSpeed: 12.3,
  pressure: 1013.2,
  feelsLike: 16.8,
  uvIndex: 4,
  visibility: 10.2,
  precipitation: 0.0,
};

const mockHourlyData = Array.from({ length: 24 }, (_, i) => {
  const hour = new Date(Date.now() + i * 60 * 60 * 1000).getHours();
  const baseTemp = 15;
  const tempVariation = Math.sin((hour - 6) * Math.PI / 12) * 8;
  const temp = baseTemp + tempVariation + (Math.random() - 0.5) * 2;

  return {
    time: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
    temperature: Math.round(temp * 10) / 10,
    wmoCode: hour >= 6 && hour <= 18 ? (Math.random() > 0.7 ? 3 : 1) : (Math.random() > 0.8 ? 2 : 0),
    precipitation: hour >= 14 && hour <= 18 ? Math.random() * 2.5 : Math.random() * 0.3,
    windSpeed: 8 + Math.sin(hour * Math.PI / 12) * 4 + (Math.random() - 0.5) * 2,
    humidity: 60 + Math.sin(hour * Math.PI / 12) * 15 + (Math.random() - 0.5) * 10,
  };
});

const mockWeeklyData = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return {
    date: date.toISOString(),
    wmoCode: isWeekend ? (Math.random() > 0.6 ? 3 : 1) : (Math.random() > 0.8 ? 2 : 1),
    maxTemp: 18 + Math.sin(i * Math.PI / 7) * 8 + (Math.random() - 0.5) * 4,
    minTemp: 8 + Math.sin(i * Math.PI / 7) * 6 + (Math.random() - 0.5) * 3,
    precipitation: isWeekend ? Math.random() * 0.8 : Math.random() * 0.4,
    windSpeed: 10 + Math.sin(i * Math.PI / 7) * 5 + (Math.random() - 0.5) * 3,
  };
});



export default function WeatherScreen() {
  const { theme, isDarkMode } = useThemeStore();
  const { config, setConfig, selectedStation, sectionOrder, setSectionOrder } = useWeatherConfigStore();

  // Debug log dla sectionOrder
  console.log('WeatherScreen - sectionOrder:', sectionOrder);
  console.log('WeatherScreen - config:', config);
  const router = useRouter();
  const handleOpenPushSettings = () => {
    router.push('/(tabs)/preferences');
  };





  // Simplified state management
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentWeather, setCurrentWeather] = useState(mockCurrentWeather);
  const [hourlyData, setHourlyData] = useState(mockHourlyData);
  const [weeklyData, setWeeklyData] = useState(mockWeeklyData);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [allAlerts, setAllAlerts] = useState<any[]>([]);
  const [alertsModalVisible, setAlertsModalVisible] = useState(false);
  const [alertFilters, setAlertFilters] = useState<{ severity: 'all' | 'low' | 'medium' | 'high'; type: 'all' | 'meteo' | 'hydro' }>({ severity: 'all', type: 'all' });
  const [showAllWarningsNationwide, setShowAllWarningsNationwide] = useState(false);
  const [nearestStation, setNearestStation] = useState<{ name: string; distance?: number } | null>(null);
  const [userCityName, setUserCityName] = useState<string | null>(null);
  const [synopData, setSynopData] = useState<any | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [meteoNearest, setMeteoNearest] = useState<any | null>(null);
  const [dataSources, setDataSources] = useState<{ label: string; source: string }[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<any>(null);



  // Modal states
  const [configVisible, setConfigVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const [weatherDetailsModalVisible, setWeatherDetailsModalVisible] = useState(false);
  const [marineData, setMarineData] = useState<any | null>(null);
  const [waterTempC, setWaterTempC] = useState<number | null>(null);

  // Simple animations

  // Simple animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Location handling
  const getCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Brak uprawnień do lokalizacji');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 100,
      });

      setUserLocation(location);

      // Reverse geocoding: pobierz nazwę miasta dla przycisku nagłówka
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geocode[0]) {
          const city = geocode[0].city || geocode[0].district || geocode[0].subregion || geocode[0].region;
          setUserCityName(city || null);
        }
      } catch (_) { }

      await fetchWeatherData(location.coords);

    } catch (err) {
      console.error('Błąd pobierania lokalizacji:', err);
      setError('Nie udało się pobrać lokalizacji');
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced weather data fetching with IMGW integration
  const fetchWeatherData = useCallback(async (coords: Location.LocationObjectCoords) => {
    try {
      const online = await testNetworkConnectivity();
      setIsOnline(online);
      setError(null);

      // Parallel fetch all data sources for better performance
      const [
        forecast,
        warnings,
        air,
        synop,
        meteo,
        marine,
        hydro
      ] = await Promise.allSettled([
        fetchForecast(coords, { skipNetwork: !online }),
        fetchAllWarnings({ skipNetwork: !online }),
        fetchAirQuality(coords, { skipNetwork: !online }),
        fetchSynopData({ skipNetwork: !online }),
        fetchMeteoData({ skipNetwork: !online }),
        fetchMarineForecast(coords, { skipNetwork: !online }),
        fetchHydroData({ skipNetwork: !online })
      ]);

      // Process Open-Meteo forecast data
      if (forecast.status === 'fulfilled' && forecast.value) {
        setForecastData(forecast.value);

        if (forecast.value.current_weather) {
          setCurrentWeather(prev => ({
            ...prev,
            temperature: forecast.value.current_weather.temperature,
            condition: getWeatherCondition(forecast.value.current_weather.weathercode),
            wmoCode: forecast.value.current_weather.weathercode,
            windSpeed: forecast.value.current_weather.windspeed,
          }));
        }

        if (forecast.value.hourly && Array.isArray(forecast.value.hourly.time)) {
          const realHourlyData = forecast.value.hourly.time.map((time: string, index: number) => ({
            time,
            temperature: forecast.value.hourly.temperature_2m[index],
            wmoCode: forecast.value.hourly.weathercode[index],
            precipitation: forecast.value.hourly.precipitation[index] || 0,
            windSpeed: forecast.value.hourly.windspeed_10m[index] || 0,
            humidity: forecast.value.hourly.relativehumidity_2m[index] || 0,
          }));
          setHourlyData(realHourlyData);
        }

        if (forecast.value.daily && Array.isArray(forecast.value.daily.time)) {
          const realWeeklyData = forecast.value.daily.time.map((date: string, index: number) => ({
            date,
            wmoCode: forecast.value.daily.weathercode[index],
            maxTemp: forecast.value.daily.temperature_2m_max[index],
            minTemp: forecast.value.daily.temperature_2m_min[index],
            precipitation: forecast.value.daily.precipitation_sum[index] || 0,
            windSpeed: forecast.value.daily.windspeed_10m_max?.[index] || 10,
          }));
          setWeeklyData(realWeeklyData);
        }
      }

      // Process Air Quality
      if (air.status === 'fulfilled' && air.value) {
        // Keep it in state if needed later (optional)
        // setAirQuality(air.value)
      }

      // Process Marine
      if (marine.status === 'fulfilled' && marine.value) {
        // sanity: tylko dla lokalizacji morskich (blisko Bałtyku)
        const lat = coords.latitude;
        const lon = coords.longitude;
        const nearBaltic = lat >= 53.0 && lat <= 56.5 && lon >= 13.0 && lon <= 20.5;
        if (nearBaltic) {
          setMarineData(marine.value);
        } else {
          setMarineData(null);
        }
      } else {
        setMarineData(null);
      }

      // Process Hydro (water temperature from nearest station)
      if (hydro.status === 'fulfilled' && Array.isArray(hydro.value)) {
        const nearestHydro = findNearestStationsWithDistance(coords, hydro.value, 15).find((h: any) =>
          h?.temperatura_wody != null &&
          String(h.temperatura_wody).trim() !== '' &&
          !isNaN(Number(h.temperatura_wody)) &&
          Number(h.temperatura_wody) > -50 &&
          Number(h.temperatura_wody) < 50
        );
        if (nearestHydro) {
          const t = parseFloat(String(nearestHydro.temperatura_wody));
          setWaterTempC(Number.isFinite(t) ? t : null);
          // push to data sources later below
        } else {
          setWaterTempC(null);
        }
      } else {
        setWaterTempC(null);
      }

      // Process warnings (IMGW meteo + hydro)
      if (warnings.status === 'fulfilled' && Array.isArray(warnings.value)) {
        // Map ALL warnings for modal 'Polska' widok
        const mappedAll = warnings.value
          .map((w: any) => ({
            id: w.id,
            title: w.title,
            description: w.description,
            severity: w.level >= 3 ? 'high' : w.level === 2 ? 'medium' : 'low',
            level: w.level,
            type: w.type,
            validFrom: w.validFrom,
            validTo: w.validTo,
          }))
          // Highest first
          .sort((a: any, b: any) => (b.level || 0) - (a.level || 0));
        setAllAlerts(mappedAll);

        // Filter for Pomorskie and map to UI alerts for skrót na ekranie
        const relevant = filterWarningsForPomeranianVoivodeship(warnings.value);

        const mapped = relevant
          .map((w: any) => ({
            id: w.id,
            title: w.title,
            description: w.description,
            severity: w.level >= 3 ? 'high' : w.level === 2 ? 'medium' : 'low',
            level: w.level,
            type: w.type,
            validFrom: w.validFrom,
            validTo: w.validTo,
          }))
          .sort((a: any, b: any) => (b.level || 0) - (a.level || 0));
        setAlerts(mapped);
      } else if (warnings.status === 'rejected') {
        const reason = warnings.reason;
        // Don't show error if it's just "no warnings found"
        if (reason && typeof reason === 'object' && 'message' in reason && reason.message === 'No products were found') {
          console.log('No weather warnings found - this is normal when no warnings are active');
          setAlerts([]);
          setAllAlerts([]);
        } else {
          console.error('Weather warnings fetch failed:', reason);
          setAlerts([]);
          setAllAlerts([]);
          // Show error message to user only for real errors
          setError('Nie udało się pobrać ostrzeżeń pogodowych. Sprawdź połączenie z internetem.');
        }
      } else {
        setAlerts([]);
        setAllAlerts([]);
      }

      // Najbliższa stacja SYNOP — ustawiamy zawsze (GPS badge + odległość w nagłówku)
      const nearest = findNearestSynopStation(coords);
      if (nearest) {
        setNearestStation({ name: nearest.name, distance: nearest.distance });
        // Spróbuj dopasować do dzisiejszych danych synoptycznych
        if (synop.status === 'fulfilled' && Array.isArray(synop.value) && nearest.id) {
          const found = synop.value.find((s: any) => String(s.id_stacji) === String(nearest.id));
          if (found) setSynopData(found);
        }
      }

      // Find nearest METEO station (for soil temperature etc.)
      if (meteo.status === 'fulfilled' && Array.isArray(meteo.value)) {
        // Find nearest METEO station with soil temperature; fallback to the nearest available
        const nearestList = findNearestStationsWithDistance(coords, meteo.value, 15); // Zwiększam zasięg do 15km
        const soilStation = Array.isArray(nearestList)
          ? nearestList.find((s: any) => s?.temperatura_gruntu != null && String(s.temperatura_gruntu).trim() !== '')
          : null;
        const chosen = soilStation || (Array.isArray(nearestList) && nearestList.length > 0 ? nearestList[0] : null);
        if (chosen) {
          setMeteoNearest(chosen as any);
          // enrich currentWeather with soil temperature for widgets if absent
          if (chosen?.temperatura_gruntu != null) {
            setCurrentWeather(prev => ({ ...prev, soilTemperature: Number(chosen.temperatura_gruntu) }));
          }
        }
      }

      // Build source notes per metric from available stations
      const sources: { label: string; source: string }[] = [];
      if (synop.status === 'fulfilled' && Array.isArray(synop.value)) {
        if (synopData?.stacja) sources.push({ label: 'Powietrze', source: `SYNOP: ${synopData.stacja}${nearestStation?.distance ? ` (${nearestStation.distance.toFixed(1)} km)` : ''}` });
      }
      if (meteoNearest) {
        if (meteoNearest?.temperatura_gruntu)
          sources.push({ label: 'Gleba', source: `METEO: ${meteoNearest?.nazwa_stacji || 'stacja'} (${(meteoNearest as any).distance?.toFixed?.(1) || '?'} km)` });
      }
      if (marine.status === 'fulfilled' && marine.value && marineData) {
        sources.push({ label: 'Morze', source: 'Open‑Meteo Marine (grid)' });
      }
      if (hydro.status === 'fulfilled' && Array.isArray(hydro.value)) {
        const nearestHydro = findNearestStationsWithDistance(coords, hydro.value, 15).find((h: any) =>
          h?.temperatura_wody != null &&
          String(h.temperatura_wody).trim() !== '' &&
          !isNaN(Number(h.temperatura_wody)) &&
          Number(h.temperatura_wody) > -50 &&
          Number(h.temperatura_wody) < 50
        );
        if (nearestHydro) {
          sources.push({ label: 'Woda', source: `HYDRO: ${nearestHydro.stacja || 'stacja'} (${(nearestHydro as any).distance?.toFixed?.(1) || '?'} km)` });
        }
      }
      setDataSources(sources);

    } catch (err) {
      console.error('Błąd pobierania danych pogodowych:', err);
      setIsOnline(false);
      setError('Błąd połączenia z internetem');
    }
  }, []);

  // Helper functions
  const getWeatherCondition = (code: number): string => {
    const conditions: { [key: number]: string } = {
      0: 'Bezchmurnie',
      1: 'Przeważnie bezchmurnie',
      2: 'Częściowo zachmurzone',
      3: 'Zachmurzone',
      45: 'Mgła',
      48: 'Mgła z szronem',
      51: 'Mżawka lekka',
      53: 'Mżawka umiarkowana',
      55: 'Mżawka intensywna',
      61: 'Deszcz lekki',
      63: 'Deszcz umiarkowany',
      65: 'Deszcz intensywny',
      71: 'Śnieg lekki',
      73: 'Śnieg umiarkowany',
      75: 'Śnieg intensywny',
      95: 'Burza',
    };
    return conditions[code] || 'Nieznane';
  };

  // Initialize
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Animations
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, fadeAnim, slideAnim]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (userLocation) {
      await fetchWeatherData(userLocation.coords);
    }
    setRefreshing(false);
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    } catch {
      return iso;
    }
  };



  const baseAlerts = showAllWarningsNationwide ? allAlerts : alerts;
  const filteredAlerts = baseAlerts.filter((a) => {
    const severityOk = alertFilters.severity === 'all' || a.severity === alertFilters.severity;
    const typeOk = alertFilters.type === 'all' || a.type === alertFilters.type;
    return severityOk && typeOk;
  });



  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig);
    // Force refresh to apply new configuration
    if (userLocation) {
      fetchWeatherData(userLocation.coords);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingIndicator message="Pobieranie danych pogodowych..." />
      </SafeAreaView>
    );
  }

  if (error && !userLocation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          icon={<AlertCircle size={48} color={theme.colors.error} />}
          title="Błąd lokalizacji"
          message={error}
          actionLabel="Spróbuj ponownie"
          onAction={getCurrentLocation}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Clean header with location and settings */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.locationButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => setLocationModalVisible(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Lokalizacja"
        >
          <MapPin size={16} color={theme.colors.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[styles.locationText, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {selectedStation?.cityName
                ? selectedStation.cityName
                : selectedStation
                  ? selectedStation.name
                  : (userCityName || nearestStation?.name || 'Twoja lokalizacja')}
            </Text>
            {selectedStation?.cityName ? (
              <Text style={[styles.locationSubText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                Stacja: {selectedStation.name}
              </Text>
            ) : !selectedStation && nearestStation ? (
              <Text style={[styles.locationSubText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                Stacja: {nearestStation.name}{nearestStation.distance != null ? ` • ${nearestStation.distance.toFixed(1)} km` : ''}
              </Text>
            ) : null}
          </View>
          {!selectedStation && nearestStation && (
            <View style={[styles.nearestBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.nearestBadgeText, { color: theme.colors.primary }]}>GPS</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: theme.colors.card }]}
            onPress={() => setConfigVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Otwórz ustawienia pogody"
          >
            <Settings size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: theme.colors.card }]}
            onPress={handleOpenPushSettings}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Otwórz ustawienia powiadomień"
          >
            <Bell size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status indicator */}
      {!isOnline && (
        <View style={[styles.statusIndicator, { backgroundColor: isDarkMode ? '#1F2937' : '#FEF3C7' }]}>
          <WifiOff size={16} color={isDarkMode ? '#FCD34D' : '#D97706'} />
          <Text style={[styles.statusText, { color: isDarkMode ? '#FCD34D' : '#D97706' }]}>
            Offline
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Weather hero - główna informacja pogodowa */}
        <Animated.View
          style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <WeatherHero
            temperature={currentWeather.temperature}
            feelsLike={currentWeather.feelsLike}
            wmoCode={currentWeather.wmoCode}
            humidity={currentWeather.humidity}
            windSpeed={currentWeather.windSpeed}
            uvIndex={currentWeather.uvIndex}
            pressure={currentWeather.pressure}
            visibility={currentWeather.visibility}
            windDirection={45}
            onDetailsPress={() => setWeatherDetailsModalVisible(true)}
          />

        </Animated.View>











        {(sectionOrder || ['weekly', 'alerts', 'hourly', 'specialized']).map((sectionKey) => {
          console.log('Processing section:', sectionKey, 'sectionOrder:', sectionOrder); // Debug log
          if (sectionKey === 'weekly' && config.showWeeklyForecast) {
            return (
              <Animated.View key="weekly" style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.sectionHeader}>
                  <Calendar size={20} color={theme.colors.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Prognoza 7-dniowa</Text>
                </View>
                <WeeklyForecast data={weeklyData} />
              </Animated.View>
            );
          }

          // Demo ikon pogodowych - do usunięcia po wyborze


          if (sectionKey === 'alerts' && config.showAlerts) {
            return (
              <Animated.View key="alerts" style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
                  <AlertTriangle size={20} color={theme.colors.warning} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Ostrzeżenia pogodowe</Text>
                  <View style={{ flex: 1 }} />
                  {alerts.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setAlertsModalVisible(true)}
                      accessibilityRole="button"
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.primary + '10' }}
                    >
                      <Text style={{ color: theme.colors.primary, fontFamily: Platform.select({ default: 'Poppins_Medium', android: 'Poppins_Medium' }) || 'Poppins_Medium', fontSize: 13 }}>
                        Zobacz wszystkie
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {alerts.length > 0 ? (
                  <TouchableOpacity activeOpacity={0.85} onPress={() => setAlertsModalVisible(true)}>
                    <View style={[styles.alertsContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                      {alerts.slice(0, 3).map((alert, index) => (
                        <View key={index} style={[styles.alertItem, { borderLeftColor: alert.severity === 'high' ? theme.colors.error : alert.severity === 'medium' ? theme.colors.warning : theme.colors.info }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                            <Text style={[styles.alertTitle, { color: theme.colors.text, flex: 1 }]}>{alert.title}</Text>
                            <View style={[styles.badge, { backgroundColor: (alert.severity === 'high' ? theme.colors.error : alert.severity === 'medium' ? theme.colors.warning : theme.colors.info) + '20', flexShrink: 0 }]}>
                              <Text style={[styles.badgeText, { color: alert.severity === 'high' ? theme.colors.error : alert.severity === 'medium' ? theme.colors.warning : theme.colors.info }]}>
                                {alert.severity === 'high' ? 'Wysokie' : alert.severity === 'medium' ? 'Średnie' : 'Niskie'}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.alertDescription, { color: theme.colors.textSecondary }]}>
                            {alert.description}
                          </Text>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 8, fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }) || 'Poppins_Regular' }}>
                            {formatDateTime(alert.validFrom)} - {formatDateTime(alert.validTo)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.alertsContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={styles.noAlertsContainer}>
                      <View style={[styles.noAlertsIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                        <AlertTriangle size={24} color={theme.colors.primary} />
                      </View>
                      <Text style={[styles.noAlertsText, { color: theme.colors.textSecondary }]}>
                        Brak aktywnych ostrzeżeń pogodowych
                      </Text>
                      <Text style={[styles.noAlertsSubtext, { color: theme.colors.textSecondary }]}>
                        Wszystkie ostrzeżenia IMGW-PIB są aktualizowane co 15 minut
                      </Text>
                    </View>
                  </View>
                )}
              </Animated.View>
            );
          }

          if (sectionKey === 'hourly' && config.showHourlyForecast) {
            return (
              <Animated.View key="hourly" style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.sectionHeader}>
                  <Clock size={20} color={theme.colors.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Prognoza godzinowa</Text>
                </View>
                <HourlyForecast data={hourlyData} />
              </Animated.View>
            );
          }

          if (sectionKey === 'specialized' && config.showSpecializedWidgets) {
            return (
              <Animated.View key="specialized" style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.sectionHeader}>
                  <TrendingUp size={20} color={theme.colors.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pogoda specjalistyczna</Text>
                </View>
                <SpecializedWeatherWidgets
                  weatherData={currentWeather}
                  forecastData={forecastData}
                  meteoData={meteoNearest}
                  airQualityData={null}
                  synopData={synopData}
                  marineData={marineData}
                  dataSources={dataSources}
                  showAgricultural={config.showAgriculturalWeather}
                  showMarine={config.showMarineWeather}
                  showDriving={config.showDrivingWeather}
                />
              </Animated.View>
            );
          }

          return null;
        })}
      </ScrollView>

      {/* Modals */}
      <WeatherConfig
        visible={configVisible}
        onClose={() => setConfigVisible(false)}
        config={config}
        onConfigChange={handleConfigChange}
      />

      <LocationSelectionModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
      />







      {/* Weather Details Modal */}
      <SwipeableModal
        visible={weatherDetailsModalVisible}
        onClose={() => setWeatherDetailsModalVisible(false)}
        title="Szczegóły pogody"
        presentationStyle="pageSheet"
      >
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {currentWeather && (
            <View style={styles.weatherDetailsContainer}>
              {/* Podsumowanie */}
              <View style={[styles.weatherSummaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.weatherSummaryHeader}>
                  <View style={styles.weatherSummaryIcon}>
                    <MeteoconsWeatherIcon wmoCode={currentWeather.wmoCode} size={84} />
                  </View>
                  <View style={styles.weatherSummaryInfo}>
                    <Text style={[styles.weatherSummaryTemp, { color: theme.colors.text }]}>
                      {Math.round(currentWeather.temperature)}°
                    </Text>
                    <Text style={[styles.weatherSummaryCondition, { color: theme.colors.textSecondary }]}>
                      {currentWeather.condition}
                    </Text>
                    <Text style={[styles.weatherSummaryFeels, { color: theme.colors.textSecondary }]}>
                      Odczuwalna {Math.round(currentWeather.feelsLike)}°
                    </Text>
                  </View>
                </View>
              </View>

              {/* Zwięzłe metryki */}
              <View style={styles.tilesGrid}>
                <View style={[styles.tile, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={[styles.tileIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Droplets size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.tileLabel, { color: theme.colors.textSecondary }]}>Wilgotność</Text>
                  <Text style={[styles.tileValue, { color: theme.colors.text }]}>{currentWeather.humidity}%</Text>
                </View>
                <View style={[styles.tile, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={[styles.tileIconContainer, { backgroundColor: theme.colors.secondary + '15' }]}>
                    <Wind size={18} color={theme.colors.secondary} />
                  </View>
                  <Text style={[styles.tileLabel, { color: theme.colors.textSecondary }]}>Wiatr</Text>
                  <Text style={[styles.tileValue, { color: theme.colors.text }]}>{currentWeather.windSpeed} km/h</Text>
                </View>
                <View style={[styles.tile, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={[styles.tileIconContainer, { backgroundColor: theme.colors.error + '15' }]}>
                    <Eye size={18} color={theme.colors.error} />
                  </View>
                  <Text style={[styles.tileLabel, { color: theme.colors.textSecondary }]}>Ciśnienie</Text>
                  <Text style={[styles.tileValue, { color: theme.colors.text }]}>{currentWeather.pressure} hPa</Text>
                </View>
                <View style={[styles.tile, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={[styles.tileIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Eye size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.tileLabel, { color: theme.colors.textSecondary }]}>Widoczność</Text>
                  <Text style={[styles.tileValue, { color: theme.colors.text }]}>{currentWeather.visibility} km</Text>
                </View>
                <View style={[styles.tile, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={[styles.tileIconContainer, { backgroundColor: theme.colors.warning + '15' }]}>
                    <Sun size={18} color={theme.colors.warning} />
                  </View>
                  <Text style={[styles.tileLabel, { color: theme.colors.textSecondary }]}>Indeks UV</Text>
                  <Text style={[styles.tileValue, { color: theme.colors.text }]}>{currentWeather.uvIndex}</Text>
                </View>
                <View style={[styles.tile, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={[styles.tileIconContainer, { backgroundColor: theme.colors.info + '15' }]}>
                    <Cloud size={18} color={theme.colors.info} />
                  </View>
                  <Text style={[styles.tileLabel, { color: theme.colors.textSecondary }]}>Zachmurzenie</Text>
                  <Text style={[styles.tileValue, { color: theme.colors.text }]}>{forecastData?.hourly?.cloudcover?.[0] ?? '—'}%</Text>
                </View>
                <View style={[styles.tile, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={[styles.tileIconContainer, { backgroundColor: theme.colors.warning + '15' }]}>
                    <Droplets size={18} color={theme.colors.warning} />
                  </View>
                  <Text style={[styles.tileLabel, { color: theme.colors.textSecondary }]}>Szansa opadów</Text>
                  <Text style={[styles.tileValue, { color: theme.colors.text }]}>{forecastData?.hourly?.precipitation_probability?.[0] ?? '—'}%</Text>
                </View>
                <View style={[styles.tile, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={[styles.tileIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Thermometer size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.tileLabel, { color: theme.colors.textSecondary }]}>Punkt rosy</Text>
                  <Text style={[styles.tileValue, { color: theme.colors.text }]}>{forecastData?.hourly?.dew_point_2m?.[0] != null ? `${Math.round(forecastData.hourly.dew_point_2m[0])}°C` : '—'}</Text>
                </View>
                <View style={[styles.tile, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={[styles.tileIconContainer, { backgroundColor: theme.colors.secondary + '15' }]}>
                    <Wind size={18} color={theme.colors.secondary} />
                  </View>
                  <Text style={[styles.tileLabel, { color: theme.colors.textSecondary }]}>Porywy</Text>
                  <Text style={[styles.tileValue, { color: theme.colors.text }]}>{forecastData?.hourly?.wind_gusts_10m?.[0] != null ? `${Math.round(forecastData.hourly.wind_gusts_10m[0])} km/h` : '—'}</Text>
                </View>
              </View>

              {/* Dodatkowe: miejsce + czas */}
              <View style={styles.additionalRow}>
                <View style={[styles.additionalCell, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.additionalInfoLabel, { color: theme.colors.textSecondary }]}>Lokalizacja</Text>
                  <Text style={[styles.additionalInfoValue, { color: theme.colors.text }]}>
                    {selectedStation?.name || nearestStation?.name || 'Twoja lokalizacja'}
                  </Text>
                </View>
                <View style={[styles.additionalCell, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.additionalInfoLabel, { color: theme.colors.textSecondary }]}>Wschód / zachód</Text>
                  <Text style={[styles.additionalInfoValue, { color: theme.colors.text }]}>
                    {forecastData?.daily?.sunrise?.[0] ? new Date(forecastData.daily.sunrise[0]).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '—'} / {forecastData?.daily?.sunset?.[0] ? new Date(forecastData.daily.sunset[0]).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </Text>
                </View>
              </View>

              {/* Informacje o źródle danych */}
              <View style={[styles.dataSourceSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.dataSourceTitle, { color: theme.colors.text }]}>Źródło danych</Text>

                {/* Stacja IMGW */}
                {nearestStation && (
                  <View style={styles.dataSourceItem}>
                    <View style={[styles.dataSourceIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                      <MapPin size={16} color={theme.colors.primary} />
                    </View>
                    <View style={styles.dataSourceInfo}>
                      <Text style={[styles.dataSourceLabel, { color: theme.colors.textSecondary }]}>Stacja IMGW</Text>
                      <Text style={[styles.dataSourceValue, { color: theme.colors.text }]}>
                        {nearestStation.name}
                        {nearestStation.distance && ` (${nearestStation.distance.toFixed(1)} km)`}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Czas pomiaru */}
                {synopData && (
                  <View style={styles.dataSourceItem}>
                    <View style={[styles.dataSourceIcon, { backgroundColor: theme.colors.secondary + '15' }]}>
                      <Clock size={16} color={theme.colors.secondary} />
                    </View>
                    <View style={styles.dataSourceInfo}>
                      <Text style={[styles.dataSourceLabel, { color: theme.colors.textSecondary }]}>Czas pomiaru</Text>
                      <Text style={[styles.dataSourceValue, { color: theme.colors.text }]}>
                        {synopData.data_pomiaru && synopData.godzina_pomiaru
                          ? `${synopData.data_pomiaru} ${synopData.godzina_pomiaru}`
                          : 'Ostatnie dane dostępne'
                        }
                      </Text>
                    </View>
                  </View>
                )}

                {/* Stacja METEO (temperatura gleby) */}
                {meteoNearest && (
                  <View style={styles.dataSourceItem}>
                    <View style={[styles.dataSourceIcon, { backgroundColor: theme.colors.warning + '15' }]}>
                      <Thermometer size={16} color={theme.colors.warning} />
                    </View>
                    <View style={styles.dataSourceInfo}>
                      <Text style={[styles.dataSourceLabel, { color: theme.colors.textSecondary }]}>Stacja METEO</Text>
                      <Text style={[styles.dataSourceValue, { color: theme.colors.text }]}>
                        {meteoNearest.nazwa_stacji || 'Stacja METEO'}
                        {meteoNearest.distance && ` (${meteoNearest.distance.toFixed(1)} km)`}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Dane morskie */}
                {marineData && (
                  <View style={styles.dataSourceItem}>
                    <View style={[styles.dataSourceIcon, { backgroundColor: theme.colors.info + '15' }]}>
                      <Droplets size={16} color={theme.colors.info} />
                    </View>
                    <View style={styles.dataSourceInfo}>
                      <Text style={[styles.dataSourceLabel, { color: theme.colors.textSecondary }]}>Dane morskie</Text>
                      <Text style={[styles.dataSourceValue, { color: theme.colors.text }]}>
                        Open-Meteo Marine API
                      </Text>
                    </View>
                  </View>
                )}

                {/* Temperatura wody */}
                {waterTempC && (
                  <View style={styles.dataSourceItem}>
                    <View style={[styles.dataSourceIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                      <Droplets size={16} color={theme.colors.primary} />
                    </View>
                    <View style={styles.dataSourceInfo}>
                      <Text style={[styles.dataSourceLabel, { color: theme.colors.textSecondary }]}>Temperatura wody</Text>
                      <Text style={[styles.dataSourceValue, { color: theme.colors.text }]}>
                        Stacja hydro IMGW
                      </Text>
                    </View>
                  </View>
                )}

                {/* Aktualizacja danych */}
                <View style={styles.dataSourceItem}>
                  <View style={[styles.dataSourceIcon, { backgroundColor: theme.colors.info + '15' }]}>
                    <Info size={16} color={theme.colors.info} />
                  </View>
                  <View style={styles.dataSourceInfo}>
                    <Text style={[styles.dataSourceLabel, { color: theme.colors.textSecondary }]}>Aktualizacja</Text>
                    <Text style={[styles.dataSourceValue, { color: theme.colors.text }]}>
                      {new Date().toLocaleString('pl-PL', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>

                {/* Prognozy Open-Meteo */}
                {forecastData && (
                  <View style={styles.dataSourceItem}>
                    <View style={[styles.dataSourceIcon, { backgroundColor: '#10B981' + '15' }]}>
                      <Cloud size={16} color="#10B981" />
                    </View>
                    <View style={styles.dataSourceInfo}>
                      <Text style={[styles.dataSourceLabel, { color: theme.colors.textSecondary }]}>Prognozy</Text>
                      <Text style={[styles.dataSourceValue, { color: theme.colors.text }]}>
                        Open-Meteo API (ECMWF)
                      </Text>
                    </View>
                  </View>
                )}

                {/* Jakość powietrza */}
                {forecastData && (
                  <View style={styles.dataSourceItem}>
                    <View style={[styles.dataSourceIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
                      <Eye size={16} color="#8B5CF6" />
                    </View>
                    <View style={styles.dataSourceInfo}>
                      <Text style={[styles.dataSourceLabel, { color: theme.colors.textSecondary }]}>Jakość powietrza</Text>
                      <Text style={[styles.dataSourceValue, { color: theme.colors.text }]}>
                        Open-Meteo Air Quality API
                      </Text>
                    </View>
                  </View>
                )}

                {/* Informacja o świeżości danych */}
                <View style={[styles.dataSourceItem, { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' }]}>
                  <View style={[styles.dataSourceIcon, { backgroundColor: '#22C55E' + '20' }]}>
                    <Info size={16} color="#22C55E" />
                  </View>
                  <View style={styles.dataSourceInfo}>
                    <Text style={[styles.dataSourceLabel, { color: '#22C55E' }]}>Świeżość danych</Text>
                    <Text style={[styles.dataSourceValue, { color: '#22C55E' }]}>
                      Dane aktualizowane co 5-15 minut
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </SwipeableModal>

      {/* Alerts Modal */}
      <SwipeableModal
        visible={alertsModalVisible}
        onClose={() => setAlertsModalVisible(false)}
        title="Ostrzeżenia pogodowe"
        presentationStyle="pageSheet"
      >
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Scope toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>Zakres</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowAllWarningsNationwide(false)}
                style={[styles.filterChip, !showAllWarningsNationwide && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
              >
                <Text style={[styles.filterChipText, { color: !showAllWarningsNationwide ? theme.colors.primary : theme.colors.text }]}>Pomorskie</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAllWarningsNationwide(true)}
                style={[styles.filterChip, showAllWarningsNationwide && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
              >
                <Text style={[styles.filterChipText, { color: showAllWarningsNationwide ? theme.colors.primary : theme.colors.text }]}>Polska</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filters */}
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>Filtruj wg poziomu</Text>
            <View style={styles.filtersRow}>
              {(['all', 'low', 'medium', 'high'] as const).map((sev) => (
                <TouchableOpacity
                  key={sev}
                  style={[styles.filterChip, alertFilters.severity === sev && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
                  onPress={() => setAlertFilters((f) => ({ ...f, severity: sev }))}
                >
                  <Text style={[styles.filterChipText, { color: alertFilters.severity === sev ? theme.colors.primary : theme.colors.text }]}>
                    {sev === 'all' ? 'Wszystkie' : sev === 'low' ? 'Niskie' : sev === 'medium' ? 'Średnie' : 'Wysokie'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>Filtruj wg typu</Text>
            <View style={styles.filtersRow}>
              {(['all', 'meteo', 'hydro'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.filterChip, alertFilters.type === t && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
                  onPress={() => setAlertFilters((f) => ({ ...f, type: t }))}
                >
                  <Text style={[styles.filterChipText, { color: alertFilters.type === t ? theme.colors.primary : theme.colors.text }]}>
                    {t === 'all' ? 'Wszystkie' : t === 'meteo' ? 'Meteorologiczne' : 'Hydrologiczne'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {filteredAlerts.map((alert) => (
            <View key={alert.id} style={[styles.alertDetailCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.alertDetailHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: (alert.severity === 'high' ? theme.colors.error : alert.severity === 'medium' ? theme.colors.warning : theme.colors.info) + '20' }]}>
                  <AlertTriangle size={22} color={alert.severity === 'high' ? theme.colors.error : alert.severity === 'medium' ? theme.colors.warning : theme.colors.info} />
                </View>
                <Text style={[styles.alertDetailTitle, { color: theme.colors.text }]} numberOfLines={2}>
                  {alert.title}
                </Text>
              </View>

              <Text style={[styles.alertDetailDescription, { color: theme.colors.text }]}>
                {alert.description || 'Brak opisu'}
              </Text>

              {/* Dodatkowe informacje */}
              {alert.comment && alert.comment !== 'Brak' && (
                <View style={styles.alertDetailSection}>
                  <Text style={[styles.alertDetailLabel, { color: theme.colors.textSecondary }]}>Komentarz:</Text>
                  <Text style={[styles.alertDetailValue, { color: theme.colors.text }]}>{alert.comment}</Text>
                </View>
              )}

              {alert.office && (
                <View style={styles.alertDetailSection}>
                  <Text style={[styles.alertDetailLabel, { color: theme.colors.textSecondary }]}>Biuro:</Text>
                  <Text style={[styles.alertDetailValue, { color: theme.colors.text }]}>{alert.office}</Text>
                </View>
              )}

              {/* Szczegóły obszarów dla ostrzeżeń hydrologicznych */}
              {alert.obszary && alert.obszary.length > 0 && (
                <View style={styles.alertDetailSection}>
                  <Text style={[styles.alertDetailLabel, { color: theme.colors.textSecondary }]}>Obszary:</Text>
                  {alert.obszary.map((obszar: any, index: number) => (
                    <View key={index} style={styles.areaItem}>
                      <Text style={[styles.areaName, { color: theme.colors.text }]}>{obszar.wojewodztwo}</Text>
                      <Text style={[styles.areaDescription, { color: theme.colors.textSecondary }]}>{obszar.opis}</Text>
                      {obszar.kod_zlewni && obszar.kod_zlewni.length > 0 && (
                        <Text style={[styles.areaCode, { color: theme.colors.primary }]}>
                          Kod zlewni: {obszar.kod_zlewni.join(', ')}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.alertDetailInfo}>
                <Text style={[styles.alertDetailLabel, { color: theme.colors.textSecondary }]}>Typ: {alert.type === 'hydro' ? 'Hydrologiczne' : 'Meteorologiczne'}</Text>
                <Text style={[styles.alertDetailLabel, { color: theme.colors.textSecondary }]}>Poziom: {alert.level}</Text>
                {alert.probability && alert.probability > 0 && (
                  <Text style={[styles.alertDetailLabel, { color: theme.colors.textSecondary }]}>Prawdopodobieństwo: {alert.probability}%</Text>
                )}
                {alert.published && (
                  <Text style={[styles.alertDetailLabel, { color: theme.colors.textSecondary }]}>Opublikowano: {formatDateTime(alert.published)}</Text>
                )}
                <Text style={[styles.alertDetailLabel, { color: theme.colors.textSecondary }]}>Obowiązuje: {formatDateTime(alert.validFrom)} - {formatDateTime(alert.validTo)}</Text>
              </View>
            </View>
          ))}
          {filteredAlerts.length === 0 && (
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 24 }}>Brak ostrzeżeń dla wybranych filtrów</Text>
          )}
        </ScrollView>
      </SwipeableModal>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 0,
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    fontSize: 13,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
  },
  locationSubText: {
    fontSize: 10,
    fontFamily: 'Poppins_Regular',
    marginTop: 1,
  },
  nearestBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  nearestBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_Medium',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    alignSelf: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 13,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
  },


  // Modal styles
  modalContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 16,
  },
  // Alert detail styles
  alertDetailCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  alertDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  alertDetailTitle: {
    fontSize: 20,
    fontFamily: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
    flex: 1,
  },
  alertDetailDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    fontFamily: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
  },
  alertDetailInfo: {
    gap: 8,
  },
  alertDetailLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
  },
  alertDetailValue: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    marginTop: 4,
    color: '#000000',
  },
  weatherDetailsContainer: {
    gap: 20,
    paddingBottom: 20,
  },
  weatherSummaryCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  weatherSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 6,
  },
  weatherSummaryIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(34, 74, 150, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  weatherSummaryInfo: {
    flex: 1,
    marginLeft: 20,
    alignItems: 'flex-end',
  },
  weatherSummaryTemp: {
    fontSize: 56,
    fontFamily: Platform.select({
      default: 'Poppins_Bold',
      android: 'Poppins_Bold',
    }) || 'Poppins_Bold',
    lineHeight: 60,
    marginBottom: 6,
  },
  weatherSummaryCondition: {
    fontSize: 16,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    marginBottom: 6,
    textAlign: 'right',
  },
  weatherSummaryFeels: {
    fontSize: 16,
    fontFamily: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
    opacity: 0.8,
    textAlign: 'right',
  },
  weatherDetailSection: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  weatherDetailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  weatherDetailSectionTitle: {
    fontSize: 20,
    fontFamily: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
    marginBottom: 0,
  },
  weatherDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weatherDetailItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  weatherDetailLabel: {
    fontSize: 16,
    fontFamily: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
  },
  weatherDetailValue: {
    fontSize: 16,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
  },
  weatherDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  weatherDetailGridItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  metricIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  metricContent: {
    alignItems: 'center',
    minWidth: 80,
    paddingHorizontal: 4,
  },

  // Compact tiles grid for key metrics
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  tile: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  tileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 12,
    fontFamily: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  tileValue: {
    fontSize: 16,
    fontFamily: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
  },

  additionalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  additionalCell: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },

  additionalInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  additionalInfoItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  additionalInfoLabel: {
    fontSize: 13,
    fontFamily: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
    marginBottom: 6,
    textAlign: 'center',
  },
  additionalInfoValue: {
    fontSize: 15,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    textAlign: 'center',
  },
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  columnItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    marginBottom: 8,
  },
  alertsContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    marginBottom: 8,
  },
  alertItem: {
    borderLeftWidth: 4,
    paddingLeft: 16,
    paddingVertical: 12,
    paddingRight: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontFamily: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
    marginBottom: 8,
    lineHeight: 22,
  },
  alertDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 60,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    textAlign: 'center',
  },
  filterLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontFamily: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
  },
  noAlertsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  noAlertsIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noAlertsText: {
    fontSize: 16,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  noAlertsSubtext: {
    fontSize: 13,
    fontFamily: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.8,
  },
  alertDetailSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  areaItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  areaName: {
    fontSize: 15,
    fontFamily: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
    marginBottom: 6,
    color: '#000000',
  },
  areaDescription: {
    fontSize: 13,
    fontFamily: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
    marginBottom: 6,
    lineHeight: 18,
    color: '#666666',
  },
  areaCode: {
    fontSize: 13,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    color: '#2563EB',
  },

  // New styles for data source section
  dataSourceSection: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  dataSourceTitle: {
    fontSize: 18,
    fontFamily: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000000',
  },
  dataSourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  dataSourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dataSourceInfo: {
    flex: 1,
  },
  dataSourceLabel: {
    fontSize: 13,
    fontFamily: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
    marginBottom: 4,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dataSourceValue: {
    fontSize: 15,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    color: '#000000',
    lineHeight: 20,
  },

});

