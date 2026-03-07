import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Modal, Pressable, RefreshControl, TextInput, Platform, Image, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Map as MapIcon, List, Navigation, Info, X, Cloud, Droplets, Thermometer, Wind, Gauge, ChevronRight, TrendingUp, Calendar, Clock, MapPin, AlertTriangle, Menu, HeartPulse, CircleDashed, CircleDot, Circle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { FlashList } from '@shopify/flash-list';
import { useThemeStore } from '@/store/themeStore';
import {
    fetchNearestAirQuality,
    aqCategoryToColor,
    aqCategoryToEmoji,
    aqCategoryToDescription,
    AqStationResult,
    AveragedValues,
    getEsaCategoryByPm10equiv,
} from '@/services/airQualityService';
import { AirQualityMap } from '@/components/maps/AirQualityMap';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function IndexGauge({ value, color }: { value: number | null; color: string }) {
    const bars = 5;
    const filled = value != null ? Math.min(Math.ceil(value / 25), bars) : 0;
    return (
        <View style={gauge.row}>
            {Array.from({ length: bars }).map((_, i) => (
                <View
                    key={i}
                    style={[
                        gauge.bar,
                        {
                            backgroundColor: i < filled ? color : '#E5E7EB',
                            opacity: i < filled ? 1 : 0.4,
                        },
                    ]}
                />
            ))}
        </View>
    );
}

const gauge = StyleSheet.create({
    row: { flexDirection: 'row', gap: 4, marginTop: 6 },
    bar: { flex: 1, height: 6, borderRadius: 3 },
});

// ---------------------------------------------------------------------------
// Karta stacji
// ---------------------------------------------------------------------------
function StationCard({
    station,
    theme,
    isFirst,
}: {
    station: AqStationResult;
    theme: any;
    isFirst: boolean;
}) {
    const idx = station.index;
    const hasData = idx?.indexValue != null;
    const color = aqCategoryToColor(idx?.indexCategory ?? null);
    const emoji = aqCategoryToEmoji(idx?.indexCategory ?? null);

    return (
        <View
            style={[
                styles.stationCard,
                {
                    backgroundColor: theme.colors.card,
                    borderColor: isFirst ? color : theme.colors.border,
                    borderWidth: isFirst ? 2 : 1,
                },
            ]}
        >
            <View style={styles.stationHeader}>
                <View style={[styles.stationIconWrap, { backgroundColor: color + '22' }]}>
                    <MapPin size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.stationName, { color: theme.colors.text }]} numberOfLines={1}>
                        {station.name}
                    </Text>
                    <Text style={[styles.stationSub, { color: theme.colors.textSecondary }]}>
                        {station.city}
                        {station.distance != null ? ` • ${station.distance.toFixed(1)} km` : ''}
                        {isFirst ? ' • Najbliższa' : ''}
                    </Text>
                </View>
                {hasData && (
                    <View style={[styles.aqiBadge, { backgroundColor: color }]}>
                        <Text style={styles.aqiBadgeText}>{emoji}</Text>
                    </View>
                )}
            </View>

            {hasData ? (
                <>
                    <View style={styles.indexRow}>
                        <View>
                            <Text style={[styles.indexValue, { color }]}>
                                {idx!.indexValue?.toFixed(0) ?? '—'}
                            </Text>
                            <Text style={[styles.indexLabel, { color: theme.colors.textSecondary }]}>
                                Indeks jakości powietrza
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.categoryText, { color }]}>
                                {idx!.indexCategory ?? '—'}
                            </Text>
                            {idx!.source && (
                                <Text style={[styles.pollutantText, { color: theme.colors.textSecondary }]}>
                                    Źródło: {idx!.source === 'AIRLY' ? 'Airly' : idx!.source === 'ESA' ? 'ESA OSE' : 'CAMS'}
                                </Text>
                            )}
                        </View>
                    </View>

                    <IndexGauge value={idx!.indexValue} color={color} />

                    <Text style={[styles.descText, { color: theme.colors.textSecondary }]}>
                        {aqCategoryToDescription(idx!.indexCategory ?? null)}
                    </Text>

                    <View style={styles.pollutantsGrid}>
                        {[
                            { label: 'PM10', value: idx!.pm10Value, cat: idx!.pm10Category },
                            { label: 'PM2.5', value: idx!.pm25Value, cat: idx!.pm25Category },
                            { label: 'SO₂', value: idx!.so2Value, cat: null },
                            { label: 'NO₂', value: idx!.no2Value, cat: null },
                            { label: 'O₃', value: idx!.o3Value, cat: null },
                        ]
                            .filter(p => p.value != null)
                            .map(p => {
                                const pc = aqCategoryToColor(p.cat ?? null);
                                return (
                                    <View
                                        key={p.label}
                                        style={[styles.pollutantChip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                                    >
                                        <Text style={[styles.pollutantChipLabel, { color: theme.colors.textSecondary }]}>
                                            {p.label}
                                        </Text>
                                        <Text style={[styles.pollutantChipValue, { color: p.cat ? pc : theme.colors.text }]}>
                                            {p.value?.toFixed(0)}
                                        </Text>
                                    </View>
                                );
                            })}
                    </View>
                </>
            ) : (
                <View style={styles.noDataWrap}>
                    <AlertTriangle size={20} color={theme.colors.textSecondary} />
                    <Text style={[styles.noDataText, { color: theme.colors.textSecondary }]}>
                        {station.error ?? 'Brak aktualnych danych pomiarowych'}
                    </Text>
                </View>
            )}
        </View>
    );
}

