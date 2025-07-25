import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { WeatherIcon } from './WeatherIcon';
import { MapPin, Clock, Thermometer, Droplets, Wind, Gauge } from 'lucide-react-native';

const WeatherSummary = ({ weatherData, stationName, currentWmoCode }) => {
    const { theme } = useThemeStore();
    const styles = getStyles(theme);

    if (!weatherData) return null;

    const { temperatura, cisnienie, wilgotnosc_wzgledna, predkosc_wiatru, suma_opadu, data_pomiaru, godzina_pomiaru } = weatherData;

    const getWeatherDescription = (wmoCode) => {
        if (wmoCode <= 1) return 'Słonecznie';
        if (wmoCode === 2) return 'Częściowo pochmurno';
        if (wmoCode === 3) return 'Pochmurno';
        if (wmoCode >= 45 && wmoCode <= 48) return 'Mgliście';
        if (wmoCode >= 51 && wmoCode <= 55) return 'Mżawka';
        if (wmoCode >= 56 && wmoCode <= 67) return 'Deszcz';
        if (wmoCode >= 71 && wmoCode <= 77) return 'Śnieg';
        if (wmoCode >= 80 && wmoCode <= 82) return 'Przelotne opady';
        if (wmoCode >= 85 && wmoCode <= 86) return 'Opady śniegu';
        if (wmoCode >= 95 && wmoCode <= 99) return 'Burza';
        return 'Pochmurno';
    };

    const getTemperatureColor = (temp) => {
        const temperature = parseFloat(temp);
        if (temperature >= 25) return '#FF6B6B'; // Hot
        if (temperature >= 15) return '#4ECDC4'; // Warm
        if (temperature >= 5) return '#45B7D1'; // Cool
        return '#96CEB4'; // Cold
    };

    const getWindDescription = (speed) => {
        const windSpeed = parseFloat(speed);
        if (windSpeed < 2) return 'Bezwietrznie';
        if (windSpeed < 5) return 'Lekki wiatr';
        if (windSpeed < 10) return 'Umiarkowany wiatr';
        if (windSpeed < 15) return 'Silny wiatr';
        return 'Bardzo silny wiatr';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.locationContainer}>
                    <MapPin size={16} color={theme.colors.primary} />
                    <Text style={styles.locationText}>{stationName}</Text>
                </View>
                <View style={styles.timeContainer}>
                    <Clock size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.timeText}>
                        {data_pomiaru} o {godzina_pomiaru}:00
                    </Text>
                </View>
            </View>

            <View style={styles.mainContent}>
                <View style={styles.weatherIconContainer}>
                    <WeatherIcon wmoCode={currentWmoCode} size={60} />
                    <Text style={styles.weatherDescription}>
                        {getWeatherDescription(currentWmoCode)}
                    </Text>
                </View>
                
                <View style={styles.temperatureContainer}>
                    <Text style={[styles.temperature, { color: getTemperatureColor(temperatura) }]}>
                        {parseFloat(temperatura).toFixed(1)}°
                    </Text>
                    <Text style={styles.temperatureUnit}>C</Text>
                </View>
            </View>

            <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                    <View style={[styles.detailIcon, { backgroundColor: `${getTemperatureColor(temperatura)}15` }]}>
                        <Thermometer size={16} color={getTemperatureColor(temperatura)} />
                    </View>
                    <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>Temperatura</Text>
                        <Text style={styles.detailValue}>{parseFloat(temperatura).toFixed(1)}°C</Text>
                    </View>
                </View>

                <View style={styles.detailItem}>
                    <View style={[styles.detailIcon, { backgroundColor: '#4ECDC415' }]}>
                        <Droplets size={16} color="#4ECDC4" />
                    </View>
                    <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>Wilgotność</Text>
                        <Text style={styles.detailValue}>{parseFloat(wilgotnosc_wzgledna).toFixed(0)}%</Text>
                    </View>
                </View>

                <View style={styles.detailItem}>
                    <View style={[styles.detailIcon, { backgroundColor: '#45B7D115' }]}>
                        <Wind size={16} color="#45B7D1" />
                    </View>
                    <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>Wiatr</Text>
                        <Text style={styles.detailValue}>{getWindDescription(predkosc_wiatru)}</Text>
                    </View>
                </View>

                <View style={styles.detailItem}>
                    <View style={[styles.detailIcon, { backgroundColor: '#96CEB415' }]}>
                        <Gauge size={16} color="#96CEB4" />
                    </View>
                    <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>Ciśnienie</Text>
                        <Text style={styles.detailValue}>{parseFloat(cisnienie).toFixed(0)} hPa</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const getStyles = (theme) => StyleSheet.create({
    container: {
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    locationText: {
        fontFamily: theme.fontFamily.bold,
        fontSize: 16,
        color: theme.colors.text,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontFamily: theme.fontFamily.medium,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    mainContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    weatherIconContainer: {
        alignItems: 'center',
    },
    weatherDescription: {
        fontFamily: theme.fontFamily.medium,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
    },
    temperatureContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    temperature: {
        fontFamily: theme.fontFamily.bold,
        fontSize: 48,
        lineHeight: 48,
    },
    temperatureUnit: {
        fontFamily: theme.fontFamily.bold,
        fontSize: 16,
        color: theme.colors.textSecondary,
        paddingTop: 8,
        marginLeft: 2,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    detailItem: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        padding: 12,
        backgroundColor: theme.colors.background,
        borderRadius: 12,
    },
    detailIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    detailText: {
        flex: 1,
    },
    detailLabel: {
        fontFamily: theme.fontFamily.medium,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    detailValue: {
        fontFamily: theme.fontFamily.bold,
        fontSize: 14,
        color: theme.colors.text,
    },
});

export default WeatherSummary; 