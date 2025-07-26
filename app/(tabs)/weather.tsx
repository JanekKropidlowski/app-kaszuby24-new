import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, FlatList, Animated, Dimensions } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { Gauge, Droplets, Wind, Umbrella, MapPin, ChevronDown, Search, Clock, Thermometer, CloudRain } from 'lucide-react-native';
import * as Location from 'expo-location';

import { STATIONS_METADATA } from '@/constants/stations';
import { WeatherIcon } from '@/components/WeatherIcon';
import { WeatherWarnings } from '@/components/WeatherWarnings';
import { WeatherWidget } from '@/components/WeatherWidget';
import WeatherSummary from '@/components/WeatherSummary';

const { width: screenWidth } = Dimensions.get('window');

const IMGW_API_URL = 'https://danepubliczne.imgw.pl/api/data/synop';
const OPEN_METEO_API_URL = 'https://api.open-meteo.com/v1/forecast';

const getDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};



const LoadingSkeleton = () => {
    const { theme } = useThemeStore();
    const styles = getStyles(theme);
    
    return (
        <View style={styles.container}>
            <View style={styles.skeletonHeader}>
                <View style={styles.skeletonStation} />
                <View style={styles.skeletonIcon} />
            </View>
            <View style={styles.skeletonTemperature} />
            <View style={styles.skeletonHighlights}>
                {[1, 2, 3, 4].map(i => (
                    <View key={i} style={styles.skeletonCard} />
                ))}
            </View>
        </View>
    );
};

