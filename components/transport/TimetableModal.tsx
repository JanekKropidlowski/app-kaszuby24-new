import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { GeoJSONFeature } from './types';
import { TransportSearchResult } from '../../utils/searchEngine';
import { OTPService } from '../../services/otpService';

import { getAgencyDisplayName, getAgencyColor, getAgencyIcon } from '../../utils/agencyHelpers';

// Lazy load RouteMapModal for better performance
const RouteMapModal = React.lazy(() =>
    import('./RouteMapModal').then(module => ({ default: module.RouteMapModal }))
);

// Konfiguracja polskich nazw
LocaleConfig.locales['pl'] = {
    monthNames: ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'],
    monthNamesShort: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'],
    dayNames: ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'],
    dayNamesShort: ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'],
    today: 'Dziś'
};
LocaleConfig.defaultLocale = 'pl';

type TimetableProvider = 'SKM' | 'POLREGIO' | 'MZK' | 'PKS' | 'SEARCH';

interface TimetableModalProps {
    visible: boolean;
    onClose: () => void;
    stops: TransportSearchResult[];
}

const tfs = (size: number) => (Platform.OS === 'android' ? Math.max(9, size - 3) : size);

const MZK_LINES = [
    { number: '1', route: 'Bolszewo - Wejherowo - Gościcino' },
    { number: '2', route: 'Wejherowo Szpital - Dworzec PKP' },
    { number: '3', route: 'Wejherowo - Gościcino Robakowska' },
    { number: '4', route: 'Wejherowo - Orle' },
    { number: '5', route: 'Wejherowo - Szpital - Pętkowice' },
    { number: '6', route: 'Wejherowo - Kąpino' },
    { number: '7', route: 'Wejherowo - Bolszewo - Gościcino' },
    { number: '8', route: 'Wejherowo - Reda - Rumia' },
    { number: '9', route: 'Reda - Rumia Dworzec PKP' },
    { number: '10', route: 'Wejherowo - Szpital - Fenikowskiego' },
    { number: '11', route: 'Wejherowo - Gowino' },
    { number: '12', route: 'Wejherowo - Góra - Gowino' },
    { number: '16', route: 'Wejherowo - Pętkowice' },
];

interface PKSLine {
    number: string;
    route: string;
    route_id?: string;
}

interface Departure {
    line: string;
    direction: string;
    time: string;
    operator?: string;
    realtime?: boolean;
    platform?: string;
    trip_id?: string;
}

// Memoized DepartureItem component for performance
const DepartureItem = React.memo<{
    item: Departure;
    isSkm: boolean;
    isPolregio: boolean;
    selectedDate: string;
}>(({ item, isSkm, isPolregio, selectedDate }) => {
    const timeRemaining = isToday(selectedDate) ? getTimeRemaining(item.time) : null;
    const iconName = isSkm || isPolregio ? 'train' : 'bus';
    // Dynamiczny kolor na podstawie operatora/agencji
    const agencyColor = `#${getAgencyColor(item.operator)}`;
    return (
        <View style={styles.departureItemSimple}>
            <View style={styles.trainDepartureRow}>
                <View style={styles.trainDepartureLeft}>
                    <MaterialCommunityIcons
                        name={iconName}
                        size={24}
                        color={agencyColor}
                        style={{ marginRight: 12 }}
                    />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.departureTimeLarge}>
                        {item.time.substring(0, 5)}
                    </Text>
                    {timeRemaining && (
                        <Text style={styles.timeRemaining}>{timeRemaining}</Text>
                    )}
                </View>
            </View>
            {item.platform && (
                <View style={styles.platformRow}>
                    <Text style={styles.platformLabel}>Peron {item.platform}</Text>
                </View>
            )}
        </View>
    );
});

// Helper functions
const isToday = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    return date === today;
};

const getTimeRemaining = (time: string) => {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const depTime = new Date(now);
    depTime.setHours(hours, minutes, 0, 0);
    const diff = Math.floor((depTime.getTime() - now.getTime()) / 60000);
    if (diff < 0) return null;
    if (diff === 0) return 'teraz';
    if (diff < 60) return `za ${diff} min`;
    return null;
};

