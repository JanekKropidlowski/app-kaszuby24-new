import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
    ScrollView,
    Modal,
    TextInput,
    Dimensions,
    KeyboardAvoidingView,
    Linking,
    InteractionManager,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region, Callout } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import { useRouter, Stack } from 'expo-router';
import { StopDetailsModal } from '@/components/transport/StopDetailsModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/themeStore';
import {
    Bus,
    MapPin,
    ArrowLeft,
    Search,
    Clock,
    Navigation,
    Activity,
    Map as MapIcon,
    ChevronRight,
    Train,
    X,
    Wifi,
    Bike,
    Accessibility,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { RouteResults } from '@/components/transport/RouteResults';
import { SimpleSearch } from '@/components/transport/SimpleSearch';
import { TransportService, TransportStop, GdanskVehicle, TripResult } from '@/services/transportService';
import { RouteOption } from '@/services/TransportRoutingEngine';

const { width } = Dimensions.get('window');

const INITIAL_REGION = {
    latitude: 54.372158,
    longitude: 18.638306,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
};

const CAP_STOPS = 300;   // PERFORMANCE: Balanced cap for stability

const AGENCIES = [
    { id: 'polregio', name: 'PolRegio', icon: <Train size={32} color="#1E40AF" />, color: '#1E40AF', subtext: 'Koleje Regionalne' },
    { id: 'skm', name: 'SKM Trójmiasto', icon: <Train size={32} color="#FBBC05" />, color: '#FBBC05', subtext: 'Szybka Kolej Miejska' },
    { id: 'mevo', name: 'MEVO', icon: <Bike size={32} color="#DC2626" />, color: '#DC2626', subtext: 'Rowery Metropolitalne' },
    { id: 'pkp', name: 'PKP Intercity', icon: <Train size={32} color="#003399" />, color: '#003399', subtext: 'Dalekobieżne' },
    { id: 'wejherowo', name: 'MZK Wejherowo', icon: <Bus size={32} color="#047857" />, color: '#047857', subtext: 'Autobusy miejskie' },
    { id: 'pksgdynia', name: 'PKS Gdynia', icon: <Bus size={32} color="#10B981" />, color: '#10B981', subtext: 'Autobusy regionalne' },
    { id: 'gdansk', name: 'ZTM Gdańsk', icon: <Bus size={32} color="#E11D48" />, color: '#E11D48', subtext: 'Tramwaje i Autobusy' },
    { id: 'gdynia', name: 'ZKM Gdynia', icon: <Bus size={32} color="#2563EB" />, color: '#2563EB', subtext: 'Trolejbusy i Autobusy' },
];

// --- OPTIMIZATION: Memoized Sub-components to prevent map crashes ---

// --- HELPER FUNCTIONS ---

const getRelativeTime = (timeStr: string) => {
    if (!timeStr) return '';
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const departure = new Date();
    departure.setHours(hours, minutes, 0, 0);

    // Handle midnight crossing
    if (departure.getTime() < now.getTime() - 30 * 60000) {
        departure.setDate(departure.getDate() + 1);
    }

    const diffMs = departure.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < -1) return 'odjechał';
    if (diffMins < 1) return 'teraz';
    if (diffMins < 60) return `za ${diffMins} min`;
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    return `za ${h}h ${m}m`;
};



