import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Svg, Path, Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { useThemeStore, Theme } from '@/store/themeStore';
import { Thermometer, Droplets, Wind, Gauge, X, Info, TrendingUp, AlertTriangle } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface WeatherGaugeProps {
    value: number | string;
    maxValue: number;
    title: string;
    unit: string;
    color: string;
    icon: React.ComponentType<any>;
}

const WeatherGauge: React.FC<WeatherGaugeProps> = ({ value, maxValue, title, unit, color, icon: Icon }) => {
    const { theme } = useThemeStore();
    
    // Sprawdzanie czy value jest liczbą
    const numericValue = parseFloat(value.toString());
    if (isNaN(numericValue)) {
        return null;
    }
    
    const percentage = Math.min((numericValue / maxValue) * 100, 100);
    const radius = 30;
    const strokeWidth = 6;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const styles = getGaugeStyles(theme);

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

interface WeatherTrendProps {
    data: (number | string)[];
    title: string;
    color: string;
}

const WeatherTrend: React.FC<WeatherTrendProps> = ({ data, title, color }) => {
    const { theme } = useThemeStore();
    
    if (!data || data.length < 2) return null;

    // Sprawdzanie czy wszystkie wartości są liczbami
    const validData = data.filter(value => !isNaN(parseFloat(value.toString()))).map(value => parseFloat(value.toString()));
    if (validData.length < 2) return null;

    const maxValue = Math.max(...validData);
    const minValue = Math.min(...validData);
    const range = maxValue - minValue;
    
    const points = validData.map((value, index) => {
        const x = (index / (validData.length - 1)) * 100;
        const y = range > 0 ? 100 - ((value - minValue) / range) * 100 : 50;
        return `${x},${y}`;
    }).join(' ');

    const styles = getTrendStyles(theme);

    return (
        <View style={styles.trendContainer}>
            <Text style={styles.trendTitle}>{title}</Text>
            <View style={styles.trendChart}>
                <Svg width="100%" height={60} style={styles.trendSvg}>
                    <Defs>
                        <LinearGradient id={`trendGradient-${title}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <Stop offset="0%" stopColor={color} />
                            <Stop offset="100%" stopColor={`${color}80`} />
                        </LinearGradient>
                    </Defs>
                    <Path
                        d={`M 0,${points.split(' ')[0].split(',')[1]} ${points.split(' ').map(point => `L ${point.split(',')[0]},${point.split(',')[1]}`).join(' ')}`}
                        stroke={`url(#trendGradient-${title})`}
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </View>
        </View>
    );
};

interface WeatherWidgetProps {
    weatherData: {
        temperature: number;
        humidity: number;
        windSpeed?: number;
        pressure?: number;
    };
    forecastData?: Array<{
        time: string;
        temperature: number;
        description: string;
    }>;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weatherData, forecastData }) => {
    const { theme } = useThemeStore();
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const styles = getStyles(theme);

    if (!weatherData) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Brak danych pogodowych</Text>
            </View>
        );
    }

    const handlePress = () => {
        setDetailModalVisible(true);
    };

    const closeDetailModal = () => {
        setDetailModalVisible(false);
    };

    return (
        <>
            <TouchableOpacity 
                style={styles.container} 
                onPress={handlePress}
                activeOpacity={0.9}
            >
                <View style={styles.header}>
                    <View style={styles.headerIconContainer}>
                        <Thermometer size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.sectionTitle}>Aktualna Pogoda</Text>
                        <Text style={styles.headerSubtitle}>Kliknij, aby zobaczyć szczegóły</Text>
                    </View>
                    <View style={styles.clickIndicator}>
                        <Info size={16} color={theme.colors.primary} />
                    </View>
                </View>

                <View style={styles.gaugesContainer}>
                    <WeatherGauge
                        value={weatherData.temperature}
                        maxValue={40}
                        title="Temperatura"
                        unit="°C"
                        color="#FF6B6B"
                        icon={Thermometer}
                    />
                    <WeatherGauge
                        value={weatherData.humidity}
                        maxValue={100}
                        title="Wilgotność"
                        unit="%"
                        color="#4ECDC4"
                        icon={Droplets}
                    />
                </View>

                {weatherData.windSpeed && (
                    <View style={styles.gaugesContainer}>
                        <WeatherGauge
                            value={weatherData.windSpeed}
                            maxValue={30}
                            title="Wiatr"
                            unit="m/s"
                            color="#45B7D1"
                            icon={Wind}
                        />
                        <WeatherGauge
                            value={weatherData.pressure || 0}
                            maxValue={1100}
                            title="Ciśnienie"
                            unit="hPa"
                            color="#96CEB4"
                            icon={Gauge}
                        />
                    </View>
                )}

                {forecastData && forecastData.length > 0 && (
                    <View style={styles.trendsContainer}>
                        <WeatherTrend
                            data={forecastData.map(f => f.temperature)}
                            title="Trend Temperatury"
                            color="#FF6B6B"
                        />
                    </View>
                )}
            </TouchableOpacity>

            {/* Detail Modal */}
            <Modal
                visible={detailModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={closeDetailModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Szczegóły Pogody</Text>
                        <TouchableOpacity onPress={closeDetailModal} style={styles.closeButton}>
                            <X size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>Podstawowe Informacje</Text>
                            <View style={styles.detailGrid}>
                                <View style={styles.detailCard}>
                                    <View style={styles.detailCardHeader}>
                                        <Thermometer size={20} color="#FF6B6B" />
                                        <Text style={styles.detailCardTitle}>Temperatura</Text>
                                    </View>
                                    <Text style={styles.detailCardValue}>{weatherData.temperature}°C</Text>
                                    <Text style={styles.detailCardDescription}>
                                        Aktualna temperatura powietrza
                                    </Text>
                                </View>
                                
                                <View style={styles.detailCard}>
                                    <View style={styles.detailCardHeader}>
                                        <Droplets size={20} color="#4ECDC4" />
                                        <Text style={styles.detailCardTitle}>Wilgotność</Text>
                                    </View>
                                    <Text style={styles.detailCardValue}>{weatherData.humidity}%</Text>
                                    <Text style={styles.detailCardDescription}>
                                        Wilgotność względna powietrza
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {weatherData.windSpeed && (
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>Warunki Wietrzne</Text>
                                <View style={styles.detailGrid}>
                                    <View style={styles.detailCard}>
                                        <View style={styles.detailCardHeader}>
                                            <Wind size={20} color="#45B7D1" />
                                            <Text style={styles.detailCardTitle}>Prędkość Wiatru</Text>
                                        </View>
                                        <Text style={styles.detailCardValue}>{weatherData.windSpeed} m/s</Text>
                                        <Text style={styles.detailCardDescription}>
                                            Prędkość wiatru w metrach na sekundę
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.detailCard}>
                                        <View style={styles.detailCardHeader}>
                                            <Gauge size={20} color="#96CEB4" />
                                            <Text style={styles.detailCardTitle}>Ciśnienie</Text>
                                        </View>
                                        <Text style={styles.detailCardValue}>{weatherData.pressure || 0} hPa</Text>
                                        <Text style={styles.detailCardDescription}>
                                            Ciśnienie atmosferyczne
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {forecastData && forecastData.length > 0 && (
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>Prognoza</Text>
                                <View style={styles.forecastContainer}>
                                    {forecastData.slice(0, 5).map((forecast, index) => (
                                        <View key={index} style={styles.forecastItem}>
                                            <Text style={styles.forecastTime}>{forecast.time}</Text>
                                            <Text style={styles.forecastTemp}>{forecast.temperature}°C</Text>
                                            <Text style={styles.forecastDescription}>{forecast.description}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </>
    );
};

const getGaugeStyles = (theme: Theme) => StyleSheet.create({
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
        borderWidth: 1,
        borderColor: theme.colors.border,
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
});

const getTrendStyles = (theme: Theme) => StyleSheet.create({
    trendContainer: {
        backgroundColor: theme.colors.background,
        borderRadius: 16,
        padding: 16,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
        borderWidth: 1,
        borderColor: theme.colors.border,
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

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 8,
        marginVertical: 8,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${theme.colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerText: {
        flex: 1,
    },
    headerSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: theme.fontFamily.regular,
        marginTop: 2,
    },
    clickIndicator: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: `${theme.colors.primary}10`,
    },
    sectionTitle: {
        fontFamily: theme.fontFamily.bold,
        fontSize: 20,
        color: theme.colors.text,
        marginBottom: 4,
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
    trendsContainer: {
        marginTop: 10,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 40,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.card,
    },
    modalTitle: {
        fontSize: 24,
        fontFamily: theme.fontFamily.bold,
        color: theme.colors.text,
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: `${theme.colors.textSecondary}15`,
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    detailSection: {
        marginBottom: 24,
    },
    detailSectionTitle: {
        fontSize: 18,
        fontFamily: theme.fontFamily.semibold,
        color: theme.colors.text,
        marginBottom: 16,
    },
    detailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
    },
    detailCard: {
        width: '48%',
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
        marginBottom: 12,
    },
    detailCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    detailCardTitle: {
        fontSize: 14,
        fontFamily: theme.fontFamily.medium,
        color: theme.colors.textSecondary,
    },
    detailCardValue: {
        fontSize: 24,
        fontFamily: theme.fontFamily.bold,
        color: theme.colors.text,
        marginBottom: 8,
    },
    detailCardDescription: {
        fontSize: 12,
        fontFamily: theme.fontFamily.regular,
        color: theme.colors.textSecondary,
        lineHeight: 16,
    },
    forecastContainer: {
        gap: 12,
    },
    forecastItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    forecastTime: {
        fontSize: 14,
        fontFamily: theme.fontFamily.medium,
        color: theme.colors.textSecondary,
    },
    forecastTemp: {
        fontSize: 16,
        fontFamily: theme.fontFamily.bold,
        color: theme.colors.text,
    },
    forecastDescription: {
        fontSize: 12,
        fontFamily: theme.fontFamily.regular,
        color: theme.colors.textSecondary,
        flex: 1,
        textAlign: 'right',
    },
});

export default WeatherWidget; 