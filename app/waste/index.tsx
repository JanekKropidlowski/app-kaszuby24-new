import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    StatusBar,
    ScrollView,
    Modal,
    Alert,
    Switch,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    Image,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
    ArrowLeft,
    Search,
    Trash2,
    Leaf,
    Recycle,
    FileText,
    GlassWater,
    Flame,
    Package,
    MapPin,
    X,
    ChevronRight,
    Clock,
    CalendarDays,
    Building2,
    Home,
    Check,
    Info,
    XCircle,
    CheckCircle2
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import {
    wasteScheduleService,
    WasteScheduleData,
    WasteRegion,
    City,
    WasteNewsArticle,
    getCityUiMode,
    expandVillages,
    flattenRedaStreets,
    findWielorodzinneRegion,
    normalizeWasteSearch,
    prettyVillageName,
    type VillageItem,
    type RedaStreetEntry,
    type WasteUiMode,
    WASTE_SEARCH_URL,
} from '@/services/WasteScheduleService';
import { WASTE_RULES, WasteRule } from '@/constants/wasteRules';
import { WasteNotificationService, NotificationSettings } from '@/services/WasteNotificationService';
import { WasteCalendarService } from '@/services/WasteCalendarService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, Calendar as CalendarIcon, List, Newspaper, Share2, Megaphone, X as CloseIcon, ChevronLeft, Bell } from 'lucide-react-native';
import RenderHtml from 'react-native-render-html';
import WasteCascadePicker from '@/components/waste/WasteCascadePicker';
import GlobalTabBar from '@/components/GlobalTabBar';
import { useWindowDimensions } from 'react-native';
import ImageViewing from 'react-native-image-viewing';

const STORAGE_KEY = '@kaszuby24_waste_selection';

const WASTE_ICONS: Record<string, any> = {
    'Zmieszane': { icon: Trash2, color: '#000000' }, // Black
    'Bio': { icon: Leaf, color: '#FF00FF' }, // Magenta (as per Bio z kuchni if Bio is mapped to it) - wait, Bio in general is Brown usually.
    'Odpady bio z kuchni': { icon: Leaf, color: '#d946ef' }, // Magenta/Pink (approx #ff00ff)
    'Plastik i metale': { icon: Recycle, color: '#EAB308' }, // Yellow
    'Makulatura': { icon: FileText, color: '#3b82f6' }, // Blue
    'Szkło': { icon: GlassWater, color: '#22c55e' }, // Green
    'Popiół': { icon: Flame, color: '#6b7280' }, // Grey
    'Gabaryty': { icon: Package, color: '#9333ea' }, // Purple
    'Odpady zielone': { icon: Leaf, color: '#854d0e' }, // Brown
    'Choinki': { icon: Flame, color: '#15803d' }, // Green
};

