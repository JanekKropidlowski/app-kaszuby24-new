
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
} from 'lucide-react-native';
import * as Updates from 'expo-updates';

import { useThemeStore } from '@/store/themeStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { notificationService } from '@/services/notificationService';
import OnboardingCoachmarks from '@/components/OnboardingCoachmarks';
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
        notificationRegions,
        notificationCategories,
        updatePreference,
        loadSettings
    } = useSettingsStore();

    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedTime, setSelectedTime] = useState('08:00');
    const [otaUpdateId, setOtaUpdateId] = useState<string | null>(null);

    // Tutorial logic
    const [showTutorial, setShowTutorial] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        loadSettings();
        checkOtaUpdate();
    }, []);

    const checkOtaUpdate = async () => {
        try {
            if (!__DEV__) {
                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                    setOtaUpdateId(update.manifest?.id ?? 'Dostępna');
                } else {
                    const currentId = Updates.updateId;
                    if (currentId) {
                        setOtaUpdateId(currentId.slice(0, 8));
                    }
                }
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
                {/* Sekcja Powiadomień */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                        POWIADOMIENIA
                    </Text>

                    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <View style={[styles.preferenceRow, { borderBottomColor: theme.colors.border }]}>
                            <View style={styles.preferenceInfo}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                    <Bell size={20} color="#EF4444" />
                                </View>
                                <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                                    Włącz powiadomienia
                                </Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={handleToggleNotifications}
                                trackColor={{ false: '#94A3B8', true: theme.colors.primary }}
                                thumbColor={notificationsEnabled ? theme.colors.primary : (isDarkMode ? '#4B5563' : '#D1D5DB')}
                                style={{ transform: [{ scale: 1.0 }] }}
                            />
                        </View>

                        <View style={[styles.preferenceRow, { borderBottomColor: theme.colors.border }]}>
                            <View style={styles.preferenceInfo}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                    <CloudRain size={20} color="#3B82F6" />
                                </View>
                                <View>
                                    <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                                        Codzienna pogoda
                                    </Text>
                                    <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>
                                        Prognoza rano
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={dailyWeatherEnabled}
                                onValueChange={(enabled) => setDailyWeatherEnabled(enabled)}
                                trackColor={{ false: '#94A3B8', true: theme.colors.primary }}
                                disabled={!notificationsEnabled}
                                thumbColor={theme.colors.card}
                                style={{ transform: [{ scale: 0.8 }] }}
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.preferenceRow, { borderBottomColor: 'transparent' }]}
                            onPress={() => setShowTimePicker(true)}
                            disabled={!dailyWeatherEnabled || !notificationsEnabled}
                        >
                            <View style={styles.preferenceInfo}>
                                <View style={[styles.iconContainer, { backgroundColor: 'transparent' }]} />
                                <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                                    Godzina
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ color: theme.colors.textSecondary, marginRight: 8, fontSize: 16 }}>
                                    {selectedTime}
                                </Text>
                                <ChevronRight size={20} color={theme.colors.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Sekcja Regionów */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                        REGIONY
                    </Text>
                    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        {notificationRegions.map((region, index) => (
                            <View
                                key={region.id}
                                style={[
                                    styles.preferenceRow,
                                    { borderBottomColor: index === notificationRegions.length - 1 ? 'transparent' : theme.colors.border }
                                ]}
                            >
                                <View style={styles.preferenceInfo}>
                                    <View style={[
                                        styles.iconContainer,
                                        { backgroundColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }
                                    ]}>
                                        <MapPin size={18} color={theme.colors.textSecondary} />
                                    </View>
                                    <Text style={[
                                        styles.preferenceLabel,
                                        { color: theme.colors.text },
                                        region.name.trim().startsWith('--') && { paddingLeft: 16, fontSize: 15, opacity: 0.9 } // Indent for sub-regions
                                    ]}>
                                        {region.name.replace(/^--\s*/, '')}
                                    </Text>
                                </View>
                                <Switch
                                    value={region.enabled}
                                    onValueChange={(enabled) => updatePreference(region.id, enabled)}
                                    trackColor={{ false: '#94A3B8', true: theme.colors.primary }}
                                    disabled={!notificationsEnabled}
                                    thumbColor={theme.colors.card}
                                    style={{ transform: [{ scale: 0.8 }] }}
                                />
                            </View>
                        ))}
                    </View>
                </View>

                {/* Sekcja Kategorii */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                        KATEGORIE
                    </Text>
                    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        {notificationCategories.map((category, index) => (
                            <View
                                key={category.id}
                                style={[
                                    styles.preferenceRow,
                                    { borderBottomColor: index === notificationCategories.length - 1 ? 'transparent' : theme.colors.border }
                                ]}
                            >
                                <View style={styles.preferenceInfo}>
                                    <View style={[
                                        styles.iconContainer,
                                        { backgroundColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }
                                    ]}>
                                        <Info size={18} color={theme.colors.textSecondary} />
                                    </View>
                                    <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                                        {category.name}
                                    </Text>
                                </View>
                                <Switch
                                    value={category.enabled}
                                    onValueChange={(enabled) => updatePreference(category.id, enabled)}
                                    trackColor={{ false: '#94A3B8', true: theme.colors.primary }}
                                    disabled={!notificationsEnabled}
                                    thumbColor={theme.colors.card}
                                    style={{ transform: [{ scale: 0.8 }] }}
                                />
                            </View>
                        ))}
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
                            style={[styles.preferenceRow, { borderBottomColor: 'transparent' }]}
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

                        {/* Tutorial */}
                        <TouchableOpacity
                            style={[styles.preferenceRow, { borderBottomColor: 'transparent', borderTopWidth: 1, borderTopColor: theme.colors.border }]}
                            onPress={() => { setShowTutorial(true); setCurrentStep(0); }}
                        >
                            <View style={styles.preferenceInfo}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                                    <Info size={20} color="#38BDF8" />
                                </View>
                                <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                                    Pokaż samouczek
                                </Text>
                            </View>
                            <ChevronRight size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Open Data Info */}
                        <TouchableOpacity
                            style={[styles.preferenceRow, { borderBottomColor: 'transparent', borderTopWidth: 1, borderTopColor: theme.colors.border }]}
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

                    <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
                        Wersja {VERSION} {otaUpdateId && otaUpdateId !== 'Dostępna' ? `(${otaUpdateId})` : ''}
                    </Text>

                </View>

                <OnboardingCoachmarks
                    visible={showTutorial}
                    onComplete={() => setShowTutorial(false)}
                    onSkip={() => setShowTutorial(false)}
                    currentStep={currentStep}
                />
            </ScrollView>

            {/* Time Picker Modal */}
            <SwipeableModal
                visible={showTimePicker}
                onClose={() => setShowTimePicker(false)}
                title="Wybierz godzinę"
            >
                <View style={{ padding: 20 }}>
                    <Text style={{ color: theme.colors.text, textAlign: 'center', marginBottom: 20 }}>
                        (Tutaj będzie picker godziny w przyszłości)
                    </Text>
                    <TouchableOpacity
                        style={{ backgroundColor: theme.colors.primary, padding: 15, borderRadius: 10, alignItems: 'center' }}
                        onPress={() => setShowTimePicker(false)}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Zapisz</Text>
                    </TouchableOpacity>
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
        fontSize: 13,
        fontFamily: 'Poppins_SemiBold',
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
        opacity: 0.7,
        letterSpacing: 0.8,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
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
    footer: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
        // Removed opacity: 0.6
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
});
