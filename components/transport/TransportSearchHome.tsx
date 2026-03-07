import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { MapPin, Search, Navigation, Clock, RotateCcw, Map as MapIcon, ChevronRight, Calendar } from 'lucide-react-native';
import { TransportService, TransportStop } from '@/services/transportService';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

interface Props {
    theme: any;
    userLocation: Location.LocationObject | null;
    onSearch: (from: string, to: string) => void;
    onShowMap: () => void;
    onStopSelect: (stop: TransportStop) => void;
}

const tfs = (size: number) => (Platform.OS === 'android' ? Math.max(9, size - 3) : size);

export const TransportSearchHome: React.FC<Props> = ({ theme, userLocation, onSearch, onShowMap, onStopSelect }) => {
    const [fromText, setFromText] = useState('');
    const [toText, setToText] = useState('');
    const [nearbyStops, setNearbyStops] = useState<(TransportStop & { distance: number })[]>([]);
    const [isLoadingNearby, setIsLoadingNearby] = useState(false);
    const [recentSearches, setRecentSearches] = useState([
        { from: 'Moja lokalizacja', to: 'Gdynia Główna' },
        { from: 'Reda', to: 'Gdańsk Wrzeszcz' }
    ]);
    const [fromSuggestions, setFromSuggestions] = useState<TransportStop[]>([]);
    const [toSuggestions, setToSuggestions] = useState<TransportStop[]>([]);
    const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);
    const [allStopsCache, setAllStopsCache] = useState<TransportStop[]>([]);

    useEffect(() => {
        // Pre-fetch stops for fast local search
        TransportService.fetchStops('all').then(setAllStopsCache).catch(console.warn);

        if (userLocation) {
            loadNearbyStops();
        }
    }, [userLocation]);

    useEffect(() => {
        const search = async () => {
            if (activeInput === 'from' && fromText.length > 2) {
                const results = await TransportService.searchStops(fromText, allStopsCache);
                console.log(`[UI SUGGESTIONS] From field: "${fromText}" | Results: ${results.length}`, 
                    results.map(r => ({ name: r.name, agency: r.agency })));
                setFromSuggestions(results);
            } else if (activeInput === 'to' && toText.length > 2) {
                const results = await TransportService.searchStops(toText, allStopsCache);
                console.log(`[UI SUGGESTIONS] To field: "${toText}" | Results: ${results.length}`, 
                    results.map(r => ({ name: r.name, agency: r.agency })));
                setToSuggestions(results);
            } else {
                setFromSuggestions([]);
                setToSuggestions([]);
            }
        };
        const timer = setTimeout(search, 300);
        return () => clearTimeout(timer);
    }, [fromText, toText, activeInput, allStopsCache]);

    const loadNearbyStops = async () => {
        if (!userLocation) return;
        setIsLoadingNearby(true);
        try {
            const stops = await TransportService.findNearestStops(
                userLocation.coords.latitude,
                userLocation.coords.longitude,
                5
            );
            setNearbyStops(stops);
        } catch (e) {
            console.warn(e);
        } finally {
            setIsLoadingNearby(false);
        }
    };

    const handleSearch = () => {
        if (!toText.trim()) return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSearch(fromText, toText);

        // Add to recent if unique
        const isNew = !recentSearches.some(s => s.to.toLowerCase() === toText.toLowerCase());
        if (isNew) {
            setRecentSearches(prev => [{ from: fromText, to: toText }, ...prev].slice(0, 3));
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text }]}>Gdzie jedziemy?</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Znajdź najlepsze połączenie</Text>
            </View>

            {/* Search Box */}
            <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                <View style={styles.inputRow}>
                    <View style={styles.iconBox}>
                        <MapPin size={18} color={theme.colors.primary} />
                    </View>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        value={fromText}
                        onChangeText={setFromText}
                        onFocus={() => setActiveInput('from')}
                        onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                        placeholder="Skąd wyruszasz?"
                        placeholderTextColor={theme.colors.textSecondary}
                    />
                    {fromText === '' && (
                        <TouchableOpacity
                            onPress={() => {
                                setFromText('Moja lokalizacja');
                                if (Platform.OS !== 'web') Haptics.selectionAsync();
                            }}
                            style={{ padding: 8 }}
                        >
                            <Navigation size={18} color={theme.colors.primary} fill={theme.colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* From Suggestions */}
                {activeInput === 'from' && fromSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                        {fromSuggestions.map((s, i) => (
                            <TouchableOpacity
                                key={`from-${s.id}-${i}`}
                                style={styles.suggestionItem}
                                onPress={() => {
                                    setFromText(s.name);
                                    setFromSuggestions([]);
                                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                                }}
                            >
                                <MapPin size={14} color={theme.colors.textSecondary} />
                                <Text style={[styles.suggestionText, { color: theme.colors.text }]}>{s.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={[styles.suggestionAgency, { color: theme.colors.primary }]}>{s.agency?.toUpperCase()}</Text>
                                    {/* DEBUG: Show position badge */}
                                    <Text style={{ fontSize: tfs(10), color: theme.colors.textSecondary, paddingHorizontal: 4, paddingVertical: 2, backgroundColor: theme.colors.background, borderRadius: 3 }}>
                                        #{i + 1}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={[styles.cleanDivider, { backgroundColor: theme.colors.border }]} />

                <View style={styles.inputRow}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <Navigation size={18} color={theme.colors.primary} />
                    </View>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        value={toText}
                        onChangeText={setToText}
                        onFocus={() => setActiveInput('to')}
                        onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                        placeholder="Cel podróży..."
                        placeholderTextColor={theme.colors.textSecondary}
                        autoFocus={false}
                    />
                </View>

                {/* To Suggestions */}
                {activeInput === 'to' && toSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                        {toSuggestions.map((s, i) => (
                            <TouchableOpacity
                                key={`to-${s.id}-${i}`}
                                style={styles.suggestionItem}
                                onPress={() => {
                                    setToText(s.name);
                                    setToSuggestions([]);
                                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                                }}
                            >
                                <MapPin size={14} color={theme.colors.textSecondary} />
                                <Text style={[styles.suggestionText, { color: theme.colors.text }]}>{s.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={[styles.suggestionAgency, { color: theme.colors.primary }]}>{s.agency?.toUpperCase()}</Text>
                                    {/* DEBUG: Show position badge */}
                                    <Text style={{ fontSize: tfs(10), color: theme.colors.textSecondary, paddingHorizontal: 4, paddingVertical: 2, backgroundColor: theme.colors.background, borderRadius: 3 }}>
                                        #{i + 1}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Time options removed per user request */}

                <TouchableOpacity
                    style={[styles.searchBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={handleSearch}
                >
                    <Search size={20} color="#fff" />
                    <Text style={styles.searchBtnText}>Szukaj połączenia</Text>
                </TouchableOpacity>
            </View>

            {/* Map Button */}
            <TouchableOpacity
                style={[styles.mapBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={onShowMap}
            >
                <MapIcon size={20} color={theme.colors.text} />
                <Text style={[styles.mapBtnText, { color: theme.colors.text }]}>Otwórz mapę przystanków</Text>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {/* Nearby Stops */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MapPin size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>W TWOJEJ OKOLICY</Text>
                </View>

                {isLoadingNearby ? (
                    <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <View>
                        {nearbyStops.map((stop, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.stopItem, { backgroundColor: theme.colors.card }]}
                                onPress={() => onStopSelect(stop)}
                            >
                                <View style={[styles.stopIcon, { backgroundColor: theme.colors.background }]}>
                                    <Clock size={18} color={theme.colors.text} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.stopName, { color: theme.colors.text }]}>{stop.name}</Text>
                                    <Text style={[styles.stopDist, { color: theme.colors.primary }]}>
                                        {Math.round(stop.distance)}m stąd • {stop.agency?.toUpperCase()}
                                    </Text>
                                </View>
                                <ChevronRight size={16} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                        {nearbyStops.length === 0 && (
                            <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic', marginLeft: 10 }}>Brak przystanków w pobliżu</Text>
                        )}
                    </View>
                )}
            </View>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <RotateCcw size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>OSTATNIE WYSZUKIWANIA</Text>
                    </View>
                    {recentSearches.map((s, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.recentItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => { setFromText(s.from); setToText(s.to); onSearch(s.from, s.to); }}
                        >
                            <Text style={[styles.recentText, { color: theme.colors.text }]}>{s.to}</Text>
                            <Text style={{ color: theme.colors.textSecondary, fontSize: tfs(12) }}>z: {s.from}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },
    header: { marginTop: 60, marginBottom: 25 },
    title: {
        fontSize: tfs(32),
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 5,
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    subtitle: {
        fontSize: tfs(16),
        fontWeight: '500',
        ...Platform.select({ android: { fontFamily: 'Poppins_Medium' }, default: {} }),
    },
    card: { borderRadius: 24, padding: 6, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, shadowOffset: { width: 0, height: 5 } },
    inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    iconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    input: {
        flex: 1,
        fontSize: tfs(16),
        fontWeight: '600',
        height: 40,
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    },
    cleanDivider: { height: 1, marginLeft: 60, opacity: 0.5 },
    searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 18, marginTop: 6, gap: 10 },
    searchBtnText: {
        color: '#fff',
        fontSize: tfs(16),
        fontWeight: '800',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    mapBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginTop: 20, justifyContent: 'space-between' },
    mapBtnText: {
        fontSize: tfs(16),
        fontWeight: '700',
        flex: 1,
        marginLeft: 12,
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    },
    section: { marginTop: 30 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15, opacity: 0.7 },
    sectionTitle: {
        fontSize: tfs(13),
        fontWeight: '800',
        letterSpacing: 0.5,
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    },
    stopItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, marginBottom: 10, gap: 12 },
    stopIcon: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    stopName: {
        fontSize: tfs(16),
        fontWeight: '700',
        marginBottom: 2,
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    },
    stopDist: {
        fontSize: tfs(12),
        fontWeight: '600',
        ...Platform.select({ android: { fontFamily: 'Poppins_Medium' }, default: {} }),
    },
    recentItem: { paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    recentText: {
        fontSize: tfs(16),
        fontWeight: '600',
        ...Platform.select({ android: { fontFamily: 'Poppins_Medium' }, default: {} }),
    },
    suggestionsContainer: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12, borderRadius: 12, padding: 8, elevation: 2 },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, gap: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    suggestionText: {
        fontSize: tfs(14),
        fontWeight: '600',
        flex: 1,
        ...Platform.select({ android: { fontFamily: 'Poppins_Medium' }, default: {} }),
    },
    suggestionAgency: {
        fontSize: tfs(10),
        fontWeight: '800',
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    },
    timeOptionsContainer: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 8, paddingHorizontal: 16 },
    timeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#F3F4F6' },
    timeText: {
        fontSize: tfs(13),
        fontWeight: '700',
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    }
});