export default function WasteScheduleScreen() {
    const router = useRouter();
    const { theme } = useThemeStore();
    const { width } = useWindowDimensions();

    // States
    const [loading, setLoading] = useState(true);
    const [cities, setCities] = useState<City[]>([]);
    const [data, setData] = useState<WasteScheduleData | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Selections
    const [selectedCity, setSelectedCity] = useState<City | null>(null);
    const [selectedStreet, setSelectedStreet] = useState<{ street: string; regionId: string } | null>(null);

    // UI States — 'cascade' = address picker for search-mode cities (Gdynia)
    const [step, setStep] = useState<'city' | 'cascade' | 'street' | 'schedule'>('city');
    const [isSearching, setIsSearching] = useState(false);

    // Modal & GPS States
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedRule, setSelectedRule] = useState<WasteRule | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);

    // New Features States
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [newsModalVisible, setNewsModalVisible] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<WasteNewsArticle | null>(null);
    const [selectedDayDetails, setSelectedDayDetails] = useState<{ date: string, types: string[] } | null>(null);
    const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
        enabled: true,
        hour: 19,
        minute: 0,
        reminderDayOffset: 1,
        enabledTypes: []
    });
    const [newsArticles, setNewsArticles] = useState<WasteNewsArticle[]>([]);
    const [newsLoading, setNewsLoading] = useState(false);
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [images, setImages] = useState<{ uri: string }[]>([]);

    // Waste Search State
    const [isWasteSearchVisible, setIsWasteSearchVisible] = useState(false);
    const [wasteSearchQuery, setWasteSearchQuery] = useState('');
    const [wasteSearchResults, setWasteSearchResults] = useState<any[]>([]);
    const [wasteSearchLoading, setWasteSearchLoading] = useState(false);

    // Reda building-type modal state — shown when picked street exists in
    // both Jednorodzinne and Wielorodzinne and we need user to disambiguate.
    // (RedaPickModal removed — Reda flow now uses flat per-(street, type) list)

    // Per-city UI mode — drives placeholder copy, building-type buttons,
    // and whether we list streets or villages.
    const cityMode: WasteUiMode = useMemo(
        () => getCityUiMode(selectedCity?.id || ''),
        [selectedCity]
    );

    useEffect(() => {
        const searchWaste = async () => {
            if (wasteSearchQuery.length < 3) {
                setWasteSearchResults([]);
                return;
            }

            setWasteSearchLoading(true);
            try {
                // Assuming the WP plugin is installed on kaszuby24.pl or the relevant domain. 
                // If testing locally, might need headers or specific URL.
                // For now using a generic placeholder URL that points to the plugin's endpoint.
                // Ideally this should be configurable.
                const response = await fetch(`${WASTE_SEARCH_URL}?q=${encodeURIComponent(wasteSearchQuery)}`);
                const data = await response.json();
                if (Array.isArray(data)) {
                    setWasteSearchResults(data);
                }
            } catch (e) {
                console.log('Error searching waste:', e);
            } finally {
                setWasteSearchLoading(false);
            }
        };

        const timeout = setTimeout(searchWaste, 500);
        return () => clearTimeout(timeout);
    }, [wasteSearchQuery]);

    useEffect(() => {
        loadInitialState();
    }, []);

    const loadInitialState = async () => {
        setLoading(true);
        const availableCities = await wasteScheduleService.getCities();
        setCities(availableCities);

        // Load Notif Settings
        const settings = await WasteNotificationService.getSettings();
        setNotifSettings(settings);

        const savedSelection = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedSelection) {
            const parsed = JSON.parse(savedSelection);
            const city = availableCities.find(c => c.id === parsed.cityId);

            if (city && city.active) {
                setSelectedCity(city);
                // Search-mode (Gdynia): restore directly via region id (skip 7.5 MB fetch)
                if (city.mode === 'search') {
                    if (parsed.regionId) {
                        const regionData = await wasteScheduleService.getRegionWithSchedule(parsed.regionId);
                        if (regionData) {
                            setData(regionData);
                            setSelectedStreet({ street: parsed.street || 'Twój adres', regionId: String(parsed.regionId) });
                            setStep('schedule');
                            fetchNewsArticles(city);
                        } else {
                            setStep('cascade');
                        }
                    } else {
                        setStep('cascade');
                    }
                } else {
                    const cityData = await wasteScheduleService.getSchedule(city.id, city.mode);
                    if (cityData) {
                        setData(cityData);
                        const exists = cityData.regions.find(r => r.id === parsed.regionId && r.streets.includes(parsed.street));
                        if (exists) {
                            setSelectedStreet({ street: parsed.street, regionId: parsed.regionId });
                            setStep('schedule');
                            fetchNewsArticles(city);
                        } else {
                            setStep('street');
                        }
                    }
                }
                setLoading(false);
                return;
            }
        }

        // No saved selection — silently try GPS auto-detect (only if permission already granted,
        // so we don't prompt on first open).
        setLoading(false);
        tryAutoLocateCity(availableCities);
    };

    // Silent GPS city detection on startup — no permission prompt, just uses existing grant.
    const tryAutoLocateCity = async (availableCities: City[]) => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const rev = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            if (!rev?.length) return;
            const matched = matchCityFromGeocode(rev[0], availableCities);
            if (matched) handleCitySelect(matched);
        } catch (_) {
            // Silent fail — user can still pick manually
        }
    };

    // Finds the best city from our list given a geocoded address result.
    // Checks city field first, then subregion (catches "Gmina Puck" etc.).
    const matchCityFromGeocode = (r: Location.LocationGeocodedAddress, cityList: City[]): City | null => {
        const norm = (s?: string | null) => normalizeWasteSearch(s || '');
        const gCity = norm(r.city);
        const gSub = norm(r.subregion);
        const gDistrict = norm(r.district);

        // Priority: exact city > subregion includes city name > city name includes gCity
        return cityList.find(c => {
            const cn = norm(c.name);
            if (!cn) return false;
            if (cn === gCity) return true;
            if (gSub && (gSub === cn || gSub.replace('gmina ', '').replace('miasto ', '') === cn)) return true;
            if (gSub && gSub.includes(cn) && cn.length > 3) return true;
            if (gDistrict && gDistrict === cn) return true;
            if (gCity && cn.startsWith(gCity) && gCity.length > 3) return true;
            return false;
        }) ?? null;
    };

    const fetchNewsArticles = async (city: City) => {
        try {
            setNewsLoading(true);
            console.log('[WasteNews] Fetching for city:', city.name, 'URL:', city.news_api_url, 'Category:', city.news_category_id);
            if (city.news_api_url) {
                const articles = await wasteScheduleService.getNewsArticles(
                    city.news_api_url,
                    city.news_category_id,
                    5
                );
                console.log('[WasteNews] Fetched', articles.length, 'articles');
                setNewsArticles(articles);
            } else {
                console.log('[WasteNews] No news_api_url configured for this city');
                setNewsArticles([]);
            }
        } catch (error) {
            console.log('[WasteNews] Error fetching news articles:', error);
            setNewsArticles([]);
        } finally {
            setNewsLoading(false);
        }
    };

    const handleCitySelect = async (city: City) => {
        if (!city.active) return;
        setLoading(true);
        setSelectedCity(city);
        // Search-mode (Gdynia): skip 7.5 MB schedule fetch, render cascade picker
        if (city.mode === 'search') {
            setData(null);
            setStep('cascade');
            setLoading(false);
            fetchNewsArticles(city);
            return;
        }
        const cityData = await wasteScheduleService.getSchedule(city.id, city.mode);
        setData(cityData);
        setStep('street');
        setLoading(false);
        fetchNewsArticles(city);
    };

    // Called from WasteCascadePicker when user finishes the address pick.
    // Fetches the chosen region by id (small payload) and jumps to schedule step.
    const handleCascadePicked = async (regionId: number, label: { dzielnica: string; ulica: string; numer: string; zabudowa: string }) => {
        if (!selectedCity) return;
        setLoading(true);
        try {
            const regionData = await wasteScheduleService.getRegionWithSchedule(regionId);
            if (regionData) {
                setData(regionData);
                const region = regionData.regions[0];
                const streetLabel = `${label.ulica} ${label.numer} (${label.zabudowa})`;
                setSelectedStreet({ street: streetLabel, regionId: region.id });
                setStep('schedule');
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
                    cityId: selectedCity.id, street: streetLabel, regionId: region.id,
                }));
                if (region) {
                    await WasteNotificationService.scheduleNotificationsForRegion(region.schedule);
                }
            } else {
                Alert.alert('Błąd', 'Nie udało się pobrać harmonogramu dla wybranego adresu.');
            }
        } catch (e: any) {
            console.error('[WasteCascade]', e.message);
            Alert.alert('Błąd', 'Wystąpił błąd podczas pobierania harmonogramu.');
        } finally {
            setLoading(false);
        }
    };

    const handleStreetSelect = async (street: string, regionId: string) => {
        const selection = { cityId: selectedCity?.id, street, regionId };
        setSelectedStreet({ street, regionId });
        setStep('schedule');
        setIsSearching(false);
        setSearchQuery('');
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selection));

        // Schedule notifications automatically when street is selected
        if (data) {
            const region = data.regions.find(r => r.id === regionId);
            if (region) {
                await WasteNotificationService.scheduleNotificationsForRegion(region.schedule);
            }
        }
    };

    // Streets mode (Puck, fallback): one row per street with its region.
    const allStreets = useMemo(() => {
        if (!data) return [];
        const streets: { street: string; regionId: string }[] = [];
        data.regions.forEach(region => {
            region.streets.forEach(street => {
                streets.push({ street, regionId: region.id });
            });
        });
        return streets.sort((a, b) => a.street.localeCompare(b.street));
    }, [data]);

    const filteredStreets = useMemo(() => {
        if (!searchQuery) return allStreets.slice(0, 10);
        const query = normalizeWasteSearch(searchQuery);
        const directMatches = allStreets.filter(s => normalizeWasteSearch(s.street).startsWith(query));
        const includeMatches = allStreets.filter(s => normalizeWasteSearch(s.street).includes(query) && !normalizeWasteSearch(s.street).startsWith(query));
        return [...directMatches, ...includeMatches].slice(0, 20);
    }, [searchQuery, allStreets]);

    // Villages mode (Gmina Puck): one row per village with parent group.
    const allVillages = useMemo<VillageItem[]>(
        () => (data && cityMode === 'villages' ? expandVillages(data.regions) : []),
        [data, cityMode]
    );
    const filteredVillages = useMemo(() => {
        if (!searchQuery) return allVillages.slice(0, 12);
        const q = normalizeWasteSearch(searchQuery);
        return allVillages.filter(v => normalizeWasteSearch(v.village).includes(q)).slice(0, 20);
    }, [searchQuery, allVillages]);

    // Reda mode: dedup street with badges showing which building types apply.
    // Reda list = ONLY jednorodzinne streets. Blocks (wielorodzinne) are
    // handled by the "Mieszkam w Bloku" fast-path button — single region for
    // all blocks city-wide, no point duplicating each street in the list.
    const redaStreets = useMemo<RedaStreetEntry[]>(
        () => (data && cityMode === 'reda'
            ? flattenRedaStreets(data.regions).filter((e) => e.type === 'jednorodzinna')
            : []),
        [data, cityMode]
    );
    const filteredRedaStreets = useMemo(() => {
        if (!searchQuery) return redaStreets.slice(0, 12);
        const q = normalizeWasteSearch(searchQuery);
        return redaStreets.filter(s => normalizeWasteSearch(s.street).includes(q)).slice(0, 20);
    }, [searchQuery, redaStreets]);

    const currentSchedule = useMemo(() => {
        if (!data || !selectedStreet) return [];
        const region = data.regions.find(r => r.id === selectedStreet.regionId);
        if (!region) return [];
        const today = new Date().toISOString().split('T')[0];
        return region.schedule.filter(s => s.date >= today);
    }, [data, selectedStreet]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
        const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
        return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
    };

    const handleUseLocation = async () => {
        setLocationLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Brak uprawnień', 'Musisz zezwolić na dostęp do lokalizacji, aby użyć tej funkcji.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            const address = await Location.reverseGeocodeAsync({ latitude, longitude });

            if (!address?.length) {
                Alert.alert('Błąd', 'Nie udało się ustalić adresu z GPS.');
                return;
            }

            const r = address[0];

            if (step === 'city') {
                const matched = matchCityFromGeocode(r, cities);
                if (matched) {
                    handleCitySelect(matched);
                } else {
                    Alert.alert('Niestety', `Twoja lokalizacja (${r.city || r.subregion || '?'}) nie jest jeszcze obsługiwana.`);
                }
            } else if (step === 'street') {
                if (cityMode === 'villages') {
                    // Gmina Puck: village name comes in district/name/street — search allVillages
                    const hint = r.district || r.name || r.street || '';
                    if (hint) {
                        const q = normalizeWasteSearch(hint);
                        const match = allVillages.find(v =>
                            normalizeWasteSearch(v.village).includes(q) ||
                            q.includes(normalizeWasteSearch(v.village))
                        );
                        if (match) {
                            handleStreetSelect(match.village, match.regionId);
                        } else {
                            setSearchQuery(hint);
                            Alert.alert('Informacja', `Wykryto miejscowość: ${hint}. Wybierz z listy poniżej.`);
                        }
                    } else {
                        Alert.alert('Błąd', 'Nie udało się wykryć nazwy miejscowości.');
                    }
                } else {
                    // Streets mode (Reda, Puck, fallback)
                    const street = r.street;
                    if (street) {
                        const sourceList = cityMode === 'reda' ? redaStreets : allStreets;
                        const matchedStreet = sourceList.find(s =>
                            normalizeWasteSearch(s.street).includes(normalizeWasteSearch(street)) ||
                            normalizeWasteSearch(street).includes(normalizeWasteSearch(s.street))
                        );
                        if (matchedStreet) {
                            handleStreetSelect(matchedStreet.street, matchedStreet.regionId);
                        } else {
                            setSearchQuery(street);
                            Alert.alert('Informacja', `Wykryto ulicę: ${street}. Wybierz z listy poniżej.`);
                        }
                    } else {
                        Alert.alert('Błąd', 'Nie udało się wykryć nazwy ulicy.');
                    }
                }
            }
        } catch (error) {
            Alert.alert('Błąd', 'Wystąpił problem z pobraniem lokalizacji.');
        } finally {
            setLocationLoading(false);
        }
    };

    const openWasteDetails = (type: string) => {
        console.log(`[WasteDebug] openWasteDetails called with type: "${type}"`);
        if (!type) {
            console.warn('[WasteDebug] No type provided to openWasteDetails');
            return;
        }

        // 1. Normalization (remove special chars for easier matching)
        const normalize = (s: string) => s.toLowerCase()
            .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
            .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
            .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
            .trim();

        const normalizedInput = normalize(type);
        console.log(`[WasteDebug] Normalized input: "${normalizedInput}"`);

        // 2. Keyword Mapping (Synonyms)
        const getMappedId = (input: string): string => {
            if (input.includes('plastik') || input.includes('metal') || input.includes('tworzyw')) return 'Plastik i metale';
            if (input.includes('papier') || input.includes('makulatur')) return 'Papier';
            if (input.includes('szklo')) return 'Szkło';
            if (input.includes('bio') || input.includes('kuchn') || input.includes('jedzen')) return 'Bio';
            if (input.includes('ogrod') || input.includes('zielon') || input.includes('traw') || input.includes('lisci')) return 'Odpady zielone';
            if (input.includes('popiol')) return 'Popiół';
            if (input.includes('zmieszan') || input.includes('pozostal')) return 'Zmieszane';
            if (input.includes('gabaryt') || input.includes('mebl') || input.includes('wielkogabaryt')) return 'Gabaryty';
            if (input.includes('niebezpiecz') || input.includes('elektro')) return 'Zmieszane'; // Or a dedicated rule if exists
            return input;
        };

        const mappedId = getMappedId(normalizedInput);
        console.log(`[WasteDebug] Mapped ID: "${mappedId}"`);

        // 3. Find Rule - Multi-step search
        const rule =
            // Exact match on Mapped ID or Original
            WASTE_RULES.find(r => r.id.toLowerCase() === mappedId.toLowerCase()) ||
            WASTE_RULES.find(r => r.id.toLowerCase() === type.toLowerCase()) ||
            // Partial match
            WASTE_RULES.find(r => mappedId.toLowerCase().includes(r.id.toLowerCase())) ||
            WASTE_RULES.find(r => normalize(r.id).includes(normalizedInput));

        if (rule) {
            console.log(`[WasteDebug] Found rule: "${rule.title}" (ID: ${rule.id})`);
            console.log(`[WasteDebug] Allowed items count: ${rule.allowed.length}`);
            console.log(`[WasteDebug] Forbidden items count: ${rule.forbidden.length}`);

            // Close search modal first
            setIsWasteSearchVisible(false);

            // Small timeout to let the search modal close before opening details
            // prevents focus/visibility issues on some devices
            setTimeout(() => {
                setSelectedRule(rule);
                setModalVisible(true);
                console.log('[WasteDebug] Details Modal marked as visible now');
            }, 300);
        } else {
            console.error(`[WasteDebug] No rule found for category: "${type}" (Normalized: "${normalizedInput}", Mapped: "${mappedId}")`);
            // Optional: Alert the user or show a general "Info" rule
        }
    };

    const renderCitySelection = () => (
        <View style={styles.stepContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Wybierz swoje miasto</Text>

            <TouchableOpacity
                style={[styles.gpsButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}
                onPress={handleUseLocation}
                disabled={locationLoading}
            >
                {locationLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                    <MapPin size={20} color={theme.colors.primary} />
                )}
                <Text style={[styles.gpsButtonText, { color: theme.colors.primary }]}>
                    {locationLoading ? 'Namierzanie...' : 'Znajdź najbliższe miasto (GPS)'}
                </Text>
            </TouchableOpacity>

            <View style={styles.cityGrid}>
                {cities.map((city) => (
                    <TouchableOpacity
                        key={city.id}
                        style={[
                            styles.cityCard,
                            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                            !city.active && { opacity: 0.5 }
                        ]}
                        onPress={() => handleCitySelect(city)}
                        disabled={!city.active}
                    >
                        <View style={[styles.cityIcon, { backgroundColor: city.active ? theme.colors.primary + '20' : theme.colors.textSecondary + '20' }]}>
                            <Building2 color={city.active ? theme.colors.primary : theme.colors.textSecondary} size={28} />
                        </View>
                        <Text style={[styles.cityLabel, { color: theme.colors.text }]}>{city.name}</Text>
                        {!city.active && <Text style={[styles.cityStatus, { color: theme.colors.textSecondary }]}>Wkrótce</Text>}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderStreetSelection = () => {
        // Copy + behavior swap per city mode.
        const stepTitle =
            cityMode === 'villages' ? 'Znajdź swoją miejscowość' :
            cityMode === 'reda' ? 'Znajdź swoją ulicę' :
            'Znajdź swoją ulicę';
        const placeholder =
            cityMode === 'villages' ? 'np. Brudzewo, Połchowo, Strzelno...' :
            'np. Sienkiewicza, Gdańska, Sobieskiego...';
        const emptyText =
            cityMode === 'villages'
                ? `Nie znaleziono miejscowości w ${selectedCity?.name}`
                : `Nie znaleziono ulicy w mieście ${selectedCity?.name}`;
        const suggestionHeader =
            cityMode === 'villages' ? 'Wszystkie miejscowości' : 'Najczęściej wybierane / Sugestie';

        const wielorodzinneRegion = cityMode === 'reda' ? findWielorodzinneRegion(data) : null;

        // Picker handlers — different shape per mode but converge to handleStreetSelect.
        const handleVillagePick = (v: VillageItem) =>
            handleStreetSelect(v.village, v.regionId);

        // Reda list shows only jednorodzinne streets. Blocks go through the
        // "Mieszkam w Bloku" button above (one schedule for all city blocks).
        const handleRedaPick = (entry: RedaStreetEntry) => {
            handleStreetSelect(entry.street, entry.regionId);
        };

        return (
            <View style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                    <TouchableOpacity onPress={() => setStep('city')} style={styles.backLink}>
                        <Text style={{ color: theme.colors.primary }}>← Zmień miasto ({selectedCity?.name})</Text>
                    </TouchableOpacity>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 10 }]}>{stepTitle}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.gpsButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary, marginBottom: 15 }]}
                    onPress={handleUseLocation}
                    disabled={locationLoading}
                >
                    {locationLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <MapPin size={20} color={theme.colors.primary} />
                    )}
                    <Text style={[styles.gpsButtonText, { color: theme.colors.primary }]}>
                        {locationLoading ? 'Namierzanie...' : 'Użyj mojej lokalizacji (GPS)'}
                    </Text>
                </TouchableOpacity>

                {/* Building-type fast paths — Reda only, where same street can fall
                    into Jednorodzinne or Wielorodzinne with different schedules. */}
                {cityMode === 'reda' && (
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                        <TouchableOpacity
                            style={[styles.gpsButton, { flex: 1, backgroundColor: theme.colors.card, borderColor: theme.colors.border, flexDirection: 'column', alignItems: 'center', padding: 15, height: 'auto', marginBottom: 0 }]}
                            onPress={() => {
                                if (wielorodzinneRegion) {
                                    handleStreetSelect('Wielorodzinne (bloki)', wielorodzinneRegion.id);
                                } else {
                                    Alert.alert('Informacja', 'Brak harmonogramu dla zabudowy wielorodzinnej w tym mieście.');
                                }
                            }}
                        >
                            <Building2 size={28} color="#D97706" strokeWidth={2.2} style={{ marginBottom: 8 }} />
                            <Text style={{ color: theme.colors.text, fontFamily: 'Poppins_Bold', textAlign: 'center' }}>Mieszkam w Bloku</Text>
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 4, fontFamily: 'Poppins_Regular' }}>(Zabudowa wielorodzinna)</Text>
                        </TouchableOpacity>

                        <View style={[styles.gpsButton, { flex: 1, backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary, flexDirection: 'column', alignItems: 'center', padding: 15, height: 'auto', marginBottom: 0 }]}>
                            <Home size={28} color="#059669" strokeWidth={2.2} style={{ marginBottom: 8 }} />
                            <Text style={{ color: theme.colors.text, fontFamily: 'Poppins_Bold', textAlign: 'center' }}>Dom Jednorodzinny</Text>
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 4, fontFamily: 'Poppins_Regular' }}>(Wpisz ulicę poniżej)</Text>
                        </View>
                    </View>
                )}

                <View style={[styles.searchInputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Search size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        placeholder={placeholder}
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            setIsSearching(true);
                        }}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                >
                    {cityMode === 'villages' ? (
                        <FlatList
                            data={filteredVillages}
                            keyExtractor={(item, index) => `village-${item.regionId}-${item.village}-${index}`}
                            style={styles.resultsList}
                            contentContainerStyle={{ paddingBottom: 100 }}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                                    onPress={() => handleVillagePick(item)}
                                >
                                    <View style={[styles.resultItemContent, { flex: 1 }]}>
                                        <MapPin size={16} color={theme.colors.textSecondary} style={{ marginRight: 10 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.resultText, { color: theme.colors.text }]}>{item.pretty}</Text>
                                            {item.groupSiblings.length > 0 && (
                                                <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                                                    Wspólny harmonogram: +{item.groupSiblings.length} miejscowości
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    <ChevronRight size={18} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                            ListHeaderComponent={
                                <Text style={[styles.listHeader, { color: theme.colors.textSecondary }]}>
                                    {searchQuery ? 'Wyniki wyszukiwania' : suggestionHeader}
                                </Text>
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={{ color: theme.colors.textSecondary }}>{emptyText}</Text>
                                </View>
                            }
                        />
                    ) : cityMode === 'reda' ? (
                        <FlatList
                            data={filteredRedaStreets}
                            keyExtractor={(item, index) => `reda-${item.regionId}-${item.street}-${index}`}
                            style={styles.resultsList}
                            contentContainerStyle={{ paddingBottom: 100 }}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                                    onPress={() => handleRedaPick(item)}
                                >
                                    <View style={styles.resultItemContent}>
                                        <MapPin size={16} color={theme.colors.textSecondary} style={{ marginRight: 10 }} />
                                        <Text style={[styles.resultText, { color: theme.colors.text }]}>{item.street}</Text>
                                    </View>
                                    <ChevronRight size={18} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                            ListHeaderComponent={
                                <Text style={[styles.listHeader, { color: theme.colors.textSecondary }]}>
                                    {searchQuery ? 'Wyniki wyszukiwania' : suggestionHeader}
                                </Text>
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={{ color: theme.colors.textSecondary }}>{emptyText}</Text>
                                </View>
                            }
                        />
                    ) : (
                        <FlatList
                            data={filteredStreets}
                            keyExtractor={(item, index) => `${item.regionId}-${item.street}-${index}`}
                            style={styles.resultsList}
                            contentContainerStyle={{ paddingBottom: 100 }}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                                    onPress={() => handleStreetSelect(item.street, item.regionId)}
                                >
                                    <View style={styles.resultItemContent}>
                                        <MapPin size={16} color={theme.colors.textSecondary} style={{ marginRight: 10 }} />
                                        <Text style={[styles.resultText, { color: theme.colors.text }]}>{item.street}</Text>
                                    </View>
                                    <ChevronRight size={18} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                            ListHeaderComponent={
                                <Text style={[styles.listHeader, { color: theme.colors.textSecondary }]}>
                                    {searchQuery ? 'Wyniki wyszukiwania' : suggestionHeader}
                                </Text>
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={{ color: theme.colors.textSecondary }}>{emptyText}</Text>
                                </View>
                            }
                        />
                    )}
                </KeyboardAvoidingView>
            </View>
        );
    };

    const renderSchedule = () => (
        <FlatList
            data={currentSchedule}
            keyExtractor={(item) => item.date}
            contentContainerStyle={styles.scheduleList}
            ListHeaderComponent={
                <View style={styles.scheduleHeader}>
                    <TouchableOpacity
                        style={[styles.selectionPreview, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                        onPress={() => setStep('street')}
                    >
                        <View style={styles.previewInfo}>
                            <Text style={[styles.previewCity, { color: theme.colors.textSecondary }]}>{selectedCity?.name}</Text>
                            <Text style={[styles.previewStreet, { color: theme.colors.text }]}>
                                {cityMode === 'villages' && selectedStreet?.street
                                    ? prettyVillageName(selectedStreet.street)
                                    : selectedStreet?.street}
                            </Text>
                        </View>
                        <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Zmień</Text>
                    </TouchableOpacity>

                    {newsArticles && newsArticles.length > 0 && (
                        <View style={{ marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 0, color: theme.colors.text }]}>Aktualności ({newsArticles.length})</Text>
                                <TouchableOpacity onPress={() => setNewsModalVisible(true)}>
                                    <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600' }}>Zobacz wszystkie</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                {newsArticles.map(ann => (
                                    <TouchableOpacity
                                        key={ann.id}
                                        style={[styles.miniAnnCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                                        onPress={() => {
                                            setSelectedArticle(ann);
                                            setNewsModalVisible(true);
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                            <Newspaper size={14} color={theme.colors.primary} />
                                            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginLeft: 6 }}>
                                                {new Date(ann.date).toLocaleDateString('pl-PL')}
                                            </Text>
                                        </View>
                                        <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>{ann.title.rendered}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>
            }
            renderItem={({ item, index }) => {
                const dateObj = new Date(item.date);
                const isToday = item.date === new Date().toISOString().split('T')[0];
                const isNext = index === 0 && new Date(item.date) >= new Date();

                // Month Header Logic
                const currentMonth = dateObj.getMonth();
                const prevItem = index > 0 ? currentSchedule[index - 1] : null;
                const prevMonth = prevItem ? new Date(prevItem.date).getMonth() : -1;
                const showMonthHeader = index === 0 || currentMonth !== prevMonth;

                const months = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
                const monthName = months[currentMonth];
                const year = dateObj.getFullYear();

                return (
                    <View>
                        {showMonthHeader && (
                            <View style={styles.listMonthHeader}>
                                <Text style={[styles.listMonthTitle, { color: theme.colors.text }]}>{monthName} {year}</Text>
                            </View>
                        )}

                        <View style={[
                            styles.dateCard,
                            { backgroundColor: theme.colors.card, borderColor: isNext ? theme.colors.primary : theme.colors.border },
                            isNext && styles.nextDateCard
                        ]}>
                            {isNext && (
                                <View style={[styles.nextBadge, { backgroundColor: theme.colors.primary }]}>
                                    <Text style={styles.nextBadgeText}>NAJBLIŻSZY TERMIN</Text>
                                </View>
                            )}
                            <View style={styles.dateHeader}>
                                <CalendarDays size={18} color={isNext ? theme.colors.primary : theme.colors.textSecondary} />
                                <Text style={[styles.dateText, { color: isNext ? theme.colors.primary : theme.colors.text, fontWeight: isNext ? '700' : '600', flex: 1 }]}>
                                    {formatDate(item.date)}
                                </Text>
                                {(() => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const targetDate = new Date(item.date);
                                    targetDate.setHours(0, 0, 0, 0);

                                    // Use getTime() for safer subtraction
                                    const diffTime = targetDate.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                    // Only show for future dates (0 and above)
                                    // AND only if less than 8 days away per user request
                                    if (diffDays < 0 || diffDays > 7) return null;

                                    let badgeText = '';
                                    if (diffDays === 0) badgeText = 'Dzisiaj';
                                    else if (diffDays === 1) badgeText = 'Jutro';
                                    else badgeText = `Za ${diffDays} dni`;

                                    return (
                                        <View style={{
                                            backgroundColor: theme.colors.primary + '15',
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 8,
                                            marginLeft: 8
                                        }}>
                                            <Text style={{
                                                color: theme.colors.primary,
                                                fontSize: 12,
                                                fontWeight: '700',
                                                fontFamily: 'Poppins_Bold'
                                            }}>{badgeText}</Text>
                                        </View>
                                    );
                                })()}
                            </View>

                            <View style={styles.typesContainer}>
                                {item.types.map((type, idx) => {
                                    const typeConfig = WASTE_ICONS[type] || { icon: Trash2, color: '#666' };
                                    const Icon = typeConfig.icon;
                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            style={[styles.typeBadge, {
                                                backgroundColor: typeConfig.color + '15',
                                                borderColor: typeConfig.color + '40',
                                                borderWidth: 1
                                            }]}
                                            onPress={() => openWasteDetails(type)}
                                        >
                                            <Icon size={14} color={typeConfig.color} />
                                            <Text style={[styles.typeText, { color: typeConfig.color }]}>{type}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                );
            }}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Clock size={48} color={theme.colors.textSecondary} opacity={0.3} />
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                        Brak nadchodzących terminów odbioru dla tej lokalizacji.
                    </Text>
                </View>
            }
            ListFooterComponent={
                data?.footer_text ? (
                    <View style={{ padding: 20, paddingTop: 10, opacity: 0.8 }}>
                        <Text style={{ fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, fontFamily: 'Poppins_Regular' }}>
                            {data.footer_text}
                        </Text>
                    </View>
                ) : null
            }
        />
    );

    const toggleNotifType = async (type: string) => {
        const newTypes = notifSettings.enabledTypes.includes(type)
            ? notifSettings.enabledTypes.filter(t => t !== type)
            : [...notifSettings.enabledTypes, type];

        const newSettings = { ...notifSettings, enabledTypes: newTypes };
        setNotifSettings(newSettings);
        await WasteNotificationService.saveSettings(newSettings);
        refreshNotifications(newSettings);
    };

    const toggleNotifEnabled = async (value: boolean) => {
        if (value) {
            const permission = await WasteNotificationService.requestPermissions();
            if (!permission) {
                Alert.alert('Brak uprawnień', 'Nie możemy włączyć powiadomień bez Twojej zgody.');
                return;
            }
        }

        const newSettings = { ...notifSettings, enabled: value };
        setNotifSettings(newSettings);
        await WasteNotificationService.saveSettings(newSettings);
        refreshNotifications(newSettings);
    };

    const refreshNotifications = async (settings: NotificationSettings) => {
        if (!data || !selectedStreet) return;
        const region = data.regions.find(r => r.id === selectedStreet.regionId);
        if (region) {
            await WasteNotificationService.scheduleNotificationsForRegion(region.schedule, settings);
        }
    };

    const renderCalendarView = () => {
        // Simple List-based Calendar Simulation grouped by Month
        if (!currentSchedule.length) return null;

        const byMonth: Record<string, typeof currentSchedule> = {};
        currentSchedule.forEach(item => {
            const date = new Date(item.date);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            if (!byMonth[key]) byMonth[key] = [];
            byMonth[key].push(item);
        });

        const monthsObj = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

        return (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
                {Object.keys(byMonth).map(key => {
                    const [year, monthIdx] = key.split('-');
                    const monthName = monthsObj[parseInt(monthIdx)];

                    return (
                        <View key={key} style={styles.monthSection}>
                            <Text style={[styles.monthTitle, { color: theme.colors.text }]}>{monthName} {year}</Text>
                            <View style={styles.calendarGrid}>
                                {byMonth[key].map((item, idx) => {
                                    const date = new Date(item.date);
                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            style={[styles.calendarDay, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                                            onPress={() => setSelectedDayDetails(item)}
                                        >
                                            <Text style={[styles.calendarDayNum, { color: theme.colors.text }]}>{date.getDate()}</Text>
                                            <View style={styles.calendarDots}>
                                                {item.types.map((type, tIdx) => {
                                                    const color = WASTE_ICONS[type]?.color || '#888';
                                                    return <View key={tIdx} style={[styles.dot, { backgroundColor: color }]} />;
                                                })}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}

                <View style={{ marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, opacity: 0.8 }}>
                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 10, lineHeight: 18, fontFamily: 'Poppins_Regular' }}>
                        Odpady w pojemnikach lub workach należy wystawiać przed posesję na jeden dzień przed planowanym terminem odbioru lub do godziny 6:00 w dniu wywozu.
                    </Text>
                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 10, lineHeight: 18, fontFamily: 'Poppins_Regular' }}>
                        Reklamacje odnośnie odbioru należy zgłaszać najpóźniej dzień roboczy po planowanej zbiórce.{'\n'}
                        <Text style={{ fontWeight: '700' }}>Tel.: 58 785 76 31 lub 58 678 80 21</Text>
                    </Text>
                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, fontFamily: 'Poppins_Regular', fontStyle: 'italic' }}>
                        Wystawianie odpadów po godzinie 6:00 w dniu planowanego odbioru nie jest podstawą do reklamacji.
                    </Text>
                </View>
            </ScrollView>
        );
    };

    const handleImagePress = (imageUri: string) => {
        setImages([{ uri: imageUri }]);
        setIsImageViewVisible(true);
    };

    // Memoizowane props dla RenderHtml — nie są tworzone przy każdym renderze
    const wasteHtmlSource = useMemo(() => ({
        html: selectedArticle?.content?.rendered || (selectedArticle?.content as any) || '',
    }), [selectedArticle?.content]);
    const wasteHtmlBaseStyle = useMemo(() => ({
        color: theme.colors.text, fontSize: 16, lineHeight: 24, fontFamily: 'Poppins_Regular' as any,
    }), [theme.colors.text]);
    const wasteHtmlTagsStyles = useMemo(() => ({
        body: { fontFamily: 'Poppins_Regular' as any },
        p: { marginBottom: 14, fontFamily: 'Poppins_Regular' as any, lineHeight: 24 },
        h1: { fontSize: 24, fontWeight: 'bold' as any, fontFamily: 'Poppins_Bold' as any, marginTop: 20, marginBottom: 10, lineHeight: 32 },
        h2: { fontSize: 22, fontWeight: 'bold' as any, fontFamily: 'Poppins_Bold' as any, marginTop: 18, marginBottom: 8, lineHeight: 30 },
        h3: { fontSize: 20, fontWeight: 'bold' as any, fontFamily: 'Poppins_SemiBold' as any, marginTop: 16, marginBottom: 6, lineHeight: 28 },
        h4: { fontSize: 18, fontWeight: '600' as any, fontFamily: 'Poppins_SemiBold' as any, marginTop: 14, marginBottom: 6, lineHeight: 26 },
        h5: { fontSize: 16, fontWeight: '600' as any, fontFamily: 'Poppins_SemiBold' as any, marginTop: 12, marginBottom: 4, lineHeight: 24 },
        h6: { fontSize: 14, fontWeight: '600' as any, fontFamily: 'Poppins_Medium' as any, marginTop: 10, marginBottom: 4, lineHeight: 22 },
        a: { color: theme.colors.primary, textDecorationLine: 'none' as any, fontFamily: 'Poppins_Medium' as any },
        strong: { fontWeight: 'bold' as any, fontFamily: 'Poppins_Bold' as any },
        b: { fontWeight: 'bold' as any, fontFamily: 'Poppins_Bold' as any },
        em: { fontStyle: 'italic' as any, fontFamily: 'Poppins_Italic' as any },
        i: { fontStyle: 'italic' as any, fontFamily: 'Poppins_Italic' as any },
        ul: { marginBottom: 14, paddingLeft: 24, fontFamily: 'Poppins_Regular' as any },
        ol: { marginBottom: 14, paddingLeft: 24, fontFamily: 'Poppins_Regular' as any },
        li: { marginBottom: 8, fontFamily: 'Poppins_Regular' as any, lineHeight: 22 },
        blockquote: { marginLeft: 16, paddingLeft: 16, borderLeftWidth: 4, borderLeftColor: theme.colors.primary, marginBottom: 14, fontStyle: 'italic' as any, fontFamily: 'Poppins_Italic' as any },
        img: { width: '100%' as any, borderRadius: 12, marginVertical: 16 },
        figure: { marginVertical: 16, width: '100%' as any },
        figcaption: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' as any, fontFamily: 'Poppins_Regular' as any, fontStyle: 'italic' as any },
        table: { marginVertical: 16, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8 },
        th: { padding: 12, fontFamily: 'Poppins_SemiBold' as any, backgroundColor: theme.colors.card },
        td: { padding: 12, fontFamily: 'Poppins_Regular' as any, borderTopWidth: 1, borderTopColor: theme.colors.border },
        code: { fontFamily: 'Courier' as any, backgroundColor: theme.colors.card, padding: 4, borderRadius: 4, fontSize: 14 },
        pre: { backgroundColor: theme.colors.card, padding: 16, borderRadius: 8, marginVertical: 16 },
    }), [theme.colors.text, theme.colors.primary, theme.colors.textSecondary, theme.colors.border, theme.colors.card]);
    const wasteHtmlRenderers = useMemo(() => ({
        img: (props: any) => {
            const uri = props.tnode.attributes.src;
            if (!uri) return null;
            return (
                <TouchableOpacity
                    onPress={() => handleImagePress(uri)}
                    style={{ marginVertical: 16, borderRadius: 12, overflow: 'hidden', width: '100%' }}
                >
                    <Image
                        source={{ uri }}
                        style={{ width: '100%', height: 250, borderRadius: 12 }}
                        resizeMode="cover"
                    />
                </TouchableOpacity>
            );
        },
        iframe: (props: any) => {
            const src = props.tnode.attributes.src;
            if (!src) return null;
            if (src.includes('youtube.com') || src.includes('youtu.be')) {
                return (
                    <View style={{ marginVertical: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' }}>
                        <View style={{ paddingTop: '56.25%', position: 'relative' }}>
                            <Text style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -50 }, { translateY: -50 }], color: '#fff', fontFamily: 'Poppins_Regular' }}>
                                🎥 Wideo YouTube
                            </Text>
                        </View>
                    </View>
                );
            }
            return (
                <View style={{ marginVertical: 16, padding: 20, backgroundColor: theme.colors.card, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border }}>
                    <Text style={{ color: theme.colors.text, fontFamily: 'Poppins_Regular' }}>📄 Osadzony content</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, fontFamily: 'Poppins_Regular' }}>
                        {src.length > 50 ? src.substring(0, 50) + '...' : src}
                    </Text>
                </View>
            );
        },
        figure: (props: any) => (
            <View style={{ marginVertical: 16, width: '100%' }}>
                {props.TDefaultRenderer && <props.TDefaultRenderer {...props} />}
            </View>
        ),
    }), [handleImagePress, theme.colors.text, theme.colors.textSecondary, theme.colors.card, theme.colors.border]);
    const wasteHtmlRenderersProps = useMemo(() => ({
        img: { enableExperimentalPercentWidth: true, initialDimensions: { width: width - 40, height: 300 } },
        a: { onPress: (_event: any, href: string) => { if (href) {} } },
    }), [width]);

    // --- Render Logic ---

    // Header Right Actions
    const renderHeaderRight = () => {
        if (step !== 'schedule') return null;
        return (
            <View style={{ flexDirection: 'row', gap: 10 }}>
                {newsArticles && newsArticles.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setNewsModalVisible(true)}
                        style={{ padding: 6, position: 'relative' }}
                    >
                        <Newspaper color={theme.colors.text} size={22} />
                        <View style={{
                            position: 'absolute',
                            top: 4,
                            right: 6,
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'red',
                            borderWidth: 1,
                            borderColor: theme.colors.background
                        }} />
                    </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => setSettingsVisible(true)} style={{ padding: 6 }}>
                    <Settings color={theme.colors.text} size={22} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle={theme.isDarkMode ? 'light-content' : 'dark-content'} />
            <Stack.Screen options={{ headerShown: false }} />

            {/* GLOBAL HEADER */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft color={theme.colors.text} size={28} />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Harmonogram</Text>
                        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                            {step === 'schedule' ? selectedCity?.name : 'Wybierz lokalizację'}
                        </Text>
                    </View>
                </View>
                {renderHeaderRight()}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <>
                    {step === 'city' && renderCitySelection()}
                    {step === 'cascade' && selectedCity && (
                        <View style={styles.stepContainer}>
                            <View style={styles.stepHeader}>
                                <TouchableOpacity onPress={() => setStep('city')} style={styles.backLink}>
                                    <ChevronLeft size={20} color={theme.colors.primary} />
                                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Zmień miasto</Text>
                                </TouchableOpacity>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 10 }]}>
                                    {selectedCity.name} — wpisz adres
                                </Text>
                            </View>
                            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
                                <WasteCascadePicker
                                    citySlug={selectedCity.id}
                                    cityName={selectedCity.name}
                                    theme={theme as any}
                                    onPicked={handleCascadePicked}
                                />
                            </ScrollView>
                        </View>
                    )}
                    {step === 'street' && renderStreetSelection()}
                    {step === 'schedule' && (
                        <>
                            {/* TABS */}
                            <View style={styles.tabContainer}>
                                <TouchableOpacity
                                    style={[styles.tab, viewMode === 'list' && { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                                    onPress={() => setViewMode('list')}
                                >
                                    <List size={18} color={viewMode === 'list' ? theme.colors.primary : theme.colors.textSecondary} />
                                    <Text style={[styles.tabText, { color: viewMode === 'list' ? theme.colors.text : theme.colors.textSecondary }]}>Lista</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tab, viewMode === 'calendar' && { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                                    onPress={() => setViewMode('calendar')}
                                >
                                    <CalendarIcon size={18} color={viewMode === 'calendar' ? theme.colors.primary : theme.colors.textSecondary} />
                                    <Text style={[styles.tabText, { color: viewMode === 'calendar' ? theme.colors.text : theme.colors.textSecondary }]}>Kalendarz</Text>
                                </TouchableOpacity>
                            </View>



                            {viewMode === 'list' ? renderSchedule() : renderCalendarView()}
                        </>
                    )}
                </>
            )}

            {/* FAB SEARCH BUTTON */}
            <TouchableOpacity
                style={{
                    position: 'absolute',
                    bottom: 120,
                    right: 20,
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 30,
                    flexDirection: 'row',
                    alignItems: 'center',
                    elevation: 5,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    zIndex: 100
                }}
                onPress={() => setIsWasteSearchVisible(true)}
            >
                <Search color="#FFF" size={20} style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFF', fontFamily: 'Poppins-SemiBold', fontSize: 14 }}>Gdzie wyrzucić?</Text>
            </TouchableOpacity>

            {/* WASTE SEARCH MODAL */}
            <Modal
                visible={isWasteSearchVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsWasteSearchVisible(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                    <View style={{
                        paddingTop: 20,
                        paddingBottom: 24,
                        paddingHorizontal: 20,
                        backgroundColor: theme.colors.primary,
                        borderBottomLeftRadius: 30,
                        borderBottomRightRadius: 30,
                        shadowColor: theme.colors.primary,
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.3,
                        shadowRadius: 15,
                        elevation: 10,
                        zIndex: 10
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <View>
                                <Text style={{ fontSize: 24, fontFamily: 'Poppins-Bold', color: '#FFF' }}>Gdzie wyrzucić?</Text>
                                <Text style={{ fontSize: 13, fontFamily: 'Poppins-Medium', color: 'rgba(255,255,255,0.8)', marginTop: -4 }}>Wyszukiwarka segregacji odpadów</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsWasteSearchVisible(false)}
                                style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 }}
                            >
                                <X color="#FFF" size={24} />
                            </TouchableOpacity>
                        </View>

                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#FFF',
                            borderRadius: 16,
                            paddingHorizontal: 16,
                            height: 56,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 5
                        }}>
                            <Search color={theme.colors.primary} size={22} style={{ marginRight: 12 }} />
                            <TextInput
                                style={{ flex: 1, color: '#1F2937', fontFamily: 'Poppins-Medium', fontSize: 16 }}
                                placeholder="Np. słoik, opona, karton..."
                                placeholderTextColor="#9CA3AF"
                                value={wasteSearchQuery}
                                onChangeText={setWasteSearchQuery}
                                autoFocus
                            />
                            {wasteSearchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setWasteSearchQuery('')}>
                                    <XCircle color="#9CA3AF" size={20} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <FlatList
                        data={wasteSearchResults}
                        keyExtractor={(item, idx) => `waste-${idx}`}
                        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={() => (
                            !wasteSearchLoading && wasteSearchQuery.length >= 3 ? (
                                <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 40 }}>
                                    <View style={{ backgroundColor: theme.colors.card, padding: 20, borderRadius: 50, marginBottom: 16 }}>
                                        <Search size={40} color={theme.colors.textSecondary} opacity={0.3} />
                                    </View>
                                    <Text style={{ fontSize: 18, fontFamily: 'Poppins-Bold', color: theme.colors.text, textAlign: 'center' }}>
                                        Nie znaleziono odpadu
                                    </Text>
                                    <Text style={{ fontSize: 14, fontFamily: 'Poppins-Regular', color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
                                        Spróbuj wpisać inną nazwę lub sprawdź czy nie ma literówek.
                                    </Text>
                                </View>
                            ) : wasteSearchQuery.length > 0 && wasteSearchQuery.length < 3 ? (
                                <View style={{ alignItems: 'center', marginTop: 60 }}>
                                    <Text style={{ fontSize: 14, fontFamily: 'Poppins-Regular', color: theme.colors.textSecondary }}>
                                        Wpisz co najmniej 3 znaki...
                                    </Text>
                                </View>
                            ) : null
                        )}
                        ListHeaderComponent={() => (
                            wasteSearchLoading ? (
                                <View style={{ paddingVertical: 20 }}>
                                    <ActivityIndicator color={theme.colors.primary} />
                                </View>
                            ) : null
                        )}
                        renderItem={({ item }) => {
                            let IconComponent = Search;
                            if (item.icon === 'recycle') IconComponent = Recycle;
                            else if (item.icon === 'glass-fragile') IconComponent = GlassWater;
                            else if (item.icon === 'file-document') IconComponent = FileText;
                            else if (item.icon === 'leaf') IconComponent = Leaf;
                            else if (item.icon === 'sprout') IconComponent = Leaf;
                            else if (item.icon === 'trash') IconComponent = Trash2;
                            else if (item.icon === 'help') IconComponent = Info;

                            return (
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 16,
                                        backgroundColor: theme.colors.card,
                                        marginBottom: 12,
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 4,
                                        elevation: 2
                                    }}
                                    onPress={() => openWasteDetails(item.category)}
                                >
                                    <View style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 12,
                                        backgroundColor: (item.color || '#888') + '15',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 16,
                                        borderWidth: 1,
                                        borderColor: (item.color || '#888') + '30'
                                    }}>
                                        <IconComponent size={24} color={item.color || '#888'} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontFamily: 'Poppins-Bold', color: theme.colors.text }}>{item.name}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                            <View style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: 4,
                                                backgroundColor: item.color || '#888',
                                                marginRight: 6
                                            }} />
                                            <Text style={{ fontSize: 13, fontFamily: 'Poppins-Medium', color: theme.colors.textSecondary }}>
                                                {item.category}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </SafeAreaView>
            </Modal>

            {/* SETTINGS MODAL */}
            <Modal
                visible={settingsVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSettingsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '78%', backgroundColor: theme.colors.card }]}>
                        <View style={[styles.modalHeader, { backgroundColor: theme.colors.background }]}>
                            <View style={styles.modalTitleRow}>
                                <Bell color={theme.colors.text} size={24} />
                                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Powiadomienia</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSettingsVisible(false)} style={styles.closeButton}>
                                <X color={theme.colors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.settingRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Włącz przypomnienia</Text>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Push o nadchodzącym odbiorze</Text>
                                </View>
                                <Switch
                                    value={notifSettings.enabled}
                                    onValueChange={toggleNotifEnabled}
                                    trackColor={{ false: '#767577', true: theme.colors.primary }}
                                />
                            </View>

                            <View style={styles.settingDivider} />

                            {/* Kiedy powiadamiać */}
                            <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12, color: theme.colors.text }]}>Kiedy?</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                {[
                                    { offset: 1, label: 'Dzień przed' },
                                    { offset: 0, label: 'Tego samego dnia' },
                                ].map(({ offset, label }) => {
                                    const active = notifSettings.reminderDayOffset === offset;
                                    return (
                                        <TouchableOpacity
                                            key={offset}
                                            disabled={!notifSettings.enabled}
                                            onPress={async () => {
                                                const next = { ...notifSettings, reminderDayOffset: offset };
                                                setNotifSettings(next);
                                                await WasteNotificationService.saveSettings(next);
                                                refreshNotifications(next);
                                            }}
                                            style={{
                                                flex: 1,
                                                paddingVertical: 12,
                                                borderRadius: 12,
                                                borderWidth: 1.5,
                                                alignItems: 'center',
                                                backgroundColor: active ? theme.colors.primary + '15' : 'transparent',
                                                borderColor: active ? theme.colors.primary : theme.colors.border,
                                                opacity: notifSettings.enabled ? 1 : 0.5,
                                            }}
                                        >
                                            <Text style={{ color: active ? theme.colors.primary : theme.colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* O której godzinie — preset chipy */}
                            <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12, color: theme.colors.text }]}>O której godzinie?</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                {[7, 8, 12, 17, 18, 19, 20, 21].map((h) => {
                                    const active = notifSettings.hour === h && notifSettings.minute === 0;
                                    return (
                                        <TouchableOpacity
                                            key={h}
                                            disabled={!notifSettings.enabled}
                                            onPress={async () => {
                                                const next = { ...notifSettings, hour: h, minute: 0 };
                                                setNotifSettings(next);
                                                await WasteNotificationService.saveSettings(next);
                                                refreshNotifications(next);
                                            }}
                                            style={{
                                                paddingVertical: 8,
                                                paddingHorizontal: 14,
                                                borderRadius: 999,
                                                borderWidth: 1,
                                                backgroundColor: active ? theme.colors.primary : 'transparent',
                                                borderColor: active ? theme.colors.primary : theme.colors.border,
                                                opacity: notifSettings.enabled ? 1 : 0.5,
                                            }}
                                        >
                                            <Text style={{ color: active ? '#FFF' : theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                                                {h.toString().padStart(2, '0')}:00
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.settingDivider} />

                            <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12, color: theme.colors.text }]}>Jakie frakcje przypominać?</Text>
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
                                Domyślnie wszystkie (poza Choinkami). Wybierz konkretne, by zawęzić.
                            </Text>

                            <View style={styles.typesContainer}>
                                {Object.keys(WASTE_ICONS).filter(t => t !== 'Choinki').map((type, idx) => {
                                    const isActive = notifSettings.enabledTypes.length === 0 || notifSettings.enabledTypes.includes(type);
                                    const typeConfig = WASTE_ICONS[type];
                                    const Icon = typeConfig.icon;

                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            style={[
                                                styles.typeBadge,
                                                {
                                                    backgroundColor: isActive ? typeConfig.color + '20' : theme.colors.border,
                                                    borderWidth: 1,
                                                    borderColor: isActive ? typeConfig.color : 'transparent',
                                                    opacity: notifSettings.enabled ? 1 : 0.5
                                                }
                                            ]}
                                            onPress={() => notifSettings.enabled && toggleNotifType(type)}
                                        >
                                            <Icon size={16} color={isActive ? typeConfig.color : theme.colors.textSecondary} />
                                            <Text style={[styles.typeText, { color: isActive ? theme.colors.text : theme.colors.textSecondary }]}>{type}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={{ height: 16 }} />

                            <TouchableOpacity
                                disabled={!notifSettings.enabled}
                                onPress={async () => {
                                    const result = await WasteNotificationService.sendTestNotification();
                                    if (result.ok) {
                                        Alert.alert(
                                            'Wysłano testowe powiadomienie',
                                            'Powinno pojawić się za 2 sekundy. Jeśli go nie widzisz, sprawdź ustawienia systemowe powiadomień.'
                                        );
                                        return;
                                    }
                                    if (result.reason === 'permission-denied') {
                                        Alert.alert(
                                            'Brak uprawnień',
                                            'Aplikacja nie ma zgody na powiadomienia. Otwórz ustawienia systemu i włącz powiadomienia dla Kaszuby24.',
                                            [
                                                { text: 'Anuluj', style: 'cancel' },
                                                {
                                                    text: 'Otwórz ustawienia',
                                                    onPress: () => {
                                                        Linking.openSettings().catch(() => {});
                                                    },
                                                },
                                            ]
                                        );
                                        return;
                                    }
                                    // schedule-error — surface raw error so we can debug from a real device
                                    Alert.alert(
                                        'Nie udało się wysłać powiadomienia',
                                        `Błąd techniczny: ${result.error || 'nieznany'}.\n\nSpróbuj zrestartować aplikację. Jeśli problem się utrzymuje — zgłoś nam ten komunikat.`
                                    );
                                }}
                                style={{
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: theme.colors.primary,
                                    alignItems: 'center',
                                    opacity: notifSettings.enabled ? 1 : 0.5,
                                }}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Wyślij testowe powiadomienie</Text>
                            </TouchableOpacity>

                            <View style={{ height: 12 }} />
                            <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: 12 }}>
                                {notifSettings.reminderDayOffset === 0 ? 'Tego samego dnia' : 'Dzień przed'} o godz.{' '}
                                {notifSettings.hour.toString().padStart(2, '0')}:{notifSettings.minute.toString().padStart(2, '0')}.
                            </Text>
                            <View style={{ height: 24 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* NEWS MODAL */}
            <Modal
                visible={newsModalVisible}
                transparent={false}
                animationType="slide"
                onRequestClose={() => {
                    if (selectedArticle) setSelectedArticle(null);
                    else setNewsModalVisible(false);
                }}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                    <View style={styles.modalHeader}>
                        {selectedArticle ? (
                            <TouchableOpacity onPress={() => setSelectedArticle(null)} style={styles.closeButton}>
                                <ChevronLeft color={theme.colors.text} size={28} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => setNewsModalVisible(false)} style={styles.closeButton}>
                                <CloseIcon color={theme.colors.text} size={28} />
                            </TouchableOpacity>
                        )}
                        <Text style={[styles.modalTitle, { color: theme.colors.text, flex: 1, textAlign: 'center' }]}>
                            {selectedArticle ? 'Aktualności' : 'Aktualności'}
                        </Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {selectedArticle ? (
                        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
                            {selectedArticle.featured_media_url && (
                                <Image 
                                    source={{ uri: selectedArticle.featured_media_url }}
                                    style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 16 }}
                                    resizeMode="cover"
                                />
                            )}
                            <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 10, fontFamily: 'Poppins_Bold' }}>
                                {selectedArticle.title.rendered}
                            </Text>
                            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 20, fontFamily: 'Poppins_Medium' }}>
                                {new Date(selectedArticle.date).toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </Text>

                            <RenderHtml
                                contentWidth={width - 40}
                                source={wasteHtmlSource}
                                baseStyle={wasteHtmlBaseStyle}
                                tagsStyles={wasteHtmlTagsStyles}
                                renderers={wasteHtmlRenderers}
                                renderersProps={wasteHtmlRenderersProps}
                            />
                        </ScrollView>
                    ) : (
                        <FlatList
                            data={newsArticles}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={{ padding: 16 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: theme.colors.card,
                                        marginBottom: 12,
                                        borderRadius: 12,
                                        padding: 16,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border
                                    }}
                                    onPress={() => setSelectedArticle(item)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                        <Megaphone size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
                                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                                            {new Date(item.date).toLocaleDateString('pl-PL')}
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 4 }}>
                                        {item.title.rendered}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                    <Text style={{ color: theme.colors.textSecondary }}>Brak aktualności dla tego miasta.</Text>
                                </View>
                            }
                        />
                    )}
                </SafeAreaView>
                <ImageViewing
                    images={images}
                    imageIndex={0}
                    visible={isImageViewVisible}
                    onRequestClose={() => setIsImageViewVisible(false)}
                />
            </Modal>

            {/* WASTE DETAILS MODAL */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                        {selectedRule && (
                            <>
                                <View style={[styles.modalHeader, { backgroundColor: selectedRule.color }]}>
                                    <View style={styles.modalTitleRow}>
                                        <selectedRule.icon color="#FFF" size={24} />
                                        <Text style={styles.modalTitle}>{selectedRule.title}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                                        <X color="#FFF" size={24} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={styles.modalBody}>
                                    <Text style={[styles.ruleDescription, { color: theme.colors.text }]}>
                                        {selectedRule.description}
                                    </Text>

                                    <View style={styles.ruleSection}>
                                        <View style={styles.ruleSectionHeader}>
                                            <CheckCircle2 color={theme.colors.success} size={20} />
                                            <Text style={[styles.ruleSectionTitle, { color: theme.colors.text }]}>WRZUCAMY ({selectedRule.allowed.length})</Text>
                                        </View>
                                        {selectedRule.allowed.length > 0 ? selectedRule.allowed.map((item, i) => (
                                            <View key={i} style={styles.ruleItem}>
                                                <View style={[styles.bullet, { backgroundColor: theme.colors.success }]} />
                                                <Text style={[styles.ruleText, { color: theme.colors.textSecondary }]}>{item}</Text>
                                            </View>
                                        )) : (
                                            <Text style={{ color: theme.colors.textSecondary, marginLeft: 26, fontStyle: 'italic' }}>Brak sprecyzowanych elementów</Text>
                                        )}
                                    </View>

                                    <View style={styles.ruleSection}>
                                        <View style={styles.ruleSectionHeader}>
                                            <XCircle color={theme.colors.error} size={20} />
                                            <Text style={[styles.ruleSectionTitle, { color: theme.colors.text }]}>NIE WRZUCAMY ({selectedRule.forbidden.length})</Text>
                                        </View>
                                        {selectedRule.forbidden.length > 0 ? selectedRule.forbidden.map((item, i) => (
                                            <View key={i} style={styles.ruleItem}>
                                                <View style={[styles.bullet, { backgroundColor: theme.colors.error }]} />
                                                <Text style={[styles.ruleText, { color: theme.colors.textSecondary }]}>{item}</Text>
                                            </View>
                                        )) : (
                                            <Text style={{ color: theme.colors.textSecondary, marginLeft: 26, fontStyle: 'italic' }}>Brak sprecyzowanych elementów</Text>
                                        )}
                                    </View>

                                    {selectedRule.tips && (
                                        <View style={[styles.tipsContainer, { backgroundColor: theme.colors.background }]}>
                                            <View style={styles.ruleSectionHeader}>
                                                <Info color={theme.colors.primary} size={20} />
                                                <Text style={[styles.ruleSectionTitle, { color: theme.colors.text }]}>Warto wiedzieć</Text>
                                            </View>
                                            {selectedRule.tips.map((item, i) => (
                                                <Text key={i} style={[styles.tipText, { color: theme.colors.textSecondary }]}>• {item}</Text>
                                            ))}
                                        </View>
                                    )}

                                    <View style={{ height: 40 }} />
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
            {/* DAY DETAILS MODAL (BOTTOM SHEET STYLE) */}
            <Modal
                visible={!!selectedDayDetails}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedDayDetails(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: 'auto', maxHeight: '50%', backgroundColor: theme.colors.card }]}>
                        <View style={[styles.modalHeader, { backgroundColor: theme.colors.background }]}>
                            <View style={styles.modalTitleRow}>
                                <CalendarIcon color={theme.colors.text} size={24} />
                                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                                    {selectedDayDetails ? formatDate(selectedDayDetails.date) : ''}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedDayDetails(null)} style={styles.closeButton}>
                                <X color={theme.colors.text} size={24} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ padding: 24, paddingBottom: 40 }}>
                            <Text style={{ fontSize: 16, marginBottom: 15, color: theme.colors.textSecondary }}>Odbierane frakcje:</Text>
                            {selectedDayDetails?.types.map((type, idx) => {
                                const typeConfig = WASTE_ICONS[type] || { icon: Trash2, color: '#666' };
                                const Icon = typeConfig.icon;
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.typeBadge, {
                                            backgroundColor: typeConfig.color + '15',
                                            borderColor: typeConfig.color + '40',
                                            borderWidth: 1,
                                            marginBottom: 10,
                                            paddingVertical: 12
                                        }]}
                                        onPress={() => {
                                            setSelectedDayDetails(null);
                                            setTimeout(() => openWasteDetails(type), 300);
                                        }}
                                    >
                                        <Icon size={24} color={typeConfig.color} />
                                        <Text style={[styles.typeText, { color: typeConfig.color, fontSize: 18, fontWeight: '700', fontFamily: 'Poppins_SemiBold' }]}>{type}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* (Reda building-type modal removed — Reda streets are now flat:
                each street with both types appears as TWO entries in the list,
                clearly labeled with icon + colored badge) */}

            <GlobalTabBar activeTab="menu" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'Poppins_Black',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 0,
        fontFamily: 'Poppins_Medium',
    },
    stepContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 20,
        fontFamily: 'Poppins_Bold',
    },
    stepHeader: {
        marginBottom: 10,
    },
    backLink: {
        marginBottom: 5,
    },
    cityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    cityCard: {
        width: '47%',
        borderRadius: 16,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        elevation: 2,
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    cityIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    cityLabel: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Poppins_Bold',
    },
    cityStatus: {
        fontSize: 12,
        marginTop: 4,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        height: 50,
        marginBottom: 15,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    resultsList: {
        flex: 1,
    },
    listHeader: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginVertical: 10,
        fontFamily: 'Poppins_SemiBold',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    resultItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resultText: {
        fontSize: 16,
    },
    scheduleList: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    scheduleHeader: {
        marginBottom: 5,
    },
    selectionPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
    },
    previewInfo: {
        flex: 1,
    },
    previewCity: {
        fontSize: 12,
        textTransform: 'uppercase',
        fontWeight: '600',
        fontFamily: 'Poppins_SemiBold',
    },
    previewStreet: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 2,
        fontFamily: 'Poppins_Bold',
    },
    dateCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    nextDateCard: {
        paddingTop: 32,
        borderWidth: 2,
        marginBottom: 24,
    },
    nextBadge: {
        position: 'absolute',
        top: -1,
        left: -1,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderTopLeftRadius: 18,
        borderBottomRightRadius: 18,
        zIndex: 1,
    },
    nextBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
        letterSpacing: 0.2,
        fontFamily: 'Poppins_Bold',
    },
    typesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 8,
    },
    typeText: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Poppins_SemiBold',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 15,
        marginTop: 15,
        paddingHorizontal: 40,
        lineHeight: 22,
    },
    gpsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
        gap: 8,
    },
    gpsButtonText: {
        fontWeight: '600',
        fontSize: 14,
        fontFamily: 'Poppins_SemiBold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '85%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    modalHeader: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '800',
        fontFamily: 'Poppins_Black',
        flexShrink: 1, // Prevent text overflow
    },
    closeButton: {
        padding: 5,
    },
    modalBody: {
        flex: 1,
        padding: 24,
    },
    ruleDescription: {
        fontSize: 16,
        marginBottom: 24,
        lineHeight: 22,
        fontFamily: 'Poppins_Regular',
    },
    ruleSection: {
        marginBottom: 24,
    },
    ruleSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    ruleSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        paddingLeft: 4,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 7,
        marginRight: 10,
    },
    ruleText: {
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
        fontFamily: 'Poppins_Regular',
    },
    tipsContainer: {
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
    },
    tipText: {
        fontSize: 14,
        marginBottom: 4,
        fontStyle: 'italic',
        fontFamily: 'Poppins_Italic',
    },
    // Calendar View Styles
    monthSection: {
        marginBottom: 0,
        paddingTop: 0,
    },
    monthTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
        marginTop: 8,
        marginLeft: 4,
        fontFamily: 'Poppins_Bold',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
    },
    calendarDay: {
        width: '23%', // Increased from 18% to fit 4 per row comfortably
        aspectRatio: 1, // Square
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 5,
        paddingTop: 8,
    },
    calendarDayNum: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
        fontFamily: 'Poppins_Bold',
    },
    calendarDots: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 15,
        paddingHorizontal: 20,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        elevation: 1,
        shadowOpacity: 0.1,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 4,
        borderRadius: 14,
        marginBottom: 20,
        marginHorizontal: 40, // Make it narrower/centered as requested
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8, // Smaller padding
        gap: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Poppins_SemiBold',
    },
    listMonthHeader: {
        marginTop: 10,
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    listMonthTitle: {
        fontSize: 18,
        fontWeight: '800',
        textTransform: 'capitalize',
        fontFamily: 'Poppins_Black',
    },
    // Settings Modal
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Poppins_SemiBold',
    },
    settingDivider: {
        height: 1,
        backgroundColor: '#ccc',
        opacity: 0.3,
        marginBottom: 20,
    },
    testNotifButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    announcementCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    announcementHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    announcementTitle: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Poppins_Bold',
        flex: 1,
    },
    announcementContent: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
        fontFamily: 'Poppins_Regular',
    },
    announcementDate: {
        fontSize: 12,
        fontFamily: 'Poppins_Medium',
    },
    miniAnnCard: {
        width: 220,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
    }
});
