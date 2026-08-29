
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    ScrollView,
    TouchableOpacity,
    Linking,
    Alert,
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
    Bell,
    Moon,
    Info,
    ChevronRight,
    Shield,
    Mail,
    MapPin,
    CloudRain,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    Tag,
    Trash2,
    Clock,
    Home,
    Navigation,
} from 'lucide-react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

import { useThemeStore } from '@/store/themeStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAdminStore } from '@/store/adminStore';
import { notificationService } from '@/services/notificationService';
import { WasteNotificationService } from '@/services/WasteNotificationService';
import SwipeableModal from '@/components/SwipeableModal';
import GlobalTabBar from '@/components/GlobalTabBar';

const VERSION = '1.0.39';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { theme, toggleTheme, isDarkMode } = useThemeStore();
    const {
        notificationsEnabled,
        toggleNotifications,
    } = useNotificationsStore();

    const {
        dailyWeatherEnabled,
        setDailyWeatherEnabled,
        weatherNotificationTime,
        setWeatherNotificationTime,
        wasteNotificationsEnabled,
        setWasteNotificationsEnabled,
        notificationRegions,
        notificationCategories,
        updatePreference,
        loadSettings
    } = useSettingsStore();

    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showRegions, setShowRegions] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [showNewsSection, setShowNewsSection] = useState(false);
    const [showWeatherSection, setShowWeatherSection] = useState(false);
    const [showWasteDetails, setShowWasteDetails] = useState(false);
    const [otaUpdateId, setOtaUpdateId] = useState<string | null>(null);
    const [versionTapCount, setVersionTapCount] = useState(0);
    const versionTapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const isAdminAuthenticated = useAdminStore((s) => s.isAuthenticated());
    // Waste specific state
    const [wasteDisplayCity, setWasteDisplayCity] = useState('');
    const [wasteDisplayStreet, setWasteDisplayStreet] = useState('');
    const [wasteHour, setWasteHour] = useState('19');
    const [wasteMinute, setWasteMinute] = useState('00');
    const [wasteDayOffset, setWasteDayOffset] = useState(1);

    const activeRegionsCount = notificationRegions.filter(r => r.enabled).length;
    const activeCategoriesCount = notificationCategories.filter(c => c.enabled).length;

    useEffect(() => {
        loadSettings();
        checkOtaUpdate();
        loadWasteSettings();
    }, []);

    const loadWasteSettings = async () => {
        const wasteConfig = await WasteNotificationService.getSettings();
        setWasteNotificationsEnabled(wasteConfig.enabled);
        setWasteHour(String(wasteConfig.hour));
        setWasteMinute(String(wasteConfig.minute).padStart(2, '0'));
        setWasteDayOffset(wasteConfig.reminderDayOffset);
        // Auto-read city/street from the waste screen selection
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const raw = await AsyncStorage.getItem('@kaszuby24_waste_selection');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.street) setWasteDisplayStreet(parsed.street);
                // Try to get city name from waste service
                const { wasteScheduleService } = require('@/services/WasteScheduleService');
                if (wasteScheduleService && parsed.cityId) {
                    const cities = await wasteScheduleService.getCities();
                    const foundCity = cities?.find((c: any) => c.id === parsed.cityId);
                    if (foundCity) setWasteDisplayCity(foundCity.name);
                }
            }
        } catch (e) { }
    };

    const handleWasteNotificationToggle = async (enabled: boolean) => {
        if (enabled && !notificationsEnabled) {
            handleToggleNotifications(true);
        }

        setWasteNotificationsEnabled(enabled);

        const currentWasteConfig = await WasteNotificationService.getSettings();
        currentWasteConfig.enabled = enabled;
        await WasteNotificationService.saveSettings(currentWasteConfig);

        if (enabled) {
            await WasteNotificationService.requestPermissions();
        }
    };

    const saveWasteTime = async (hour: string, minute: string, dayOffset: number) => {
        const h = parseInt(hour) || 19;
        const m = parseInt(minute) || 0;
        const config = await WasteNotificationService.getSettings();
        config.hour = h;
        config.minute = m;
        config.reminderDayOffset = dayOffset;
        await WasteNotificationService.saveSettings(config);
    };

    const checkOtaUpdate = async () => {
        try {
            // Skip OTA checks in Expo Go and in dev
            if (!__DEV__ && Constants.appOwnership !== 'expo') {
                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                    setOtaUpdateId(update.manifest?.id ?? 'Dostępna');
                } else {
                    const currentId = Updates.updateId;
                    if (currentId) {
                        setOtaUpdateId(currentId.slice(0, 8));
                    }
                }
            } else {
                // In Expo Go or dev, show runtime id if available
                const currentId = Updates.updateId;
                if (currentId) setOtaUpdateId(currentId.slice(0, 8));
            }
        } catch (e) {
            // Ignore in dev
        }
    };

    const handleToggleNotifications = async (value: boolean) => {
        if (value) {
            const granted = await notificationService.requestPermissions();
            if (granted) {
                if (!notificationsEnabled) toggleNotifications();
                notificationService.requestPermissionsAndRegister();
            } else {
                Alert.alert(
                    'Brak uprawnień',
                    'Aby otrzymywać powiadomienia, włącz je w ustawieniach systemu.',
                    [
                        { text: 'Anuluj', style: 'cancel' },
                        { text: 'Otwórz ustawienia', onPress: () => Linking.openSettings() },
                    ]
                );
                if (notificationsEnabled) toggleNotifications();
            }
        } else {
            if (notificationsEnabled) toggleNotifications();
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: theme.colors.card }]}
                    onPress={() => router.back()}
                >
                    <ArrowLeft size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Ustawienia</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]} // Increased padding for GlobalTabBar
                showsVerticalScrollIndicator={false}
            >
                {/* Notification Settings Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>USTAWIENIA POWIADOMIEŃ</Text>

                    {/* 1. Master toggle card */}
                    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginBottom: 12 }]}>
                        <View style={[styles.preferenceRow, { borderBottomColor: 'transparent' }]}>
                            <View style={styles.preferenceInfo}>
                                <View style={[styles.iconContainer, { backgroundColor: notificationsEnabled ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.12)' }]}>
                                    <Bell size={22} color={notificationsEnabled ? '#EF4444' : '#94A3B8'} />
                                </View>
                                <View>
                                    <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>Wszystkie powiadomienia</Text>
                                    <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>
                                        {notificationsEnabled ? 'Włączone' : 'Wyłączone'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={handleToggleNotifications}
                                trackColor={{ false: '#94A3B8', true: '#EF4444' }}
                                thumbColor={'#FFFFFF'}
                            />
                        </View>
                    </View>

                    {/* Notice if disabled */}
                    {!notificationsEnabled && (
                        <View style={[styles.noticeContainer, { marginBottom: 16 }]}>
                            <Info size={14} color={theme.colors.primary} />
                            <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>
                                Włącz powiadomienia główne, aby zarządzać szczegółami.
                            </Text>
                        </View>
                    )}

                    {/* Sub-notification cards */}
                    <View style={{ opacity: notificationsEnabled ? 1 : 0.5 }}>
                        {/* 2. Wiadomości card – collapsible */}
                        <TouchableOpacity
                            style={[styles.collapsibleHeader, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                            onPress={() => notificationsEnabled && setShowNewsSection(v => !v)}
                            activeOpacity={0.75}
                            disabled={!notificationsEnabled}
                        >
                            <View style={styles.preferenceInfo}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                                    <Tag size={20} color="#F59E0B" />
                                </View>
                                <View>
                                    <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>Wiadomości</Text>
                                    <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>
                                        {showNewsSection ? 'Kliknij aby zwinąć' : 'Regiony, kategorie'}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Switch
                                    value={notificationCategories.some(c => c.enabled)}
                                    onValueChange={(val) => {
                                        notificationCategories.forEach(c => updatePreference(c.id, val));
                                    }}
                                    trackColor={{ false: '#94A3B8', true: theme.colors.primary }}
                                    disabled={!notificationsEnabled}
                                    thumbColor={theme.colors.card}
                                    style={{ transform: [{ scale: 0.7 }] }}
                                />
                                {showNewsSection
                                    ? <ChevronUp size={18} color={theme.colors.textSecondary} />
                                    : <ChevronDown size={18} color={theme.colors.textSecondary} />
                                }
                            </View>
                        </TouchableOpacity>

                        {showNewsSection && notificationsEnabled && (
                            <View style={[styles.collapsibleBody, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginBottom: 8 }]}>
                                {/* Regiony ... */}
                                <TouchableOpacity
                                    style={[styles.preferenceRow, { borderBottomColor: showRegions ? theme.colors.border : 'transparent' }]}
                                    onPress={() => setShowRegions(v => !v)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.preferenceInfo}>
                                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                                            <MapPin size={18} color="#10B981" />
                                        </View>
                                        <View>
                                            <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>Regiony</Text>
                                            <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>
                                                {activeRegionsCount} z {notificationRegions.length} aktywnych
                                            </Text>
                                        </View>
                                    </View>
                                    {showRegions
                                        ? <ChevronUp size={16} color={theme.colors.textSecondary} />
                                        : <ChevronDown size={16} color={theme.colors.textSecondary} />
                                    }
                                </TouchableOpacity>
                                {showRegions && notificationRegions.map((region, index) => (
                                    <View
                                        key={region.id}
                                        style={[
                                            styles.preferenceRow,
                                            {
                                                paddingLeft: 48,
                                                borderBottomColor: index === notificationRegions.length - 1 && !showCategories ? 'transparent' : theme.colors.border,
                                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)'
                                            }
                                        ]}
                                    >
                                        <View style={styles.preferenceInfo}>
                                            <Text style={[styles.preferenceLabel, { color: theme.colors.text, fontSize: 14 }, region.name.trim().startsWith('--') && { paddingLeft: 12, opacity: 0.85 }]}>
                                                {region.name.replace(/^--\s*/, '')}
                                            </Text>
                                        </View>
                                        <Switch
                                            value={region.enabled}
                                            onValueChange={(enabled) => updatePreference(region.id, enabled)}
                                            trackColor={{ false: '#94A3B8', true: theme.colors.primary }}
                                            disabled={!notificationsEnabled}
                                            thumbColor={theme.colors.card}
                                            style={{ transform: [{ scale: 0.75 }] }}
                                        />
                                    </View>
                                ))}

                                {/* Kategorie */}
                                <TouchableOpacity
                                    style={[styles.preferenceRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, borderBottomColor: showCategories ? theme.colors.border : 'transparent' }]}
                                    onPress={() => setShowCategories(v => !v)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.preferenceInfo}>
                                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                                            <Tag size={18} color="#3B82F6" />
                                        </View>
                                        <View>
                                            <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>Kategorie</Text>
                                            <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>
                                                {activeCategoriesCount} aktywnych
                                            </Text>
                                        </View>
                                    </View>
                                    {showCategories
                                        ? <ChevronUp size={16} color={theme.colors.textSecondary} />
                                        : <ChevronDown size={16} color={theme.colors.textSecondary} />
                                    }
                                </TouchableOpacity>

                                {showCategories && notificationCategories.map((category, index) => (
                                    <View
                                        key={category.id}
                                        style={[
                                            styles.preferenceRow,
                                            {
                                                paddingLeft: 48,
                                                borderBottomColor: index === notificationCategories.length - 1 ? 'transparent' : theme.colors.border,
                                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.02)'
                                            }
                                        ]}
                                    >
                                        <View style={styles.preferenceInfo}>
                                            <Text style={[styles.preferenceLabel, { color: theme.colors.text, fontSize: 14 }]}>
                                                {category.name}
                                            </Text>
                                        </View>
                                        <Switch
                                            value={category.enabled}
                                            onValueChange={(enabled) => updatePreference(category.id, enabled)}
                                            trackColor={{ false: '#94A3B8', true: theme.colors.primary }}
                                            disabled={!notificationsEnabled}
                                            thumbColor={theme.colors.card}
                                            style={{ transform: [{ scale: 0.75 }] }}
                                        />
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* 3. Pogoda card – collapsible */}
                        <TouchableOpacity
                            style={[styles.collapsibleHeader, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginTop: 10 }]}
                            onPress={() => notificationsEnabled && setShowWeatherSection(v => !v)}
                            activeOpacity={0.75}
                            disabled={!notificationsEnabled}
                        >
                            <View style={styles.preferenceInfo}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                                    <CloudRain size={20} color="#3B82F6" />
                                </View>
                                <View>
                                    <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>Pogoda</Text>
                                    <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>
                                        {dailyWeatherEnabled ? `Powiadomienie o ${weatherNotificationTime}` : 'Wyłączone'}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Switch
                                    value={dailyWeatherEnabled}
                                    onValueChange={(enabled) => setDailyWeatherEnabled(enabled)}
                                    trackColor={{ false: '#94A3B8', true: theme.colors.primary }}
                                    disabled={!notificationsEnabled}
                                    thumbColor={theme.colors.card}
                                    style={{ transform: [{ scale: 0.75 }] }}
                                />
                                {showWeatherSection
                                    ? <ChevronUp size={18} color={theme.colors.textSecondary} />
                                    : <ChevronDown size={18} color={theme.colors.textSecondary} />
                                }
                            </View>
                        </TouchableOpacity>

                        {showWeatherSection && notificationsEnabled && (
                            <View style={[styles.collapsibleBody, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginBottom: 8 }]}>
                                <TouchableOpacity
                                    style={[styles.preferenceRow, { borderBottomColor: 'transparent', paddingLeft: 48 }]}
                                    onPress={() => setShowTimePicker(true)}
                                    disabled={!dailyWeatherEnabled || !notificationsEnabled}
                                >
                                    <View style={styles.preferenceInfo}>
                                        <Text style={[styles.preferenceLabel, { color: theme.colors.text, fontSize: 14, opacity: dailyWeatherEnabled ? 1 : 0.5 }]}>Godzina powiadomienia</Text>
                                    </View>
                                    <View style={[styles.timeChip, { backgroundColor: dailyWeatherEnabled ? theme.colors.primary + '15' : 'transparent', borderColor: dailyWeatherEnabled ? theme.colors.primary + '40' : theme.colors.border }]}>
                                        <Text style={{ color: dailyWeatherEnabled ? theme.colors.primary : theme.colors.textSecondary, fontSize: 14, fontFamily: 'Poppins_Bold' }}>
                                            {weatherNotificationTime}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* 4. Odpady card – collapsible */}
                        <TouchableOpacity
                            style={[styles.collapsibleHeader, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginTop: 10 }]}
                            onPress={() => notificationsEnabled && setShowWasteDetails(v => !v)}
                            activeOpacity={0.75}
                            disabled={!notificationsEnabled}
                        >
                            <View style={styles.preferenceInfo}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                                    <Trash2 size={20} color="#22C55E" />
                                </View>
                                <View>
                                    <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>Odpady</Text>
                                    <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>
                                        {(wasteDisplayCity || wasteDisplayStreet) ? [wasteDisplayStreet, wasteDisplayCity].filter(Boolean).join(', ') : 'Kliknij aby skonfigurować'}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Switch
                                    value={wasteNotificationsEnabled}
                                    onValueChange={handleWasteNotificationToggle}
                                    trackColor={{ false: '#94A3B8', true: theme.colors.primary }}
                                    disabled={!notificationsEnabled}
                                    thumbColor={theme.colors.card}
                                    style={{ transform: [{ scale: 0.75 }] }}
                                />
                                {showWasteDetails
                                    ? <ChevronUp size={18} color={theme.colors.textSecondary} />
                                    : <ChevronDown size={18} color={theme.colors.textSecondary} />
                                }
                            </View>
                        </TouchableOpacity>

                        {showWasteDetails && notificationsEnabled && (
                            <View style={[styles.collapsibleBody, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                {/* Godzina powiadomienia */}
                                <View style={[styles.preferenceRow, { borderBottomColor: theme.colors.border, paddingLeft: 48 }]}>
                                    <View style={styles.preferenceInfo}>
                                        <Text style={[styles.preferenceLabel, { color: theme.colors.text, fontSize: 14 }]}>Godzina przypomnienia</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <TextInput
                                            style={[styles.timeInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                                            value={wasteHour}
                                            onChangeText={setWasteHour}
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            placeholder="19"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            onBlur={() => saveWasteTime(wasteHour, wasteMinute, wasteDayOffset)}
                                            editable={wasteNotificationsEnabled && notificationsEnabled}
                                        />
                                        <Text style={{ color: theme.colors.textSecondary, fontSize: 18, fontWeight: '700' }}>:</Text>
                                        <TextInput
                                            style={[styles.timeInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                                            value={wasteMinute}
                                            onChangeText={setWasteMinute}
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            placeholder="00"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            onBlur={() => saveWasteTime(wasteHour, wasteMinute, wasteDayOffset)}
                                            editable={wasteNotificationsEnabled && notificationsEnabled}
                                        />
                                    </View>
                                </View>


                                {/* Kiedy – w dniu / dzień przed */}
                                <View style={[styles.preferenceRow, { borderBottomColor: 'transparent', paddingLeft: 48 }]}>
                                    <View style={styles.preferenceInfo}>
                                        <Text style={[styles.preferenceLabel, { color: theme.colors.text, fontSize: 14 }]}>Kiedy</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        <TouchableOpacity
                                            style={[
                                                styles.dayToggleBtn,
                                                wasteDayOffset === 1 && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                            ]}
                                            onPress={() => { setWasteDayOffset(1); saveWasteTime(wasteHour, wasteMinute, 1); }}
                                            disabled={!wasteNotificationsEnabled || !notificationsEnabled}
                                        >
                                            <Text style={[styles.dayToggleTxt, { color: wasteDayOffset === 1 ? '#FFFFFF' : theme.colors.textSecondary }]}>Dzień przed</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.dayToggleBtn,
                                                wasteDayOffset === 0 && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                            ]}
                                            onPress={() => { setWasteDayOffset(0); saveWasteTime(wasteHour, wasteMinute, 0); }}
                                            disabled={!wasteNotificationsEnabled || !notificationsEnabled}
                                        >
                                            <Text style={[styles.dayToggleTxt, { color: wasteDayOffset === 0 ? '#FFFFFF' : theme.colors.textSecondary }]}>W dniu</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Sekcja Wyglądu */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                        WYGLĄD
                    </Text>
                    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <View style={[styles.preferenceRow, { borderBottomColor: 'transparent' }]}>
                            <View style={styles.preferenceInfo}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
                                    <Moon size={20} color="#7C3AED" />
                                </View>
                                <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                                    Tryb ciemny
                                </Text>
                            </View>
                            <Switch
                                value={isDarkMode}
                                onValueChange={toggleTheme}
                                trackColor={{ false: '#94A3B8', true: theme.colors.primary }}
                                thumbColor={theme.colors.card}
                                style={{ transform: [{ scale: 0.8 }] }}
                            />
                        </View>
                    </View>
                </View>

                {/* Sekcja Informacji */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                        INFORMACJE
                    </Text>
                    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <TouchableOpacity
                            style={[styles.preferenceRow, { borderBottomColor: theme.colors.border }]}
                            onPress={() => Linking.openURL('https://kaszuby24.pl/polityka-prywatnosci/')}
                        >
                            <View style={styles.preferenceInfo}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                    <Shield size={20} color="#10B981" />
                                </View>
                                <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                                    Polityka prywatności
                                </Text>
                            </View>
                            <ChevronRight size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.preferenceRow, { borderBottomColor: theme.colors.border }]}
                            onPress={() => Linking.openURL('mailto:kontakt@kaszuby24.pl')}
                        >
                            <View style={styles.preferenceInfo}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                    <Mail size={20} color="#F59E0B" />
                                </View>
                                <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                                    Skontaktuj się z nami
                                </Text>
                            </View>
                            <ChevronRight size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Open Data Info */}
                        <TouchableOpacity
                            style={[styles.preferenceRow, { borderBottomColor: 'transparent' }]}
                            onPress={() => Alert.alert('O danych', 'Dane o rozkładach jazdy oraz inne informacje publiczne pochodzą z otwartych źródeł (Open Data) udostępnianych przez przewoźników i instytucje. Aplikacja prezentuje te dane w celach informacyjnych i nie ponosi odpowiedzialności za ich dokładność.')}
                        >
                            <View style={styles.preferenceInfo}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(156, 163, 175, 0.1)' }]}>
                                    <Info size={20} color="#9CA3AF" />
                                </View>
                                <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                                    Źródła danych (Open Data)
                                </Text>
                            </View>
                            <ChevronRight size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.developerContainer}>
                        <Text style={[styles.developerText, { color: theme.colors.textSecondary }]}>
                            Aplikacja stworzona przez
                        </Text>
                        <TouchableOpacity onPress={() => Linking.openURL('https://kropidlowscy.pl')}>
                            <Image
                                source={{ uri: 'https://kropidlowscy.pl/LOGO-KROPIDLOWSCY-03.png' }}
                                style={styles.developerLogo}
                                contentFit="contain"
                                transition={500}
                            />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => {
                            const next = versionTapCount + 1;
                            setVersionTapCount(next);
                            if (versionTapTimer.current) clearTimeout(versionTapTimer.current);
                            if (next >= 5) {
                                setVersionTapCount(0);
                                router.push('/admin');
                            } else {
                                versionTapTimer.current = setTimeout(() => setVersionTapCount(0), 2000);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
                            Wersja {VERSION}{isAdminAuthenticated ? ' ⚙' : ''}
                        </Text>
                    </TouchableOpacity>
                    {otaUpdateId && otaUpdateId !== 'Dostępna' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 }} />
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontFamily: 'Poppins_Medium' }}>
                                Aktualizacja OTA: {otaUpdateId}
                            </Text>
                        </View>
                    )}

                </View>

            </ScrollView >

            {/* Time Picker Modal */}
            <SwipeableModal
                visible={showTimePicker}
                onClose={() => setShowTimePicker(false)}
                title="Godzina powiadomienia"
            >
                <View style={{ padding: 16, gap: 12 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Poppins_Regular', color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 8 }}>
                        Wybierz godzinę, o której chcesz otrzymywać poranną prognozę pogody.
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                        {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'].map((time) => (
                            <TouchableOpacity
                                key={time}
                                style={{
                                    width: '30%',
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: weatherNotificationTime === time ? theme.colors.primary : theme.colors.border,
                                    backgroundColor: weatherNotificationTime === time ? theme.colors.primary + '10' : theme.colors.card,
                                    alignItems: 'center'
                                }}
                                onPress={() => {
                                    setWeatherNotificationTime(time);
                                    setShowTimePicker(false);
                                }}
                            >
                                <Text style={{
                                    color: weatherNotificationTime === time ? theme.colors.primary : theme.colors.text,
                                    fontSize: 16,
                                    fontFamily: 'Poppins_Bold'
                                }}>
                                    {time}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </SwipeableModal>
            <GlobalTabBar activeTab="menu" />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Poppins_Bold',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Poppins_SemiBold',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 8,
        opacity: 0.7,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingVertical: 4,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
    },
    collapsibleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 2,
    },
    collapsibleBody: {
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 2,
    },
    subGroupLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_SemiBold',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        borderTopWidth: 1,
        opacity: 0.6,
    },
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    preferenceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    preferenceLabel: {
        fontSize: 16,
        fontFamily: 'Poppins_Medium',
        fontWeight: '500',
    },
    preferenceDescription: {
        fontSize: 13,
        marginTop: 2,
        opacity: 0.7,
    },
    nestedRow: {
        paddingLeft: 12,
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
        // Removed opacity: 0.6
    },
    // Style dla wyboru godziny
    timeChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    noticeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderRadius: 12,
        marginTop: 12,
        gap: 8,
    },
    noticeText: {
        fontSize: 12,
        fontFamily: 'Poppins_Medium',
    },
    footerLogo: {
        width: 48,
        height: 48,
        marginBottom: 12,
        borderRadius: 10,
    },
    developerContainer: {
        alignItems: 'center',
        marginVertical: 16,
    },
    developerText: {
        fontSize: 12,
        fontFamily: 'Poppins_Medium',
        marginBottom: 8,
        opacity: 0.8,
    },
    developerLogo: {
        width: 180, // Increased from 150
        height: 60, // Increased from 50
    },
    relatedFooterText: {
        fontSize: 14,
        fontFamily: 'Poppins_Regular',
        marginLeft: 8,
    },
    loadMoreButton: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(34, 74, 150, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(34, 74, 150, 0.1)',
    },
    loadMoreText: {
        fontSize: 15,
        fontFamily: 'Poppins_Medium',
        fontWeight: '600',
    },
    versionText: {
        fontSize: 14,
        fontFamily: 'Poppins_Medium',
        marginBottom: 4,
    },
    versionSubText: {
        fontSize: 12,
    },
    copyrightText: {
        fontSize: 12,
    },
    inlineInput: {
        fontSize: 14,
        fontFamily: 'Poppins_Medium',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 100,
        textAlign: 'right',
    },
    timeInput: {
        fontSize: 16,
        fontFamily: 'Poppins_Bold',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        width: 46,
        textAlign: 'center',
    },
    dayToggleBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.3)',
    },
    dayToggleTxt: {
        fontSize: 12,
        fontFamily: 'Poppins_Medium',
    },
});
