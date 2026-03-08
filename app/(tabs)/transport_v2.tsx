import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform, Keyboard, ScrollView, Animated, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

import { performAdvancedSearch, TransportSearchResult, addToHistory, getHistoryResults, enrichWithDepartures } from '../../utils/searchEngine';
import { GeoJSONFeature } from '../../components/transport/types';
import { getDeparturesService } from '../../utils/departuresService';
import { TransportRoutingEngine, RouteOption, RouteLeg } from '../../services/TransportRoutingEngine';
import { TransportStop } from '../../services/transportService';
import { LegDetail } from '../../components/transport/LegDetail';
import { JourneyDetailsModal } from '../../components/transport/JourneyDetailsModal';
import { TransportFilterModal, SearchFilters } from '../../components/transport/TransportFilterModal';
import { TimetableModal } from '../../components/transport/TimetableModal';
import { KeyboardAvoidingView } from 'react-native';
import { useFavoritesStore } from '../../store/favoritesStore';

const API_STOPS = 'https://kaszuby24.pl/wp-json/kaszuby24/v2/stops?agency=all';
const tfs = (size: number) => (Platform.OS === 'android' ? Math.max(9, size - 3) : size);

type SearchFieldType = 'from' | 'to' | null;

export default function TransportSearchScreen() {
    const [fromQuery, setFromQuery] = useState('');
    const [toQuery, setToQuery] = useState('');
    const [fromStation, setFromStation] = useState<TransportSearchResult | null>(null);
    const [toStation, setToStation] = useState<TransportSearchResult | null>(null);
    const [activeField, setActiveField] = useState<SearchFieldType>(null);
    const [results, setResults] = useState<TransportSearchResult[]>([]);
    const [allStops, setAllStops] = useState<TransportSearchResult[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [isInitLoading, setIsInitLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);

    const departuresService = useMemo(() => getDeparturesService(), []);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const activeFieldRef = useRef<SearchFieldType>(null);
    const allStopsRef = useRef<TransportSearchResult[]>([]);
    const userLocationRef = useRef<{ lat: number, lon: number } | null>(null);

    const [journeys, setJourneys] = useState<RouteOption[]>([]);
    const [isSearchingRoute, setIsSearchingRoute] = useState(false);
    const [expandedJourneyId, setExpandedJourneyId] = useState<string | null>(null);
    const [selectedJourney, setSelectedJourney] = useState<RouteOption | null>(null);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [timetableModalVisible, setTimetableModalVisible] = useState(false);
    const [visibleJourneysCount, setVisibleJourneysCount] = useState(3);
    const [nextDayOffset, setNextDayOffset] = useState(0); // Track how many days ahead to search
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const { favoriteRoutes, addRoute, removeRoute, isFavorite, incrementUsage } = useFavoritesStore();
    const sortedFavoriteRoutes = useMemo(() =>
        [...favoriteRoutes].sort((a, b) => {
            const usageDiff = (b.usageCount || 0) - (a.usageCount || 0);
            return usageDiff !== 0 ? usageDiff : b.lastUsed - a.lastUsed;
        }),
    [favoriteRoutes]);

    // Initial Filters
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        sortMode: 'optimal',
        noTransfers: false,
        transportModes: {
            tram: true,
            bus: true,
            trolley: true,
            rail: true
        }
    });

    // Synchronizuj ref z activeField (potrzebne w debounced handleSearch)
    useEffect(() => { activeFieldRef.current = activeField; }, [activeField]);
    useEffect(() => { allStopsRef.current = allStops; }, [allStops]);
    useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);

    useEffect(() => {
        loadInitialData();
        requestLocation();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const requestLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const userLoc = { lat: loc.coords.latitude, lon: loc.coords.longitude };
            setUserLocation(userLoc);

            if (!fromQuery && !fromStation) {
                handleSearch('');
            }
        } catch (e) {
        }
    };

    const loadInitialData = async () => {
        try {
            const cachedStops = await AsyncStorage.getItem('k24_stops_cache');
            if (cachedStops) {
                const parsed = JSON.parse(cachedStops);
                setAllStops(parsed);
                setIsInitLoading(false);
            }

            const res = await fetch(API_STOPS);

            if (!res.ok) {
                setIsInitLoading(false);
                return;
            }

            const text = await res.text();
            let data;
            try {
                // Strip PHP warnings/HTML before JSON
                let cleanText = text.trim();
                if (cleanText.startsWith('<')) {
                    // Find first { or [ (JSON start)
                    const jsonStart = Math.min(
                        cleanText.indexOf('{') !== -1 ? cleanText.indexOf('{') : Infinity,
                        cleanText.indexOf('[') !== -1 ? cleanText.indexOf('[') : Infinity
                    );
                    if (jsonStart !== Infinity) {
                        cleanText = cleanText.substring(jsonStart);
                    }
                }
                data = JSON.parse(cleanText);
            } catch (parseError) {
                setIsInitLoading(false);
                return;
            }

            let rawFeatures: any[] = [];
            if (data.features && Array.isArray(data.features)) {
                rawFeatures = data.features;
            } else if (Array.isArray(data)) {
                rawFeatures = data;
            }

            // FLATTEN DATA IMMEDIATELY TO SAVE RAM
            const normalizedStops: TransportSearchResult[] = rawFeatures.map((s: any) => {
                const isGeoJSON = s.type === 'Feature';
                const props = isGeoJSON ? s.properties : s;
                const geom = isGeoJSON ? s.geometry : null;

                const agency = props.agency || 'unknown';
                const agencies = props.agencies || [agency];

                return {
                    id: String(props.id || props.uid || ''),
                    name: props.name || '?',
                    type: 'stop' as const,
                    lat: isGeoJSON ? geom.coordinates[1] : Number(props.lat || 0),
                    lon: isGeoJSON ? geom.coordinates[0] : Number(props.lon || 0),
                    source: 'local' as const,
                    agency: agency,
                    agencies: agencies,
                    agencyStops: props.agencyStops,
                    isMerged: props.isMerged || false,
                    description: agency ? `${agency.toUpperCase()}` : 'Przystanek',
                    connections: 0
                };
            });

            setAllStops(normalizedStops);
            setIsInitLoading(false);

            // Clean up large temporary objects
            data = null;
            rawFeatures = [];
            AsyncStorage.setItem('k24_stops_cache', JSON.stringify(normalizedStops));
        } catch (e) {
            setIsInitLoading(false);
        }
    };

    const handleSearch = useCallback(
        debounce(async (text: string) => {
            const stops = allStopsRef.current;
            const location = userLocationRef.current;
            setIsLoading(true);

            if (!text.trim()) {
                const history = await getHistoryResults('');
                const myLocationEntry: TransportSearchResult | null = (location && activeFieldRef.current === 'from') ? {
                    id: 'user_location',
                    name: 'Moja lokalizacja',
                    type: 'place',
                    source: 'local',
                    lat: location.lat,
                    lon: location.lon,
                    description: 'Aktualna pozycja GPS',
                    distance: 0,
                } : null;
                const filteredHistory = history.filter(h => h.id !== 'user_location');
                setResults(myLocationEntry ? [myLocationEntry, ...filteredHistory] : filteredHistory);
                setIsLoading(false);
                return;
            }

            const searchGenerator = performAdvancedSearch(
                text,
                stops,
                {
                    userLocation: location || undefined,
                    currentTime: new Date().toTimeString().slice(0, 5)
                },
                {
                    sortBy: 'relevance'
                }
            );

            for await (const currentResults of searchGenerator) {
                setResults([...currentResults]);

                if (currentResults.length > 0) {
                    const resultsToEnrich = currentResults.slice(0, 5);
                    setTimeout(async () => {
                        try {
                            const enriched = await enrichWithDepartures(resultsToEnrich, departuresService);
                            setResults(prev => {
                                const newResults = [...prev];
                                enriched.forEach(en => {
                                    const idx = newResults.findIndex(r => r.id === en.id);
                                    if (idx !== -1) newResults[idx] = en;
                                });
                                return newResults;
                            });
                        } catch (err) {
                        }
                    }, 0);
                }
            }
            setIsLoading(false);
        }, 500),
        [departuresService]
    );

    const onFromFocus = () => {
        setActiveField('from');
        setJourneys([]);
        handleSearch(fromQuery);
    };

    const onToFocus = () => {
        setActiveField('to');
        setJourneys([]);
        handleSearch(toQuery);
    };

    // ROUTING LOGIC WITH FILTERS
    const fetchRoute = async (from: TransportSearchResult, to: TransportSearchResult, currentFiltersState: SearchFilters) => {
        setIsSearchingRoute(true);
        setJourneys([]);
        setVisibleJourneysCount(3);
        setNextDayOffset(0); // Reset day offset when starting new search

        try {
            const fromCoords = { lat: from.lat || 0, lon: from.lon || 0 };

            // Map filters to params
            const activeModes: string[] = [];
            if (currentFiltersState.transportModes.tram) activeModes.push('TRAM');
            if (currentFiltersState.transportModes.bus) activeModes.push('BUS');
            if (currentFiltersState.transportModes.rail) activeModes.push('RAIL');
            if (currentFiltersState.transportModes.trolley) activeModes.push('TROLLEYBUS');

            const routeOptions = await TransportRoutingEngine.findRoute(
                from.id === 'user_location' ? fromCoords : { lat: from.lat || 0, lon: from.lon || 0 },
                { lat: to.lat || 0, lon: to.lon || 0, name: to.name, id: to.id },
                {
                    transportModes: activeModes.length > 0 ? activeModes : undefined,
                    maxTransfers: currentFiltersState.noTransfers ? 0 : undefined
                }
            );

            setJourneys(routeOptions);
        } catch (e) {
        } finally {
            setIsSearchingRoute(false);
        }
    };

    // Load more routes - kontynuuje bieżący dzień, potem przechodzi na następny
    const loadMoreDays = useCallback(async () => {
        if (!fromStation || !toStation || isLoadingMore) return;

        setIsLoadingMore(true);

        try {
            const fromCoords = { lat: fromStation.lat || 0, lon: fromStation.lon || 0 };
            const activeModes: string[] = [];
            if (searchFilters.transportModes.tram) activeModes.push('TRAM');
            if (searchFilters.transportModes.bus) activeModes.push('BUS');
            if (searchFilters.transportModes.rail) activeModes.push('RAIL');
            if (searchFilters.transportModes.trolley) activeModes.push('TROLLEYBUS');

            const { OTPService } = await import('../../services/otpService');
            const fromPlace = `${fromCoords.lat},${fromCoords.lon}`;
            const toPlace = `${toStation.lat},${toStation.lon}`;

            // Wyznacz czas i datę kolejnego zapytania na podstawie ostatniego odjazdu
            const lastJourney = journeys.length > 0 ? journeys[journeys.length - 1] : null;
            let searchDate: Date;
            let searchTime: string;
            let advancedToNextDay = false;

            if (lastJourney?.startTimeTimestamp) {
                const lastDep = new Date(lastJourney.startTimeTimestamp);
                const h = lastDep.getHours();
                const m = lastDep.getMinutes();
                if (h < 22) {
                    // Kontynuuj ten sam dzień od czasu ostatniego odjazdu + 1 min
                    searchDate = new Date(lastDep);
                    const nextM = m + 1;
                    searchDate.setHours(h + (nextM >= 60 ? 1 : 0), nextM % 60, 0, 0);
                    searchTime = `${String(searchDate.getHours()).padStart(2, '0')}:${String(searchDate.getMinutes()).padStart(2, '0')}`;
                } else {
                    // Koniec dnia - przejdź na następny
                    searchDate = new Date(lastDep);
                    searchDate.setDate(searchDate.getDate() + 1);
                    searchTime = '04:00';
                    advancedToNextDay = true;
                }
            } else {
                // Fallback: następny dzień od 04:00
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + nextDayOffset + 1);
                searchDate = tomorrow;
                searchTime = '04:00';
                advancedToNextDay = true;
            }

            const dateStr = searchDate.toISOString().split('T')[0];

            const newRoutes = await OTPService.planTrip({
                fromPlace,
                toPlace,
                date: dateStr,
                time: searchTime,
                transportModes: activeModes.length > 0 ? activeModes : undefined,
                maxTransfers: searchFilters.noTransfers ? 0 : undefined
            });

            // Deduplikacja po startTimeTimestamp (IDs są generowane przez Date.now())
            const existingTs = new Set(journeys.map(j => j.startTimeTimestamp).filter(Boolean));
            const uniqueRoutes = newRoutes.filter(r => !r.startTimeTimestamp || !existingTs.has(r.startTimeTimestamp));

            setJourneys(prev => [...prev, ...uniqueRoutes]);
            if (advancedToNextDay) setNextDayOffset(prev => prev + 1);
            setVisibleJourneysCount(prev => prev + uniqueRoutes.length);
        } catch (e) {
        } finally {
            setIsLoadingMore(false);
        }
    }, [fromStation, toStation, isLoadingMore, journeys, searchFilters, nextDayOffset]);

    // Infinite scroll - załaduj więcej gdy dotarło na koniec
    const handleJourneyListEndReached = useCallback(() => {
        if (isLoadingMore) return;
        if (journeys.length > visibleJourneysCount) {
            setVisibleJourneysCount(prev => prev + 5);
        } else {
            loadMoreDays();
        }
    }, [isLoadingMore, journeys.length, visibleJourneysCount, loadMoreDays]);

    // Trigger route search when both stations selected OR filters applied
    useEffect(() => {
        if (fromStation && toStation) {
            fetchRoute(fromStation, toStation, searchFilters);
        }
    }, [fromStation, toStation, searchFilters]);

    const onItemPress = async (item: TransportSearchResult) => {
        await addToHistory(item);
        if (activeField === 'from') {
            setFromStation(item);
            setFromQuery(item.name);
            setActiveField('to');
        } else if (activeField === 'to') {
            setToStation(item);
            setToQuery(item.name);
            setActiveField(null);
            Keyboard.dismiss();
        }
        setResults([]);
    };

    const onSwapStations = () => {
        const tempS = fromStation;
        const tempQ = fromQuery;
        setFromStation(toStation);
        setFromQuery(toQuery);
        setToStation(tempS);
        setToQuery(tempQ);
        setJourneys([]);
    };

    const onClearFrom = () => {
        setFromStation(null);
        setFromQuery('');
        setJourneys([]);
        if (activeField === 'from') handleSearch('');
    };

    const onClearTo = () => {
        setToStation(null);
        setToQuery('');
        setJourneys([]);
        if (activeField === 'to') handleSearch('');
    };

    const onSearchRoute = async () => {
        if (!fromStation || !toStation) return;

        setIsSearchingRoute(true);
        setActiveField(null);
        Keyboard.dismiss();

        try {
            // Map TransportSearchResult to TransportStop format
            const mapToStop = (s: TransportSearchResult): TransportStop => ({
                id: s.id,
                name: s.name,
                lat: s.lat || 0,
                lon: s.lon || 0,
                agency: s.agency || (s.agencies && s.agencies[0]) || 'unknown',
            });

            const fromStop = mapToStop(fromStation);
            const toStop = mapToStop(toStation);

            const routes = await TransportRoutingEngine.findRoute(fromStop, toStop);

            setJourneys(routes);
            setResults([]); // Clear search results list

            // Auto-expand first journey
            if (routes.length > 0) {
                setExpandedJourneyId(routes[0].id);
            }
        } catch (err) {
        } finally {
            setIsSearchingRoute(false);
        }
    };

    const handleFavoriteToggle = () => {
        if (!fromStation || !toStation) return;

        const fromLat = fromStation.lat ?? 0;
        const fromLon = fromStation.lon ?? 0;
        const toLat = toStation.lat ?? 0;
        const toLon = toStation.lon ?? 0;

        if (isFavorite(fromLat, fromLon, toLat, toLon)) {
            // Generujemy to samo id co w store
            const id = `${fromLat.toFixed(4)},${fromLon.toFixed(4)}-${toLat.toFixed(4)},${toLon.toFixed(4)}`;
            removeRoute(id);
        } else {
            addRoute({
                fromName: fromStation.name,
                fromLat,
                fromLon,
                toName: toStation.name,
                toLat,
                toLon,
            });
        }
    };

    const applyFavoriteRoute = (route: any) => {
        const fromMock: TransportSearchResult = {
            id: 'fav_from',
            name: route.fromName,
            lat: route.fromLat,
            lon: route.fromLon,
            type: 'stop',
            source: 'history'
        };
        const toMock: TransportSearchResult = {
            id: 'fav_to',
            name: route.toName,
            lat: route.toLat,
            lon: route.toLon,
            type: 'stop',
            source: 'history'
        };

        setFromStation(fromMock);
        setFromQuery(route.fromName);
        setToStation(toMock);
        setToQuery(route.toName);
        setActiveField(null);
        Keyboard.dismiss();
        // Zliczaj użycia - dzięki temu najczęstsze trasy pojawiają się pierwsze
        incrementUsage(route.id);
    };

    const renderItem = ({ item }: { item: TransportSearchResult }) => {
        // Specjalny kafelek "Moja lokalizacja"
        if (item.id === 'user_location') {
            return (
                <TouchableOpacity style={styles.resultItem} onPress={() => onItemPress(item)} activeOpacity={0.7}>
                    <View style={styles.resultLeft}>
                        <View style={[styles.miniBadge, { backgroundColor: '#EBF4FF', width: 36, height: 36, borderRadius: 10 }]}>
                            <Ionicons name="locate" size={20} color="#3182CE" />
                        </View>
                        <View style={styles.resultTextContainer}>
                            <Text style={[styles.itemTitle, { color: '#3182CE' }]}>Moja lokalizacja</Text>
                            <Text style={styles.itemSubtitle}>Aktualna pozycja GPS</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
                    </View>
                </TouchableOpacity>
            );
        }

        const isHistory = item.source === 'history';
        const agencies = item.agencies || (item.agency ? [item.agency] : []);
        const agencyText = agencies.slice(0, 2).map(a => a.toUpperCase()).join(' • ');
        const distanceText = item.distance !== undefined && item.distance < 5000
            ? (item.distance < 1000 ? `${Math.round(item.distance)} m` : `${(item.distance / 1000).toFixed(1)} km`)
            : '';

        // Agency detection
        const isMzk = agencies.some(a => a.toLowerCase().includes('mzk'));
        const isSkm = agencies.some(a => a.toLowerCase().includes('skm'));
        const isPolregio = agencies.some(a => a.toLowerCase().includes('polregio') || a.toLowerCase() === 'reg' || a.toLowerCase() === 'regio');
        const isPks = agencies.some(a => a.toLowerCase().includes('pks') || a.toLowerCase().includes('pksgdynia'));
        const isZkm = agencies.some(a => a.toLowerCase().includes('zkm'));
        const isZtm = agencies.some(a => a.toLowerCase().includes('ztm'));
        const isIC = agencies.some(a => a.toLowerCase().includes('intercity') || a.toLowerCase().includes('pkp ic') || a.toLowerCase() === 'ic');
        const isRegioJet = agencies.some(a => a.toLowerCase().includes('regiojet'));

        const renderIcon = () => {
            if (isSkm) return (
                <View style={[styles.miniBadge, { backgroundColor: '#FFD54F', width: 36, height: 36, borderRadius: 10 }]}>
                    <MaterialCommunityIcons name="train" size={20} color="#000" />
                </View>
            );
            if (isPolregio) return (
                <View style={[styles.miniBadge, { backgroundColor: '#1A6ADD', width: 36, height: 36, borderRadius: 10 }]}>
                    <MaterialCommunityIcons name="train" size={20} color="#FFF" />
                </View>
            );
            if (isIC || isRegioJet) return (
                <View style={[styles.miniBadge, { backgroundColor: '#1A237E', width: 36, height: 36, borderRadius: 10 }]}>
                    <MaterialCommunityIcons name="train-variant" size={20} color="#FFF" />
                </View>
            );
            if (isPks) return (
                <View style={[styles.miniBadge, { backgroundColor: '#388E3C', width: 36, height: 36, borderRadius: 10 }]}>
                    <MaterialCommunityIcons name="bus" size={20} color="white" />
                </View>
            );
            if (isMzk) return (
                <View style={[styles.miniBadge, { backgroundColor: '#1A237E', width: 36, height: 36, borderRadius: 10 }]}>
                    <MaterialCommunityIcons name="bus-clock" size={20} color="white" />
                </View>
            );
            if (isZkm) return (
                <View style={[styles.miniBadge, { backgroundColor: '#E53935', width: 36, height: 36, borderRadius: 10 }]}>
                    <MaterialCommunityIcons name="bus" size={20} color="white" />
                </View>
            );
            if (isZtm) return (
                <View style={[styles.miniBadge, { backgroundColor: '#F57C00', width: 36, height: 36, borderRadius: 10 }]}>
                    <MaterialCommunityIcons name="tram" size={20} color="white" />
                </View>
            );
            return (
                <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name={isHistory ? 'history' : 'train-variant'} size={24} color="#718096" />
                </View>
            );
        };

        const subtitleParts = [agencyText, distanceText].filter(Boolean).join(' • ');

        return (
            <TouchableOpacity style={styles.resultItem} onPress={() => onItemPress(item)} activeOpacity={0.7}>
                <View style={styles.resultLeft}>
                    {renderIcon()}
                    <View style={styles.resultTextContainer}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
                        {subtitleParts ? (
                            <Text style={styles.itemSubtitle} numberOfLines={1}>{subtitleParts}</Text>
                        ) : null}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderJourney = ({ item }: { item: RouteOption }) => {
        const isExpanded = expandedJourneyId === item.id;

        // Calculate time until departure
        const diffMs = item.startTimeTimestamp ? item.startTimeTimestamp - Date.now() : 0;
        const totalMinutesUntil = Math.max(0, Math.round(diffMs / 60000));
        const showCountdown = totalMinutesUntil > 0 && totalMinutesUntil <= 60;

        return (
            <TouchableOpacity
                style={styles.journeyCard}
                onPress={() => setExpandedJourneyId(isExpanded ? null : item.id)}
                activeOpacity={0.9}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* LEFT COLUMN: Time / Label */}
                    <View style={{ minWidth: 90, justifyContent: 'center' }}>
                        <Text style={{ fontSize: tfs(13), fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }), color: '#718096', marginBottom: -2 }}>
                            {showCountdown ? 'Odjazd za:' : 'Odjazd o:'}
                        </Text>
                        {showCountdown ? (
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                                <Text style={{ fontSize: tfs(42), fontFamily: Platform.select({ android: 'Poppins_Bold', default: 'Poppins-Bold' }), color: '#1A202C', lineHeight: 50, includeFontPadding: false }}>
                                    {totalMinutesUntil}
                                </Text>
                                <Text style={{ fontSize: tfs(18), fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }), color: '#4A5568', marginLeft: 6, marginBottom: 4 }}>min</Text>
                            </View>
                        ) : (
                            <Text style={{ fontSize: tfs(32), fontFamily: Platform.select({ android: 'Poppins_Bold', default: 'Poppins-Bold' }), color: '#1A202C', lineHeight: 42, marginTop: 4 }}>
                                {item.startTime}
                            </Text>
                        )}
                    </View>

                    {/* RIGHT COLUMN: Badges, Timeline */}
                    <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 16, justifyContent: 'center' }}>
                        {/* Row 1: Operator Badges (Deduped by Brand/Line) */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', marginBottom: 12 }}>
                            {(() => {
                                // Filter walk, then map to badge data
                                const legs = item.legs.filter(l => l.mode !== 'WALK');
                                // Generate unique keys for badges to avoid duplicates (e.g. SKM + SKM)
                                // Preference: Brand -> Line
                                const badges = legs.map(leg => {
                                    let text = leg.line || leg.brand || '?';
                                    let style: any = {};
                                    let label = leg.brand;

                                    if (leg.brand === 'SKM') {
                                        text = 'SKM'; // Just show SKM for logos, or line if needed. User liked "SKM".
                                        style = { backgroundColor: '#FFD700', color: '#1A1A1A' }; // Yellow/Gold background for SKM
                                    } else if (leg.brand === 'POLREGIO') {
                                        text = 'REGIO';
                                        style = styles.badgePol;
                                    } else if (leg.brand === 'MZK' || leg.brand === 'MZK Wejherowo') {
                                        text = leg.line ? `MZK ${leg.line}` : 'MZK'; // Show "MZK 9" if line number exists
                                        style = { backgroundColor: '#1A237E', color: '#FFFFFF' }; // White text for MZK
                                    } else if (leg.brand === 'PKS' || leg.brand === 'PKS Gdynia' || leg.brand?.includes('PKS')) {
                                        text = leg.line ? `${leg.line}` : 'PKS';
                                        style = { backgroundColor: '#388E3C', color: '#FFFFFF' }; // Zielony PKS Gdynia
                                    } else if (leg.brand === 'ZKM') {
                                        text = leg.line ? `ZKM ${leg.line}` : 'ZKM';
                                        style = { backgroundColor: '#E53935', color: '#FFFFFF' }; // Czerwony ZKM Gdynia
                                    } else if (leg.brand === 'ZTM') {
                                        text = leg.line ? `ZTM ${leg.line}` : 'ZTM';
                                        style = { backgroundColor: '#F57C00', color: '#FFFFFF' }; // Pomarańczowy ZTM Gdańsk
                                    } else if (leg.brand === 'IC' || leg.brand === 'RegioJet') {
                                        text = leg.line ? `${leg.brand} ${leg.line}` : (leg.brand || 'IC');
                                        style = { backgroundColor: '#1A237E', color: '#FFFFFF' }; // Granatowy IC/RegioJet
                                    } else if (leg.brand === 'PKP') {
                                        text = leg.line ? `PKP ${leg.line}` : 'PKP';
                                        style = { backgroundColor: '#37474F', color: '#FFFFFF' }; // Ciemnoszary PKP
                                    }

                                    return { text, style, label };
                                });

                                // Dedup by text
                                const uniqueBadges = Object.values(badges.reduce((acc, curr) => {
                                    if (!acc[curr.text]) acc[curr.text] = curr;
                                    return acc;
                                }, {} as Record<string, typeof badges[0]>));

                                return uniqueBadges.map((badge, idx) => (
                                    <View key={idx} style={[
                                        styles.miniBadge,
                                        badge.style,
                                        {
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            borderRadius: 8,
                                            minHeight: 24,
                                            minWidth: 46,
                                            justifyContent: 'center',
                                            flexDirection: 'row',
                                            width: 'auto',
                                            height: 'auto'
                                        }
                                    ]}>
                                        {(badge.label === 'SKM' || badge.label === 'POLREGIO') && (
                                            <MaterialCommunityIcons
                                                name="train"
                                                size={13}
                                                color={badge.label === 'POLREGIO' ? '#FFFFFF' : '#1A1A1A'}
                                                style={{ marginRight: 4, alignSelf: 'center' }}
                                            />
                                        )}
                                        {(badge.label === 'PKS' || badge.label === 'PKS Gdynia' || badge.label?.includes('PKS')) && (
                                            <MaterialCommunityIcons
                                                name="bus"
                                                size={13}
                                                color="#FFFFFF"
                                                style={{ marginRight: 4, alignSelf: 'center' }}
                                            />
                                        )}
                                        {(badge.label === 'MZK' || badge.label === 'MZK Wejherowo') && (
                                            <MaterialCommunityIcons
                                                name="bus"
                                                size={13}
                                                color="#FFFFFF"
                                                style={{ marginRight: 4, alignSelf: 'center' }}
                                            />
                                        )}
                                        <Text style={[
                                            styles.miniBadgeText,
                                            (badge.text === 'REGIO' || badge.text === 'MZK') ? { color: '#FFFFFF' } : null,
                                            { fontSize: tfs(11), alignSelf: 'center', fontFamily: Platform.select({ android: 'Poppins_Bold', default: 'Poppins-Bold' }) },
                                            badge.style.color ? { color: badge.style.color } : null
                                        ]}>
                                            {badge.text}
                                        </Text>
                                    </View>
                                ));
                            })()}
                        </View>

                        {/* Row 2: Timeline Pills (Right Aligned) */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: tfs(11), color: '#A0AEC0', fontFamily: Platform.select({ android: 'Poppins_Regular', default: 'Poppins-Regular' }), marginBottom: 2 }}>{item.totalDuration} min</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <View style={[styles.timeBadge, { backgroundColor: '#48BB78', height: 20, paddingHorizontal: 8, borderRadius: 10 }]}>
                                        <Text style={[styles.timeBadgeText, { color: 'white', fontSize: tfs(11) }]}>{item.startTime}</Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={12} color="#CBD5E0" />
                                    <View style={[styles.timeBadge, { backgroundColor: '#4299E1', height: 20, paddingHorizontal: 8, borderRadius: 10 }]}>
                                        <Text style={[styles.timeBadgeText, { color: 'white', fontSize: tfs(11) }]}>{item.endTime}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* EXPANDED DETAILS */}
                {isExpanded && (
                    <View style={styles.journeyDetails}>
                        <View style={{ height: 1, backgroundColor: '#EDF2F7', marginVertical: 12, opacity: 0.6 }} />
                        {item.legs
                            .filter((leg, legIdx) => {
                                // Filter out last WALK leg if it's just walking around destination station
                                if (legIdx === item.legs.length - 1 && leg.mode === 'WALK') {
                                    // If last leg is WALK with very short distance (<100m), it's likely just "arriving at destination"
                                    const walkDistance = leg.distance || 0;
                                    if (walkDistance < 100) return false; // Skip this leg
                                }
                                return true;
                            })
                            .map((leg, legIdx, filteredLegs) => (
                                <LegDetail key={legIdx} leg={leg} isLast={legIdx === filteredLegs.length - 1} />
                            ))
                        }
                        <TouchableOpacity
                            style={[styles.detailsButton, { backgroundColor: '#FFB300', marginTop: 12 }]}
                            onPress={() => {
                                setSelectedJourney(item);
                                setDetailsModalVisible(true);
                            }}
                        >
                            <Text style={[styles.detailsButtonText, { color: '#1A1A1A', fontFamily: Platform.select({ android: 'Poppins_Bold', default: 'Poppins-Bold' }) }]}>SZCZEGÓŁY TRASY</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };



    return (
        <View style={styles.container}>
            <LinearGradient colors={['#E5E7EB', '#F3F4F6']} style={styles.headerGradient}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerSubtitle}>Dokąd dzisiaj</Text>
                            <Text style={styles.headerTitle}>Jedziemy ?</Text>
                        </View>
                        <TouchableOpacity style={styles.settingsBtn} onPress={() => setTimetableModalVisible(true)}>
                            <MaterialCommunityIcons name="table-clock" size={22} color="#1A1A1A" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                <Animated.View style={[styles.searchSection, { opacity: fadeAnim }]}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {/* Left Column: Swap/Dots */}
                        <View style={{ width: 32, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {/* Dot From */}
                            <View style={{ alignItems: 'center', flex: 1, justifyContent: 'flex-end', paddingBottom: 4 }}>
                                <View style={[styles.dot, styles.dotFrom, { marginRight: 0 }]} />
                                <View style={{ width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 4 }} />
                            </View>

                            {/* Swap Button */}
                            <TouchableOpacity
                                style={styles.swapButtonSide}
                                onPress={onSwapStations}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="swap-vertical" size={20} color="#4B5563" />
                            </TouchableOpacity>

                            {/* Dot To */}
                            <View style={{ alignItems: 'center', flex: 1, justifyContent: 'flex-start', paddingTop: 4 }}>
                                <View style={{ width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 4 }} />
                                <View style={[styles.dot, styles.dotTo, { marginRight: 0 }]} />
                            </View>
                        </View>

                        {/* Right Column: Inputs */}
                        <View style={{ flex: 1, gap: 10 }}>
                            <View style={[styles.searchBar, activeField === 'from' && styles.searchBarActive, { marginBottom: 0 }]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Skąd wyruszasz?"
                                    placeholderTextColor="#909090"
                                    value={fromQuery}
                                    onChangeText={(t) => { setFromQuery(t); setFromStation(null); handleSearch(t); }}
                                    onFocus={onFromFocus}
                                    autoCorrect={false}
                                    returnKeyType="search"
                                />
                                {fromQuery.length > 0 && (
                                    <TouchableOpacity onPress={onClearFrom} style={styles.clearBtn}>
                                        <Ionicons name="close-circle" size={18} color="#909090" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={[styles.searchBar, activeField === 'to' && styles.searchBarActive, { marginBottom: 0 }]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Dokąd chcesz dotrzeć?"
                                    placeholderTextColor="#909090"
                                    value={toQuery}
                                    onChangeText={(t) => { setToQuery(t); setToStation(null); handleSearch(t); }}
                                    onFocus={onToFocus}
                                    autoCorrect={false}
                                    returnKeyType="search"
                                />
                                {toQuery.length > 0 && (
                                    <TouchableOpacity onPress={onClearTo} style={styles.clearBtn}>
                                        <Ionicons name="close-circle" size={18} color="#909090" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 }}>
                        <TouchableOpacity
                            style={[styles.searchMainBtn, { flex: 1, marginTop: 0 }]}
                            onPress={onSearchRoute}
                            activeOpacity={0.8}
                            disabled={!(fromStation && toStation)}
                        >
                            <LinearGradient colors={!(fromStation && toStation) ? ['#E2E8F0', '#CBD5E0'] : ['#FFB300', '#F59E0B']} style={styles.searchGradient}>
                                <Ionicons name="search" size={20} color={!(fromStation && toStation) ? '#A0AEC0' : '#FFFFFF'} />
                                <Text style={[styles.searchMainText, !(fromStation && toStation) ? { color: '#A0AEC0' } : { color: '#FFFFFF' }]}>Znajdź połącz.</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Przycisk ulubionych */}
                        <TouchableOpacity
                            style={[styles.favoriteBtn, !(fromStation && toStation) && { opacity: 0.5 }]}
                            disabled={!(fromStation && toStation)}
                            onPress={handleFavoriteToggle}
                        >
                            {fromStation && toStation && isFavorite(
                                fromStation.lat ?? 0,
                                fromStation.lon ?? 0,
                                toStation.lat ?? 0,
                                toStation.lon ?? 0
                            ) ? (
                                <Ionicons name="heart" size={24} color="#E53E3E" />
                            ) : (
                                <Ionicons name="heart-outline" size={24} color="#718096" />
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </LinearGradient>

            {/* Pigułki z ulubionymi trasami (widoczne gdy nie ma wyników wyszukiwania) */}
            {activeField === null && journeys.length === 0 && sortedFavoriteRoutes.length > 0 && (
                <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' }}>
                    <Text style={{ fontSize: tfs(13), fontFamily: Platform.select({ android: 'Poppins_SemiBold', default: 'Poppins-SemiBold' }), color: '#A0AEC0', paddingHorizontal: 20, marginBottom: 8, letterSpacing: 0.5 }}>Zapisane trasy</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                        {sortedFavoriteRoutes.map((fav) => (
                            <TouchableOpacity
                                key={fav.id}
                                style={styles.favoritePill}
                                onPress={() => applyFavoriteRoute(fav)}
                                activeOpacity={0.75}
                            >
                                <Ionicons name="star" size={11} color="#F59E0B" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.favoritePillText} numberOfLines={1}>
                                        {fav.fromName}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Ionicons name="arrow-forward" size={10} color="#B45309" />
                                        <Text style={[styles.favoritePillText, { fontSize: tfs(11), opacity: 0.8 }]} numberOfLines={1}>
                                            {fav.toName}
                                        </Text>
                                    </View>
                                </View>
                                {fav.usageCount > 0 && (
                                    <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2, marginLeft: 4 }}>
                                        <Text style={{ fontSize: tfs(10), fontFamily: Platform.select({ android: 'Poppins_SemiBold', default: 'Poppins-SemiBold' }), color: '#92400E' }}>{fav.usageCount}×</Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    onPress={(e) => { e.stopPropagation(); removeRoute(fav.id); }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={{ marginLeft: 6, padding: 2 }}
                                >
                                    <Ionicons name="close-circle" size={16} color="#CBD5E0" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.listContainer}
                keyboardVerticalOffset={0}
            >
                {isInitLoading || isSearchingRoute ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#FFB300" />
                        {isSearchingRoute && <Text style={styles.loadingText}>Szukam najlepszych połączeń...</Text>}
                    </View>
                ) : journeys.length > 0 ? (
                    <FlatList
                        data={journeys.slice(0, visibleJourneysCount)}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listPadding}
                        onEndReached={handleJourneyListEndReached}
                        onEndReachedThreshold={0.3}
                        ListFooterComponent={
                            isLoadingMore ? (
                                <View style={{ alignItems: 'center', padding: 20 }}>
                                    <ActivityIndicator size="small" color="#FFB300" />
                                    <Text style={{ fontSize: tfs(13), fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }), color: '#A0AEC0', marginTop: 8 }}>
                                        Ładuję kolejne połączenia...
                                    </Text>
                                </View>
                            ) : null
                        }
                        renderItem={({ item: journey, index: globalIdx }) => {
                            const firstJourneyInList = journeys[0];
                            const firstJourneyStartsWithWalk = firstJourneyInList?.legs[0]?.mode === 'WALK';
                            const firstJourneyWalkDistance = firstJourneyStartsWithWalk ? Math.round(firstJourneyInList?.legs[0]?.distance || 0) : 0;
                            const firstJourneyIsDirect = !firstJourneyStartsWithWalk || firstJourneyWalkDistance < 50;

                            // Day separator - check if this journey is on different day than previous
                            const prevJourney = globalIdx > 0 ? journeys[globalIdx - 1] : null;
                            const getJourneyDate = (j: RouteOption) => {
                                if (j.startTimeTimestamp) return new Date(j.startTimeTimestamp).toDateString();
                                const [h, m] = j.startTime.split(':').map(Number);
                                const d = new Date(); d.setHours(h, m, 0, 0); return d.toDateString();
                            };
                            const journeyDate = getJourneyDate(journey);
                            const prevDate = prevJourney ? getJourneyDate(prevJourney) : null;
                            const isNewDay = prevDate && journeyDate !== prevDate;
                            const today = new Date().toDateString();
                            const tomorrow = new Date(Date.now() + 86400000).toDateString();
                            const dayLabel = journeyDate === today ? 'Dziś'
                                : journeyDate === tomorrow ? 'Jutro'
                                : new Date(journeyDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });

                            return (
                                <View>
                                    {isNewDay && (
                                        <View style={styles.dateHeader}>
                                            <Text style={styles.dateHeaderText}>{dayLabel}</Text>
                                        </View>
                                    )}
                                    {globalIdx === 0 && firstJourneyIsDirect && (
                                        <>
                                            <View style={{ height: 1, backgroundColor: '#48BB78', marginHorizontal: 16, marginTop: 16, marginBottom: 12 }} />
                                            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                                                <Text style={{ fontSize: tfs(12), fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }), color: '#48BB78', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                                    Najbliższy odjazd
                                                </Text>
                                            </View>
                                        </>
                                    )}
                                    {globalIdx === 1 && firstJourneyIsDirect && (
                                        <>
                                            <View style={{ height: 1, backgroundColor: '#E2E8F0', marginHorizontal: 16, marginTop: 20, marginBottom: 12 }} />
                                            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                                                <Text style={{ fontSize: tfs(12), fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }), color: '#A0AEC0', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                                    Pozostałe połączenia
                                                </Text>
                                            </View>
                                        </>
                                    )}
                                    {renderJourney({ item: journey })}
                                </View>
                            );
                        }}
                    />
                ) : (isLoading && activeField !== null) ? (
                    <View style={styles.centered}><ActivityIndicator color="#FFB300" /><Text style={styles.loadingText}>Szukam przystanków...</Text></View>
                ) : (activeField !== null && results.length > 0) ? (
                    <FlashList
                        data={results}
                        renderItem={renderItem}
                        estimatedItemSize={64}
                        keyboardShouldPersistTaps="always"
                        keyboardDismissMode="none"
                        contentContainerStyle={styles.listPadding}
                    />
                ) : (activeField !== null && !isLoading && (fromQuery.length > 0 || (activeField === 'to' && toQuery.length > 0))) ? (
                    <View style={styles.centered}>
                        <MaterialCommunityIcons name="map-marker-off" size={60} color="#F0F4F8" />
                        <Text style={styles.emptyTitle}>Nie znaleziono przystanku</Text>
                        <Text style={styles.emptySubtitle}>Spróbuj wpisać inną nazwę lub sprawdź czy nie ma literówki.</Text>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.emptyContainer}
                        keyboardShouldPersistTaps="always"
                        keyboardDismissMode="none"
                    >
                        <MaterialCommunityIcons name="train-variant" size={100} color="#F0F4F8" />
                        <Text style={styles.emptyTitle}>Gotowy na podróż?</Text>
                        <Text style={styles.emptySubtitle}>Wpisz nazwę przystanku powyżej, aby zobaczyć pociągi w czasie rzeczywistym.</Text>
                    </ScrollView>
                )}
            </KeyboardAvoidingView>

            {/* MODALS */}
            <JourneyDetailsModal
                visible={detailsModalVisible}
                journey={selectedJourney}
                onClose={() => setDetailsModalVisible(false)}
            />

            <TransportFilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                currentFilters={searchFilters}
                onApply={(newFilters) => {
                    setSearchFilters(newFilters);
                    if (fromStation && toStation) {
                        fetchRoute(fromStation, toStation, newFilters);
                    }
                }}
            />

            <TimetableModal
                visible={timetableModalVisible}
                onClose={() => setTimetableModalVisible(false)}
                stops={allStops}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    headerGradient: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 25, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, zIndex: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingTop: 10, marginBottom: 15 },
    headerSubtitle: {
        fontSize: tfs(13),
        fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }),
        color: '#718096',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    headerTitle: {
        fontSize: tfs(32),
        fontFamily: Platform.select({ android: 'Poppins_Bold', default: 'Poppins-Bold' }),
        color: '#1A1A1A',
        marginTop: -5
    },
    settingsBtn: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    searchSection: { paddingHorizontal: 20, zIndex: 20 },

    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 16, paddingHorizontal: 15, paddingVertical: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#EDF2F7' },
    searchBarActive: { borderColor: '#FFB300', backgroundColor: '#FFFFFF', elevation: 4, shadowColor: '#FFB300', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    input: { flex: 1, fontSize: tfs(16), fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }), color: '#2D3748' },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    dotFrom: { backgroundColor: '#48BB78', borderWidth: 2, borderColor: '#C6F6D5' },
    dotTo: { backgroundColor: '#F56565', borderWidth: 2, borderColor: '#FED7D7' },
    clearBtn: { padding: 4 },

    swapButtonSide: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },

    listContainer: { flex: 1, backgroundColor: '#FFFFFF' },
    listPadding: { paddingTop: 15, paddingBottom: 120 },

    resultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
    resultLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    resultTextContainer: { flex: 1 },
    itemTitle: { fontSize: tfs(16), fontFamily: Platform.select({ android: 'Poppins_SemiBold', default: 'Poppins-SemiBold' }), color: '#1A202C' },
    itemSubtitle: { fontSize: tfs(12), fontFamily: Platform.select({ android: 'Poppins_Regular', default: 'Poppins-Regular' }), color: '#718096', marginTop: 2 },

    sectionTitle: { fontSize: tfs(13), fontFamily: Platform.select({ android: 'Poppins_SemiBold', default: 'Poppins-SemiBold' }), color: '#A0AEC0', marginTop: 15, marginBottom: 10, letterSpacing: 0.5 },
    recentChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginRight: 10 },
    recentText: { fontSize: tfs(13), fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }), color: '#4A5568', marginLeft: 6 },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    loadingText: { marginTop: 10, fontSize: tfs(14), fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }), color: '#A0AEC0' },
    emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 50, paddingBottom: 100 }, // Added bottom padding to push content up optically
    emptyTitle: {
        fontSize: tfs(24),
        fontFamily: Platform.select({ android: 'Poppins_Bold', default: 'Poppins-Bold' }),
        color: '#2D3748',
        marginTop: 25,
        textAlign: 'center'
    },
    emptySubtitle: { fontSize: tfs(15), fontFamily: Platform.select({ android: 'Poppins_Regular', default: 'Poppins-Regular' }), color: '#A0AEC0', textAlign: 'center', marginTop: 10, lineHeight: 22 },

    searchMainBtn: { borderRadius: 20, overflow: 'hidden', shadowColor: '#FFB300', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    searchMainBtnDisabled: { opacity: 0.6, elevation: 2 },
    searchGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
    searchMainText: { fontSize: tfs(16), fontFamily: Platform.select({ android: 'Poppins_Bold', default: 'Poppins-Bold' }), color: '#1A1A1A', marginLeft: 10 },
    searchMainTextDisabled: { color: '#A0AEC0' },

    favoriteBtn: { width: 52, height: 52, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EDF2F7', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    favoritePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderWidth: 1, borderColor: '#FEF3C7' },
    favoritePillText: { fontSize: tfs(13), fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }), color: '#92400E', maxWidth: 200 },

    journeyCard: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginVertical: 10, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#EDF2F7', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    journeyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F7FAFC', paddingBottom: 12 },
    journeyHeaderMain: { flexDirection: 'row', alignItems: 'center' },
    journeyTime: { fontSize: tfs(18), fontFamily: Platform.select({ android: 'Poppins_Bold', default: 'Poppins-Bold' }), color: '#1A1A1A', marginRight: 12 },
    journeyAgencies: { flexDirection: 'row', gap: 4 },
    miniBadge: { borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    miniBadgeText: { fontSize: tfs(10), fontFamily: Platform.select({ android: 'Poppins_Bold', default: 'Poppins-Bold' }), color: '#1A1A1A' },
    badgeSkm: { backgroundColor: '#FFD54F' },
    badgePol: { backgroundColor: '#1A6ADD' }, // Modern blue for Polregio
    badgePkp: { backgroundColor: '#D32F2F' },
    badgeZka: { backgroundColor: '#E53E3E' },
    badgeTextPol: { color: '#FFFFFF' },
    journeyDurationBox: { backgroundColor: '#F7FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    journeyDuration: { fontSize: tfs(13), fontFamily: Platform.select({ android: 'Poppins_SemiBold', default: 'Poppins-SemiBold' }), color: '#4A5568' },

    timeBadge: { backgroundColor: '#C6F6D5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
    timeBadgeText: { color: '#22543D', fontSize: tfs(11), fontFamily: Platform.select({ android: 'Poppins_Bold', default: 'Poppins-Bold' }) },

    journeySummary: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
    summaryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    summaryText: { fontSize: tfs(11), fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }), color: '#718096' },

    journeyDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EDF2F7' },
    journeyLeg: { flexDirection: 'row', minHeight: 40 },
    stopsCount: { fontSize: tfs(11), fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }), color: '#A0AEC0', marginTop: 2 },
    journeyFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 5, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F7FAFC' },
    transferText: { fontSize: tfs(12), fontFamily: Platform.select({ android: 'Poppins_Medium', default: 'Poppins-Medium' }), color: '#718096', marginLeft: 6 },

    detailsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0066CC', padding: 14, borderRadius: 14, marginTop: 20, gap: 10, elevation: 3, shadowColor: '#0066CC', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
    detailsButtonText: { fontSize: tfs(15), fontFamily: Platform.select({ android: 'Poppins_Bold', default: 'Poppins-Bold' }), color: 'white' },


    dateHeader: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F7FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    dateHeaderText: { fontSize: tfs(12), fontFamily: Platform.select({ android: 'Poppins_SemiBold', default: 'Poppins-SemiBold' }), color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5 },

});