// ---------------------------------------------------------------------------
// Modal ze szczegółami stacji
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Modal ze szczegółami stacji (Minimalist Version)
// ---------------------------------------------------------------------------
function getCategoryEmoji(category: string | null | undefined) {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('bardzo dobr')) return '😊';
    if (cat.includes('dobr')) return '🙂';
    if (cat.includes('umiarkow')) return '😐';
    if (cat.includes('dostatecz')) return '😟';
    if (cat.includes('zła')) return '😷';
    if (cat.includes('bardzo zła') || cat.includes('skrajnie')) return '🤢';
    return '😶';
}

function MiniGraph({ data, theme }: { data: AveragedValues[]; theme: any }) {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => {
        const pm10 = d.values.find(v => v.name === 'PM10')?.value || 0;
        const index = d.indexes?.[0]?.value || 0;
        return Math.max(pm10, index);
    }), 40);

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'flex-end', height: 70, paddingBottom: 10 }}>
            {data.map((item, idx) => {
                const val = item.indexes?.[0]?.value || item.values.find(v => v.name === 'PM10')?.value || 0;
                const h = Math.max((val / maxVal) * 45, 6);
                const color = aqCategoryToColor(item.indexes?.[0]?.level || null);
                const date = new Date(item.fromDateTime);
                return (
                    <View key={idx} style={{ alignItems: 'center', width: 28 }}>
                        <View style={{ height: 45, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
                            <View style={{ height: h, width: 10, borderRadius: 5, backgroundColor: color }} />
                        </View>
                        <Text style={{ fontSize: 8, color: theme.colors.textSecondary, marginTop: 4, fontFamily: 'Poppins_Regular' }}>{date.getHours()}:00</Text>
                    </View>
                );
            })}
        </ScrollView>
    );
}

