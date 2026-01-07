import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Keyboard, Animated, Platform } from 'react-native';
import { Search, ArrowDown, ArrowUp, MapPin, Navigation, Clock, X, ChevronRight, LocateFixed } from 'lucide-react-native';
import { TransportService, TransportStop } from '@/services/transportService';
import { TransportRoutingEngine, RouteOption } from '@/services/TransportRoutingEngine';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';

interface Props {
    theme: any;
    userLocation: Location.LocationObject | null;
    onClose: () => void;
    onRouteSelect: (route: RouteOption) => void;
}

export const SimpleSearch = ({ theme, userLocation, onClose, onRouteSelect }: Props) => {
    // State
    const [fromText, setFromText] = useState('');
    const [toText, setToText] = useState('');
    const [fromStop, setFromStop] = useState<TransportStop | 'current' | null>(null);
    const [toStop, setToStop] = useState<TransportStop | null>(null);

    const [suggestions, setSuggestions] = useState<TransportStop[]>([]);
    const [results, setResults] = useState<RouteOption[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);

    // Refs
    const allStopsParam = useRef<TransportStop[]>([]);

    useEffect(() => {
        loadStops();
    }, []);

    const loadStops = async () => {
        const stops = await TransportService.getAllStops();
        allStopsParam.current = stops || [];
    };

    // Helper: Autocomplete
    const updateSuggestions = (text: string) => {
        if (!text || text.length < 2) {
            setSuggestions([]);
            return;
        }
        const lower = text.toLowerCase();
        // Priority for Rail Hubs
        const filtered = allStopsParam.current
            .filter(s => s.name.toLowerCase().includes(lower))
            .sort((a, b) => {
                // Boost railway stations
                const aRail = a.agency?.includes('rail') || a.agency?.includes('skm') ? 1 : 0;
                const bRail = b.agency?.includes('rail') || b.agency?.includes('skm') ? 1 : 0;
                return bRail - aRail;
            })
            .slice(0, 20);
        setSuggestions(filtered);
    };

    const handleTextChange = (text: string, type: 'from' | 'to') => {
        if (type === 'from') setFromText(text);
        else setToText(text);
        updateSuggestions(text);
    };

    const selectSuggestion = (stop: TransportStop) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (activeInput === 'from') {
            setFromText(stop.name);
            setFromStop(stop);
            setActiveInput(null);
            // Auto focus next
            if (!toStop) setActiveInput('to');
        } else {
            setToText(stop.name);
            setToStop(stop);
            setActiveInput(null);
            // If both ready, search immediately
            if (fromText || fromStop) {
                setTimeout(() => executeSearch(fromStop || 'current', stop), 100);
            }
        }
        setSuggestions([]);
        Keyboard.dismiss();
    };

    const useCurrentLocation = () => {
        if (!userLocation) return;
        setFromText('Moja lokalizacja');
        setFromStop('current');
        setActiveInput(null);
        if (!toStop) setActiveInput('to');
    };

    const executeSearch = async (start: TransportStop | 'current' | null, end: TransportStop | null) => {
        if (!start || !end) return;

        // Resolve start
        let startObj: TransportStop | { lat: number, lon: number } = start as TransportStop;
        if (start === 'current' || (typeof start === 'string' && start === 'current')) {
            if (!userLocation) return;
            startObj = { lat: userLocation.coords.latitude, lon: userLocation.coords.longitude };
        }

        setIsSearching(true);
        setResults([]);

        try {
            const routes = await TransportRoutingEngine.findRoute(startObj, end);
            setResults(routes);
            if (routes.length === 0 && Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const swap = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const tf = fromText; const tfo = fromStop;
        const tt = toText; const tto = toStop;

        setFromText(tt); setFromStop(tto as any);
        setToText(tf); setToStop(tfo as any);

        // Re-trigger search if valid
        if (tt && tf) {
            executeSearch(tto as any, tfo as any);
        }
    };

    // Render Items
    const renderSuggestion = ({ item }: { item: TransportStop }) => (
        <TouchableOpacity
            style={[styles.suggestionItem, { borderBottomColor: theme.colors.border }]}
            onPress={() => selectSuggestion(item)}
        >
            <View style={[styles.iconBox, { backgroundColor: item.agency?.includes('rail') || item.agency?.includes('skm') ? '#fbbf24' : theme.colors.surface }]}>
                {item.agency?.includes('rail') || item.agency?.includes('skm') ? <Navigation size={18} color="#000" /> : <MapPin size={18} color={theme.colors.textSecondary} />}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.suggName, { color: theme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.suggDesc, { color: theme.colors.textSecondary }]}>{item.subtext || (item.agency?.toUpperCase() || 'BUS')}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderResult = ({ item }: { item: RouteOption }) => (
        <TouchableOpacity
            style={[styles.resultCard, { backgroundColor: theme.colors.card }]}
            onPress={() => onRouteSelect(item)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.agencyBadge}>
                    <Text style={styles.agencyText}>{item.legs[0]?.line || 'BUS'}</Text>
                </View>
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={[styles.timeRange, { color: theme.colors.text }]}>
                        {item.startTime.substring(0, 5)} - {item.endTime.substring(0, 5)}
                    </Text>
                    <Text style={[styles.durationText, { color: theme.colors.textSecondary }]}>
                        {item.totalDuration} min • {item.changes === 0 ? 'Bezpośredni' : `${item.changes} przesiadki`}
                    </Text>
                </View>
                <ChevronRight color={theme.colors.textSecondary} size={20} />
            </View>
            {/* Timeline Mini */}
            <View style={styles.miniTimeline}>
                {item.legs.map((l, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {i > 0 && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.textSecondary, marginHorizontal: 4 }} />}
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                            {l.mode === 'WALK' ? `Spacer` : `Linia ${l.line}`} ({l.duration}min)
                        </Text>
                    </View>
                ))}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header / Inputs */}
            <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>

                <View style={styles.inputRow}>
                    <View style={styles.inputStack}>
                        <View style={styles.inputWrapper}>
                            <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
                            <TextInput
                                style={[styles.input, { color: theme.colors.text }]}
                                placeholder="Start (np. Moja lokalizacja)"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={fromText}
                                onChangeText={t => handleTextChange(t, 'from')}
                                onFocus={() => setActiveInput('from')}
                            />
                            {/* Use Current Location shortcut */}
                            {activeInput === 'from' && !fromText && (
                                <TouchableOpacity onPress={useCurrentLocation} style={{ padding: 4 }}>
                                    <LocateFixed size={18} color="#3b82f6" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={{ height: 1, backgroundColor: theme.colors.border, marginLeft: 32 }} />
                        <View style={styles.inputWrapper}>
                            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
                            <TextInput
                                style={[styles.input, { color: theme.colors.text, fontWeight: '600' }]}
                                placeholder="Dokąd jedziemy?"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={toText}
                                onChangeText={t => handleTextChange(t, 'to')}
                                onFocus={() => setActiveInput('to')}
                            />
                        </View>
                    </View>

                    {/* Swap Button */}
                    <TouchableOpacity onPress={swap} style={styles.swapBtn}>
                        <ArrowUp size={16} color={theme.colors.textSecondary} />
                        <ArrowDown size={16} color={theme.colors.textSecondary} style={{ marginTop: -4 }} />
                    </TouchableOpacity>
                </View>

                {/* Close Button (if needed, usually handled by sheet) */}
            </View>

            {/* Body */}
            {isSearching ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ marginTop: 10, color: theme.colors.textSecondary }}>Szukam najlepszych połączeń...</Text>
                </View>
            ) : (
                <>
                    {/* Suggestions Overlay */}
                    {(activeInput && suggestions.length > 0) ? (
                        <FlatList
                            data={suggestions}
                            keyExtractor={i => i.id + Math.random()}
                            renderItem={renderSuggestion}
                            keyboardShouldPersistTaps="handled"
                            style={{ flex: 1 }}
                        />
                    ) : (
                        // Results List
                        <FlatList
                            data={results}
                            keyExtractor={i => i.id}
                            renderItem={renderResult}
                            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    {!activeInput && toStop ? (
                                        <Text style={{ color: theme.colors.textSecondary }}>Brak połączeń bezpośrednich w najbliższym czasie.</Text>
                                    ) : (
                                        <Text style={{ color: theme.colors.textSecondary }}>Wpisz miejsce startu i celu.</Text>
                                    )}
                                </View>
                            }
                        />
                    )}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 16, paddingTop: 10, borderBottomWidth: 1, elevation: 2 },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    inputStack: { flex: 1, marginRight: 10 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', height: 44 },
    input: { flex: 1, fontSize: 16, paddingHorizontal: 10 },
    dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
    swapBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },

    suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
    iconBox: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    suggName: { fontSize: 16, fontWeight: '500' },
    suggDesc: { fontSize: 12 },

    resultCard: { padding: 16, marginBottom: 12, borderRadius: 12, elevation: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    agencyBadge: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#e0e7ff', borderRadius: 4 },
    agencyText: { color: '#3730a3', fontWeight: 'bold' },
    timeRange: { fontSize: 18, fontWeight: '700' },
    durationText: { fontSize: 13 },
    miniTimeline: { flexDirection: 'row', flexWrap: 'wrap' },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', marginTop: 50 }
});
