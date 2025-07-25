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

    const findNearestStation = useCallback((userLat, userLon, stations) => {
        return stations.reduce((closest, station) => {
            const distance = getDistance(userLat, userLon, station.lat, station.lon);
            return distance < closest.distance ? { station, distance } : closest;
        }, { station: null, distance: Infinity }).station;
    }, []);

    const initializeLocationAndStation = useCallback(async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Brak zgody na lokalizację. Wybierz stację ręcznie.');
                setSelectedStation(allStations.find(s => s.name.toLowerCase() === 'hel'));
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const nearestStation = findNearestStation(location.coords.latitude, location.coords.longitude, allStations);
            setSelectedStation(nearestStation || allStations.find(s => s.name.toLowerCase() === 'hel'));
        } catch (e) {
            console.error("Initialization error:", e);
            setErrorMsg("Nie udało się ustalić lokalizacji. Wybierz stację ręcznie.");
            setSelectedStation(allStations.find(s => s.name.toLowerCase() === 'hel'));
        }
    }, [allStations, findNearestStation]);

    useEffect(() => {
        initializeLocationAndStation();
    }, [initializeLocationAndStation]);

    const fetchAllDataForStation = useCallback(async (station) => {
        if (!station) return;
        setLoading(true);
        setErrorMsg(null);
        try {
            const [imgwResponse, meteoResponse, warningsMeteoResponse, warningsHydroResponse] = await Promise.all([
                fetch(`${IMGW_API_URL}/id/${station.id}`),
                fetch(`${OPEN_METEO_API_URL}?latitude=${station.lat}&longitude=${station.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FWarsaw`),
                fetch('https://danepubliczne.imgw.pl/api/data/warningsmeteo'),
                fetch('https://danepubliczne.imgw.pl/api/data/warningshydro')
            ]);

            if (!imgwResponse.ok) throw new Error('Nie udało się pobrać danych z IMGW.');
            if (!meteoResponse.ok) throw new Error('Nie udało się pobrać prognozy z Open-Meteo.');

            const imgwData = await imgwResponse.json();
            const meteoData = await meteoResponse.json();
            const warningsMeteoData = warningsMeteoResponse.ok ? await warningsMeteoResponse.json() : [];
            const warningsHydroData = warningsHydroResponse.ok ? await warningsHydroResponse.json() : [];
            
            setWeatherData(imgwData);
            setForecastData(meteoData.daily);
            setWarnings({ meteo: warningsMeteoData, hydro: warningsHydroData });
            
            // Animate content fade in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        } catch (e) {
            setErrorMsg(e.message);
            console.error("Combined Fetch Error:", e);
        } finally {
            setLoading(false);
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
            return <LoadingSkeleton />;
        }

        if (errorMsg && !weatherData) {
            return (
                <View style={styles.centered}>
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{errorMsg}</Text>
                        <TouchableOpacity onPress={() => setPickerVisible(true)} style={styles.retryButton}>
                            <Text style={styles.retryButtonText}>Wybierz stację ręcznie</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }
        
        if (!weatherData || !forecastData) return null;

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
                                    <WeatherWarnings warnings={warnings} />

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

                <WeatherSummary 
                    weatherData={weatherData} 
                    stationName={stacja} 
                    currentWmoCode={currentWmoCode} 
                />

                    <WeatherWidget weatherData={weatherData} forecastData={forecastData} />

                    {forecastData?.time && (
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Prognoza na 7 dni</Text>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.forecastScrollContainer}
                            >
                                {forecastData.time.map((day, index) => (
                                    <View key={day} style={styles.dailyForecastCard}>
                                        <Text style={styles.dailyForecastDay}>
                                            {new Date(day).toLocaleDateString('pl-PL', { weekday: 'short' })}
                                        </Text>
                                        <WeatherIcon wmoCode={forecastData.weathercode[index]} size={40} />
                                        <View style={styles.tempContainer}>
                                            <Text style={styles.dailyForecastTemp}>
                                                {Math.round(forecastData.temperature_2m_max[index])}°
                                            </Text>
                                            <Text style={styles.dailyForecastTempMin}>
                                                {Math.round(forecastData.temperature_2m_min[index])}°
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {weekendForecast.length > 0 && (
                         <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Pogoda na Weekend</Text>
                            <View style={styles.weekendContainer}>
                                {weekendForecast.map(day => (
                                    <View key={day.dayName} style={styles.weekendCard}>
                                        <Text style={styles.weekendDay}>{day.dayName}</Text>
                                        <WeatherIcon wmoCode={day.weathercode} size={54} />
                                        <Text style={styles.weekendTemp}>
                                            {Math.round(day.temp_max)}° / {Math.round(day.temp_min)}°
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

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
    }
}); 