export default function TransportScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme } = useThemeStore();
    const mapRef = useRef<MapView>(null);
    const searchTimer = useRef<NodeJS.Timeout | null>(null);
    const lastKeyRef = useRef<string | null>(null);
    const fetchedViewports = useRef<Set<string>>(new Set());
    const fetchedOrder = useRef<string[]>([]);
    const genRef = useRef(0);
    const vehicleTimer = useRef<NodeJS.Timeout | null>(null);
    const filteredStopsRef = useRef<TransportStop[]>([]);

    const lastFetchRegionRef = useRef<Region | null>(null);
    const fetching = useRef(false);

    // State
    const [viewMode, setViewMode] = useState<'DASHBOARD' | 'SEARCH' | 'MAP' | 'RESULTS' | 'ROUTE_MAP'>('DASHBOARD');
    const [region, setRegion] = useState(INITIAL_REGION);
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [timetable, setTimetable] = useState<any[]>([]);
    const [loadingTimetable, setLoadingTimetable] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);
    const [isAllDay, setIsAllDay] = useState(false);

    // Data
    const [vehicles, setVehicles] = useState<GdanskVehicle[]>([]);
    const [stops, setStops] = useState<TransportStop[]>([]);
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [mevoBikes, setMevoBikes] = useState<any[]>([]);
    const [mevoStatus, setMevoStatus] = useState<Record<string, any>>({});

    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [routeResults, setRouteResults] = useState<TripResult[]>([]);
    const [selectedRoute, setSelectedRoute] = useState<TripResult | null>(null);
    const [searchOffset, setSearchOffset] = useState(0);
    const [isPlanningRoute, setIsPlanningRoute] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const [viewportStops, setViewportStops] = useState<TransportStop[]>([]);
    const [viewportStats, setViewportStats] = useState({
        total: 0,
        inView: 0,
    });

    // Train Details
    const [selectedTrip, setSelectedTrip] = useState<any>(null);
    const [tripShape, setTripShape] = useState<any[]>([]);
    const [agencyInfo, setAgencyInfo] = useState<any>(null);
    const [loadingTrip, setLoadingTrip] = useState(false);

    const fetchAndShowTrip = async (tripId: string, agency: string = 'polregio') => {
        setLoadingTrip(true);
        setTripShape([]);
        setAgencyInfo(null);
        try {
            const data = await TransportService.fetchTrainDetails(agency, tripId);
            if (data) {
                setSelectedTrip({ ...data, agency });

                // Fetch extra info in parallel
                const agencyPromise = TransportService.fetchAgencyInfo(agency);
                const shapePromise = data.shape_id ? TransportService.fetchShapes(agency, data.shape_id) : Promise.resolve([]);

                const [aInfo, sData] = await Promise.all([agencyPromise, shapePromise]);
                setAgencyInfo(aInfo);
                setTripShape(sData);

                // Fit map to shape if available
                if (sData.length > 0 && mapRef.current) {
                    const coords = sData.map(p => ({ latitude: p.lat, longitude: p.lon }));
                    mapRef.current.fitToCoordinates(coords, {
                        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                        animated: true,
                    });
                }
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Błąd', 'Nie udało się pobrać szczegółów trasy.');
        } finally {
            setLoadingTrip(false);
        }
    };


    // --- MEMOIZED FILTERING (OFFLINE-FIRST) ---
    // Now just returns the subset of viewport stops that match agency
    // The main heavy lifting is done in loadStopsFromMemory
    const filteredStops = useMemo(() => {
        let base = viewportStops; // Use pre-calculated viewport set

        // DEBUG: If viewport is empty but we have stops loaded, fallback?
        if (base.length === 0 && stops.length > 0) return [];

        if (selectedAgency) {
            const normalizedSelected = selectedAgency.toLowerCase();
            return base.filter(s => {
                const a = (s.agency || '').toLowerCase();
                const mergedAgencies = s.agencyIds ? Object.keys(s.agencyIds).map(k => k.toLowerCase()) : [];
                const allAgencies = [a, ...mergedAgencies];

                if (normalizedSelected === 'gdansk') return allAgencies.some(ag => ag.includes('gdansk') || ag === 'ztm');
                if (normalizedSelected === 'gdynia') return allAgencies.some(ag => ag.includes('gdynia') || ag === 'zkm');
                if (normalizedSelected === 'skm') return allAgencies.some(ag => ag.includes('skm')) || s.name.toUpperCase().includes('SKM');
                if (normalizedSelected === 'polregio' || normalizedSelected === 'regio') return allAgencies.some(ag => ag.includes('regio') || ag === 'pr') || s.name.toUpperCase().includes('REGIO');

                return allAgencies.some(ag => ag.includes(normalizedSelected));
            });
        }
        return base;
    }, [viewportStops, selectedAgency]);



    const initLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setUserLocation(loc);

                // FORCE ZOOM
                const currentRegion = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                };
                setRegion(currentRegion);

                // Retry map animation to ensure it catches up after layout
                setTimeout(() => {
                    mapRef.current?.animateToRegion(currentRegion, 1000);
                }, 1000);
            }
        } catch (e) {
            console.warn('Location init error', e);
        }
    };

    const viewportKey = (reg: Region, precision = 2) => {
        const factor = Math.pow(10, precision);
        // PERFORMANCE: Round coordinates to group nearby slight panned viewports
        const f = (x: number) => (Math.round(x * factor) / factor).toFixed(precision);
        const buffer = 1.2;
        const minLat = reg.latitude - (reg.latitudeDelta * buffer) / 2;
        const maxLat = reg.latitude + (reg.latitudeDelta * buffer) / 2;
        const minLon = reg.longitude - (reg.longitudeDelta * buffer) / 2;
        const maxLon = reg.longitude + (reg.longitudeDelta * buffer) / 2;
        return `${f(minLat)}:${f(minLon)}:${f(maxLat)}:${f(maxLon)}`;
    };

    // --- OFFLINE-FIRST: In-Memory Filtering ---
    const loadStopsFromMemory = useCallback(async () => {
        if (fetching.current && stops.length === 0) return; // Allow running if we have stops to update filter

        try {
            // 1. Ensure we have the dataset
            if (stops.length === 0) {
                fetching.current = true;
                setIsLoading(true);
                const allStops = await TransportService.getAllStops();
                console.log(`[Transport] Loaded ${allStops.length} stops total.`);
                setStops(allStops);
                fetching.current = false;
                setIsLoading(false);

                // First run filter immediately
                filterVisibleStops(region, activeFilter, allStops);
            } else {
                // Just filter existing
                filterVisibleStops(region, activeFilter, stops);
            }
        } catch (e) {
            console.error(e);
            setIsLoading(false);
        }
    }, [stops, region, activeFilter]);

    // Fast Numeric Filtering (Runs in JS set)
    const filterVisibleStops = (reg: Region, filter: string, source: TransportStop[]) => {
        if (!source || source.length === 0) return;

        // 1.5x Bounding Box Buffer for smoother panning
        const bufLat = reg.latitudeDelta * 0.75;
        const bufLon = reg.longitudeDelta * 0.75;

        const inView = source.filter(s => {
            const lat = Number(s.lat);
            const lon = Number(s.lon);
            const rLat = reg.latitude;
            const rLon = reg.longitude;

            return (
                lat >= rLat - bufLat &&
                lat <= rLat + bufLat &&
                lon >= rLon - bufLon &&
                lon <= rLon + bufLon
            );
        });

        if (filter.includes('pks')) {
            const pksInSource = source.filter(s => (s.agency || '').toLowerCase().includes('pks'));
            console.log(`[PKS_DEBUG] source.length: ${source.length}, PKS in total: ${pksInSource.length}`);
            if (pksInSource.length > 0) {
                console.log(`[PKS_DEBUG] Sample PKS: ${pksInSource[0].name}, lat: ${pksInSource[0].lat}, agency: ${pksInSource[0].agency}`);
            }
        }

        // Step 2: Agency filtering (STRICT - No cross-contamination!)
        let filtered = inView;
        if (filter !== 'all') {
            const agencyLower = (filter || '').toLowerCase();

            // Removed heavy logging for performance

            filtered = inView.filter(s => {
                const stopAgency = (s.agency || '').toLowerCase();
                const agencies = stopAgency.split(',').map(a => a.trim());

                if (agencyLower === 'gdansk' || agencyLower === 'ztm') {
                    return agencies.some(a => a === 'ztm_gdansk' || a === 'gdansk' || a === 'ztm');
                }
                if (agencyLower === 'gdynia' || agencyLower === 'zkm') {
                    return agencies.some(a => a === 'zkm_gdynia' || a === 'gdynia' || a === 'zkm');
                }
                if (agencyLower === 'wejherowo' || agencyLower === 'mzk') {
                    // MZK Wejherowo specific tags
                    return agencies.some(a => a === 'mzk_wejherowo' || a === 'wejherowo');
                }
                if (agencyLower === 'pksgdynia' || agencyLower === 'pks' || agencyLower === 'pks_gdynia') {
                    return agencies.some(a => a === 'pks_gdynia' || a === 'pksgdynia' || a === 'pks');
                }
                if (agencyLower === 'skm') {
                    return agencies.some(a => a === 'skm_rail' || a === 'skm');
                }
                if (agencyLower === 'pkp' || agencyLower === 'intercity') {
                    return agencies.some(a => a === 'ic_rail' || a === 'pkp' || a === 'intercity');
                }
                if (agencyLower === 'polregio' || agencyLower === 'regio') {
                    return agencies.some(a => a === 'regio_rail' || a === 'polregio' || a === 'regio');
                }

                return agencies.includes(agencyLower);
            });
        }

        // Prioritize: Rail > PKS > Other Bus > Mevo
        filtered.sort((a, b) => {
            const aAg = (a.agency || '').toLowerCase();
            const bAg = (b.agency || '').toLowerCase();

            const aIsRail = aAg.includes('rail') || aAg.includes('skm') || aAg.includes('pkp') || aAg.includes('regio');
            const bIsRail = bAg.includes('rail') || bAg.includes('skm') || bAg.includes('pkp') || bAg.includes('regio');
            if (aIsRail && !bIsRail) return -1;
            if (!aIsRail && bIsRail) return 1;

            // PKS PRORITY (since there are only 85 stops, we want them visible always)
            const aIsPKS = aAg.includes('pks');
            const bIsPKS = bAg.includes('pks');
            if (aIsPKS && !bIsPKS) return -1;
            if (!aIsPKS && bIsPKS) return 1;

            const aIsBus = aAg.includes('zkm') || aAg.includes('ztm') || aAg.includes('mzk');
            const bIsBus = bAg.includes('zkm') || bAg.includes('ztm') || bAg.includes('mzk');
            if (aIsBus && !bIsBus) return -1;
            if (!aIsBus && bIsBus) return 1;

            return 0;
        });

        // Limit for rendering safety
        const safeSet = filtered.slice(0, CAP_STOPS);

        if (filter.includes('pks')) {
            console.log(`[PKS_DEBUG] Filter: ${filter}, inView count: ${inView.length}, after filter count: ${filtered.length}`);
            const pksInFinalSet = safeSet.filter(s => (s.agency || '').toLowerCase().includes('pks'));
            console.log(`[PKS_DEBUG] PKS stops in final safeSet: ${pksInFinalSet.length}`);
        }

        setViewportStops(safeSet);
        setViewportStats({
            inView: filtered.length,
            total: source.length,
        });
    };

    const fetchVehicles = async () => {
        if (region.latitudeDelta > 0.2) return; // Fetch earlier (0.2 instead of 0.4 for better UX)
        setIsLoadingDynamic(true);
        try {
            // Fetch Mevo status if Mevo is selected OR if we are showing all agencies
            if (selectedAgency === 'mevo' || !selectedAgency) {
                const [liveBikes, stationStatus] = await Promise.all([
                    selectedAgency === 'mevo' ? TransportService.fetchMevoLive() : Promise.resolve([]),
                    TransportService.fetchMevoStatus()
                ]);
                if (selectedAgency === 'mevo') setMevoBikes(liveBikes);
                setMevoStatus(stationStatus || {});
            }

            // Fetch Gdansk vehicles if Gdansk is selected OR if showing all
            if (selectedAgency === 'gdansk' || !selectedAgency) {
                const data = await TransportService.fetchGdanskLive();
                setVehicles(data || []);
            }

            // Cleanup when switching away from Mevo
            if (selectedAgency && selectedAgency !== 'mevo') {
                setMevoBikes([]);
            }
        } finally {
            setIsLoadingDynamic(false);
        }
    };

    // --- EFFECT: Sync selectedAgency with activeFilter ---
    useEffect(() => {
        const newFilter = selectedAgency ? selectedAgency.toLowerCase() : 'all';
        setActiveFilter(newFilter);
    }, [selectedAgency]);

    // --- EFFECT: Initial Load & Region Change ---
    useEffect(() => {
        loadStopsFromMemory();
    }, []);

    // --- EFFECT: Re-filter when activeFilter changes ---
    useEffect(() => {
        if (stops.length > 0) {
            filterVisibleStops(region, activeFilter, stops);
        }
    }, [activeFilter]);

    const handleRegionChangeComplete = (newRegion: Region) => {
        setRegion(newRegion);
        if (searchTimer.current) clearTimeout(searchTimer.current);

        const gen = ++genRef.current;

        // PERFORMANCE FIX: Longer debounce to reduce re-filtering during rapid panning
        searchTimer.current = setTimeout(() => {
            if (gen !== genRef.current) return;
            if (isTransitioning) return;

            // Only filter if movement is significant enough to change "in view" significantly
            if (lastFetchRegionRef.current) {
                const latMove = Math.abs(newRegion.latitude - lastFetchRegionRef.current.latitude);
                const lonMove = Math.abs(newRegion.longitude - lastFetchRegionRef.current.longitude);

                // Very low threshold - we want to update the "Visible Stops" list often enough so markers don't disappear
                // since we have them in memory, it's cheap.
                // Movement threshold increased to 25% of view delta to reduce CPU load 
                const thresholdLat = newRegion.latitudeDelta * 0.25;
                const thresholdLon = newRegion.longitudeDelta * 0.25;

                if (latMove < thresholdLat && lonMove < thresholdLon) return;
            }

            lastFetchRegionRef.current = newRegion;
            loadStopsFromMemory();
        }, 300); // Fast debounce for memory operations (300ms is enough)
    };


    // Re-filter when agency changes
    useEffect(() => {
        loadStopsFromMemory();
    }, [selectedAgency, loadStopsFromMemory]);

    const triggerHaptic = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const rememberViewport = (key: string) => {
        if (fetchedViewports.current.has(key)) return false;
        fetchedViewports.current.add(key);
        fetchedOrder.current.push(key);

        if (fetchedOrder.current.length > 200) {
            const old = fetchedOrder.current.shift();
            if (old) fetchedViewports.current.delete(old);
        }
        return true;
    };

    // NOTE: Removed harmful useEffect that cleared stops on agency change
    // Offline-first architecture keeps ALL data in memory and just filters it

    // 2. Update visible stops when data (filteredStops) changes
    // 2. Update visible stops when data (filteredStops) changes or zoom changes

    useEffect(() => {
        console.log('[INIT] Component mounted, initializing location...');
        initLocation();

        // NOTE: Removed automatic initial fetch
        // Auto-zoom to nearest stop will trigger viewport-based fetch automatically
        // This prevents redundant API calls and improves performance

        return () => {
            console.log('[CLEANUP] Component unmounting');
            if (vehicleTimer.current) clearInterval(vehicleTimer.current);
            if (searchTimer.current) clearTimeout(searchTimer.current);
        };
    }, []);



    useEffect(() => {
        if (viewMode === 'MAP' || viewMode === 'ROUTE_MAP') {
            fetchVehicles(); // Initial fetch
            if (!vehicleTimer.current) {
                vehicleTimer.current = setInterval(() => fetchVehicles(), 15000);
            }
        } else {
            if (vehicleTimer.current) {
                clearInterval(vehicleTimer.current);
                vehicleTimer.current = null;
            }
        }
    }, [viewMode, selectedAgency]); // Re-fetch on agency change too!

    const getStopIcon = useCallback((agency?: string, size: number = 12) => {
        const agStr = (agency || '').toString().toLowerCase();
        const agencies = agStr.split(',').map(a => a.trim());

        // Check if any agency in the list is a rail operator
        const isRail = agencies.some(a => a === 'skm_rail' || a === 'skm' || a === 'regio_rail' || a === 'polregio' || a === 'regio' || a === 'ic_rail' || a === 'pkp' || a === 'intercity');

        if (isRail) return <Train size={size} color="#fff" />;
        if (agencies.some(a => a === 'mevo' || a === 'mevo_free')) return <Bike size={size} color="#000" />;
        return <Bus size={size} color="#fff" />;
    }, [selectedAgency]);

    const getStopColor = useCallback((agency?: string) => {
        const agStr = (agency || '').toLowerCase();
        const agencies = agStr.split(',').map(a => a.trim());
        const matches = (list: string[]) => agencies.some(a => list.includes(a));

        // 1. If we have a selected agency, and THIS stop serves it, return that color immediately!
        if (selectedAgency) {
            const s = selectedAgency.toLowerCase();
            if ((s === 'gdansk' || s === 'ztm') && agencies.some(a => a === 'ztm_gdansk' || a === 'gdansk' || a === 'ztm')) return '#E11D48';
            if ((s === 'gdynia' || s === 'zkm') && agencies.some(a => a === 'zkm_gdynia' || a === 'gdynia' || a === 'zkm')) return '#2563EB';
            if ((s === 'wejherowo' || s === 'mzk') && agencies.some(a => a === 'mzk_wejherowo' || a === 'wejherowo' || a === 'mzk')) return '#047857';
            if ((s === 'pksgdynia' || s === 'pks' || s === 'pks_gdynia') && agencies.some(a => a === 'pks_gdynia' || a === 'pksgdynia' || a === 'pks')) return '#10B981';
            if (s === 'skm' && agencies.some(a => a === 'skm_rail' || a === 'skm')) return '#FBBC05';
            if (s === 'pkp' && agencies.some(a => a === 'ic_rail' || a === 'pkp' || a === 'intercity')) return '#003399';
            if ((s === 'polregio' || s === 'regio') && agencies.some(a => a === 'regio_rail' || a === 'polregio' || a === 'regio')) return '#1E40AF';
            if (s === 'mevo' && agencies.some(a => a === 'mevo' || a === 'mevo_free')) return '#DC2626';
        }

        // 2. Default fallback hierarchy
        if (matches(['regio_rail', 'polregio', 'regio'])) return '#1E40AF'; // Polregio - Blue
        if (matches(['ic_rail', 'pkp', 'intercity'])) return '#003399'; // PKP - Dark Blue
        if (matches(['mzk_wejherowo', 'wejherowo', 'mzk'])) return '#047857'; // Wejherowo - Green
        if (matches(['skm_rail', 'skm'])) return '#FBBC05'; // SKM - Yellow
        if (matches(['pks_gdynia', 'pksgdynia', 'pks'])) return '#10B981'; // PKS - Emerald
        if (matches(['ztm_gdansk', 'gdansk', 'ztm'])) return '#E11D48'; // Gdansk - Rose
        if (matches(['zkm_gdynia', 'gdynia', 'zkm'])) return '#2563EB'; // Gdynia - Blue
        if (agencies.some(a => a === 'mevo' || a === 'mevo_free')) return '#DC2626'; // MEVO - Red
        return '#6B7280';
    }, [selectedAgency]);

    const handleSearchSubmit = async (from: string, to: string, fromLabel?: string, toLabel?: string, timeOffset: number = 0) => {
        setIsPlanningRoute(true);
        setIsTransitioning(true);
        setViewMode('RESULTS');
        setTimeout(() => setIsTransitioning(false), 500);

        // Use labels for UI if provided, otherwise fallback to values
        setFromLocation(fromLabel || from);
        setToLocation(toLabel || to);

        if (timeOffset === 0) setRouteResults([]);
        try {
            let allStops = stops.length > 0 ? stops : await TransportService.getAllStops();

            let startTimeStr = undefined;
            if (timeOffset > 0) {
                const later = new Date(Date.now() + timeOffset * 60000);
                startTimeStr = `${later.getHours().toString().padStart(2, '0')}:${later.getMinutes().toString().padStart(2, '0')}`;
            }
            const results = await TransportService.planTrip(from, to, allStops, startTimeStr);
            const limitedResults = results.slice(0, 3);
            if (timeOffset > 0) setRouteResults(prev => [...prev, ...limitedResults]);
            else setRouteResults(limitedResults);
        } catch (e) {
            console.warn(e);
        } finally {
            setIsPlanningRoute(false);
            setIsLoadingMore(false);
        }
    };

    const handleRouteSelect = (route: TripResult) => {
        triggerHaptic();
        setSelectedRoute(route);
        setIsTransitioning(true);
        setViewMode('ROUTE_MAP');
        setTimeout(() => setIsTransitioning(false), 800);
        if (route.path && route.path.length > 0) {
            setTimeout(() => {
                mapRef.current?.fitToCoordinates(route.path, {
                    edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                    animated: true,
                });
            }, 500);
        }
    };

    const handleBackToSearch = () => {
        setIsTransitioning(true);
        setViewMode('SEARCH');
        setTimeout(() => setIsTransitioning(false), 400);
        setRouteResults([]);
        setSelectedRoute(null);
        setSearchOffset(0);
    };

    const handleStopPress = useCallback(async (stop: TransportStop, allDay = false) => {
        setSelectedItem(stop);
        if (!allDay) setTimetable([]);
        setIsAllDay(allDay);
        if (stop.id === 'place_search') return;

        setLoadingTimetable(true);
        triggerHaptic();
        try {
            // Support checking multiple IDs for one stop (Smart Merging)
            let allDepartures: any[] = [];

            if (stop.agencyIds) {
                // Fetch for all agencies/ids associated with this merged stop
                const normalizedMap: Record<string, string> = {};
                Object.entries(stop.agencyIds).forEach(([ag, id]) => {
                    let norm = ag.toLowerCase();
                    if (norm === 'mzk_wejherowo') norm = 'wejherowo';
                    if (norm === 'ztm_gdansk') norm = 'gdansk';
                    if (norm === 'zkm_gdynia') norm = 'gdynia';
                    if (norm === 'pksgdynia' || norm === 'pks_gdynia') norm = 'pks_gdynia';
                    if (norm === 'skm_rail') norm = 'skm';
                    if (norm === 'regio_rail') norm = 'polregio';
                    if (!normalizedMap[norm]) normalizedMap[norm] = id;
                });

                const promises = Object.entries(normalizedMap).map(([agency, id]) =>
                    TransportService.fetchTimetable(agency, id, undefined, allDay)
                );
                const results = await Promise.all(promises);
                let combined = [] as any[];
                results.forEach(r => combined = [...combined, ...r]);

                // Deduplicate combined results from different agencies
                const seen = new Set();
                allDepartures = combined.filter(item => {
                    const datePart = item.date || item.target_date || '';
                    const key = `${datePart}|${item.time}|${item.line}|${item.destination || item.direction}`.toLowerCase();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            } else if (stop.agency === 'mevo_free') {
                // For free bikes, we show battery/range info as the "timetable"
                const rangeMtrs = stop.attributes?.range || 0;
                const rangeKm = Math.round(rangeMtrs / 1000);
                // Estimate battery: Full is ~100km (Mevo 2.0 e-bike Spec)
                const batteryPct = Math.min(100, Math.round((rangeKm / 100) * 100));

                const bikeInfo = [
                    {
                        time: stop.attributes?.is_electric ? `${batteryPct}%` : '🚲',
                        line: stop.attributes?.is_electric ? 'BATERIA' : 'KLASYCZNY',
                        destination: stop.attributes?.is_electric ? `Zasięg ok. ${rangeKm} km` : 'Rower Mevo (bez napędu)',
                        route_type: stop.attributes?.is_electric ? 'mevo_electric' : 'mevo_mechanical'
                    }
                ];
                setTimetable(bikeInfo);
                setLoadingTimetable(false);
                return;
            } else if (stop.agency === 'mevo') {
                // Sync station status for the clicked station if we have global status
                // Backend now uses mevo_ prefix for station IDs in status keys
                const s = mevoStatus[stop.id];
                if (s) {
                    const statusData = [
                        { time: 'Dostępne', line: String(s.bikes), destination: 'Razem', route_type: 'mevo_bikes' },
                        { time: String(s.electric), line: 'Elektryczne', destination: 'Rower', route_type: 'mevo_electric' },
                        { time: String(s.classic), line: 'Klasyczne', destination: 'Rower', route_type: 'mevo_mechanical' },
                        { time: 'Wolne', line: String(s.docks), destination: 'Stojaki', route_type: 'mevo_docks' }
                    ];
                    setTimetable(statusData);
                    setLoadingTimetable(false);
                    return;
                }
                // Fallback to fetch single if not in global
                allDepartures = await TransportService.fetchTimetable(stop.agency, stop.id, undefined, allDay);
            } else {
                allDepartures = await TransportService.fetchTimetable(stop.agency || 'gdansk', stop.id, undefined, allDay);
            }

            // Standardize and deduplicate
            const seen = new Set();
            const clean = allDepartures.map((t: any) => ({
                time: t.time || t.departureTime || '',
                line: String(t.line || t.route || ''),
                destination: t.destination || t.headsign || 'Inny kierunek',
                isRealtime: !!t.isRealtime,
                direction: t.direction || t.headsign || 'Inny kierunek',
                date: t.date,
                day_label: t.day_label,
                attributes: t.attributes,
                route_type: t.route_type, // CRITICAL: Preserve route_type for Mevo status parsing in Modal
                tripId: t.tripId || t.trip_id
            })).filter((t: any) => {
                const key = `${t.date}_${t.time}_${t.line}_${t.destination}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).sort((a: any, b: any) => {
                // Sort by date first, then time
                if (a.date && b.date && a.date !== b.date) {
                    return a.date.localeCompare(b.date);
                }
                return a.time.localeCompare(b.time);
            });

            setTimetable(clean);
        } finally {
            setLoadingTimetable(false);
        }
    }, []);



    const startNavigation = (target: { lat: number, lon: number }) => {
        triggerHaptic();
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${target.lat},${target.lon} `;
        const label = 'Cel podróży';
        const url = Platform.select({ ios: `${scheme}${label} @${latLng} `, android: `${scheme}${latLng} (${label})` });
        if (url) Linking.openURL(url);
    };

    // --- MAIN RENDER ---

    if (viewMode === 'DASHBOARD') {

        if (isLoading && stops.length === 0) {
            return (
                <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            );
        }

        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.colors.background }}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
                    >
                        <Text style={{ fontSize: 28, fontWeight: '800', color: theme.colors.text, marginBottom: 8 }}>
                            Transport Pomorski
                        </Text>
                        <Text style={{ fontSize: 15, color: theme.colors.textSecondary, marginBottom: 20 }}>
                            Wybierz agencję transportową
                        </Text>

                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                                triggerHaptic();
                                Alert.alert('Wkrótce', 'Pracujemy nad uruchomieniem nowej wyszukiwarki przystanków. Zapraszamy wkrótce!');
                            }}
                            style={{
                                backgroundColor: theme.colors.card,
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 24,
                                flexDirection: 'row',
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                opacity: 0.7,
                                zIndex: 20
                            }}
                        >
                            <View style={{
                                width: 40, height: 40, borderRadius: 12,
                                backgroundColor: theme.colors.border, // dimmed icon bg
                                justifyContent: 'center', alignItems: 'center', marginRight: 16
                            }}>
                                <Search size={22} color={theme.colors.textSecondary} strokeWidth={2.5} />
                            </View>
                            <View>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.textSecondary }}>Znajdź przystanek</Text>
                                <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 }}>Wyszukaj przystanek na mapie</Text>
                            </View>
                            <View style={{ flex: 1 }} />
                            <ChevronRight size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            {AGENCIES.map(agency => (
                                <TouchableOpacity
                                    key={agency.id}
                                    onPress={async () => {
                                        triggerHaptic();
                                        setSelectedAgency(agency.id);
                                        setViewMode('MAP');

                                        // Auto-zoom to nearest stop using offline data
                                        if (userLocation && stops.length > 0) {
                                            const agencyStops = stops.filter((s: any) => {
                                                const a = (s.agency || '').toLowerCase();
                                                const agId = agency.id.toLowerCase();
                                                const agencies = a.split(',').map((x: string) => x.trim());

                                                if (agId === 'gdansk' || agId === 'ztm') {
                                                    return agencies.some((x: string) => x === 'ztm_gdansk' || x === 'gdansk' || x === 'ztm' || x === 'ztm gdansk');
                                                }
                                                if (agId === 'gdynia' || agId === 'zkm') {
                                                    return agencies.some((x: string) => x === 'zkm_gdynia' || x === 'gdynia' || x === 'zkm' || x === 'zkm gdynia');
                                                }
                                                if (agId === 'wejherowo' || agId === 'mzk') {
                                                    return agencies.some((x: string) => x === 'mzk_wejherowo' || x === 'wejherowo' || x === 'mzk' || x === 'mzk wejherowo');
                                                }
                                                if (agId === 'pksgdynia' || agId === 'pks' || agId === 'pks_gdynia') {
                                                    return agencies.some((x: string) => x === 'pks_gdynia' || x === 'pksgdynia' || x === 'pks' || x === 'pks gdynia' || x === 'pks_gd');
                                                }
                                                if (agId === 'skm') {
                                                    return agencies.some((x: string) => x === 'skm_rail' || x === 'skm' || x === 'pkp skm');
                                                }
                                                if (agId === 'pkp' || agId === 'intercity') {
                                                    return agencies.some((x: string) => x === 'ic_rail' || x === 'pkp' || x === 'intercity' || x === 'pkp intercity');
                                                }
                                                if (agId === 'polregio' || agId === 'regio') {
                                                    return agencies.some((x: string) => x === 'regio_rail' || x === 'polregio' || x === 'regio');
                                                }
                                                if (agId === 'mevo') {
                                                    return agencies.some((x: string) => x === 'mevo');
                                                }
                                                return agencies.some((x: string) => x === agId);
                                            });

                                            if (agencyStops.length > 0) {
                                                let nearest = agencyStops[0];
                                                let minDist = Infinity;

                                                agencyStops.forEach(stop => {
                                                    const dist = Math.sqrt(
                                                        Math.pow(stop.lat - userLocation.coords.latitude, 2) +
                                                        Math.pow(stop.lon - userLocation.coords.longitude, 2)
                                                    );
                                                    if (dist < minDist) {
                                                        minDist = dist;
                                                        nearest = stop;
                                                    }
                                                });

                                                const newRegion = {
                                                    latitude: nearest.lat,
                                                    longitude: nearest.lon,
                                                    latitudeDelta: 0.05,
                                                    longitudeDelta: 0.05
                                                };
                                                setRegion(newRegion);
                                                mapRef.current?.animateToRegion(newRegion, 1000);
                                            }
                                        }
                                    }}
                                    style={{
                                        width: '48%',
                                        backgroundColor: theme.colors.card,
                                        borderRadius: 20,
                                        padding: 20,
                                        elevation: 3,
                                        shadowColor: '#000',
                                        shadowOpacity: 0.1,
                                        shadowRadius: 8,
                                        borderWidth: 2,
                                        borderColor: theme.colors.border,
                                    }}
                                >
                                    <View style={{ marginBottom: 12 }}>
                                        {agency.icon}
                                    </View>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 4 }}>
                                        {agency.name}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                                        {agency.subtext}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                setSelectedAgency(null);
                                setViewMode('MAP');
                            }}
                            style={{
                                marginTop: 20,
                                backgroundColor: theme.colors.primary,
                                paddingVertical: 16,
                                borderRadius: 16,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                                Pokaż wszystkie przystanki
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View >
            </>
        );
    }

    if (viewMode === 'SEARCH') {
        return (
            <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.colors.background }}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* Search Header for Back navigation */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
                    <TouchableOpacity
                        onPress={() => setViewMode('DASHBOARD')}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.card, justifyContent: 'center', alignItems: 'center' }}
                    >
                        <ArrowLeft size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={{ marginLeft: 16, fontSize: 18, fontWeight: '700', color: theme.colors.text }}>Planer podróży</Text>
                </View>

                <SimpleSearch
                    theme={theme}
                    userLocation={userLocation}
                    onClose={() => setViewMode('DASHBOARD')}
                    onRouteSelect={(route: RouteOption) => {
                        console.log('Selected Route 2.0:', route);
                        // Convert new RouteOption to old TripResult format temporarily or handle natively
                        // For MVP: Alert user or show simple list
                        // TODO: Create SimpleRouteDetails component
                        Alert.alert('Trasa wybrana', `Czas: ${route.totalDuration} min, Przesiadki: ${route.changes}`);
                    }}
                />
            </View>
        );
    }
    if (viewMode === 'RESULTS') {
        return (
            <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.colors.background }}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.resultsHeaderContainer, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
                    <TouchableOpacity onPress={handleBackToSearch} style={styles.backBtnInline}>
                        <ArrowLeft size={24} color={theme.colors.text} />
                        <Text style={[styles.backText, { color: theme.colors.text }]}>Wróć</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerRouteTitle, { color: theme.colors.text }]}>Wyniki trasy</Text>
                </View>
                <RouteResults
                    results={routeResults}
                    isLoading={isPlanningRoute}
                    theme={theme}
                    onClose={handleBackToSearch}
                    onSelect={handleRouteSelect}
                    onShowMore={() => {
                        setIsLoadingMore(true);
                        handleSearchSubmit(fromLocation, toLocation, undefined, undefined, (routeResults.length / 3) * 60);
                    }}
                    isLoadingMore={isLoadingMore}
                />
            </View>
        );
    }


    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <ClusteredMapView
                ref={mapRef as any}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={region}
                onRegionChangeComplete={handleRegionChangeComplete}
                showsUserLocation
                rotateEnabled={false}
                radius={50}
                clusterColor={theme.colors.primary}
                clusterTextColor="#fff"
                animationEnabled={false}
                extent={512}
                minPoints={2}
            >
                {/* Render stops with memoization-like stability */}
                {viewMode === 'MAP' && viewportStops && Array.isArray(viewportStops) && viewportStops.length > 0 && viewportStops.map((stop, idx) => {
                    const lat = Number(stop.lat);
                    const lon = Number(stop.lon);
                    if (isNaN(lat) || isNaN(lon)) return null;

                    const markerKey = stop.agency === 'mevo' ? `mevo_st_${stop.id}_${idx}` : `m_${stop.id}_${stop.agency || 'uk'}_${idx}`;

                    if (stop.agency === 'mevo') {
                        const status = mevoStatus[stop.id];
                        const count = parseInt(String(status?.bikes ?? status?.bikesAvailable ?? 0));
                        const isEmpty = count === 0;
                        return (
                            <Marker
                                key={markerKey}
                                coordinate={{ latitude: Number(stop.lat), longitude: Number(stop.lon) }}
                                onPress={() => handleStopPress(stop)}
                                tracksViewChanges={false}
                                anchor={{ x: 0.5, y: 0.5 }}
                            >
                                <View pointerEvents="none" style={[
                                    styles.mevoStationMarker,
                                    isEmpty && { backgroundColor: '#71717A', borderColor: '#D4D4D8', opacity: 0.6, elevation: 0 }
                                ]}>
                                    <Text style={[styles.mevoStationText, isEmpty && { color: '#E4E4E7' }]}>
                                        {count}
                                    </Text>
                                </View>
                            </Marker>
                        );
                    }

                    const isPKS = (stop.agency || '').toLowerCase().includes('pks');
                    const markerSize = isPKS ? 38 : 30;
                    const iconSize = isPKS ? 18 : 12;

                    return (
                        <Marker
                            key={markerKey}
                            coordinate={{ latitude: Number(stop.lat), longitude: Number(stop.lon) }}
                            onPress={() => handleStopPress(stop)}
                            tracksViewChanges={false}
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View pointerEvents="none" style={[
                                styles.stopMarker,
                                {
                                    backgroundColor: getStopColor(stop.agency),
                                    elevation: isPKS ? 8 : 5,
                                    zIndex: isPKS ? 20 : 10,
                                    width: markerSize,
                                    height: markerSize,
                                    borderRadius: markerSize / 2
                                }
                            ]}>
                                {getStopIcon(stop.agency, iconSize)}
                            </View>
                        </Marker>
                    );
                })}

                {/* Live Vehicles (Gdansk) */}
                {vehicles.map((v, idx) => (
                    <Marker
                        key={`v_${v.vehicleId}_${idx}`}
                        coordinate={{ latitude: Number(v.lat), longitude: Number(v.lon) }}
                        rotation={v.direction}
                        tracksViewChanges={false}
                    >
                        <View style={[styles.stopMarker, { backgroundColor: '#E11D48', width: 26, height: 26, borderRadius: 13, borderWidth: 1.5 }]}>
                            <Bus size={14} color="#fff" />
                        </View>
                    </Marker>
                ))}

                {/* MEVO Free-floating Bikes - Strict limit & zoom for stability */}
                {selectedAgency === 'mevo' && region.latitudeDelta < 0.02 && mevoBikes.slice(0, 60).map((bike, idx) => {
                    const bikeId = bike.bike_id || bike.id;
                    const isLowBattery = bike.current_range_meters !== undefined && bike.current_range_meters < 500;
                    const isInactive = bike.is_disabled || bike.is_reserved || isLowBattery;

                    return (
                        <Marker
                            key={`bike_${bikeId}_${idx}`}
                            coordinate={{ latitude: Number(bike.lat), longitude: Number(bike.lon) }}
                            onPress={() => handleStopPress({
                                id: bikeId,
                                name: `Rower MEVO ${bikeId.substring(bikeId.length - 4)}`,
                                agency: 'mevo_free',
                                lat: Number(bike.lat),
                                lon: Number(bike.lon),
                                attributes: {
                                    range: bike.current_range_meters,
                                    is_electric: bike.vehicle_type_id === 'ebike' || bike.is_electric,
                                    is_disabled: bike.is_disabled,
                                    is_reserved: bike.is_reserved
                                }
                            })}
                            tracksViewChanges={false}
                        >
                            <View style={[
                                styles.mevoMiniMarker,
                                { backgroundColor: '#F97316' },
                                isInactive && { backgroundColor: '#94A3B8' }
                            ]}>
                                <Bike size={12} color={isInactive ? "#475569" : "#000"} />
                                {(bike.vehicle_type_id === 'electric' || bike.is_electric) && (
                                    <View style={[styles.mevoBoltBadge, isInactive && { backgroundColor: '#475569' }]}>
                                        <Text style={[styles.mevoBoltText, isInactive && { color: '#CBD5E1' }]}>⚡</Text>
                                    </View>
                                )}
                            </View>
                        </Marker>
                    );
                })}

                {viewMode === 'ROUTE_MAP' && selectedRoute && (
                    <>
                        {/* Render individual segments with different colors */}
                        {(selectedRoute.segments && selectedRoute.segments.length > 0) ? (
                            selectedRoute.segments.map((seg, idx) => (
                                <React.Fragment key={`seg_${seg.mode}_${idx}`}>
                                    {seg.path && Array.isArray(seg.path) && seg.path.length > 0 && (
                                        <Polyline
                                            key={`poly_${seg.mode}_${idx}_${seg.path.length}`}
                                            coordinates={seg.path.filter(p => p && !isNaN(p.latitude) && !isNaN(p.longitude))}
                                            strokeColor={seg.mode === 'walking' ? '#9CA3AF' : (seg.mode === 'train' ? '#1E40AF' : theme.colors.primary)}
                                            strokeWidth={6}
                                            lineDashPattern={seg.mode === 'walking' ? [6, 6] : undefined}
                                        />
                                    )}
                                    {seg.from && !isNaN(seg.from.lat) && !isNaN(seg.from.lon) && (
                                        <Marker
                                            key={`marker_seg_${seg.mode}_${idx}`}
                                            coordinate={{ latitude: seg.from.lat, longitude: seg.from.lon }}
                                            title={String(seg.line ? `Linia ${seg.line}` : (seg.mode === 'walking' ? 'Marsz' : 'Przesiadka'))}
                                        >
                                            <View style={[styles.stopMarker, { backgroundColor: getStopColor(seg.from.agency) }]}>
                                                {getStopIcon(seg.from.agency)}
                                            </View>
                                        </Marker>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            selectedRoute.path && <Polyline key="fallback_poly" coordinates={selectedRoute.path} strokeColor={theme.colors.primary} strokeWidth={6} />
                        )}

                        {/* Final Destination Marker */}
                        {selectedRoute.path && selectedRoute.path.length > 0 && (
                            <Marker coordinate={selectedRoute.path[selectedRoute.path.length - 1]} title="Cel">
                                <View style={[styles.stopMarker, { backgroundColor: '#EF4444' }]}><MapPin size={12} color="#fff" /></View>
                            </Marker>
                        )}
                    </>
                )}

                {/* Rendering shapes for selected trip */}
                {tripShape.length > 0 && (
                    <Polyline
                        coordinates={tripShape.map(p => ({ latitude: p.lat, longitude: p.lon }))}
                        strokeColor={selectedTrip?.color ? `#${selectedTrip.color}` : theme.colors.primary}
                        strokeWidth={4}
                        lineDashPattern={selectedTrip?.agency === 'pkp' ? [10, 5] : undefined}
                    />
                )}
            </ClusteredMapView>

            <View style={[styles.headerWrapper, { top: insets.top + 10 }]}>
                <View style={styles.topActionRow}>
                    <TouchableOpacity onPress={() => viewMode === 'ROUTE_MAP' ? setViewMode('RESULTS') : setViewMode('DASHBOARD')} style={styles.backBtnFloating}>
                        <ArrowLeft size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.searchPill, { opacity: 0.7 }]}
                        activeOpacity={0.7}
                        onPress={() => {
                            Alert.alert('Wkrótce', 'Pracujemy nad nową wyszukiwarką połączeń.');
                        }}
                    >
                        <Search size={18} color={theme.colors.textSecondary} />
                        <Text style={[styles.searchPillText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {toLocation || "Dokąd jedziemy?"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Floating Counters Card (Strict Rules UI) */}
                <View style={[styles.statsFloatingCard, { backgroundColor: theme.isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)' }]}>
                    <View style={styles.cardStatItem}>
                        <View style={[styles.cardIconCircle, { backgroundColor: theme.colors.primary }]}>
                            <Bus size={14} color="#fff" />
                        </View>
                        <View>
                            <Text style={[styles.cardStatLabel, { color: theme.colors.textSecondary }]}>Przystanki</Text>
                            <Text style={[styles.cardStatValue, { color: theme.colors.text }]}>
                                {viewportStats.inView}
                                <Text style={{ color: '#94A3B8', fontWeight: '400', fontSize: 10 }}> / {viewportStats.total}</Text>
                            </Text>
                        </View>
                    </View>
                </View>
            </View>



            <StopDetailsModal
                visible={!!selectedItem}
                stop={selectedItem}
                timetable={timetable}
                isLoading={loadingTimetable}
                onClose={() => {
                    setSelectedItem(null);
                    setIsAllDay(false);
                }}
                theme={theme}
                getStopColor={getStopColor}
                getStopIcon={getStopIcon}
                onRefresh={(allDay) => selectedItem && handleStopPress(selectedItem, allDay)}
                isAllDay={isAllDay}
            />

            {
                isLoading && (
                    <View style={[styles.loadingIndicator, { backgroundColor: theme.colors.card }]}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={[styles.loadingIndicatorText, { color: theme.colors.text }]}>Pobieranie...</Text>
                    </View>
                )
            }

            <Modal
                visible={!!selectedTrip || loadingTrip}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedTrip(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.detailCard, { backgroundColor: theme.colors.card, maxHeight: '80%', paddingBottom: insets.bottom + 100 }]}>
                        <View style={styles.modalDrag} />

                        {loadingTrip ? (
                            <ActivityIndicator size="large" color={theme.colors.primary} style={{ margin: 40 }} />
                        ) : selectedTrip && (
                            <>
                                <View style={styles.detailHeader}>
                                    <View style={[styles.detailIcon, { backgroundColor: selectedTrip.color ? `#${selectedTrip.color}` : '#1E40AF' }]}>
                                        <Train size={32} color="#fff" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.detailName, { color: theme.colors.text }]}>
                                            {selectedTrip.badge ? `${selectedTrip.badge} ` : ''}{selectedTrip.train_number}
                                        </Text>
                                        <Text style={[styles.detailAgency, { color: theme.colors.textSecondary }]}>
                                            {selectedTrip.headsign}
                                            {selectedTrip.continues_as ? ` (kontynuuje jako ${selectedTrip.continues_as})` : ''}
                                        </Text>
                                        <View style={{ flexDirection: 'row', marginTop: 4 }}>
                                            {selectedTrip.attributes?.wifi && <View style={styles.attrBadge}><Wifi size={12} color="#fff" /><Text style={styles.attrText}>WiFi</Text></View>}
                                            {selectedTrip.attributes?.bikes && <View style={styles.attrBadge}><Bike size={12} color="#fff" /><Text style={styles.attrText}>Rowery</Text></View>}
                                            {selectedTrip.attributes?.wheelchair && <View style={styles.attrBadge}><Accessibility size={12} color="#fff" /><Text style={styles.attrText}>Wózki</Text></View>}
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => setSelectedTrip(null)} style={styles.navCircle}>
                                        <X size={24} color={theme.colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {selectedTrip.stops.map((stop: any, index: number) => (
                                        <View key={index} style={styles.tripStopRow}>
                                            <View style={styles.tripTimeline}>
                                                <View style={[styles.tripDot, { backgroundColor: selectedTrip.color ? `#${selectedTrip.color}` : theme.colors.primary }]} />
                                                {index < selectedTrip.stops.length - 1 && <View style={styles.tripLine} />}
                                            </View>
                                            <View style={styles.tripStopContent}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={[styles.tripStopName, { color: theme.colors.text }]}>
                                                        {stop.stop_name}
                                                        {stop.stop_name.toLowerCase().includes('n/ż') && (
                                                            <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: 'bold' }}> (n/ż)</Text>
                                                        )}
                                                    </Text>
                                                    <Text style={[styles.tripStopName, { color: theme.colors.text, fontSize: 13 }]}>
                                                        {stop.departure_time || stop.arrival_time}
                                                    </Text>
                                                </View>
                                                <View style={styles.tripStopMeta}>
                                                    <Clock size={12} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                                                    {stop.arrival_time && stop.departure_time && stop.arrival_time !== stop.departure_time ? (
                                                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                                                            Postój: {stop.arrival_time} - {stop.departure_time}
                                                        </Text>
                                                    ) : (
                                                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Przystanek</Text>
                                                    )}
                                                    {stop.platform && (
                                                        <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '700', marginLeft: 8 }}>
                                                            Peron {stop.platform}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    headerWrapper: { position: 'absolute', left: 16, right: 16, zIndex: 999, elevation: 10 }, // Increased zIndex
    topActionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtnFloating: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    searchPill: { flex: 1, height: 44, borderRadius: 22, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    searchPillText: { marginLeft: 10, fontSize: 15, fontWeight: '500' },
    resultsHeaderContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtnInline: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
    backText: { marginLeft: 4, fontWeight: '600' },
    headerRouteTitle: { fontSize: 18, fontWeight: '800' },
    filtersContainerFloating: { position: 'absolute', left: 0, right: 0, zIndex: 10 },
    filtersScrollContent: { paddingHorizontal: 16, gap: 8 },
    filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
    filterChipText: { marginLeft: 6, fontWeight: '700', fontSize: 13 },
    bottomOverlay: { position: 'absolute', bottom: 100, left: 0, right: 0 },
    stopMarker: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4 },
    mevoStationMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#DC2626',
        borderWidth: 2.5,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 }
    },
    mevoStationText: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 1 },
    mevoMiniMarker: {
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 2
    },
    mevoBoltBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#000', borderRadius: 4, width: 10, height: 10, justifyContent: 'center', alignItems: 'center' },
    mevoBoltText: { fontSize: 7, color: '#F97316', fontWeight: 'bold' },
    loadingIndicator: { position: 'absolute', top: 120, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, elevation: 5 },
    loadingIndicatorText: { fontSize: 11, fontWeight: '700' },
    clusterMarker: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clusterInner: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    clusterText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    detailCard: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20 },
    modalDrag: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    detailIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    detailName: { fontSize: 18, fontWeight: '800' },
    detailAgency: { fontSize: 12, fontWeight: '600' },
    navCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    ttRowCondensed: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
    ttLineAndTimeContainer: { width: 75, alignItems: 'flex-start' },
    ttTimeSmall: { fontSize: 17, fontWeight: '700', letterSpacing: -0.5 },
    ttRelTime: { fontSize: 11, fontWeight: '600', marginTop: 2 },
    ttContentContainer: { flex: 1, paddingLeft: 8 },
    ttLineBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    ttLineBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },
    ttDestination: { fontSize: 15, fontWeight: '600', flex: 1 },
    ttMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    ttPlatform: { fontSize: 11, fontWeight: '700' },
    ttLineTextSmall: { fontSize: 13, fontWeight: '800', color: '#fff' },
    ttLineGroup: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    ttMeta: { fontSize: 14, marginLeft: 'auto', textAlign: 'right', minWidth: 60 },

    directionGroup: { marginBottom: 15 },
    directionHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', paddingVertical: 5, paddingHorizontal: 16, marginBottom: 5 },
    directionIconBg: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    directionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    ttRowModern: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    ttTimeContainer: {
        width: 85,
        justifyContent: 'center',
    },
    ttCountdown: {
        fontSize: 18,
        fontWeight: '900',
    },
    ttAbsolute: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    ttRouteInfo: {
        flex: 1,
        marginLeft: 10,
    },
    ttDestinationText: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
        flex: 1,
    },
    ttLineTextBold: {
        fontSize: 14,
        fontWeight: '900',
        color: '#fff',
    },
    ttEmpty: {
        textAlign: 'center',
        padding: 30,
        color: '#9CA3AF',
        fontWeight: '600',
        fontSize: 14,
    },
    timetableContainer: { paddingTop: 10 },

    // New Summary Styles
    summaryContainer: { paddingHorizontal: 16, marginBottom: 15 },
    summaryRow: { marginBottom: 8 },
    summaryLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
    linesScroll: { flexDirection: 'row' },
    lineChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginRight: 6 },
    lineChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    destinationsText: { fontSize: 13, lineHeight: 18 },
    pksToolbar: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    pksLinesScroll: {
        paddingHorizontal: 15,
    },
    pksLineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#F59E0B',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    pksLineIcon: {
        backgroundColor: '#F59E0B',
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pksLineText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#F59E0B',
        marginLeft: 4,
    },
    // Strict Rules UI Styles
    statsFloatingCard: {
        marginTop: 12,
        alignSelf: 'flex-start',
        borderRadius: 16,
        padding: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        gap: 12,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    cardStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardStatLabel: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: -2,
    },
    cardStatValue: {
        fontSize: 15,
        fontWeight: '800',
    },
    cardStatAction: {
        fontSize: 10,
        color: '#EF4444',
        fontWeight: 'bold',
    },
    tripStopRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16 },
    tripTimeline: { width: 30, alignItems: 'center' },
    tripDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, zIndex: 2 },
    tripLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: -10, zIndex: 1 },
    tripStopContent: { flex: 1, marginLeft: 8 },
    tripStopName: { fontSize: 15, fontWeight: '700' },
    tripStopMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    attrBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E40AF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 6
    },
    attrText: { color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 4 },
    agencyFooter: {
        padding: 16,
        borderTopWidth: 1,
        marginTop: 8
    },
    agencyFooterTitle: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
    agencyFooterName: { fontSize: 14, fontWeight: '700' },
    agencyAction: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8
    },
    agencyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    agencyBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#fff',
        textTransform: 'uppercase',
    },
});
