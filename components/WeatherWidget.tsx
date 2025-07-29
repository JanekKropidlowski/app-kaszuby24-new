import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Path, Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { useThemeStore } from '@/store/themeStore';
import { Thermometer, Droplets, Wind, Gauge } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

const WeatherGauge = ({ value, maxValue, title, unit, color, icon: Icon }) => {
    const { theme } = useThemeStore();
    
    // Sprawdzanie czy value jest liczbą
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
        return null;
    }
    
    const percentage = Math.min((numericValue / maxValue) * 100, 100);
    const radius = 30;
    const strokeWidth = 6;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <View style={styles.gaugeContainer}>
            <View style={styles.gaugeHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                    <Icon size={20} color={color} />
                </View>
                <Text style={styles.gaugeTitle}>{title}</Text>
            </View>
            <View style={styles.gaugeContent}>
                <Svg width={80} height={80} style={styles.gaugeSvg}>
                    <Defs>
                        <LinearGradient id={`gaugeGradient-${title}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={color} />
                            <Stop offset="100%" stopColor={`${color}80`} />
                        </LinearGradient>
                    </Defs>
                    <G transform={`translate(40, 40)`}>
                        {/* Background circle */}
                        <Circle
                            cx="0"
                            cy="0"
                            r={radius}
                            stroke={theme.colors.border}
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        {/* Progress circle */}
                        <Circle
                            cx="0"
                            cy="0"
                            r={radius}
                            stroke={`url(#gaugeGradient-${title})`}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform="rotate(-90)"
                        />
                    </G>
                </Svg>
                <View style={styles.gaugeValueContainer}>
                    <Text style={styles.gaugeValue}>{numericValue.toFixed(1)}</Text>
                    <Text style={styles.gaugeUnit}>{unit}</Text>
                </View>
            </View>
        </View>
    );
};

const WeatherTrend = ({ data, title, color }) => {
    const { theme } = useThemeStore();
    
    if (!data || data.length < 2) return null;

    // Sprawdzanie czy wszystkie wartości są liczbami
    const validData = data.filter(value => !isNaN(parseFloat(value))).map(value => parseFloat(value));
    if (validData.length < 2) return null;

    const maxValue = Math.max(...validData);
    const minValue = Math.min(...validData);
    const range = maxValue - minValue;
    
    const points = validData.map((value, index) => {
        const x = (index / (validData.length - 1)) * 100;
        const y = range > 0 ? 100 - ((value - minValue) / range) * 100 : 50;
        return `${x},${y}`;
    }).join(' ');

    return (
        <View style={styles.trendContainer}>
            <Text style={styles.trendTitle}>{title}</Text>
            <View style={styles.trendChart}>
                <Svg width="100%" height={60} style={styles.trendSvg}>
                    <Defs>
                        <LinearGradient id={`trendGradient-${title}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <Stop offset="0%" stopColor={color} />
                            <Stop offset="100%" stopColor={`${color}60`} />
                        </LinearGradient>
                    </Defs>
                    <Path
                        d={`M ${points}`}
                        stroke={`url(#trendGradient-${title})`}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <Path
                        d={`M ${points} L 100,${points.split(' ').pop().split(',')[1]} L 100,100 L 0,100 Z`}
                        fill={`url(#trendGradient-${title})`}
                        opacity="0.1"
                    />
                </Svg>
            </View>
        </View>
    );
};

export const WeatherWidget = ({ weatherData, forecastData }) => {
    const { theme } = useThemeStore();
    const styles = getStyles(theme);

    if (!weatherData) return null;

    // Bezpieczne pobieranie danych z sprawdzeniem
    const temperatura = weatherData.temperatura;
    const cisnienie = weatherData.cisnienie;
    const wilgotnosc_wzgledna = weatherData.wilgotnosc_wzgledna;
    const predkosc_wiatru = weatherData.predkosc_wiatru;

    // Sprawdzanie czy wszystkie wymagane dane są dostępne
    if (!temperatura || !cisnienie || !wilgotnosc_wzgledna || !predkosc_wiatru) {
        return (
            <View style={styles.container}>
                <Text style={styles.sectionTitle}>Szczegółowe dane</Text>
                <Text style={styles.errorText}>Brak kompletnych danych pogodowych</Text>
            </View>
        );
    }

    // Prepare trend data for the next 7 days
    const temperatureTrend = forecastData?.temperature_2m_max?.slice(0, 7) || [];
    const pressureTrend = Array(7).fill(parseFloat(cisnienie)).map((p, i) => p + (Math.random() - 0.5) * 5);

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Szczegółowe dane</Text>
            
            <View style={styles.gaugesContainer}>
                <WeatherGauge
                    value={temperatura}
                    maxValue={40}
                    title="Temperatura"
                    unit="°C"
                    color="#FF6B6B"
                    icon={Thermometer}
                />
                <WeatherGauge
                    value={wilgotnosc_wzgledna}
                    maxValue={100}
                    title="Wilgotność"
                    unit="%"
                    color="#4ECDC4"
                    icon={Droplets}
                />
                <WeatherGauge
                    value={predkosc_wiatru}
                    maxValue={20}
                    title="Wiatr"
                    unit="m/s"
                    color="#45B7D1"
                    icon={Wind}
                />
                <WeatherGauge
                    value={cisnienie}
                    maxValue={1100}
                    title="Ciśnienie"
                    unit="hPa"
                    color="#96CEB4"
                    icon={Gauge}
                />
            </View>

            {temperatureTrend.length > 0 && (
                <View style={styles.trendsContainer}>
                    <WeatherTrend
                        data={temperatureTrend}
                        title="Trend temperatury (7 dni)"
                        color="#FF6B6B"
                    />
                </View>
            )}
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
    sectionTitle: {
        fontFamily: theme.fontFamily.bold,
        fontSize: 20,
        color: theme.colors.text,
        marginBottom: 20,
    },
    errorText: {
        fontFamily: theme.fontFamily.medium,
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    gaugesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    gaugeContainer: {
        width: '48%',
        backgroundColor: theme.colors.background,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    gaugeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    gaugeTitle: {
        fontFamily: theme.fontFamily.semibold,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    gaugeContent: {
        position: 'relative',
        alignItems: 'center',
    },
    gaugeSvg: {
        position: 'absolute',
    },
    gaugeValueContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
    },
    gaugeValue: {
        fontFamily: theme.fontFamily.bold,
        fontSize: 18,
        color: theme.colors.text,
    },
    gaugeUnit: {
        fontFamily: theme.fontFamily.regular,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    trendsContainer: {
        marginTop: 10,
    },
    trendContainer: {
        backgroundColor: theme.colors.background,
        borderRadius: 16,
        padding: 16,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    trendTitle: {
        fontFamily: theme.fontFamily.semibold,
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 12,
    },
    trendChart: {
        height: 60,
    },
    trendSvg: {
        width: '100%',
    },
}); 