export const TimetableModal: React.FC<TimetableModalProps> = ({ visible, onClose, stops }) => {
    const [selectedProvider, setSelectedProvider] = useState<TimetableProvider | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStop, setSelectedStop] = useState<TransportSearchResult | null>(null);
    const [timetableData, setTimetableData] = useState<Departure[]>([]);
    const [isLoadingTimetable, setIsLoadingTimetable] = useState(false);
    const [timetableError, setTimetableError] = useState<string | null>(null);
    const [selectedMzkLine, setSelectedMzkLine] = useState<string | null>(null);
    const [isMzkSearchMode, setIsMzkSearchMode] = useState(false);
    const [selectedPksLine, setSelectedPksLine] = useState<string | null>(null);
    const [isPksSearchMode, setIsPksSearchMode] = useState(false);
    const [pksLines, setPksLines] = useState<PKSLine[]>([]);
    const [pksLinesLoading, setPksLinesLoading] = useState(false);
    const [pksTimetableData, setPksTimetableData] = useState<any>(null);
    const [selectedDirection, setSelectedDirection] = useState<string | null>(null);
    const [expandedStops, setExpandedStops] = useState<Set<string>>(new Set());
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); // Format YYYY-MM-DD
    const [showCalendar, setShowCalendar] = useState<boolean>(false);
    const [showRouteMap, setShowRouteMap] = useState<boolean>(false);
    const [showSkmMap, setShowSkmMap] = useState<boolean>(false);
    const [showPolregioMap, setShowPolregioMap] = useState<boolean>(false);
    const [trainRouteData, setTrainRouteData] = useState<any>(null);
    const [showStopMap, setShowStopMap] = useState<boolean>(false);
    const [mzkTimetableData, setMzkTimetableData] = useState<any>(null);

    const pksControllerRef = React.useRef<AbortController | null>(null);
    const mzkControllerRef = React.useRef<AbortController | null>(null);

    // NIE wymuszaj Keyboard.dismiss() przy otwarciu modala!


    // Auto-select first direction when MZK timetable loads
    useEffect(() => {
        if (selectedMzkLine && mzkTimetableData && !selectedDirection) {
            const directionsSet = new Set<string>();
            mzkTimetableData.stops?.forEach((stop: any) => {
                stop.departures?.forEach((dep: any) => {
                    if (dep.direction) directionsSet.add(dep.direction);
                });
            });
            const uniqueDirections = Array.from(directionsSet);
            if (uniqueDirections.length > 0) {
                setSelectedDirection(uniqueDirections[0]);
            }
        }
    }, [selectedMzkLine, mzkTimetableData]);

    // Auto-select first direction when SKM/POLREGIO timetable loads
    useEffect(() => {
        if (timetableData.length > 0 && !selectedDirection && selectedStop) {
            const uniqueDirections = Array.from(new Set(timetableData.map(d => d.direction).filter(Boolean)));
            if (uniqueDirections.length > 0) {
                console.log('[TimetableModal] Auto-selecting first direction:', uniqueDirections[0]);
                setSelectedDirection(uniqueDirections[0]);
            }
        }
    }, [timetableData, selectedStop, selectedDirection]);

    // Filter stops for search - only for the selected provider
    const filteredStops = useMemo(() => {
        if (!searchQuery || searchQuery.length < 2) return [];
        const lower = searchQuery.toLowerCase();

        // Filter by agency based on selected provider
        let agencyFilter: string[] = [];
        if (selectedProvider === 'SKM') agencyFilter = ['skm'];
        else if (selectedProvider === 'POLREGIO') agencyFilter = ['polregio'];
        else if (selectedProvider === 'PKS') agencyFilter = ['pks', 'pksgdynia', 'pks gdynia'];
        else if (selectedProvider === 'MZK' || isMzkSearchMode) agencyFilter = ['mzk', 'mzk wejherowo', 'mzk_wejherowo'];
        else if (isPksSearchMode) agencyFilter = ['pks', 'pksgdynia', 'pks gdynia'];

        return stops
            .filter(s => {
                const matchesName = s.name.toLowerCase().includes(lower);
                const matchesAgency = agencyFilter.length === 0 || agencyFilter.includes(s.agency?.toLowerCase() || '');
                return matchesName && matchesAgency;
            })
            .slice(0, 20);
    }, [searchQuery, stops, selectedProvider]);

    useEffect(() => {
        if (!visible) {
            // Reset state on close - dismiss keyboard first
            Keyboard.dismiss();
            // Use setTimeout to ensure keyboard is dismissed before state reset
            const timeout = setTimeout(() => {
                setSelectedProvider(null);
                setSearchQuery('');
                setSelectedStop(null);
                setTimetableData([]);
                setTimetableError(null);
                setSelectedDate(new Date().toISOString().split('T')[0]);
                setShowCalendar(false);
                setSelectedMzkLine(null);
                setSelectedDirection(null);
                setExpandedStops(new Set());
                setIsMzkSearchMode(false);
                setSelectedPksLine(null);
                setPksTimetableData(null);
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [visible]);

    const handleProviderSelect = (provider: TimetableProvider) => {
        setSelectedProvider(provider);
        // Dla SKM i POLREGIO natychmiast włącz tryb search
        if (provider === 'SKM' || provider === 'POLREGIO') {
            setIsMzkSearchMode(false);
        }
        // Dla PKS pobierz listę linii
        if (provider === 'PKS') {
            fetchPksLines();
        }
    };

    const fetchPksLines = async () => {
        setPksLinesLoading(true);
        try {
            const res = await fetch('https://kaszuby24.pl/wp-json/kaszuby24/v2/pks-lines');
            if (!res.ok) throw new Error('Błąd pobierania linii');

            const text = await res.text();
            let cleanText = text.trim();
            if (cleanText.startsWith('<')) {
                const jsonStart = Math.min(
                    cleanText.indexOf('{') !== -1 ? cleanText.indexOf('{') : Infinity,
                    cleanText.indexOf('[') !== -1 ? cleanText.indexOf('[') : Infinity
                );
                if (jsonStart !== Infinity) {
                    cleanText = cleanText.substring(jsonStart);
                    console.log('[PKS Lines] Stripped HTML warnings from response');
                }
            }
            const data = JSON.parse(cleanText);
            setPksLines(data.lines || []);
        } catch (e) {
            console.error('[PKS Lines] Error:', e);
            setPksLines([]);
        } finally {
            setPksLinesLoading(false);
        }
    };

    const fetchPksLineTimetable = async (line: string, dateString?: string) => {
        const targetDate = dateString || selectedDate;
        setIsLoadingTimetable(true);
        setTimetableError(null);
        setPksTimetableData(null);

        try {
            console.log(`[PKS Timetable] Fetching from OTP for line ${line} on ${targetDate}`);

            // Use OTP API instead of WordPress API
            const data = await OTPService.getPKSLineTimetable(line, targetDate);

            console.log(`[PKS Timetable] Retrieved ${data.stops?.length || 0} stops from OTP`);

            setPksTimetableData(data);

        } catch (e: any) {
            console.error('[PKS Timetable] Error:', e);
            setTimetableError('Nie udało się pobrać rozkładu dla tej linii.');
        } finally {
            pksControllerRef.current = null;
            setIsLoadingTimetable(false);
        }
    };

    const fetchTimetable = async (stop: TransportSearchResult, dateString?: string) => {
        const targetDate = dateString || selectedDate;
        setSelectedStop(stop);
        setIsLoadingTimetable(true);
        setTimetableError(null);
        setTimetableData([]);

        try {
            const agency = stop.agency || 'unknown';
            const stopId = stop.id;

            // Use OTP API instead of WordPress timetable API
            console.log(`[Timetable] Fetching from OTP for ${agency}:${stopId} on ${targetDate}`);

            const departures = await OTPService.getDepartures(stopId, agency, targetDate);

            console.log('[Timetable] OTP Departures count:', departures.length);
            if (departures.length > 0) {
                console.log('[Timetable] Sample OTP departures:', JSON.stringify(departures.slice(0, 5), null, 2));
            }

            // Convert to our Departure interface (already compatible)
            const normalizedDepartures: Departure[] = departures.map(dep => ({
                line: dep.line,
                direction: dep.direction,
                time: dep.time,
                operator: dep.operator,
                realtime: dep.realtime || false,
                platform: dep.platform || undefined,
                trip_id: dep.trip_id || undefined
            }));

            setTimetableData(normalizedDepartures);

        } catch (e) {
            console.error('[Timetable] Error:', e);
            setTimetableError('Nie udało się pobrać rozkładu.');
        } finally {
            setIsLoadingTimetable(false);
        }
    };


    const renderProviderList = () => (
        <View style={styles.grid}>

            <TouchableOpacity style={[styles.card, styles.cardAcc]} onPress={() => handleProviderSelect('SKM')}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFD54F' }]}>
                    <MaterialCommunityIcons name="train" size={24} color="#000" />
                </View>
                <Text style={styles.cardLabel}>SKM Trójmiasto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.card, styles.cardAcc]} onPress={() => handleProviderSelect('POLREGIO')}>
                <View style={[styles.iconCircle, { backgroundColor: '#D32F2F' }]}>
                    <MaterialCommunityIcons name="train" size={24} color="#FFF" />
                </View>
                <Text style={styles.cardLabel}>Polregio</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.card, styles.cardAcc]} onPress={() => handleProviderSelect('PKS')}>
                <View style={[styles.iconCircle, { backgroundColor: '#388E3C' }]}>
                    <MaterialCommunityIcons name="bus" size={24} color="#FFF" />
                </View>
                <Text style={styles.cardLabel}>PKS Gdynia</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.card, styles.cardAcc]} onPress={() => handleProviderSelect('MZK')}>
                <View style={[styles.iconCircle, { backgroundColor: '#1A237E' }]}>
                    <MaterialCommunityIcons name="bus" size={24} color="#FFF" />
                </View>
                <Text style={styles.cardLabel}>MZK Wejherowo</Text>
            </TouchableOpacity>
        </View>
    );

    const renderMzkLines = () => (
        <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedProvider(null)}>
                <Ionicons name="arrow-back" size={20} color="#4A5568" />
                <Text style={styles.backText}>Wróć do wyboru</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Wybierz linię MZK</Text>

            <TouchableOpacity
                style={styles.searchButton}
                onPress={() => setIsMzkSearchMode(true)}
            >
                <Ionicons name="search" size={20} color="#4A5568" />
                <Text style={styles.searchButtonText}>Szukaj przystanku...</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {MZK_LINES.map(line => (
                    <TouchableOpacity
                        key={line.number}
                        style={styles.lineItem}
                        onPress={() => {
                            // For MZK, we'll show a message that timetables are coming soon
                            // or implement backend endpoint to fetch MZK line timetable
                            setSelectedMzkLine(line.number);
                            console.log(`Selected MZK line ${line.number} - timetable display coming soon`);
                        }}
                    >
                        <View style={styles.lineNumberBadge}>
                            <Text style={styles.lineNumber}>{line.number}</Text>
                        </View>
                        <Text style={styles.lineRoute} numberOfLines={1}>{line.route}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderPksLines = () => (
        <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedProvider(null)}>
                <Ionicons name="arrow-back" size={20} color="#4A5568" />
                <Text style={styles.backText}>Wróć do wyboru</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Wybierz linię PKS Gdynia</Text>

            <TouchableOpacity
                style={styles.searchButton}
                onPress={() => setIsPksSearchMode(true)}
            >
                <Ionicons name="search" size={20} color="#4A5568" />
                <Text style={styles.searchButtonText}>Szukaj przystanku...</Text>
            </TouchableOpacity>

            {pksLinesLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#388E3C" />
                    <Text style={styles.loadingText}>Pobieranie listy linii...</Text>
                </View>
            ) : pksLines.length === 0 ? (
                <View style={styles.centered}>
                    <MaterialCommunityIcons name="bus-alert" size={48} color="#A0AEC0" />
                    <Text style={styles.emptyText}>Brak dostępnych linii</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                    <View style={styles.pksLinesGrid}>
                        {pksLines.map(line => (
                            <TouchableOpacity
                                key={line.number}
                                style={styles.pksLineCard}
                                onPress={() => {
                                    setSelectedPksLine(line.number);
                                }}
                            >
                                <Text style={styles.pksLineNumber}>{line.number}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );

    const renderPksLineDetail = () => {
        const line = pksLines.find(l => l.number === selectedPksLine);
        if (!line) return null;

        return (
            <View style={{ flex: 1 }}>
                <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedPksLine(null); setPksTimetableData(null); }}>
                    <Ionicons name="arrow-back" size={20} color="#4A5568" />
                    <Text style={styles.backText}>Wróć do listy linii</Text>
                </TouchableOpacity>

                <View style={styles.stopHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.lineNumberBadge, { backgroundColor: '#388E3C', marginRight: 12 }]}>
                                <Text style={styles.lineNumber}>{line.number}</Text>
                            </View>
                            <Text style={styles.stopName}>Linia {line.number}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                style={styles.calendarBtn}
                                onPress={() => setShowRouteMap(true)}
                                disabled={!pksTimetableData?.stops || pksTimetableData.stops.length < 2}
                            >
                                <Ionicons name="map" size={18} color="#388E3C" />
                                <Text style={[styles.calendarBtnText, { color: '#388E3C', fontSize: tfs(10) }]}>Mapa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.calendarBtn} onPress={() => setShowCalendar(true)}>
                                <Ionicons name="calendar" size={18} color="#388E3C" />
                                <Text style={[styles.calendarBtnText, { color: '#388E3C' }]}>
                                    {isToday(selectedDate) ? 'Dziś' : selectedDate.split('-').reverse().slice(0, 2).join('.')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={styles.stopAgency}>{line.route}</Text>
                </View>

                {/* NAGŁÓWEK KIERUNKÓW */}
                {(() => {
                    // Use availableDirections from API (already sorted by direction)
                    const uniqueDirections: string[] = pksTimetableData?.availableDirections || [];
                    const currentDirection = selectedDirection;

                    return uniqueDirections.length > 1 ? (
                        <View>
                            <Text style={styles.directionHeaderLabel}>Wybierz kierunek jazdy</Text>
                            <View style={styles.directionTabs}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 16 }}
                                >
                                    {uniqueDirections.map(dir => (
                                        <TouchableOpacity
                                            key={dir}
                                            style={[
                                                styles.directionTab,
                                                currentDirection === dir && styles.directionTabActivePKS
                                            ]}
                                            onPress={() => {
                                                setSelectedDirection(dir);
                                                setExpandedStops(new Set());
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.directionTabText,
                                                    currentDirection === dir && styles.directionTabTextActivePKS
                                                ]}
                                            >
                                                {dir}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    ) : null;
                })()}

                {isLoadingTimetable ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#388E3C" />
                        <Text style={styles.loadingText}>Pobieranie rozkładu linii...</Text>
                    </View>
                ) : timetableError ? (
                    <View style={styles.centered}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#EF4444" />
                        <Text style={styles.errorText}>{timetableError}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPksLineTimetable(line.number, selectedDate)}>
                            <Text style={styles.retryText}>Spróbuj ponownie</Text>
                        </TouchableOpacity>
                    </View>
                ) : !pksTimetableData || !pksTimetableData.stops || pksTimetableData.stops.length === 0 ? (
                    <View style={styles.centered}>
                        <MaterialCommunityIcons name="bus-clock" size={48} color="#A0AEC0" />
                        <Text style={[styles.emptyText, { marginTop: 16, fontSize: tfs(16), fontFamily: 'Poppins-Bold' }]}>Brak kursów w tym dniu</Text>
                        <Text style={[styles.emptyText, { marginTop: 8, fontSize: tfs(13), textAlign: 'center' }]}>
                            Wybrana linia nie kursuje {isToday(selectedDate) ? 'dzisiaj' : 'w wybranym dniu'}.
                        </Text>
                        <Text style={[styles.emptyText, { marginTop: 4, fontSize: tfs(12), textAlign: 'center', color: '#718096' }]}>
                            💡 Najbliższy kurs prawdopodobnie jutro rano
                        </Text>

                        <View style={{ flexDirection: 'row', marginTop: 24, gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.retryBtn, { backgroundColor: '#388E3C' }]}
                                onPress={() => {
                                    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                                    setSelectedDate(tomorrow);
                                    fetchPksLineTimetable(line.number, tomorrow);
                                }}
                            >
                                <Text style={[styles.retryText, { color: '#FFF' }]}>Sprawdź jutro</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.retryBtn} onPress={() => setShowCalendar(true)}>
                                <Text style={styles.retryText}>Inna data</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        {(() => {
                            const availableDirs = pksTimetableData?.availableDirections || [];
                            const currentDirection = selectedDirection || (availableDirs.length > 0 ? availableDirs[0] : null);

                            // Aktualny czas do filtracji przeszłych odjazdów
                            const now = new Date();
                            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                            const todayDate = new Date().toISOString().split('T')[0];
                            const isTodaySelected = selectedDate === todayDate;

                            // Use stopsByDirection if available (already sorted by route order)
                            const stopsForDirection = currentDirection && pksTimetableData?.stopsByDirection?.[currentDirection]
                                ? pksTimetableData.stopsByDirection[currentDirection]
                                : pksTimetableData?.stops || [];

                            const filteredStops = stopsForDirection
                                .map((stop: any) => ({
                                    ...stop,
                                    departures: (stop.departures || [])
                                        // Filtruj przeszłe odjazdy tylko dla dzisiaj
                                        .filter((dep: any) => !isTodaySelected || (dep.time && dep.time.substring(0, 5) >= currentTime))
                                }))
                                .filter((stop: any) => stop.departures.length > 0);

                            if (!filteredStops || filteredStops.length === 0) {
                                return (
                                    <View style={styles.centered}>
                                        <MaterialCommunityIcons name="bus-clock" size={48} color="#A0AEC0" />
                                        <Text style={[styles.emptyText, { marginTop: 16, fontSize: tfs(16), fontFamily: 'Poppins-Bold' }]}>Brak kursów dla wybranego kierunku</Text>
                                        <Text style={[styles.emptyText, { marginTop: 8, fontSize: tfs(13), textAlign: 'center' }]}>Nie znaleziono kursów dla tego kierunku w wybranym dniu.</Text>
                                    </View>
                                );
                            }

                            return (
                                <View style={styles.timelineContainer}>
                                    {filteredStops.map((stop: any, stopIdx: number) => {
                                        const stopKey = `pks-stop-${stopIdx}`;
                                        const isExpanded = expandedStops.has(stopKey);

                                        return (
                                            <View key={stopIdx}>
                                                <TouchableOpacity
                                                    style={styles.timelineStop}
                                                    onPress={() => {
                                                        const newSet = new Set(expandedStops);
                                                        if (isExpanded) {
                                                            newSet.delete(stopKey);
                                                        } else {
                                                            newSet.add(stopKey);
                                                        }
                                                        setExpandedStops(newSet);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.timelineIndicator}>
                                                        <View style={[styles.timelineDot, { backgroundColor: '#388E3C' }]} />
                                                        {stopIdx < filteredStops.length - 1 && <View style={styles.timelineLine} />}
                                                    </View>
                                                    <View style={styles.timelineContent}>
                                                        <Text style={styles.timelineStopName}>{stop.stop_name}</Text>
                                                        <Ionicons
                                                            name={isExpanded ? "chevron-up" : "chevron-down"}
                                                            size={18}
                                                            color="#A0AEC0"
                                                            style={{ marginLeft: 8 }}
                                                        />
                                                    </View>
                                                </TouchableOpacity>

                                                {isExpanded && (
                                                    <View style={styles.timelineDepartures}>
                                                        <View style={styles.departuresGrid}>
                                                            {stop.departures.map((dep: any, depIdx: number) => {
                                                                const timeWithoutSeconds = dep.time ? dep.time.substring(0, 5) : '';
                                                                return (
                                                                    <View key={depIdx} style={[styles.departureTimeChip, { backgroundColor: '#E8F5E9', borderColor: '#388E3C' }]}>
                                                                        <Text style={[styles.departureTimeText, { color: '#1B5E20' }]}>{timeWithoutSeconds}</Text>
                                                                    </View>
                                                                );
                                                            })}
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        })()}
                    </ScrollView>
                )}
            </View>
        );
    };

    const getTimeRemaining = (departureTime: string): string | null => {
        const now = new Date();
        const [hours, minutes] = departureTime.split(':').map(Number);
        const departure = new Date();
        departure.setHours(hours, minutes, 0, 0);

        const diffMs = departure.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 0) return null; // Past departure
        if (diffMins === 0) return 'teraz';
        if (diffMins < 60) return `za ${diffMins} min`;
        if (diffMins <= 120) {
            const hrs = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            if (mins === 0) return `za ${hrs} godz`;
            return `za ${hrs}h ${mins}min`;
        }
        return null;
    };
    const getDateLabel = (dateString: string): string => {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        if (dateString === today) return 'Dziś';
        if (dateString === tomorrow) return 'Jutro';

        // Format as DD.MM
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}.${month}`;
    };

    const renderTimetable = () => {
        // Wyciągnij unikalne kierunki z danych
        const uniqueDirections = Array.from(new Set(timetableData.map(d => d.direction).filter(Boolean)));
        const currentDirection = selectedDirection; // Nie wybieraj automatycznie kierunku

        console.log('[TimetableModal] selectedDirection:', selectedDirection);
        console.log('[TimetableModal] uniqueDirections:', uniqueDirections);
        console.log('[TimetableModal] currentDirection:', currentDirection);

        // Filtruj dane po wybranym kierunku i ukryj przeszłe odjazdy
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Sprawdź czy wybrano dzisiaj
        const isTodaySelected = isToday(selectedDate);

        // Filtruj po kierunku i (jeśli dziś) ukryj przeszłe odjazdy
        const filteredData = timetableData
            .filter(d => !currentDirection || d.direction === currentDirection)
            .filter(d => !isTodaySelected || d.time >= currentTime); // Ukryj przeszłe tylko dla dzisiaj

        console.log('[TimetableModal] filteredData count:', filteredData.length);
        console.log('[TimetableModal] filteredData sample:', filteredData.slice(0, 3));

        const agencyLower = selectedStop?.agency?.toLowerCase() || '';
        const isSkm = selectedProvider === 'SKM' || agencyLower.includes('skm');
        const isPolregio = selectedProvider === 'POLREGIO' || agencyLower.includes('polregio');
        const isPks = selectedProvider === 'PKS' || agencyLower.includes('pks');
        const isMzk = selectedProvider === 'MZK' || agencyLower.includes('mzk');

        return (
            <View style={{ flex: 1 }}>
                <TouchableOpacity style={styles.backBtn} onPress={() => {
                    setSelectedStop(null);
                    setTimetableData([]);
                    setSelectedDirection(null);
                    setExpandedStops(new Set());
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                }}>
                    <Ionicons name="arrow-back" size={20} color="#4A5568" />
                    <Text style={styles.backText}>Wróć do wyszukiwania</Text>
                </TouchableOpacity>

                <View style={styles.stopHeaderRow}>
                    <View style={styles.stopHeaderLeft}>
                        <Text style={styles.stopName}>{selectedStop?.name}</Text>
                        <Text style={styles.stopAgency}>
                            {isSkm ? 'STACJA SKM' : getAgencyDisplayName(selectedStop?.agency)}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {(isSkm || isPolregio) && filteredData.length > 0 && (
                            <TouchableOpacity
                                style={styles.calendarBtn}
                                onPress={() => {
                                    if (isSkm) {
                                        setShowSkmMap(true);
                                    } else {
                                        setShowPolregioMap(true);
                                    }
                                }}
                            >
                                <Ionicons
                                    name="map"
                                    size={18}
                                    color={isSkm ? '#FFB300' : '#1A6ADD'}
                                />
                                <Text style={[styles.calendarBtnText, {
                                    color: isSkm ? '#FFB300' : '#1A6ADD',
                                    fontSize: tfs(10)
                                }]}>
                                    Mapa
                                </Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.calendarBtn}
                            onPress={() => setShowCalendar(true)}
                        >
                            <Ionicons
                                name="calendar"
                                size={24}
                                color={isSkm ? '#FFB300' : (isPolregio ? '#1A237E' : '#2D3748')}
                            />
                            <Text style={[styles.calendarBtnText, {
                                color: isSkm ? '#FFB300' : (isPolregio ? '#1A237E' : '#2D3748')
                            }]}>
                                {getDateLabel(selectedDate)}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* TABY KIERUNKÓW */}
                {uniqueDirections.length > 1 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.directionTabs}
                        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
                    >
                        {uniqueDirections.map(dir => {
                            const isActive = currentDirection === dir;
                            let activeStyle = styles.directionTabActiveMZK;
                            if (isSkm) {
                                activeStyle = styles.directionTabActiveSKM;
                            } else if (isPolregio) {
                                activeStyle = styles.directionTabActivePOLREGIO;
                            } else if (isPks) {
                                activeStyle = styles.directionTabActivePKS;
                            }

                            return (
                                <TouchableOpacity
                                    key={dir}
                                    style={[
                                        styles.directionTab,
                                        isActive && activeStyle
                                    ]}
                                    onPress={() => {
                                        setSelectedDirection(dir);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.directionTabText,
                                            isActive && (isSkm ? styles.directionTabTextActiveSKM : styles.directionTabTextActive)
                                        ]}
                                    >
                                        {dir}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}

                {isLoadingTimetable ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#FFB300" />
                        <Text style={styles.loadingText}>Pobieranie rozkładu...</Text>
                    </View>
                ) : timetableError ? (
                    <View style={styles.centered}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#EF4444" />
                        <Text style={styles.errorText}>{timetableError}</Text>
                    </View>
                ) : filteredData.length === 0 ? (
                    <View style={styles.centered}>
                        <MaterialCommunityIcons name="timetable" size={40} color="#A0AEC0" />
                        <Text style={styles.emptyText}>Brak nadchodzących odjazdów</Text>
                    </View>
                ) : (
                    <FlashList
                        data={filteredData}
                        keyExtractor={(item, index) => `dep-${index}`}
                        renderItem={({ item }) => (
                            <DepartureItem
                                item={item}
                                isSkm={isSkm}
                                isPolregio={isPolregio}
                                selectedDate={selectedDate}
                            />
                        )}
                        ListFooterComponent={<View style={{ height: 20 }} />}
                    />
                )}
            </View>
        );
    };

    const renderStopSearch = () => (
        <View style={{ flex: 1 }}>
            <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                    if (isMzkSearchMode) {
                        setIsMzkSearchMode(false);
                    } else if (isPksSearchMode) {
                        setIsPksSearchMode(false);
                    } else {
                        setSelectedProvider(null);
                    }
                }}
            >
                <Ionicons name="arrow-back" size={20} color="#4A5568" />
                <Text style={styles.backText}>Wróć do wyboru</Text>
            </TouchableOpacity>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#A0AEC0" style={{ marginRight: 10 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Wpisz nazwę przystanku..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                    autoFocus
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color="#CBD5E0" />
                    </TouchableOpacity>
                )}
            </View>

            <FlashList
                data={filteredStops}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                    searchQuery.length > 1 ? (
                        <Text style={styles.noResults}>Nie znaleziono przystanków</Text>
                    ) : null
                }
                keyExtractor={(item) => item.id + item.agency}
                renderItem={({ item }) => {
                    const agencyColor = `#${getAgencyColor(item.agency)}`;
                    const agencyIconName = getAgencyIcon(item.agency);
                    return (
                        <TouchableOpacity
                            style={styles.stopItem}
                            onPress={() => fetchTimetable(item)}
                        >
                            <View style={[styles.stopItemIcon, { backgroundColor: `${agencyColor}20` }]}>
                                <MaterialCommunityIcons name={agencyIconName} size={20} color={agencyColor} />
                            </View>
                            <View style={styles.stopItemText}>
                                <Text style={styles.stopItemName}>{item.name}</Text>
                                <Text style={[styles.stopItemAgency, { color: agencyColor }]}>{getAgencyDisplayName(item.agency)}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );

    const fetchMzkLineTimetable = async (line: string, dateString?: string) => {
        const targetDate = dateString || selectedDate;
        setIsLoadingTimetable(true);
        setTimetableError(null);
        setMzkTimetableData(null);

        try {
            console.log(`[MZK Timetable] Fetching from OTP for line ${line} on ${targetDate}`);
            console.log(`[MZK Timetable] Fetching from OTP for line ${line} on ${targetDate}`);

            // Use OTP API instead of WordPress API
            const data = await OTPService.getMZKLineTimetable(line, targetDate);

            console.log(`[MZK Timetable] Retrieved ${data.stops?.length || 0} stops from OTP`);

            setMzkTimetableData(data);

        } catch (e: any) {
            console.error('[MZK Timetable] Error:', e);
            setTimetableError('Nie udało się pobrać rozkładu dla tej linii.');
        } finally {
            mzkControllerRef.current = null;
            setIsLoadingTimetable(false);
        }
    };

    // Abort any in-flight fetches on unmount
    useEffect(() => {
        return () => {
            if (pksControllerRef.current) pksControllerRef.current.abort();
            if (mzkControllerRef.current) mzkControllerRef.current.abort();
        };
    }, []);

    useEffect(() => {
        if (selectedMzkLine) {
            fetchMzkLineTimetable(selectedMzkLine, selectedDate);
        }
    }, [selectedMzkLine, selectedDate]);

    useEffect(() => {
        if (selectedPksLine) {
            fetchPksLineTimetable(selectedPksLine, selectedDate);
        }
    }, [selectedPksLine, selectedDate]);

    // Fetch train route data when map is opened
    const fetchTrainRoute = async (agency: string) => {
        setTrainRouteData(null);

        try {
            // Extract directions and ALL trip_ids per direction
            const uniqueDirections = Array.from(
                new Set(timetableData.map(dep => dep.direction).filter(Boolean))
            );

            console.log('[Train Route] Available directions:', uniqueDirections);

            // Build ALL trip_ids per direction (not just first one)
            const directionTrips: { [direction: string]: string[] } = {};
            uniqueDirections.forEach(dir => {
                const tripsForDirection = timetableData
                    .filter(dep => dep.direction === dir && dep.trip_id)
                    .map(dep => dep.trip_id!);
                directionTrips[dir] = Array.from(new Set(tripsForDirection)); // Unique trip_ids
            });

            // Pass timetableData for merging departures
            setTrainRouteData({
                stopsByDirection: {}, // Empty - will be filled when direction selected
                directions: uniqueDirections,
                direction: null,
                agency: agency,
                directionTrips: directionTrips, // ALL trip_ids per direction
                timetableData: timetableData // Pass full timetable for departure merging
            });

        } catch (e) {
            console.error('[Train Route] Error:', e);
        }
    };

    useEffect(() => {
        if ((showSkmMap || showPolregioMap) && timetableData.length > 0 && selectedStop) {
            const agency = showSkmMap ? 'skm' : 'polregio';
            fetchTrainRoute(agency);
        }
    }, [showSkmMap, showPolregioMap]);

    const renderMzkLineDetail = () => {
        const line = MZK_LINES.find(l => l.number === selectedMzkLine);
        if (!line) return null;

        return (
            <View style={{ flex: 1 }}>
                <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedMzkLine(null); setMzkTimetableData(null); }}>
                    <Ionicons name="arrow-back" size={20} color="#4A5568" />
                    <Text style={styles.backText}>Wróć do listy linii</Text>
                </TouchableOpacity>

                <View style={styles.stopHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.lineNumberBadge, { marginRight: 12 }]}>
                                <Text style={styles.lineNumber}>{line.number}</Text>
                            </View>
                            <Text style={styles.stopName}>Linia {line.number}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                style={styles.calendarBtn}
                                onPress={() => setShowRouteMap(true)}
                                disabled={!mzkTimetableData?.stops || mzkTimetableData.stops.length < 2}
                            >
                                <Ionicons name="map" size={18} color="#1A237E" />
                                <Text style={[styles.calendarBtnText, { color: '#1A237E', fontSize: tfs(10) }]}>Mapa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.calendarBtn} onPress={() => setShowCalendar(true)}>
                                <Ionicons name="calendar" size={18} color={`#${getAgencyColor(selectedStop?.agency)}`} />
                                <Text style={[styles.calendarBtnText, { color: `#${getAgencyColor(selectedStop?.agency)}` }]}>
                                    {isToday(selectedDate) ? 'Dziś' : selectedDate.split('-').reverse().slice(0, 2).join('.')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={styles.stopAgency}>{line.route}</Text>
                </View>

                {/* NAGŁÓWEK KIERUNKÓW */}
                {(() => {
                    // Use availableDirections from API (already sorted by direction)
                    const uniqueDirections: string[] = mzkTimetableData?.availableDirections || [];
                    // Auto-select pierwszy kierunek dla MZK
                    const currentDirection = selectedDirection || (uniqueDirections.length > 0 ? uniqueDirections[0] : null);

                    return uniqueDirections.length > 1 ? (
                        <View>
                            <Text style={styles.directionHeaderLabel}>Wybierz kierunek jazdy</Text>
                            <View style={styles.directionTabs}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 16 }}
                                >
                                    {uniqueDirections.map(dir => (
                                        <TouchableOpacity
                                            key={dir}
                                            style={[
                                                styles.directionTab,
                                                currentDirection === dir && styles.directionTabActiveMZK
                                            ]}
                                            onPress={() => {
                                                setSelectedDirection(dir);
                                                setExpandedStops(new Set());
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.directionTabText,
                                                    currentDirection === dir && styles.directionTabTextActive
                                                ]}
                                            >
                                                {dir}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    ) : null;
                })()}

                {isLoadingTimetable ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#1A237E" />
                        <Text style={styles.loadingText}>Pobieranie rozkładu linii...</Text>
                    </View>
                ) : timetableError ? (
                    <View style={styles.centered}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#EF4444" />
                        <Text style={styles.errorText}>{timetableError}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchMzkLineTimetable(line.number, selectedDate)}>
                            <Text style={styles.retryText}>Spróbuj ponownie</Text>
                        </TouchableOpacity>
                    </View>
                ) : !mzkTimetableData || !mzkTimetableData.stops || mzkTimetableData.stops.length === 0 ? (
                    <View style={styles.centered}>
                        <MaterialCommunityIcons name="bus-clock" size={48} color="#A0AEC0" />
                        <Text style={[styles.emptyText, { marginTop: 16, fontSize: tfs(16) }]}>Brak danych rozkładu</Text>
                        <Text style={[styles.emptyText, { marginTop: 8, fontSize: tfs(13), textAlign: 'center' }]}>
                            Nie znaleziono aktywnych kursów dla tej linii w wybranym dniu.
                        </Text>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        {(() => {
                            const availableDirs = mzkTimetableData?.availableDirections || [];
                            const currentDirection = selectedDirection || (availableDirs.length > 0 ? availableDirs[0] : null);

                            // Aktualny czas do filtracji przeszłych odjazdów
                            const now = new Date();
                            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                            const todayDate = new Date().toISOString().split('T')[0];
                            const isTodaySelected = selectedDate === todayDate;

                            // Use stopsByDirection if available (already sorted by route order)
                            const stopsForDirection = currentDirection && mzkTimetableData?.stopsByDirection?.[currentDirection]
                                ? mzkTimetableData.stopsByDirection[currentDirection]
                                : mzkTimetableData?.stops || [];

                            const filteredStops = stopsForDirection
                                .map((stop: any) => ({
                                    ...stop,
                                    departures: (stop.departures || [])
                                        // Filtruj przeszłe odjazdy tylko dla dzisiaj
                                        .filter((dep: any) => !isTodaySelected || (dep.time && dep.time.substring(0, 5) >= currentTime))
                                }))
                                .filter((stop: any) => stop.departures.length > 0);

                            if (!filteredStops || filteredStops.length === 0) {
                                return (
                                    <View style={styles.centered}>
                                        <MaterialCommunityIcons name="bus-clock" size={48} color="#A0AEC0" />
                                        <Text style={[styles.emptyText, { marginTop: 16, fontSize: tfs(16) }]}>Brak kursów dla wybranego kierunku</Text>
                                        <Text style={[styles.emptyText, { marginTop: 8, fontSize: tfs(13), textAlign: 'center' }]}>Nie znaleziono aktywnych kursów dla tego kierunku w wybranym dniu.</Text>
                                    </View>
                                );
                            }

                            return (
                                <View style={styles.timelineContainer}>
                                    {filteredStops.map((stop: any, stopIdx: number) => {
                                        const stopKey = `mzk-stop-${stopIdx}`;
                                        const isExpanded = expandedStops.has(stopKey);

                                        return (
                                            <View key={stopIdx}>
                                                <TouchableOpacity
                                                    style={styles.timelineStop}
                                                    onPress={() => {
                                                        const newSet = new Set(expandedStops);
                                                        if (isExpanded) {
                                                            newSet.delete(stopKey);
                                                        } else {
                                                            newSet.add(stopKey);
                                                        }
                                                        setExpandedStops(newSet);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.timelineIndicator}>
                                                        <View style={[styles.timelineDot, { backgroundColor: '#1A237E' }]} />
                                                        {stopIdx < filteredStops.length - 1 && <View style={styles.timelineLine} />}
                                                    </View>
                                                    <View style={styles.timelineContent}>
                                                        <Text style={styles.timelineStopName}>{stop.stop_name}</Text>
                                                        <Ionicons
                                                            name={isExpanded ? "chevron-up" : "chevron-down"}
                                                            size={18}
                                                            color="#A0AEC0"
                                                            style={{ marginLeft: 8 }}
                                                        />
                                                    </View>
                                                </TouchableOpacity>

                                                {isExpanded && (
                                                    <View style={styles.timelineDepartures}>
                                                        <View style={styles.departuresGrid}>
                                                            {stop.departures.map((dep: any, depIdx: number) => {
                                                                const timeWithoutSeconds = dep.time ? dep.time.substring(0, 5) : '';
                                                                return (
                                                                    <View key={depIdx} style={[styles.departureTimeChip, { backgroundColor: '#EEF2FF', borderColor: '#1A237E' }]}>
                                                                        <Text style={[styles.departureTimeText, { color: '#1A237E' }]}>{timeWithoutSeconds}</Text>
                                                                    </View>
                                                                );
                                                            })}
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        })()}
                    </ScrollView>
                )}
            </View>
        );
    };

    // Po zamknięciu wyszukiwarki wracaj do wyboru przewoźnika
    const handleClose = useCallback(() => {
        setIsMzkSearchMode(false);
        setIsPksSearchMode(false);
        setSelectedProvider(null);
        setSelectedStop(null);
        setSelectedMzkLine(null);
        setSelectedPksLine(null);
        setPksTimetableData(null);
        setMzkTimetableData(null);
        setTimetableData([]);
        setTimetableError(null);
        setSelectedDirection(null);
        setExpandedStops(new Set());
        onClose();
    }, [onClose]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    onPress={handleClose}
                    activeOpacity={1}
                />
                <View style={[
                    styles.content,
                    (selectedProvider === 'MZK' || selectedProvider === 'SKM' || selectedProvider === 'POLREGIO' || selectedProvider === 'PKS') ? { height: '80%' } : null
                ]}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {selectedStop ? 'Rozkład jazdy' : 'Rozkłady Jazdy'}
                        </Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#718096" />
                        </TouchableOpacity>
                    </View>

                    {selectedStop ? renderTimetable() :
                        selectedMzkLine ? renderMzkLineDetail() :
                            selectedPksLine ? renderPksLineDetail() :
                                (selectedProvider === 'SKM' || selectedProvider === 'POLREGIO' || isMzkSearchMode || isPksSearchMode) ? renderStopSearch() :
                                    selectedProvider === 'MZK' ? renderMzkLines() :
                                        selectedProvider === 'PKS' ? renderPksLines() :
                                            renderProviderList()}
                </View>
            </KeyboardAvoidingView>

            {/* Calendar Modal */}
            <Modal visible={showCalendar} animationType="slide" transparent onRequestClose={() => setShowCalendar(false)}>
                <View style={styles.calendarOverlay}>
                    <TouchableOpacity
                        style={styles.calendarBackdrop}
                        onPress={() => setShowCalendar(false)}
                        activeOpacity={1}
                    />
                    <View style={styles.calendarModal}>
                        <View style={styles.calendarHeader}>
                            <Text style={styles.calendarTitle}>Wybierz datę odjazdu</Text>
                            <TouchableOpacity onPress={() => setShowCalendar(false)}>
                                <Ionicons name="close" size={28} color="#4A5568" />
                            </TouchableOpacity>
                        </View>

                        {/* Quick select buttons */}
                        <View style={styles.quickSelectRow}>
                            <TouchableOpacity
                                style={[styles.quickSelectBtn, isToday(selectedDate) && styles.quickSelectBtnActive]}
                                onPress={() => {
                                    const today = new Date().toISOString().split('T')[0];
                                    setSelectedDate(today);
                                    setShowCalendar(false);
                                    if (selectedStop) {
                                        fetchTimetable(selectedStop, today);
                                    } else if (selectedPksLine) {
                                        fetchPksLineTimetable(selectedPksLine, today);
                                    }
                                }}
                            >
                                <Text style={[styles.quickSelectText, isToday(selectedDate) && styles.quickSelectTextActive]}>Dziś</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.quickSelectBtn, selectedDate === new Date(Date.now() + 86400000).toISOString().split('T')[0] && styles.quickSelectBtnActive]}
                                onPress={() => {
                                    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                                    setSelectedDate(tomorrow);
                                    setShowCalendar(false);
                                    if (selectedStop) {
                                        fetchTimetable(selectedStop, tomorrow);
                                    } else if (selectedPksLine) {
                                        fetchPksLineTimetable(selectedPksLine, tomorrow);
                                    }
                                }}
                            >
                                <Text style={[styles.quickSelectText, selectedDate === new Date(Date.now() + 86400000).toISOString().split('T')[0] && styles.quickSelectTextActive]}>Jutro</Text>
                            </TouchableOpacity>
                        </View>

                        <Calendar
                            current={selectedDate}
                            onDayPress={(day: any) => {
                                setSelectedDate(day.dateString);
                                setShowCalendar(false);
                                if (selectedStop) {
                                    fetchTimetable(selectedStop, day.dateString);
                                } else if (selectedPksLine) {
                                    fetchPksLineTimetable(selectedPksLine, day.dateString);
                                }
                            }}
                            markedDates={{
                                [selectedDate]: { selected: true, selectedColor: '#1A237E', selectedTextColor: '#FFFFFF' }
                            }}
                            monthFormat={'MMMM yyyy'}
                            firstDay={1}
                            theme={{
                                backgroundColor: '#FFFFFF',
                                calendarBackground: '#FFFFFF',
                                todayTextColor: '#FFD700',
                                selectedDayBackgroundColor: '#1A237E',
                                selectedDayTextColor: '#FFFFFF',
                                arrowColor: '#1A237E',
                                monthTextColor: '#1A202C',
                                textMonthFontSize: 18,
                                textDayFontSize: 15,
                                textMonthFontFamily: 'Poppins-Bold',
                                textDayFontFamily: 'Poppins-Medium',
                                textDayHeaderFontFamily: 'Poppins-Bold',
                            }}
                            minDate={new Date().toISOString().split('T')[0]}
                            maxDate={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                        />
                    </View>
                </View>
            </Modal>

            {/* Route Map Modal for PKS - with direction support */}
            {selectedPksLine && (
                <Suspense fallback={<ActivityIndicator size="large" color="#3B82F6" />}>
                    <RouteMapModal
                        visible={showRouteMap}
                        onClose={() => setShowRouteMap(false)}
                        stops={pksTimetableData?.stops || []}
                        stopsByDirection={pksTimetableData?.stopsByDirection || {}}
                        availableDirections={pksTimetableData?.availableDirections || []}
                        directionTrips={pksTimetableData?.directionTrips || {}}
                        agency="pks"
                        lineNumber={selectedPksLine}
                        color="#388E3C"
                        lineName={pksLines.find(l => l.number === selectedPksLine)?.route}
                    />
                </Suspense>
            )}

            {/* Route Map Modal for MZK - with direction support */}
            {selectedMzkLine && !selectedPksLine && (
                <Suspense fallback={<ActivityIndicator size="large" color="#3B82F6" />}>
                    <RouteMapModal
                        visible={showRouteMap}
                        onClose={() => setShowRouteMap(false)}
                        stops={mzkTimetableData?.stops || []}
                        stopsByDirection={mzkTimetableData?.stopsByDirection || {}}
                        availableDirections={mzkTimetableData?.availableDirections || []}
                        directionTrips={mzkTimetableData?.directionTrips || {}}
                        agency="mzk"
                        lineNumber={selectedMzkLine}
                        color="#1A237E"
                        lineName={MZK_LINES.find(l => l.number === selectedMzkLine)?.route}
                    />
                </Suspense>
            )}

            {/* SKM Route Map Modal */}
            {showSkmMap && selectedStop && trainRouteData && (
                <Suspense fallback={<ActivityIndicator size="large" color="#3B82F6" />}>
                    <RouteMapModal
                        visible={showSkmMap}
                        onClose={() => {
                            setShowSkmMap(false);
                            setTrainRouteData(null);
                        }}
                        stopsByDirection={trainRouteData.stopsByDirection || {}}
                        availableDirections={trainRouteData.directions || []}
                        directionTrips={trainRouteData.directionTrips}
                        agency={trainRouteData.agency}
                        timetableData={trainRouteData.timetableData}
                        lineNumber="SKM"
                        color="#FFB300"
                        lineName={trainRouteData.direction}
                    />
                </Suspense>
            )}

            {/* POLREGIO Route Map Modal - prosta linia */}
            {showPolregioMap && selectedStop && trainRouteData && (
                <Suspense fallback={<ActivityIndicator size="large" color="#3B82F6" />}>
                    <RouteMapModal
                        visible={showPolregioMap}
                        onClose={() => {
                            setShowPolregioMap(false);
                            setTrainRouteData(null);
                        }}
                        stopsByDirection={trainRouteData.stopsByDirection || {}}
                        availableDirections={trainRouteData.directions || []}
                        directionTrips={trainRouteData.directionTrips}
                        agency={trainRouteData.agency}
                        timetableData={trainRouteData.timetableData}
                        lineNumber="POLREGIO"
                        color="#1A6ADD"
                        lineName={trainRouteData.direction}
                    />
                </Suspense>
            )}

            {/* Single stop map from search results */}
            {showStopMap && selectedStop && (
                <Suspense fallback={<ActivityIndicator size="large" color="#3B82F6" />}>
                    <RouteMapModal
                        visible={showStopMap}
                        onClose={() => setShowStopMap(false)}
                        stop={{
                            stop_id: selectedStop.id || String(selectedStop.name || ''),
                            stop_name: selectedStop.name,
                            stop_lat: selectedStop.lat || 0,
                            stop_lon: selectedStop.lon || 0,
                        }}
                        agencyName={getAgencyDisplayName(selectedStop?.agency)}
                        lineNumber={selectedStop.agency || ''}
                        color="#4A5568"
                    />
                </Suspense>
            )}


        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject },
    content: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
    handle: { width: 40, height: 4, backgroundColor: '#EDF2F7', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: tfs(20), fontFamily: 'Poppins-Bold', color: '#1A202C' },
    closeBtn: { padding: 4 },
    grid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    card: { flex: 1, minWidth: '45%', backgroundColor: '#F7FAFC', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EDF2F7' },
    cardAcc: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    providerText: { fontSize: tfs(14), fontFamily: 'Poppins-Bold' },
    cardLabel: { fontSize: tfs(14), fontFamily: 'Poppins-SemiBold', color: '#2D3748', textAlign: 'center' },

    // MZK Styles
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    backText: { fontSize: tfs(14), fontFamily: 'Poppins-Medium', color: '#4A5568', marginLeft: 8 },
    sectionTitle: { fontSize: tfs(16), fontFamily: 'Poppins-Bold', color: '#1A202C', marginBottom: 12 },
    lineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F7FAFC', paddingHorizontal: 4 },
    lineNumberBadge: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#1A237E', alignItems: 'center', justifyContent: 'center', marginRight: 14, shadowColor: "#1A237E", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
    lineNumber: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: tfs(17) },
    lineRoute: { flex: 1, fontSize: tfs(14), fontFamily: 'Poppins-Medium', color: '#2D3748', lineHeight: 20 },

    // Search Styles
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 12, paddingHorizontal: 12, height: 46, marginBottom: 15, borderWidth: 1, borderColor: '#EDF2F7' },
    searchInput: { flex: 1, fontSize: tfs(15), fontFamily: 'Poppins-Medium', color: '#2D3748' },
    stopItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F4F8' },
    stopIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    stopItemName: { fontSize: tfs(15), fontFamily: 'Poppins-SemiBold', color: '#2D3748' },
    stopItemAgency: { fontSize: tfs(11), fontFamily: 'Poppins-Medium', color: '#A0AEC0' },
    noResults: { textAlign: 'center', marginTop: 20, color: '#A0AEC0', fontFamily: 'Poppins-Medium' },

    searchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7FAFC',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EDF2F7',
        marginBottom: 16
    },
    searchButtonText: {
        marginLeft: 8,
        fontSize: tfs(14),
        fontFamily: 'Poppins-Medium',
        color: '#718096'
    },

    // Timetable Styles
    stopHeader: { marginBottom: 20 },
    stopHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20
    },
    stopHeaderLeft: {
        flex: 1,
        marginRight: 15
    },
    stopName: { fontSize: tfs(22), fontFamily: 'Poppins-Bold', color: '#1A202C' },
    stopAgency: { fontSize: tfs(13), fontFamily: 'Poppins-Medium', color: '#718096' },
    departureCount: {
        fontSize: tfs(12),
        fontFamily: 'Poppins-Bold',
        color: '#10B981'
    },
    calendarBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#F7FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        minWidth: 70
    },
    calendarBtnText: {
        fontSize: tfs(11),
        fontFamily: 'Poppins-Bold',
        marginTop: 2
    },
    centered: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    loadingText: { marginTop: 10, color: '#A0AEC0' },
    errorText: { marginTop: 10, color: '#EF4444', textAlign: 'center' },
    emptyText: { marginTop: 10, color: '#A0AEC0' },
    departureItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
    miniBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    miniBadgeText: { fontSize: tfs(12), fontFamily: 'Poppins-Bold', color: '#2D3748' },
    departureDirection: { fontSize: tfs(15), fontFamily: 'Poppins-Medium', color: '#2D3748' },
    departureOperator: { fontSize: tfs(11), color: '#A0AEC0' },
    departureTime: { fontSize: tfs(16), fontFamily: 'Poppins-SemiBold', color: '#1A202C' },

    // MZK Line Detail Styles
    daySelector: { flexDirection: 'row', backgroundColor: '#F7FAFC', borderRadius: 12, padding: 4, marginBottom: 15, borderWidth: 1, borderColor: '#EDF2F7' },
    dayOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    dayOptionActive: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
    dayText: { fontSize: tfs(12), fontFamily: 'Poppins-Bold', color: '#718096' },
    dayTextActive: { color: '#1A237E' },
    retryBtn: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#EDF2F7', borderRadius: 8 },
    retryText: { fontSize: tfs(14), fontFamily: 'Poppins-Bold', color: '#4A5568' },
    mzkStopCard: { marginBottom: 15 },
    mzkStopHeader: { flexDirection: 'row' },
    stopIndicator: { width: 30, alignItems: 'center', marginRight: 10 },
    stopDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1A237E', marginTop: 4, borderWidth: 2, borderColor: '#FFF', elevation: 2 },
    stopLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
    mzkStopName: { fontSize: tfs(16), fontFamily: 'Poppins-Bold', color: '#2D3748', marginBottom: 8 },
    departuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    mzkDepartureTime: { backgroundColor: '#F0F4F8', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 50, alignItems: 'center' },
    mzkTimeText: { fontSize: tfs(13), fontFamily: 'Poppins-Bold', color: '#1A237E' },
    mzkHeadsignText: { fontSize: tfs(9), color: '#718096', maxWidth: 80, textAlign: 'center' },

    // Direction Tabs
    directionTabs: {
        marginBottom: 10,
        marginHorizontal: -20,
        paddingVertical: 4,
        flexGrow: 0
    },
    directionTab: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        minHeight: 38,
        justifyContent: 'center',
        alignItems: 'center'
    },
    directionTabActiveSKM: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700'
    },
    directionTabActivePOLREGIO: {
        backgroundColor: '#1A237E',
        borderColor: '#1A237E'
    },
    directionTabActivePKS: {
        backgroundColor: '#388E3C',
        borderColor: '#388E3C'
    },
    directionTabActiveMZK: {
        backgroundColor: '#1A237E',
        borderColor: '#1A237E'
    },
    directionTabText: {
        fontSize: tfs(13),
        lineHeight: 16,
        fontFamily: 'Poppins-Bold',
        color: '#000000',
        textAlign: 'center',
        includeFontPadding: false
    },
    directionTabTextActivePKS: {
        color: '#FFF'
    },
    directionTabTextActiveSKM: {
        color: '#000000'
    },
    directionTabTextActive: {
        color: '#FFFFFF'
    },

    // Accordion Styles
    accordionContainer: {
        marginBottom: 12,
        backgroundColor: '#F7FAFC',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF'
    },
    accordionTitle: {
        fontSize: tfs(15),
        fontFamily: 'Poppins-SemiBold',
        color: '#2D3748',
        marginBottom: 2
    },
    accordionSubtitle: {
        fontSize: tfs(12),
        fontFamily: 'Poppins-Medium',
        color: '#718096'
    },
    accordionContent: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: '#FAFBFC'
    },
    platformBadge: {
        backgroundColor: '#EBF8FF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8
    },
    platformText: {
        fontSize: tfs(11),
        fontFamily: 'Poppins-SemiBold',
        color: '#3182CE'
    },

    // Simple Departure Item (SKM/POLREGIO)
    departureItemSimple: {
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EDF2F7',
        backgroundColor: '#FFF'
    },
    trainDepartureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    trainDepartureLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12
    },
    trainDirection: {
        fontSize: tfs(16),
        fontFamily: 'Poppins-SemiBold',
        color: '#2D3748',
        flex: 1
    },
    departureTimeLarge: {
        fontSize: tfs(28),
        fontFamily: 'Poppins-Bold',
        color: '#000000'
    },
    platformRow: {
        marginTop: 8,
        marginLeft: 32
    },
    platformLabel: {
        fontSize: tfs(12),
        fontFamily: 'Poppins-Medium',
        color: '#718096'
    },
    timeRemaining: {
        fontSize: tfs(12),
        fontFamily: 'Poppins-Medium',
        color: '#10B981',
        marginTop: 2
    },

    // Calendar Modal Styles
    calendarOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.6)'
    },
    calendarBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    },
    calendarModal: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 20
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    calendarTitle: {
        fontSize: tfs(20),
        fontFamily: 'Poppins-Bold',
        color: '#1A202C'
    },
    quickSelectRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20
    },
    quickSelectBtn: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: '#F7FAFC',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        alignItems: 'center'
    },
    quickSelectBtnActive: {
        backgroundColor: '#1A237E',
        borderColor: '#1A237E'
    },
    quickSelectText: {
        fontSize: tfs(15),
        fontFamily: 'Poppins-Bold',
        color: '#4A5568'
    },
    quickSelectTextActive: {
        color: '#FFFFFF'
    },

    // Next Day Button
    nextDayBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    nextDayText: {
        fontSize: tfs(13),
        fontFamily: 'Poppins-Medium',
        color: '#718096'
    },
    // PKS Line Grid
    pksLinesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        paddingHorizontal: 0,
    },
    pksLineCard: {
        width: '23%',
        paddingVertical: 24,
        backgroundColor: '#388E3C',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        margin: '1%',
        minHeight: 75,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
    },
    pksLineNumber: {
        fontSize: tfs(16),
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    // Timeline Styles
    timelineContainer: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    timelineStop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    timelineIndicator: {
        alignItems: 'center',
        width: 30,
        marginRight: 12,
    },
    timelineDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 3,
        borderColor: '#FFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
    },
    lineBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lineBadgeText: {
        color: '#FFFFFF',
        fontSize: tfs(14),
        fontFamily: 'Poppins-Bold',
        fontWeight: '700',
    },
    timelineLine: {
        width: 3,
        flex: 1,
        backgroundColor: '#E2E8F0',
        minHeight: 40,
        marginVertical: 4,
    },
    timelineContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingRight: 8,
    },
    timelineStopName: {
        fontSize: tfs(15),
        fontFamily: 'Poppins-SemiBold',
        color: '#2D3748',
        flex: 1,
    },
    timelineDepartures: {
        marginLeft: 42,
        marginBottom: 12,
        marginRight: 8,
        paddingTop: 4,
    },
    departureTimeChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1.5,
    },
    departureTimeText: {
        fontSize: tfs(14),
        fontFamily: 'Poppins-Bold',
    },
    directionHeaderLabel: {
        fontSize: tfs(13),
        fontFamily: 'Poppins-Bold',
        color: '#4A5568',
        marginHorizontal: 20,
        marginTop: 4,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
});
