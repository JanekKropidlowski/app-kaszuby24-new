import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Image,
    FlatList,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/store/themeStore';
import { ArrowLeft, Phone, Mail, Clock, Wrench, BarChart2, Coffee } from 'lucide-react-native';
import GlobalTabBar from '@/components/GlobalTabBar';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_GAP = 12;

const CONTACTS = [
    {
        id: 'reporter',
        title: 'Reporter Dyżurny',
        badge: '24/7',
        icon: 'clock',
        accent: '#3B82F6',
        accentBg: 'rgba(59,130,246,0.12)',
        phone: '583800401',
        phoneLabel: '58 380 04 01',
        email: 'info@kaszuby24.pl',
    },
    {
        id: 'tech',
        title: 'Dział techniczny',
        badge: null,
        icon: 'wrench',
        accent: '#10B981',
        accentBg: 'rgba(16,185,129,0.12)',
        phone: '583800115',
        phoneLabel: '58 380 01 15',
        email: 'biuro@kaszuby24.pl',
    },
    {
        id: 'ads',
        title: 'Dział Reklam',
        badge: null,
        icon: 'chart',
        accent: '#F59E0B',
        accentBg: 'rgba(245,158,11,0.12)',
        phone: '665710401',
        phoneLabel: '665 710 401',
        email: 'reklama@kaszuby24.pl',
    },
];

function ContactCard({ item, theme }: { item: typeof CONTACTS[0]; theme: any }) {
    const openLink = (url: string) => Linking.openURL(url);
    const Icon = item.icon === 'clock' ? Clock : item.icon === 'wrench' ? Wrench : BarChart2;

    return (
        <View style={[styles.swipeCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, width: CARD_WIDTH }]}>
            <View style={styles.swipeCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: item.accentBg }]}>
                    <Icon size={20} color={item.accent} />
                </View>
                <View>
                    <Text style={[styles.swipeCardTitle, { color: theme.colors.text }]}>{item.title}</Text>
                    {item.badge && (
                        <Text style={[styles.badge, { color: item.accent }]}>{item.badge}</Text>
                    )}
                </View>
            </View>

            <TouchableOpacity style={styles.contactRow} onPress={() => openLink(`tel:${item.phone}`)}>
                <Phone size={17} color={theme.colors.textSecondary} />
                <Text style={[styles.contactText, { color: theme.colors.text }]}>{item.phoneLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactRow} onPress={() => openLink(`mailto:${item.email}`)}>
                <Mail size={17} color={theme.colors.textSecondary} />
                <Text style={[styles.contactText, { color: theme.colors.text }]}>{item.email}</Text>
            </TouchableOpacity>
        </View>
    );
}

