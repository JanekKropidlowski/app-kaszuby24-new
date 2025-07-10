import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, FlatList } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { Gauge, Droplets, Wind, Umbrella, MapPin, ChevronDown } from 'lucide-react-native';
import * as Location from 'expo-location';

import { STATIONS_METADATA } from '@/constants/stations';
import { WeatherIcon } from '@/components/WeatherIcon';
import { WeatherWarnings } from '@/components/WeatherWarnings';

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

const HighlightCard = ({ icon, title, value, unit }) => {
    const { theme } = useThemeStore();
    const styles = getStyles(theme);
    return (
        <View style={styles.highlightCard}>
            <View style={styles.highlightHeader}>
                {icon}
                <Text style={styles.highlightTitle}>{title}</Text>
            </View>
            <View style={styles.highlightBody}>
                <Text style={styles.highlightValue}>{value}</Text>
                {unit && <Text style={styles.highlightUnit}>{unit}</Text>}
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
        } catch (e) {
            setErrorMsg(e.message);
            console.error("Combined Fetch Error:", e);
        } finally {
            setLoading(false);
        }
    }, []);
    
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
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Szukaj miejscowości..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={theme.colors.textSecondary}
                    />
                </View>
                <FlatList
                    data={filteredStations}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.pickerItem} 
                            onPress={() => handleSelectStation(item)}>
                            <Text style={styles.pickerItemText}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyListText}>Nie znaleziono stacji.</Text>}
                />
            </SafeAreaView>
        </Modal>
    );

    const renderContent = () => {
        if (loading && !weatherData) {
            return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
        }

        if (errorMsg && !weatherData) {
            return (
                <View style={styles.centered}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                    <TouchableOpacity onPress={() => setPickerVisible(true)} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Wybierz stację ręcznie</Text>
                    </TouchableOpacity>
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
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                <WeatherWarnings warnings={warnings} />

                <TouchableOpacity style={styles.headerContainer} onPress={() => setPickerVisible(true)}>
                    <View>
                        <Text style={styles.stationLabel}>Stacja pomiarowa</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                            <Text style={styles.stationName}>{stacja}</Text>
                            <ChevronDown size={28} color={theme.colors.primary} />
                        </View>
                    </View>
                    <WeatherIcon wmoCode={currentWmoCode} size={80} />
                </TouchableOpacity>
                
                <View style={styles.mainTemperatureContainer}>
                    <Text style={styles.mainTemperature}>{parseFloat(temperatura).toFixed(1)}</Text>
                    <Text style={styles.mainTemperatureUnit}>°C</Text>
                </View>

                <Text style={styles.lastUpdated}>Aktualizacja: {data_pomiaru} o {godzina_pomiaru}:00</Text>

                <View style={styles.highlightsGrid}>
                    <HighlightCard icon={<Gauge size={24} color="#616161" />} title="Ciśnienie" value={`${parseFloat(cisnienie).toFixed(0)}`} unit="hPa" />
                    <HighlightCard icon={<Droplets size={24} color="#3498db" />} title="Wilgotność" value={`${parseFloat(wilgotnosc_wzgledna).toFixed(0)}`} unit="%" />
                    <HighlightCard icon={<Wind size={24} color="#616161" />} title="Wiatr" value={`${parseFloat(predkosc_wiatru)} m/s`} />
                    <HighlightCard icon={<Umbrella size={24} color="#3498db" />} title="Suma opadów (6h)" value={`${parseFloat(suma_opadu)}`} unit="mm" />
                </View>

                {forecastData?.time && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Prognoza na 7 dni</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {forecastData.time.map((day, index) => (
                                <View key={day} style={styles.dailyForecastCard}>
                                    <Text style={styles.dailyForecastDay}>{new Date(day).toLocaleDateString('pl-PL', { weekday: 'short' })}</Text>
                                    <WeatherIcon wmoCode={forecastData.weathercode[index]} size={40} />
                                    <Text style={styles.dailyForecastTemp}>{Math.round(forecastData.temperature_2m_max[index])}°</Text>
                                    <Text style={styles.dailyForecastTempMin}>{Math.round(forecastData.temperature_2m_min[index])}°</Text>
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
                                    <Text style={styles.weekendTemp}>{Math.round(day.temp_max)}° / {Math.round(day.temp_min)}°</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Dane pogodowe dostarczone przez IMGW & Open-Meteo</Text>
                </View>
            </ScrollView>
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
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: 20, paddingBottom: 100 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: theme.colors.background },
    errorText: { fontFamily: theme.fontFamily.medium, fontSize: 16, color: theme.colors.error, textAlign: 'center' },
    retryButton: { marginTop: 20, backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 30 },
    retryButtonText: { color: 'white', fontFamily: theme.fontFamily.bold, fontSize: 16 },

    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: theme.colors.card,
        padding: 20,
        borderRadius: 24,
    },
    stationLabel: { fontFamily: theme.fontFamily.regular, fontSize: 16, color: theme.colors.textSecondary },
    stationName: { fontFamily: theme.fontFamily.bold, fontSize: 28, color: theme.colors.text, textTransform: 'capitalize' },
    
    mainTemperatureContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        marginVertical: 20,
        backgroundColor: theme.colors.card,
        borderRadius: 30,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
    },
    mainTemperature: { fontFamily: theme.fontFamily.bold, fontSize: 96, color: theme.colors.text, lineHeight: 96 },
    mainTemperatureUnit: { fontFamily: theme.fontFamily.bold, fontSize: 24, color: theme.colors.textSecondary, paddingTop: 16, marginLeft: 4 },
    
    lastUpdated: { fontFamily: theme.fontFamily.medium, fontSize: 14, color: theme.colors.textSecondary, marginBottom: 20, textAlign: 'center' },

    highlightsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    highlightCard: {
        width: '48%',
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
    },
    highlightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    highlightTitle: { fontFamily: theme.fontFamily.semibold, fontSize: 14, color: theme.colors.textSecondary, marginLeft: 8 },
    highlightBody: { alignItems: 'flex-start' },
    highlightValue: { fontFamily: theme.fontFamily.bold, fontSize: 22, color: theme.colors.text },
    highlightUnit: { fontFamily: theme.fontFamily.regular, fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
    
    footer: {
        marginTop: 20,
        paddingVertical: 15,
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        borderRadius: 20,
    },
    footerText: {
        fontFamily: theme.fontFamily.regular,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    
    sectionContainer: {
        marginTop: 20,
        backgroundColor: theme.colors.card,
        borderRadius: 24,
        padding: 20,
    },
    sectionTitle: { fontFamily: theme.fontFamily.bold, fontSize: 20, color: theme.colors.text, marginBottom: 15 },
    
    dailyForecastCard: {
        alignItems: 'center',
        marginRight: 10,
        padding: 10,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        minWidth: 70,
    },
    dailyForecastDay: { fontFamily: theme.fontFamily.semibold, fontSize: 16, color: theme.colors.text },
    dailyForecastTemp: { fontFamily: theme.fontFamily.bold, fontSize: 18, color: theme.colors.text, marginTop: 8 },
    dailyForecastTempMin: { fontFamily: theme.fontFamily.regular, fontSize: 14, color: theme.colors.textSecondary },

    weekendContainer: { flexDirection: 'row', justifyContent: 'space-around' },
    weekendCard: {
        alignItems: 'center',
        padding: 15,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        width: '48%',
    },
    weekendDay: { fontFamily: theme.fontFamily.bold, fontSize: 16, color: theme.colors.text, marginBottom: 10 },
    weekendTemp: { fontFamily: theme.fontFamily.bold, fontSize: 20, color: theme.colors.text, marginTop: 10 },

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
    },
    searchInput: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 15,
        fontFamily: theme.fontFamily.regular,
        fontSize: 16,
        color: theme.colors.text,
    },
    pickerItem: {
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    pickerItemText: {
        fontFamily: theme.fontFamily.medium,
        fontSize: 18,
        color: theme.colors.text,
    },
    emptyListText: {
        textAlign: 'center',
        marginTop: 40,
        fontFamily: theme.fontFamily.regular,
        fontSize: 16,
        color: theme.colors.textSecondary,
    }
}); 