import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Modal,
    Alert,
    Switch,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
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
    Check,
    Info,
    XCircle,
    CheckCircle2
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { wasteScheduleService, WasteScheduleData, WasteRegion, City } from '@/services/WasteScheduleService';
import { WASTE_RULES, WasteRule } from './wasteRules';
import { WasteNotificationService, NotificationSettings } from '@/services/WasteNotificationService';
import { WasteCalendarService } from '@/services/WasteCalendarService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, Calendar as CalendarIcon, List, Bell, Share2, Megaphone, X as CloseIcon, ChevronLeft } from 'lucide-react-native';
import RenderHtml from 'react-native-render-html';
import GlobalTabBar from '@/components/GlobalTabBar';
import { useWindowDimensions } from 'react-native';
import ImageViewing from 'react-native-image-viewing';

interface WasteAnnouncement {
    id: number;
    date: string;
    title: { rendered: string };
    content: { rendered: string };
    link: string;
    excerpt: { rendered: string };
    _embedded?: {
        'wp:featuredmedia'?: Array<{ source_url: string }>
    };
}

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

    // UI States
    const [step, setStep] = useState<'city' | 'street' | 'schedule'>('city');
    const [isSearching, setIsSearching] = useState(false);

    // Modal & GPS States
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedRule, setSelectedRule] = useState<WasteRule | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);

    // New Features States
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [newsModalVisible, setNewsModalVisible] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<WasteAnnouncement | null>(null);
    const [selectedDayDetails, setSelectedDayDetails] = useState<{ date: string, types: string[] } | null>(null);
    const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
        enabled: true,
        hour: 19,
        minute: 0,
        reminderDayOffset: 1,
        enabledTypes: []
    });
    const [announcements, setAnnouncements] = useState<WasteAnnouncement[]>([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(false);
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [images, setImages] = useState<{ uri: string }[]>([]);

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
                const cityData = await wasteScheduleService.getSchedule(city.id);
                if (cityData) {
                    setData(cityData);
                    // Verify street
                    const exists = cityData.regions.find(r => r.id === parsed.regionId && r.streets.includes(parsed.street));
                    if (exists) {
                        setSelectedStreet({ street: parsed.street, regionId: parsed.regionId });
                        setStep('schedule');
                        if (city.id === 'reda') fetchAnnouncements();
                    } else {
                        setStep('street');
                    }
                }
            }
        }
        setLoading(false);
    };

    const fetchAnnouncements = async () => {
        try {
            setAnnouncementsLoading(true);
            const response = await fetch('https://miasto.reda.pl/wp-json/wp/v2/posts?categories=11&per_page=3&_embed');
            if (response.ok) {
                const data = await response.json();
                setAnnouncements(data);
            }
        } catch (error) {
            console.log('Error fetching announcements:', error);
        } finally {
            setAnnouncementsLoading(false);
        }
    };

    const handleCitySelect = async (city: City) => {
        if (!city.active) return;
        setLoading(true);
        setSelectedCity(city);
        const cityData = await wasteScheduleService.getSchedule(city.id);
        setData(cityData);
        setStep('street');
        setLoading(false);
        if (city.id === 'reda') fetchAnnouncements();
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
        if (!searchQuery) return allStreets.slice(0, 10); // Suggestions when empty

        const query = searchQuery.toLowerCase();
        // 1. Exact matches / starts with
        const directMatches = allStreets.filter(s => s.street.toLowerCase().startsWith(query));
        // 2. Includes
        const includeMatches = allStreets.filter(s => s.street.toLowerCase().includes(query) && !s.street.toLowerCase().startsWith(query));

        return [...directMatches, ...includeMatches].slice(0, 20);
    }, [searchQuery, allStreets]);

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
                setLocationLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            const address = await Location.reverseGeocodeAsync({ latitude, longitude });

            if (address && address.length > 0) {
                const city = address[0].city;
                const street = address[0].street;

                if (step === 'city') {
                    const matchedCity = cities.find(c => c.name.toLowerCase() === city?.toLowerCase());
                    if (matchedCity) {
                        handleCitySelect(matchedCity);
                    } else {
                        Alert.alert('Niestety', `Twoje miasto (${city}) nie jest jeszcze obsługiwane.`);
                    }
                } else if (step === 'street') {
                    if (street) {
                        // Fuzzy search for street
                        const matchedStreet = allStreets.find(s =>
                            s.street.toLowerCase().includes(street.toLowerCase()) ||
                            street.toLowerCase().includes(s.street.toLowerCase())
                        );

                        if (matchedStreet) {
                            handleStreetSelect(matchedStreet.street, matchedStreet.regionId);
                        } else {
                            setSearchQuery(street);
                            Alert.alert('Informacja', `Wykryto ulicę: ${street}, ale nie znaleziono jej dokładnego odpowiednika w bazie. Sprawdź wyniki wyszukiwania.`);
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
        const rule = WASTE_RULES.find(r => r.id.toLowerCase() === type.toLowerCase()) || WASTE_RULES.find(r => type.toLowerCase().includes(r.id.toLowerCase()));
        if (rule) {
            setSelectedRule(rule);
            setModalVisible(true);
        } else {
            // Fallback for types not strictly defined but mapped
            // e.g., mapping 'Odpady zielone' to 'Bio' if strict rule missing, but we have specific rules now.
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

    const renderStreetSelection = () => (
        <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
                <TouchableOpacity onPress={() => setStep('city')} style={styles.backLink}>
                    <Text style={{ color: theme.colors.primary }}>← Zmień miasto ({selectedCity?.name})</Text>
                </TouchableOpacity>
                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 10 }]}>Znajdź swoją ulicę</Text>
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

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <TouchableOpacity
                    style={[styles.gpsButton, { flex: 1, backgroundColor: theme.colors.card, borderColor: theme.colors.border, flexDirection: 'column', alignItems: 'center', padding: 15, height: 'auto', marginBottom: 0 }]}
                    onPress={() => {
                        const blockStreet = data?.regions
                            .flatMap(r => r.streets.map(s => ({ street: s, regionId: r.id })))
                            .find(s => s.street.toLowerCase().includes('wielorodzinna') || s.regionId === 'wielorodzinna');

                        if (blockStreet) {
                            handleStreetSelect(blockStreet.street, blockStreet.regionId);
                        } else {
                            Alert.alert('Informacja', 'Dla tego miasta nie zdefiniowano oddzielnego harmonogramu dla bloków.');
                        }
                    }}
                >
                    <Building2 size={28} color={theme.colors.primary} style={{ marginBottom: 8 }} />
                    <Text style={{ color: theme.colors.text, fontWeight: '600', textAlign: 'center' }}>Mieszkam w Bloku</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 4 }}>(Zabudowa wielorodzinna)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.gpsButton, { flex: 1, backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary, flexDirection: 'column', alignItems: 'center', padding: 15, height: 'auto', marginBottom: 0 }]}
                    activeOpacity={1}
                >
                    <MapPin size={28} color={theme.colors.primary} style={{ marginBottom: 8 }} />
                    <Text style={{ color: theme.colors.text, fontWeight: '600', textAlign: 'center' }}>Dom Jednorodzinny</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 4 }}>(Wpisz ulicę poniżej)</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.searchInputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Search size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder="Wpisz nazwę ulicy..."
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
                            {searchQuery ? 'Wyniki wyszukiwania' : 'Najczęściej wybierane / Sugestie'}
                        </Text>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ color: theme.colors.textSecondary }}>Nie znaleziono ulicy w mieście {selectedCity?.name}</Text>
                        </View>
                    }
                />
            </KeyboardAvoidingView>
        </View>
    );

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
                            <Text style={[styles.previewStreet, { color: theme.colors.text }]}>{selectedStreet?.street}</Text>
                        </View>
                        <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Zmień</Text>
                    </TouchableOpacity>
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
                <View style={{ padding: 20, paddingTop: 10, opacity: 0.8 }}>
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

    // --- Render Logic ---

    // Header Right Actions
    const renderHeaderRight = () => {
        if (step !== 'schedule') return null;
        return (
            <View style={{ flexDirection: 'row', gap: 10 }}>
                {selectedCity?.id === 'reda' && (
                    <TouchableOpacity
                        onPress={() => setNewsModalVisible(true)}
                        style={{ padding: 6, position: 'relative' }}
                    >
                        <Bell color={theme.colors.text} size={22} />
                        {announcements.length > 0 && (
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
                        )}
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

            {/* SETTINGS MODAL */}
            <Modal
                visible={settingsVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSettingsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '60%', backgroundColor: theme.colors.card }]}>
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
                                <View>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Włącz przypomnienia</Text>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Powiadomienia o odbiorze</Text>
                                </View>
                                <Switch
                                    value={notifSettings.enabled}
                                    onValueChange={toggleNotifEnabled}
                                    trackColor={{ false: '#767577', true: theme.colors.primary }}
                                />
                            </View>

                            <View style={styles.settingDivider} />

                            <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 15, color: theme.colors.text }]}>Jakie frakcje przypominać?</Text>

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

                            <View style={{ height: 20 }} />
                            <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: 12 }}>
                                Powiadomienia przychodzą dzień przed odbiorem o godz. {notifSettings.hour}:{notifSettings.minute < 10 ? '0' + notifSettings.minute : notifSettings.minute}.
                            </Text>
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
                            {selectedArticle ? 'Artykuł' : 'Komunikaty'}
                        </Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {selectedArticle ? (
                        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
                            {selectedArticle._embedded?.['wp:featuredmedia']?.[0]?.source_url && (
                                <TouchableOpacity
                                    onPress={() => selectedArticle._embedded && handleImagePress(selectedArticle._embedded['wp:featuredmedia'][0].source_url)}
                                    style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden' }}
                                >
                                    <Image
                                        source={{ uri: selectedArticle._embedded?.['wp:featuredmedia']?.[0]?.source_url || '' }}
                                        style={{ width: '100%', height: 200, borderRadius: 12 }}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            )}
                            <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 10, fontFamily: 'Poppins_Bold' }}>
                                {selectedArticle.title.rendered.replace(/&#8211;/g, '-').replace(/&#8222;/g, '„').replace(/&#8221;/g, '”')}
                            </Text>
                            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 20, fontFamily: 'Poppins_Medium' }}>
                                {new Date(selectedArticle.date).toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </Text>

                            <RenderHtml
                                contentWidth={width - 40}
                                source={{ html: selectedArticle.content.rendered }}
                                baseStyle={{ color: theme.colors.text, fontSize: 16, lineHeight: 24, fontFamily: 'Poppins_Regular' }}
                                tagsStyles={{
                                    p: { marginBottom: 14, fontFamily: 'Poppins_Regular', lineHeight: 24 },
                                    h1: { fontSize: 24, fontWeight: 'bold', fontFamily: 'Poppins_Bold', marginTop: 20, marginBottom: 10, lineHeight: 32 },
                                    h2: { fontSize: 22, fontWeight: 'bold', fontFamily: 'Poppins_Bold', marginTop: 18, marginBottom: 8, lineHeight: 30 },
                                    h3: { fontSize: 20, fontWeight: 'bold', fontFamily: 'Poppins_SemiBold', marginTop: 16, marginBottom: 6, lineHeight: 28 },
                                    a: { color: theme.colors.primary, textDecorationLine: 'none', fontFamily: 'Poppins_Medium' },
                                    strong: { fontWeight: 'bold', fontFamily: 'Poppins_Bold' },
                                    em: { fontStyle: 'italic', fontFamily: 'Poppins_Italic' },
                                    ul: { marginBottom: 14, paddingLeft: 24 },
                                    ol: { marginBottom: 14, paddingLeft: 24 },
                                    li: { marginBottom: 8, fontFamily: 'Poppins_Regular', lineHeight: 22 },
                                    blockquote: { marginLeft: 16, paddingLeft: 16, borderLeftWidth: 4, borderLeftColor: theme.colors.primary, marginBottom: 14, fontStyle: 'italic' },
                                    img: { width: '100%', borderRadius: 12, marginVertical: 16 }
                                }}
                                renderers={{
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
                                    }
                                }}
                                renderersProps={{
                                    img: {
                                        enableExperimentalPercentWidth: true,
                                        initialDimensions: { width: width - 40, height: 300 }
                                    }
                                }}
                            />
                        </ScrollView>
                    ) : (
                        <FlatList
                            data={announcements}
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
                                        {item.title.rendered.replace(/&#8211;/g, '-').replace(/&#8222;/g, '„').replace(/&#8221;/g, '”')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                    <Text style={{ color: theme.colors.textSecondary }}>Brak nowych komunikatów.</Text>
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
                                            <Text style={[styles.ruleSectionTitle, { color: theme.colors.text }]}>WRZUCAMY</Text>
                                        </View>
                                        {selectedRule.allowed.map((item, i) => (
                                            <View key={i} style={styles.ruleItem}>
                                                <View style={[styles.bullet, { backgroundColor: theme.colors.success }]} />
                                                <Text style={[styles.ruleText, { color: theme.colors.textSecondary }]}>{item}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <View style={styles.ruleSection}>
                                        <View style={styles.ruleSectionHeader}>
                                            <XCircle color={theme.colors.error} size={20} />
                                            <Text style={[styles.ruleSectionTitle, { color: theme.colors.text }]}>NIE WRZUCAMY</Text>
                                        </View>
                                        {selectedRule.forbidden.map((item, i) => (
                                            <View key={i} style={styles.ruleItem}>
                                                <View style={[styles.bullet, { backgroundColor: theme.colors.error }]} />
                                                <Text style={[styles.ruleText, { color: theme.colors.textSecondary }]}>{item}</Text>
                                            </View>
                                        ))}
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
});