export default function ContactScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { theme } = useThemeStore();
    const flatRef = useRef<FlatList>(null);

    const openLink = (url: string) => Linking.openURL(url);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: theme.colors.card }]}
                    onPress={() => router.back()}
                >
                    <ArrowLeft size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Kontakt i Wsparcie</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* 1. Kontakt - swipeable cards */}
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>KONTAKT Z REDAKCJĄ</Text>
                <FlatList
                    ref={flatRef}
                    data={CONTACTS}
                    horizontal
                    keyExtractor={item => item.id}
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_WIDTH + CARD_GAP}
                    decelerationRate="fast"
                    contentContainerStyle={{ gap: CARD_GAP, paddingRight: 16 }}
                    renderItem={({ item }) => <ContactCard item={item} theme={theme} />}
                    style={{ marginHorizontal: -16, paddingLeft: 16, marginBottom: 8 }}
                />

                {/* 2. O nas */}
                <View style={styles.aboutSection}>
                    <Text style={[styles.bigHeading, { color: theme.colors.text }]}>
                        Kim jesteśmy
                    </Text>
                    <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
                        Jesteśmy portalem informacyjnym, który działa na Pomorzu nieprzerwanie od ponad 12 lat. Zaczynaliśmy lokalnie w powiecie puckim, a dziś obejmujemy swoim zasięgiem całe Pomorze.
                    </Text>
                    <Text style={[styles.bodyText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                        Kaszuby24 to projekt rodzinny — nie stoi za nami wieloosobowy sztab redakcyjny. Sami wykonujemy reportaże foto i wideo, prowadzimy działania marketingowe, tworzymy aplikacje i strony internetowe.
                    </Text>
                    <Text style={[styles.bodyText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                        Powołaliśmy Fundację Twoje Wspomnienia, aby działać jeszcze sprawniej przez kolejne lata, ale też aktywnie wspierać inicjatywy organizowane przez organizacje pozarządowe. Widzimy jak wiele NGO robi dla lokalnych społeczności i chcemy im w tym pomagać.
                    </Text>
                    <Text style={[styles.bodyText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                        Napisz do nas! Informuj nas o swoich wydarzeniach, akcjach i inicjatywach lokalnych.
                    </Text>
                </View>

                {/* 3. Wesprzyj – dark granat gradient */}
                <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 28 }}>
                    <LinearGradient
                        colors={['#0f2027', '#203a43', '#2c5364']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.supportGradient}
                    >
                        <Text style={styles.supportTitle}>WESPRZYJ NASZE DZIAŁANIA</Text>
                        <Text style={styles.supportSubtitle}>
                            Postaw nam wirtualną kawę i pomóż nam dalej tworzyć portal oraz wspierać inicjatywy NGO w regionie.
                        </Text>

                        <View style={styles.coffeeRow}>
                            <TouchableOpacity
                                style={styles.coffeeBtn}
                                onPress={() => openLink('https://buycoffee.to/kaszuby24?coffeeSize=small')}
                            >
                                <Coffee size={28} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
                                <Text style={styles.coffeeLabel}>5 zł</Text>
                                <Text style={styles.coffeeSub}>Mała</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.coffeeBtn, styles.coffeeBtnFeatured]}
                                onPress={() => openLink('https://buycoffee.to/kaszuby24?coffeeSize=medium')}
                            >
                                <Coffee size={36} color="#FFFFFF" strokeWidth={2} />
                                <Text style={styles.coffeeLabel}>10 zł</Text>
                                <Text style={styles.coffeeSub}>Średnia</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.coffeeBtn}
                                onPress={() => openLink('https://buycoffee.to/kaszuby24?coffeeSize=large')}
                            >
                                <Coffee size={28} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
                                <Text style={styles.coffeeLabel}>20 zł</Text>
                                <Text style={styles.coffeeSub}>Duża</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Image
                        source={{ uri: 'https://kropidlowscy.pl/LOGO-KROPIDLOWSCY-03.png' }}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                        Portal należy do Grupy Kropidłowscy.{'\n'}Wydawcą portalu jest Fundacja Twoje Wspomnienia.
                    </Text>
                    <Text style={[styles.footerLegal, { color: theme.colors.textSecondary }]}>
                        Kaszuby24 jest zarejestrowanym znakiem towarowym (R.382257).{'\n'}Wszelkie prawa zastrzeżone.
                    </Text>
                </View>

            </ScrollView>
            <GlobalTabBar activeTab="menu" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Poppins_Bold',
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 120,
    },
    /* Swipeable cards */
    swipeCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 18,
    },
    swipeCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        gap: 10,
    },
    swipeCardTitle: {
        fontSize: 15,
        fontFamily: 'Poppins_SemiBold',
        lineHeight: 20,
    },
    badge: {
        fontSize: 11,
        fontFamily: 'Poppins_Bold',
        letterSpacing: 1,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        gap: 10,
    },
    sectionLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_SemiBold',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 12,
        marginTop: 8,
        opacity: 0.7,
        textAlign: 'center',
    },
    contactText: {
        fontSize: 15,
        fontFamily: 'Poppins_Medium',
    },
    /* About */
    aboutSection: {
        alignItems: 'center',
        paddingHorizontal: 4,
        marginTop: 32,
        marginBottom: 28,
    },
    bigHeading: {
        fontSize: 30,
        fontFamily: 'Poppins_Bold',
        marginBottom: 14,
        textAlign: 'center',
    },
    bodyText: {
        fontSize: 14,
        fontFamily: 'Poppins_Medium',
        lineHeight: 23,
        textAlign: 'center',
    },
    /* Support section */
    supportGradient: {
        padding: 24,
        alignItems: 'center',
        borderRadius: 20,
    },
    supportTitle: {
        fontSize: 13,
        letterSpacing: 1.5,
        fontFamily: 'Poppins_Bold',
        color: 'rgba(255,255,255,0.55)',
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    supportSubtitle: {
        fontSize: 14,
        fontFamily: 'Poppins_Medium',
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    coffeeRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 10,
        width: '100%',
    },
    coffeeBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    coffeeBtnFeatured: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'rgba(255,255,255,0.3)',
        paddingVertical: 20,
    },
    coffeeLabel: {
        fontSize: 16,
        fontFamily: 'Poppins_Bold',
        color: '#FFFFFF',
        marginTop: 8,
    },
    coffeeSub: {
        fontSize: 11,
        fontFamily: 'Poppins_Regular',
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    /* Footer */
    footer: {
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 12,
    },
    logoImage: {
        width: 160,
        height: 50,
        marginBottom: 14,
        opacity: 0.8,
    },
    footerText: {
        fontSize: 12,
        textAlign: 'center',
        fontFamily: 'Poppins_Medium',
        lineHeight: 20,
        marginBottom: 10,
    },
    footerLegal: {
        fontSize: 11,
        textAlign: 'center',
        fontFamily: 'Poppins_Regular',
        opacity: 0.5,
        lineHeight: 17,
    },
});