export default function WeatherScreen() {
    const { theme } = useThemeStore();
    const styles = getStyles(theme);

    const [allStations] = useState(STATIONS_METADATA);
    const [selectedStation, setSelectedStation] = useState(null);
    const [weatherData, setWeatherData] = useState(null);
    const [forecastData, setForecastData] = useState(null);
    const [warnings, setWarnings] = useState({ meteo: [], hydro: [] });
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [fadeAnim] = useState(new Animated.Value(0));
    const [debugInfo, setDebugInfo] = useState('');

    // Debug function
    const addDebugInfo = (info) => {
        console.log('Weather Debug:', info);
        setDebugInfo(prev => prev + '\n' + new Date().toLocaleTimeString() + ': ' + info);
    };

    const findNearestStation = useCallback((userLat, userLon, stations) => {
        return stations.reduce((closest, station) => {
            const distance = getDistance(userLat, userLon, station.lat, station.lon);
            return distance < closest.distance ? { station, distance } : closest;
        }, { station: null, distance: Infinity }).station;
    }, []);

    const initializeLocationAndStation = useCallback(async () => {
        setLoading(true);
        setErrorMsg(null);
        addDebugInfo('Inicjalizacja lokalizacji...');
        
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            addDebugInfo(`Status uprawnień: ${status}`);
            
            if (status !== 'granted') {
                addDebugInfo('Brak zgody na lokalizację - ustawiam Gdańsk');
                setErrorMsg('Brak zgody na lokalizację. Wybierz stację ręcznie.');
                const gdanskStation = allStations.find(s => s.name.toLowerCase() === 'gdańsk');
                setSelectedStation(gdanskStation);
                addDebugInfo(`Ustawiono stację: ${gdanskStation?.name}`);
                return;
            }

            addDebugInfo('Pobieranie lokalizacji...');
            const location = await Location.getCurrentPositionAsync({});
            addDebugInfo(`Lokalizacja: ${location.coords.latitude}, ${location.coords.longitude}`);
            
            const nearestStation = findNearestStation(location.coords.latitude, location.coords.longitude, allStations);
            addDebugInfo(`Najbliższa stacja: ${nearestStation?.name}`);
            
            setSelectedStation(nearestStation || allStations.find(s => s.name.toLowerCase() === 'gdańsk'));
        } catch (e) {
            addDebugInfo(`Błąd inicjalizacji: ${e.message}`);
            console.error("Initialization error:", e);
            setErrorMsg("Nie udało się ustalić lokalizacji. Wybierz stację ręcznie.");
            const gdanskStation = allStations.find(s => s.name.toLowerCase() === 'gdańsk');
            setSelectedStation(gdanskStation);
            addDebugInfo(`Fallback stacja: ${gdanskStation?.name}`);
        }
    }, [allStations, findNearestStation]);

    useEffect(() => {
        initializeLocationAndStation();
    }, [initializeLocationAndStation]);

    const fetchAllDataForStation = useCallback(async (station) => {
        if (!station) {
            addDebugInfo('Brak stacji - pomijam pobieranie danych');
            return;
        }
        
        setLoading(true);
        setErrorMsg(null);
        addDebugInfo(`Pobieranie danych dla stacji: ${station.name} (ID: ${station.id})`);
        
        try {
            addDebugInfo('Rozpoczynam zapytania API...');
            const [imgwResponse, meteoResponse, warningsMeteoResponse, warningsHydroResponse] = await Promise.allSettled([
                fetch(`${IMGW_API_URL}/id/${station.id}`),
                fetch(`${OPEN_METEO_API_URL}?latitude=${station.lat}&longitude=${station.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FWarsaw`),
                fetch('https://danepubliczne.imgw.pl/api/data/warningsmeteo'),
                fetch('https://danepubliczne.imgw.pl/api/data/warningshydro')
            ]);

            addDebugInfo('Zapytania zakończone - sprawdzam statusy...');

            // Check if main data requests were successful
            if (imgwResponse.status === 'rejected') {
                addDebugInfo(`IMGW błąd: ${imgwResponse.reason}`);
                throw new Error(`Nie udało się pobrać danych z IMGW: ${imgwResponse.reason}`);
            }
            if (!imgwResponse.value.ok) {
                addDebugInfo(`IMGW HTTP błąd: ${imgwResponse.value.status}`);
                throw new Error(`IMGW HTTP błąd: ${imgwResponse.value.status}`);
            }
            
            if (meteoResponse.status === 'rejected') {
                addDebugInfo(`Open-Meteo błąd: ${meteoResponse.reason}`);
                throw new Error(`Nie udało się pobrać prognozy z Open-Meteo: ${meteoResponse.reason}`);
            }
            if (!meteoResponse.value.ok) {
                addDebugInfo(`Open-Meteo HTTP błąd: ${meteoResponse.value.status}`);
                throw new Error(`Open-Meteo HTTP błąd: ${meteoResponse.value.status}`);
            }

            addDebugInfo('Parsowanie danych...');
            const imgwData = await imgwResponse.value.json();
            const meteoData = await meteoResponse.value.json();
            const warningsMeteoData = warningsMeteoResponse.status === 'fulfilled' && warningsMeteoResponse.value.ok ? await warningsMeteoResponse.value.json() : [];
            const warningsHydroData = warningsHydroResponse.status === 'fulfilled' && warningsHydroResponse.value.ok ? await warningsHydroResponse.value.json() : [];
            
            addDebugInfo(`Dane IMGW: ${JSON.stringify(imgwData).substring(0, 100)}...`);
            addDebugInfo(`Dane Open-Meteo: ${JSON.stringify(meteoData).substring(0, 100)}...`);
            
            setWeatherData(imgwData);
            setForecastData(meteoData.daily);
            setWarnings({ meteo: warningsMeteoData, hydro: warningsHydroData });
            
            addDebugInfo('Dane ustawione - animacja...');
            // Animate content fade in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
            
            addDebugInfo('Zakończono pomyślnie!');
        } catch (e) {
            addDebugInfo(`Błąd pobierania: ${e.message}`);
            setErrorMsg(e.message);
            console.error("Combined Fetch Error:", e);
        } finally {
            setLoading(false);
            addDebugInfo('Loading zakończone');
        }
    }, [fadeAnim]);
    
    useEffect(() => {
        if (selectedStation) {
            fetchAllDataForStation(selectedStation);
        }
    }, [selectedStation, fetchAllDataForStation]);

    const onRefresh = () => {
        if (selectedStation) {
            fetchAllDataForStation(selectedStation);
        } else {
            initializeLocationAndStation();
        }
    };
    
    const handleSelectStation = (station) => {
        setSearchQuery('');
        setSelectedStation(station);
        setPickerVisible(false);
        fadeAnim.setValue(0);
    };

    const filteredStations = allStations.filter(station => 
        station.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderPicker = () => (
        <Modal
            animationType="slide"
            transparent={false}
            visible={isPickerVisible}
            onRequestClose={() => {
                setPickerVisible(!isPickerVisible);
                setSearchQuery('');
            }}>
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Wybierz stację</Text>
                    <TouchableOpacity onPress={() => setPickerVisible(false)}>
                        <Text style={styles.closeButton}>Anuluj</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <Search size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Szukaj miejscowości..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>
                </View>
                <FlatList
                    data={filteredStations}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.pickerItem} 
                            onPress={() => handleSelectStation(item)}>
                            <View style={styles.pickerItemContent}>
                                <MapPin size={20} color={theme.colors.primary} />
                                <Text style={styles.pickerItemText}>{item.name}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyListContainer}>
                            <Text style={styles.emptyListText}>Nie znaleziono stacji.</Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </Modal>
    );

    const renderContent = () => {
        if (loading && !weatherData) {
            return (
                <View style={styles.container}>
                    <LoadingSkeleton />
                    <View style={styles.debugContainer}>
                        <Text style={styles.debugTitle}>Debug Info:</Text>
                        <Text style={styles.debugText}>{debugInfo}</Text>
                    </View>
                </View>
            );
        }

        if (errorMsg && !weatherData) {
            return (
                <View style={styles.centered}>
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{errorMsg}</Text>
                        <TouchableOpacity onPress={() => setPickerVisible(true)} style={styles.retryButton}>
                            <Text style={styles.retryButtonText}>Wybierz stację ręcznie</Text>
                        </TouchableOpacity>
                        <View style={styles.debugContainer}>
                            <Text style={styles.debugTitle}>Debug Info:</Text>
                            <Text style={styles.debugText}>{debugInfo}</Text>
                        </View>
                    </View>
                </View>
            );
        }
        
        if (!weatherData || !forecastData) {
            return (
                <View style={styles.centered}>
                    <Text style={styles.errorText}>Brak danych pogodowych</Text>
                    <View style={styles.debugContainer}>
                        <Text style={styles.debugTitle}>Debug Info:</Text>
                        <Text style={styles.debugText}>{debugInfo}</Text>
                    </View>
                </View>
            );
        }

        const { stacja, temperatura, data_pomiaru, godzina_pomiaru, cisnienie, wilgotnosc_wzgledna, predkosc_wiatru, suma_opadu } = weatherData;
        const currentWmoCode = forecastData?.weathercode?.[0] ?? 0;

        const weekendForecast = (forecastData?.time || []).reduce((acc, day, index) => {
            const dayOfWeek = new Date(day).getDay();
            if (dayOfWeek === 6 || dayOfWeek === 0) {
                acc.push({
                    dayName: new Date(day).toLocaleDateString('pl-PL', { weekday: 'long' }),
                    temp_max: forecastData.temperature_2m_max[index],
                    temp_min: forecastData.temperature_2m_min[index],
                    weathercode: forecastData.weathercode[index],
                });
            }
            return acc;
        }, []);

        return (
            <Animated.View style={{ opacity: fadeAnim }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Simple debug info */}
                    <View style={styles.debugContainer}>
                        <Text style={styles.debugTitle}>Debug Info:</Text>
                        <Text style={styles.debugText}>{debugInfo}</Text>
                    </View>

                    {/* Simple weather display */}
                    <View style={styles.simpleWeatherContainer}>
                        <Text style={styles.simpleTitle}>Pogoda - {stacja}</Text>
                        <Text style={styles.simpleTemp}>{parseFloat(temperatura).toFixed(1)}°C</Text>
                        <Text style={styles.simpleDetails}>
                            Wilgotność: {parseFloat(wilgotnosc_wzgledna).toFixed(0)}% | 
                            Wiatr: {parseFloat(predkosc_wiatru).toFixed(1)} m/s | 
                            Ciśnienie: {parseFloat(cisnienie).toFixed(0)} hPa
                        </Text>
                        <Text style={styles.simpleTime}>
                            Ostatni pomiar: {data_pomiaru} o {godzina_pomiaru}:00
                        </Text>
                    </View>

                    {/* Station selector */}
                    <TouchableOpacity style={styles.headerContainer} onPress={() => setPickerVisible(true)}>
                        <View style={styles.headerContent}>
                            <View>
                                <Text style={styles.stationLabel}>Stacja pomiarowa</Text>
                                <View style={styles.stationNameContainer}>
                                    <MapPin size={20} color={theme.colors.primary} />
                                    <Text style={styles.stationName}>{stacja}</Text>
                                    <ChevronDown size={24} color={theme.colors.primary} />
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Dane pogodowe dostarczone przez IMGW & Open-Meteo</Text>
                    </View>
                </ScrollView>
            </Animated.View>
        );
    };
    
    return (
        <>
            {renderPicker()}
            <SafeAreaView style={styles.container}>
                {renderContent()}
            </SafeAreaView>
        </>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: theme.colors.background 
    },
    scrollContent: { 
        padding: 20, 
        paddingBottom: 100 
    },
    centered: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20, 
        backgroundColor: theme.colors.background 
    },
    errorContainer: {
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
    },
    errorText: { 
        fontFamily: theme.fontFamily.medium, 
        fontSize: 16, 
        color: theme.colors.error, 
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: { 
        backgroundColor: theme.colors.primary, 
        paddingVertical: 15, 
        paddingHorizontal: 30, 
        borderRadius: 30,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    retryButtonText: { 
        color: 'white', 
        fontFamily: theme.fontFamily.bold, 
        fontSize: 16 
    },

    // Skeleton loading styles
    skeletonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: theme.colors.card,
        padding: 20,
        borderRadius: 24,
    },
    skeletonStation: {
        width: 120,
        height: 20,
        backgroundColor: theme.colors.border,
        borderRadius: 10,
    },
    skeletonIcon: {
        width: 60,
        height: 60,
        backgroundColor: theme.colors.border,
        borderRadius: 30,
    },
    skeletonTemperature: {
        width: 200,
        height: 100,
        backgroundColor: theme.colors.border,
        borderRadius: 20,
        alignSelf: 'center',
        marginBottom: 20,
    },
    skeletonHighlights: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    skeletonCard: {
        width: '48%',
        height: 100,
        backgroundColor: theme.colors.border,
        borderRadius: 20,
        marginBottom: 16,
    },

    headerContainer: {
        backgroundColor: theme.colors.card,
        borderRadius: 24,
        marginBottom: 20,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    stationLabel: { 
        fontFamily: theme.fontFamily.regular, 
        fontSize: 14, 
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    stationNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stationName: { 
        fontFamily: theme.fontFamily.bold, 
        fontSize: 24, 
        color: theme.colors.text, 
        textTransform: 'capitalize',
        flex: 1,
    },


    
    footer: {
        marginTop: 20,
        paddingVertical: 15,
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    footerText: {
        fontFamily: theme.fontFamily.regular,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    
    sectionContainer: {
        backgroundColor: theme.colors.card,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
    },
    sectionTitle: { 
        fontFamily: theme.fontFamily.bold, 
        fontSize: 20, 
        color: theme.colors.text, 
        marginBottom: 15 
    },
    
    forecastScrollContainer: {
        paddingHorizontal: 20,
    },
    dailyForecastCard: {
        alignItems: 'center',
        marginRight: 15,
        padding: 15,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        minWidth: 80,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    dailyForecastDay: { 
        fontFamily: theme.fontFamily.semibold, 
        fontSize: 14, 
        color: theme.colors.text,
        marginBottom: 8,
    },
    tempContainer: {
        alignItems: 'center',
        marginTop: 8,
    },
    dailyForecastTemp: { 
        fontFamily: theme.fontFamily.bold, 
        fontSize: 18, 
        color: theme.colors.text 
    },
    dailyForecastTempMin: { 
        fontFamily: theme.fontFamily.regular, 
        fontSize: 14, 
        color: theme.colors.textSecondary 
    },

    weekendContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-around' 
    },
    weekendCard: {
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        width: '48%',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    weekendDay: { 
        fontFamily: theme.fontFamily.bold, 
        fontSize: 16, 
        color: theme.colors.text, 
        marginBottom: 10 
    },
    weekendTemp: { 
        fontFamily: theme.fontFamily.bold, 
        fontSize: 20, 
        color: theme.colors.text, 
        marginTop: 10 
    },

    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.card,
    },
    pickerTitle: {
        fontFamily: theme.fontFamily.bold,
        fontSize: 22,
        color: theme.colors.text,
    },
    closeButton: {
        fontFamily: theme.fontFamily.semibold,
        fontSize: 16,
        color: theme.colors.primary,
    },
    searchContainer: {
        padding: 20,
        paddingBottom: 10,
        backgroundColor: theme.colors.card,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        paddingHorizontal: 15,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 15,
        fontFamily: theme.fontFamily.regular,
        fontSize: 16,
        color: theme.colors.text,
    },
    pickerItem: {
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.card,
    },
    pickerItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    pickerItemText: {
        fontFamily: theme.fontFamily.medium,
        fontSize: 18,
        color: theme.colors.text,
    },
    emptyListContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyListText: {
        textAlign: 'center',
        fontFamily: theme.fontFamily.regular,
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    debugContainer: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    debugTitle: {
        fontFamily: theme.fontFamily.bold,
        fontSize: 14,
        color: theme.colors.primary,
        marginBottom: 8,
    },
    debugText: {
        fontFamily: theme.fontFamily.regular,
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 16,
    },
    simpleWeatherContainer: {
        backgroundColor: theme.colors.card,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
    },
    simpleTitle: {
        fontFamily: theme.fontFamily.bold,
        fontSize: 18,
        color: theme.colors.text,
        marginBottom: 10,
    },
    simpleTemp: {
        fontFamily: theme.fontFamily.bold,
        fontSize: 48,
        color: theme.colors.primary,
        marginBottom: 10,
    },
    simpleDetails: {
        fontFamily: theme.fontFamily.medium,
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
    },
    simpleTime: {
        fontFamily: theme.fontFamily.regular,
        fontSize: 12,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    footerText: {
        fontFamily: theme.fontFamily.regular,
        fontSize: 12,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    }
}); 