function TrendItem({ item, type, theme }: { item: AveragedValues; type: 'history' | 'forecast'; theme: any }) {
    const pm10 = item.values.find(v => v.name === 'PM10')?.value;
    const pm25 = item.values.find(v => v.name === 'PM25')?.value;
    const date = new Date(item.fromDateTime);
    const color = aqCategoryToColor(item.indexes?.[0]?.level || (pm10 ? getEsaCategoryByPm10equiv(pm10) : null));

    return (
        <View style={[modalStyles.trendItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            <Text style={[modalStyles.trendTime, { color: theme.colors.textSecondary }]}>
                {date.getHours()}:00
            </Text>
            <View style={[modalStyles.trendDot, { backgroundColor: color }]} />
            <View style={modalStyles.trendVals}>
                {pm10 != null && (
                    <Text style={[modalStyles.trendVal, { color: theme.colors.text }]}>PM10: {pm10.toFixed(0)}</Text>
                )}
                {pm25 != null && (
                    <Text style={[modalStyles.trendVal, { color: theme.colors.textSecondary }]}>PM2.5: {pm25.toFixed(0)}</Text>
                )}
            </View>
        </View>
    );
}

function StationDetailModal({
    station,
    visible,
    onClose,
    theme
}: {
    station: AqStationResult | null;
    visible: boolean;
    onClose: () => void;
    theme: any;
}) {
    if (!station) return null;
    const idx = station.index;
    const color = aqCategoryToColor(idx?.indexCategory || null);

    // Natural advice sentence based on CAQI
    const getNaturalAdvice = (category: string | null | undefined) => {
        const cat = category?.toLowerCase() || '';
        if (cat.includes('bardzo dobr')) return 'Idealne warunki na spacer i aktywność na zewnątrz!';
        if (cat.includes('dobr')) return 'Dobra jakość powietrza. Możesz śmiało wychodzić.';
        if (cat.includes('umiark')) return 'Jakość powietrza jest umiarkowana. Wrażliwe osoby powinny uważać.';
        if (cat.includes('dostatecz')) return 'Zalecamy ograniczenie dłuższego przebywania na zewnątrz.';
        if (cat.includes('zła')) return 'Niekorzystne warunki. Lepiej zostać w domu.';
        return 'Brak szczegółowych zaleceń dla tej stacji.';
    };

    const pollutants = [
        { label: 'PM10', value: idx?.pm10Value, limit: 45, icon: <CircleDashed size={16} color={theme.colors.text} /> },
        { label: 'PM2.5', value: idx?.pm25Value, limit: 15, icon: <CircleDot size={16} color={theme.colors.text} /> },
        { label: 'PM1', value: idx?.pm1Value, limit: null, icon: <Circle size={14} color={theme.colors.text} /> },
        { label: 'NO₂', value: idx?.no2Value, limit: 25, icon: <Wind size={14} color={theme.colors.text} /> },
        { label: 'SO₂', value: idx?.so2Value, limit: 40, icon: <Wind size={14} color={theme.colors.text} /> },
        { label: 'O₃', value: idx?.o3Value, limit: 100, icon: <Wind size={14} color={theme.colors.text} /> },
        { label: 'CO', value: idx?.coValue, limit: 4000, icon: <Wind size={14} color={theme.colors.text} /> },
    ].filter(p => p.value != null);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={modalStyles.backdrop}
                activeOpacity={1}
                onPress={onClose}
            />
            <View style={[modalStyles.sheet, { backgroundColor: theme.colors.card }]}>
                {/* Visual Handle */}
                <View style={modalStyles.handleRow}>
                    <View style={[modalStyles.handle, { backgroundColor: theme.colors.border }]} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={modalStyles.scrollContent}
                    style={{ flexGrow: 0 }}
                >
                    {/* Header */}
                    <View style={modalStyles.header}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={[modalStyles.emojiCircle, { backgroundColor: color + '22' }]}>
                                <Text style={{ fontSize: 32 }}>{getCategoryEmoji(idx?.indexCategory)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[modalStyles.title, { color: theme.colors.text }]}>
                                    {station.name}
                                </Text>
                                <Text style={[modalStyles.subtitle, { color: theme.colors.textSecondary }]}>
                                    {station.city}{station.address ? `, ${station.address}` : ''}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={modalStyles.miniClose}>
                            <X size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Main CAQI / Advice */}
                    <View style={[modalStyles.adviceBox, { backgroundColor: color + '15' }]}>
                        <Text style={[modalStyles.adviceTitle, { color: color }]}>
                            {idx?.indexCategory || 'Brak danych'}
                        </Text>
                        <Text style={[modalStyles.naturalAdvice, { color: theme.colors.text }]}>
                            {getNaturalAdvice(idx?.indexCategory)}
                        </Text>
                    </View>

                    {/* Pollutants Grid */}
                    {pollutants.length > 0 && (
                        <>
                            <Text style={[modalStyles.sectionTitle, { color: theme.colors.text, marginTop: 10 }]}>Parametry powietrza</Text>
                            <View style={modalStyles.pollutantGrid}>
                                {pollutants.map((p, i) => (
                                    <View key={p.label} style={modalStyles.pollCircleItem}>
                                        <View style={[modalStyles.pollIconCircle, { borderColor: p.limit && p.value! > p.limit ? '#E02020' : theme.colors.border }]}>
                                            {p.icon}
                                            <Text style={[modalStyles.pollLabelTiny, { color: theme.colors.textSecondary }]}>{p.label}</Text>
                                        </View>
                                        <View style={modalStyles.pollValueCol}>
                                            <Text style={[modalStyles.pollValueText, { color: theme.colors.text }]}>
                                                {p.value?.toFixed(0)} <Text style={modalStyles.unitText}>{p.label === 'CO' ? 'mg/m³' : 'µg/m³'}</Text>
                                            </Text>
                                            {p.limit && (
                                                <Text style={[modalStyles.percentText, { color: p.value! > p.limit ? '#E02020' : theme.colors.textSecondary }]}>
                                                    {((p.value! / p.limit) * 100).toFixed(0)}%
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Weather Row */}
                    {(idx?.temperature != null || idx?.humidity != null || idx?.pressure != null || idx?.windSpeed != null) && (
                        <>
                            <Text style={[modalStyles.sectionTitle, { color: theme.colors.text }]}>Warunki pogodowe</Text>
                            <View style={modalStyles.weatherRow}>
                                {idx?.temperature != null && (
                                    <View style={modalStyles.weatherItem}>
                                        <Thermometer size={22} color="#E07B39" />
                                        <Text style={[modalStyles.weatherVal, { color: theme.colors.text }]}>{idx.temperature.toFixed(1)}°C</Text>
                                        <Text style={[modalStyles.weatherLabel, { color: theme.colors.textSecondary }]}>Temperatura</Text>
                                    </View>
                                )}
                                {idx?.humidity != null && (
                                    <View style={modalStyles.weatherItem}>
                                        <Droplets size={22} color="#3B82F6" />
                                        <Text style={[modalStyles.weatherVal, { color: theme.colors.text }]}>{idx.humidity.toFixed(0)}%</Text>
                                        <Text style={[modalStyles.weatherLabel, { color: theme.colors.textSecondary }]}>Wilgotność</Text>
                                    </View>
                                )}
                                {idx?.pressure != null && (
                                    <View style={modalStyles.weatherItem}>
                                        <Gauge size={22} color="#8B5CF6" />
                                        <Text style={[modalStyles.weatherVal, { color: theme.colors.text }]}>{idx.pressure.toFixed(0)}</Text>
                                        <Text style={[modalStyles.weatherLabel, { color: theme.colors.textSecondary }]}>hPa</Text>
                                    </View>
                                )}
                                {idx?.windSpeed != null && (
                                    <View style={modalStyles.weatherItem}>
                                        <Wind size={22} color="#10B981" />
                                        <Text style={[modalStyles.weatherVal, { color: theme.colors.text }]}>{idx.windSpeed.toFixed(1)} m/s</Text>
                                        <Text style={[modalStyles.weatherLabel, { color: theme.colors.textSecondary }]}>Wiatr</Text>
                                    </View>
                                )}
                            </View>
                        </>
                    )}

                    {/* Trends */}
                    {((station.history && station.history.length > 0) || (station.forecast && station.forecast.length > 0)) && (
                        <View style={modalStyles.trendContainer}>
                            <Text style={[modalStyles.sectionTitle, { color: theme.colors.text }]}>Trend zanieczyszczeń (24h)</Text>
                            <MiniGraph data={[...(station.history || []), ...(station.forecast || [])]} theme={theme} />
                        </View>
                    )}

                    {/* Footer / Partner */}
                    <View style={modalStyles.footer}>
                        {station.sponsor && (
                            <Text style={[modalStyles.partnerText, { color: theme.colors.textSecondary }]}>
                                Partner stacji: <Text style={{ color: theme.colors.text, fontFamily: 'Poppins_SemiBold' }}>{station.sponsor}</Text>
                            </Text>
                        )}
                        <Text style={[modalStyles.dataSource, { color: theme.colors.textSecondary }]}>
                            Dane pochodzą z stacji pomiarowej {station.source === 'AIRLY' ? 'Airly' : 'ESA'}.
                        </Text>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const modalStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        position: 'absolute',
        bottom: 0,
        width: '100%',
        maxHeight: '90%', // Elastic but bounded
    },
    handleRow: { height: 24, alignItems: 'center', justifyContent: 'center' },
    handle: { width: 40, height: 4, borderRadius: 2 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10, gap: 12 },
    emojiCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 18, fontFamily: Platform.select({ default: 'Poppins_Bold' }), lineHeight: 22 },
    subtitle: { fontSize: 11, fontFamily: Platform.select({ default: 'Poppins_Regular' }), opacity: 0.6, marginTop: 1 },
    miniClose: { padding: 8, marginRight: -8, alignSelf: 'flex-start' },
    adviceBox: { padding: 16, borderRadius: 16, marginBottom: 20 },
    adviceTitle: { fontSize: 16, fontFamily: 'Poppins_Bold', marginBottom: 4 },
    naturalAdvice: { fontSize: 13, fontFamily: 'Poppins_Regular', opacity: 0.8 },
    pollutantGrid: { gap: 12, marginBottom: 20 },
    pollCircleItem: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    pollIconCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    pollLabelTiny: { fontSize: 8, fontFamily: 'Poppins_Bold', marginTop: -2 },
    pollValueCol: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    pollValueText: { fontSize: 20, fontFamily: 'Poppins_SemiBold' },
    unitText: { fontSize: 10, fontFamily: 'Poppins_Regular', opacity: 0.6 },
    percentText: { fontSize: 16, fontFamily: 'Poppins_Bold' },
    weatherRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)', marginBottom: 15 },
    weatherItem: { alignItems: 'center', gap: 3 },
    weatherVal: { fontSize: 15, fontFamily: 'Poppins_Bold' },
    weatherLabel: { fontSize: 10, fontFamily: 'Poppins_Regular' },
    trendContainer: { marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontFamily: 'Poppins_Bold', marginBottom: 12 },
    trendInner: { gap: 10 },
    footer: { marginTop: 10, alignItems: 'center', gap: 4 },
    partnerText: { fontSize: 11, fontFamily: 'Poppins_Regular' },
    dataSource: { fontSize: 9, fontFamily: 'Poppins_Regular', opacity: 0.5 },
    // Trends
    trendItem: { padding: 8, borderRadius: 12, borderWidth: 1, minWidth: 80, alignItems: 'center', marginRight: 10 },
    trendTime: { fontSize: 9, fontFamily: 'Poppins_SemiBold', marginBottom: 4 },
    trendDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 4 },
    trendVals: { alignItems: 'center' },
    trendVal: { fontSize: 8, fontFamily: 'Poppins_SemiBold' },
});

// ---------------------------------------------------------------------------
// Ekran główny
// ---------------------------------------------------------------------------
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList as any);

export default function AirQualityScreen() {
    const { theme } = useThemeStore();
    const insets = useSafeAreaInsets();
    const [stations, setStations] = useState<AqStationResult[]>([]);
    const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [cityName, setCityName] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [selectedStation, setSelectedStation] = useState<AqStationResult | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const listRef = useRef<any>(null);

    const loadData = useCallback(async (coords?: { lat: number; lon: number }) => {
        const c = coords ?? userCoords;
        if (!c) return;
        setError(null);
        try {
            const results = await fetchNearestAirQuality(c.lat, c.lon, 100);
            setStations(results);
            setLastUpdated(new Date());
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        } catch (e) {
            setError('Nie udało się pobrać danych. Sprawdź połączenie.');
        }
    }, [userCoords, fadeAnim]);

    const init = useCallback(async () => {
        try {
            setLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            let coords = { lat: 54.352, lon: 18.6466 }; // Default Gdańsk

            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
            }

            setUserCoords(coords);

            if (status === 'granted') {
                try {
                    const geo = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lon });
                    if (geo[0]) {
                        setCityName(geo[0].city || geo[0].district || geo[0].subregion || null);
                    }
                } catch (_) { }
            } else {
                setCityName('Gdańsk (domyślne)');
            }

            await loadData(coords);
        } catch (e) {
            setError('Błąd pobierania lokalizacji');
        } finally {
            setLoading(false);
        }
    }, [loadData]);

    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        if (!searchQuery || searchQuery.length < 3) {
            setGeocodedCoords(null);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const results = await Location.geocodeAsync(searchQuery + ', Polska');
                if (results.length > 0) {
                    setGeocodedCoords({ lat: results[0].latitude, lon: results[0].longitude });
                } else {
                    setGeocodedCoords(null);
                }
            } catch (e) {
                setGeocodedCoords(null);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleStationPress = useCallback((s: AqStationResult) => setSelectedStation(s), []);
    const handleModalClose = useCallback(() => setSelectedStation(null), []);

    const mainStation = useMemo(() => stations.find(s => s.index?.indexValue != null), [stations]);
    const mainColor = useMemo(() => aqCategoryToColor(mainStation?.index?.indexCategory ?? null), [mainStation]);
    const mainEmoji = useMemo(() => aqCategoryToEmoji(mainStation?.index?.indexCategory ?? null), [mainStation]);

    const fuse = useMemo(() => new Fuse(stations, {
        keys: [
            { name: 'city', weight: 0.7 },
            { name: 'name', weight: 0.3 }
        ],
        threshold: 0.3,
        distance: 100,
    }), [stations]);

    const { displayedStations, isGeocodedResult } = useMemo(() => {
        if (!searchQuery) return { displayedStations: stations.slice(0, 40), isGeocodedResult: false };

        const fuseResults = fuse.search(searchQuery).map(r => r.item);
        if (fuseResults.length > 0) return { displayedStations: fuseResults, isGeocodedResult: false };

        if (geocodedCoords) {
            const sortedByDist = [...stations]
                .sort((a, b) => {
                    const distA = Math.sqrt(Math.pow(a.lat - geocodedCoords.lat, 2) + Math.pow(a.lon - geocodedCoords.lon, 2));
                    const distB = Math.sqrt(Math.pow(b.lat - geocodedCoords.lat, 2) + Math.pow(b.lon - geocodedCoords.lon, 2));
                    return distA - distB;
                })
                .slice(0, 40);
            return { displayedStations: sortedByDist, isGeocodedResult: true };
        }

        return { displayedStations: [], isGeocodedResult: false };
    }, [fuse, stations, searchQuery, geocodedCoords]);

    // Scroll to top when search results change to prevent "jumping" to middle of previous list
    useEffect(() => {
        if (searchQuery && listRef.current) {
            listRef.current.scrollToOffset({ offset: 0, animated: false });
        }
    }, [displayedStations]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right', 'bottom']}>
            <View style={styles.headerContainer}>
                <LinearGradient
                    colors={mainStation ? [mainColor, mainColor + '80'] : ['#1E3A5F', '#2D5986']}
                    style={[styles.hero, { paddingTop: insets.top + 8 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.heroTop}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Navigation size={14} color="rgba(255,255,255,0.85)" />
                                <Text style={styles.heroCity}>{cityName ?? 'Twoja lokalizacja'}</Text>
                            </View>
                            <Text style={styles.heroTitle}>Jakość powietrza</Text>
                        </View>

                        {mainStation?.index?.indexValue != null && (
                            <View style={styles.heroIndexBadge}>
                                <Text style={styles.heroIndexBigNum}>{Math.round(mainStation.index.indexValue)}</Text>
                                <Text style={styles.heroIndexCaqiLabel}>CAQI</Text>
                            </View>
                        )}

                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, viewMode === 'LIST' && styles.toggleBtnActive]}
                                onPress={() => setViewMode('LIST')}
                            >
                                <Menu size={18} color={viewMode === 'LIST' ? mainColor : '#FFF'} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, viewMode === 'MAP' && styles.toggleBtnActive]}
                                onPress={() => setViewMode('MAP')}
                            >
                                <MapIcon size={18} color={viewMode === 'MAP' ? mainColor : '#FFF'} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.heroBottomRow}>
                        {mainStation?.index?.indexCategory && (
                            <View style={styles.heroCategoryWrap}>
                                <Text style={styles.heroEmoji}>{mainEmoji}</Text>
                                <Text style={styles.heroCategoryText}>
                                    {mainStation.index.indexCategory}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.heroSub}>
                            {lastUpdated ? `Aktualizacja: ${lastUpdated.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </Text>
                    </View>
                </LinearGradient>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                        Pobieranie danych o smogu…
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <AlertTriangle size={40} color={theme.colors.error ?? '#E02020'} />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={init}
                    >
                        <Text style={styles.retryBtnText}>Spróbuj ponownie</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {viewMode === 'LIST' && (
                        <View style={[styles.searchWrapper, { backgroundColor: theme.colors.background }]}>
                            <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                <Search size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
                                <TextInput
                                    style={[styles.searchInput, { color: theme.colors.text }]}
                                    placeholder="Szukaj miasta lub stacji..."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                                        <X size={16} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                    {viewMode === 'MAP' ? (
                        <View style={styles.mapContainer}>
                            {userCoords && (
                                <AirQualityMap
                                    center={userCoords}
                                    stations={stations}
                                    theme={theme}
                                    onStationPress={handleStationPress}
                                />
                            )}
                        </View>
                    ) : (
                        <AnimatedFlashList
                            ref={listRef}
                            style={{ opacity: fadeAnim }}
                            data={displayedStations}
                            keyExtractor={(item: any) => item.id.toString()}
                            estimatedItemSize={120}
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                            renderItem={({ item, index }: { item: any; index: number }) => (
                                <TouchableOpacity onPress={() => handleStationPress(item)} activeOpacity={0.8}>
                                    <StationCard station={item} theme={theme} isFirst={index === 0 && !searchQuery} />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                                        Brak stacji spełniających kryteria.
                                    </Text>
                                </View>
                            }
                            ListHeaderComponent={
                                <>
                                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                        {searchQuery ? 'Wyniki wyszukiwania' : `Stacje i region (${stations.length})`}
                                    </Text>
                                    {isGeocodedResult && searchQuery && (
                                        <View style={[styles.infoCard, { marginBottom: 16, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                            <MapIcon size={16} color={theme.colors.primary} />
                                            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                                                Brak stacji w <Text style={{ color: theme.colors.text, fontWeight: 'bold' }}>{searchQuery}</Text>. Pokazujemy najbliższe lokalizacje dla tego obszaru:
                                            </Text>
                                        </View>
                                    )}
                                </>
                            }
                            ListFooterComponent={
                                <View style={{ paddingBottom: 100 }}>
                                    <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                        <Info size={16} color={theme.colors.primary} />
                                        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                                            Dane z prywatnych czujników (Airly) oraz szkół (Edukacyjna Sieć Antysmogowa OSE). Prognozy regionalne pochodzą z satelity Copernicus (CAMS).
                                        </Text>
                                    </View>

                                    <View style={[styles.legendCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginTop: 12 }]}>
                                        <Text style={[styles.legendTitle, { color: theme.colors.text }]}>Skala indeksu</Text>
                                        {[
                                            { label: 'Bardzo dobry', color: '#1A9641', range: '0–25' },
                                            { label: 'Dobry', color: '#52B74E', range: '26–50' },
                                            { label: 'Umiarkowany', color: '#F5D327', range: '51–75' },
                                            { label: 'Dostateczny', color: '#F08D21', range: '76–100' },
                                            { label: 'Zły', color: '#E02020', range: '101–150' },
                                            { label: 'Bardzo zły', color: '#7D1B7E', range: '>150' },
                                        ].map(l => (
                                            <View key={l.label} style={styles.legendRow}>
                                                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                                                <Text style={[styles.legendLabel, { color: theme.colors.text }]}>{l.label}</Text>
                                                <Text style={[styles.legendRange, { color: theme.colors.textSecondary }]}>{l.range}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            }
                        />
                    )}
                </View>
            )}

            <StationDetailModal
                station={selectedStation}
                visible={!!selectedStation}
                theme={theme}
                onClose={handleModalClose}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    mapContainer: {
        flex: 1,
        marginTop: -32,
    },
    headerContainer: {
        overflow: 'hidden',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        backgroundColor: '#1E3A5F',
        zIndex: 10,
        elevation: 10,
    },
    hero: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        gap: 12,
    },
    heroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        padding: 4,
    },
    toggleBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleBtnActive: {
        backgroundColor: '#FFFFFF',
    },
    heroBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 4,
    },
    heroCity: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 26,
        fontFamily: Platform.select({ default: 'Poppins_Bold', android: 'Poppins_Bold' }),
        marginTop: 2,
    },
    heroEmoji: {
        fontSize: 26,
        lineHeight: 32,
        marginRight: 4,
    },
    heroCategoryWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    heroCategoryText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: Platform.select({ default: 'Poppins_SemiBold', android: 'Poppins_SemiBold' }),
    },
    heroIndexBadge: {
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignItems: 'center',
        marginRight: 8,
    },
    heroIndexBigNum: {
        color: '#FFFFFF',
        fontSize: 28,
        lineHeight: 32,
        fontFamily: Platform.select({ default: 'Poppins_Bold', android: 'Poppins_Bold' }),
    },
    heroIndexCaqiLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        letterSpacing: 1,
        fontFamily: Platform.select({ default: 'Poppins_SemiBold', android: 'Poppins_SemiBold' }),
    },
    heroSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
    },
    loadingText: {
        fontSize: 15,
        textAlign: 'center',
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
        lineHeight: 24,
    },
    retryBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryBtnText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: Platform.select({ default: 'Poppins_SemiBold', android: 'Poppins_SemiBold' }),
    },
    scrollContent: { padding: 16, paddingTop: 24, paddingBottom: 100 },
    sectionTitle: {
        fontSize: 17,
        fontFamily: Platform.select({ default: 'Poppins_SemiBold', android: 'Poppins_SemiBold' }),
        marginBottom: 12,
        marginTop: 4,
    },
    stationCard: {
        borderRadius: 16,
        padding: 16,
        gap: 10,
        borderWidth: 1,
        marginBottom: 12,
    },
    stationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stationIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stationName: {
        fontSize: 15,
        fontFamily: Platform.select({ default: 'Poppins_SemiBold', android: 'Poppins_SemiBold' }),
    },
    stationSub: {
        fontSize: 12,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
    },
    aqiBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aqiBadgeText: { fontSize: 22 },
    indexRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    indexValue: {
        fontSize: 42,
        fontFamily: Platform.select({ default: 'Poppins_Bold', android: 'Poppins_Bold' }),
        lineHeight: 48,
    },
    indexLabel: {
        fontSize: 12,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
    },
    categoryText: {
        fontSize: 15,
        fontFamily: Platform.select({ default: 'Poppins_SemiBold', android: 'Poppins_SemiBold' }),
        textAlign: 'right',
    },
    pollutantText: {
        fontSize: 11,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
        textAlign: 'right',
        marginTop: 2,
    },
    descText: {
        fontSize: 13,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
        lineHeight: 20,
        marginVertical: 4,
    },
    pollutantsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    pollutantChip: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: 'center',
        minWidth: 60,
    },
    searchWrapper: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
        zIndex: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
        fontSize: 14,
    },
    searchClearBtn: {
        padding: 4,
    },
    pollutantChipLabel: {
        fontSize: 11,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
    },
    pollutantChipValue: {
        fontSize: 15,
        fontFamily: Platform.select({ default: 'Poppins_Bold', android: 'Poppins_Bold' }),
    },
    noDataWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    noDataText: {
        fontSize: 13,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
        flex: 1,
    },
    emptyCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
        textAlign: 'center',
    },
    infoCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
        lineHeight: 18,
    },
    legendCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        gap: 8,
    },
    legendTitle: {
        fontSize: 15,
        fontFamily: Platform.select({ default: 'Poppins_SemiBold', android: 'Poppins_SemiBold' }),
        marginBottom: 4,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    legendDot: { width: 12, height: 12, borderRadius: 6 },
    legendLabel: {
        flex: 1,
        fontSize: 13,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
    },
    legendRange: {
        fontSize: 12,
        fontFamily: Platform.select({ default: 'Poppins_Regular', android: 'Poppins_Regular' }),
    },
});
