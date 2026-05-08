import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Dimensions, Platform, Linking, ActivityIndicator } from 'react-native';
import { Theme } from '@/store/themeStore';
import { Clock, Navigation, ArrowRight, Bus, Train, Footprints, ChevronDown, ChevronUp, Map as MapIcon } from 'lucide-react-native';

const { height } = Dimensions.get('window');

import { TripResult, TripStep } from '@/services/transportService';

interface RouteResultsProps {
    results: TripResult[];
    onClose: () => void;
    theme: Theme;
    isLoading?: boolean;
    isLoadingMore?: boolean;
    onSelect?: (route: TripResult) => void;
    onShowMore?: () => void;
}

const tfs = (size: number) => (Platform.OS === 'android' ? Math.max(9, size - 3) : size);

export const RouteResults: React.FC<RouteResultsProps> = ({
    results,
    onClose,
    theme,
    isLoading,
    isLoadingMore,
    onSelect,
    onShowMore
}) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    if (isLoading && results.length === 0) {
        return (
            <View style={[styles.card, { backgroundColor: theme.colors.card, flex: 1 }]}>
                <View style={styles.dragIndicator} />
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Szukanie trasy...</Text>
                </View>
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                    {[1, 2, 3].map(i => (
                        <View key={i} style={[styles.skeletonItem, { backgroundColor: theme.colors.border + '20' }]} />
                    ))}
                </ScrollView>
            </View>
        );
    }

    if (!isLoading && results.length === 0) {
        return (
            <View style={[styles.card, { backgroundColor: theme.colors.card, flex: 1 }]}>
                <View style={styles.dragIndicator} />
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Nie znaleziono połączeń</Text>
                    <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>Spróbuj zmienić czas odjazdu lub sprawdz czy przystanki są poprawne.</Text>
                </View>
            </View>
        );
    }

    const getModeIcon = (mode: string, size = 16) => {
        switch (mode) {
            case 'bus': return <Bus size={size} color={theme.colors.primary} />;
            case 'train': return <Train size={size} color={theme.colors.primary} />;
            default: return <Footprints size={size} color="#9CA3AF" />;
        }
    };

    const calculateCountdown = (timeStr: string) => {
        if (!timeStr) return null;
        try {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const now = new Date();
            const target = new Date();
            target.setHours(hours, minutes, 0, 0);

            // If target is in the past, assume it's tomorrow (but for transport usually we show same day)
            if (target < now) return null;

            const diffMs = target.getTime() - now.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            return diffMin;
        } catch (e) {
            return null;
        }
    };

    // Order matters. Two pułapki:
    //   1) `agency === 'pks'` exact-match nie łapał `pks_gdynia`/`pksgdynia` (formaty
    //      z OTP / nasz panel) → linia 650 spadała do PKP fallback (badge "PKP 650").
    //   2) "PKP Szybka Kolej Miejska" zawiera 'pkp' — SKM/PKS check muszą być przed
    //      PKP/IC (które obejmuje 'pkp'), inaczej PKS wpada do PKP/IC.
    // Dlatego używamy `includes` zamiast exact-match list i ścisłej kolejności:
    // SKM → POLREGIO → PKS → ZTM → ZKM → MZK → IC → fallback PKP.
    const getStopColor = (agency: string = '') => {
        const a = agency.toLowerCase();
        if (a.includes('skm')) return '#FBBC05';                     // SKM - Yellow
        if (a.includes('regio')) return '#1E40AF';                   // PolRegio - Blue
        if (a.includes('pks')) return '#10B981';                     // PKS - Emerald
        if (a.includes('ztm') || a.includes('gdansk')) return '#E11D48';   // ZTM - Rose
        if (a.includes('zkm') || a.includes('gdynia')) return '#2563EB';   // ZKM - Blue
        if (a.includes('mzk') || a.includes('wejherowo')) return '#047857'; // MZK - Green
        if (a.includes('intercity') || a.includes('ic_rail')) return '#003399'; // IC - Dark Blue
        if (a.includes('pkp')) return '#003399';                     // generic PKP fallback
        return theme.colors.primary;
    };

    const getAgencyLabel = (agency: string = '') => {
        const a = agency.toLowerCase();
        if (a.includes('skm')) return 'SKM';
        if (a.includes('regio')) return 'REGIO';
        if (a.includes('pks')) return 'PKS';
        if (a.includes('ztm') || a.includes('gdansk')) return 'ZTM';
        if (a.includes('zkm') || a.includes('gdynia')) return 'ZKM';
        if (a.includes('mzk') || a.includes('wejherowo')) return 'MZK';
        if (a.includes('intercity') || a.includes('ic_rail')) return 'IC';
        if (a.includes('pkp')) return 'PKP';
        return agency?.split(',')[0]?.toUpperCase() || 'BUS';
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.card, flex: 1 }]}>
            <View style={styles.dragIndicator} />
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        Propozycje połączeń
                    </Text>
                </View>
                {onClose && (
                    <TouchableOpacity
                        onPress={onClose}
                        style={[styles.closeButton, { backgroundColor: theme.colors.border + '40' }]}
                    >
                        <Text style={{ color: theme.colors.text, fontSize: tfs(16) }}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            >
                {results.map((route, index) => {
                    const isExpanded = expandedIndex === index;
                    return (
                        <View
                            key={index}
                            style={[styles.itemContainer, {
                                backgroundColor: theme.colors.background,
                                borderColor: isExpanded ? theme.colors.primary : theme.colors.border
                            }]}
                        >
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => setExpandedIndex(isExpanded ? null : index)}
                                style={styles.itemHeader}
                            >
                                <View style={styles.itemHeaderMain}>
                                    <View style={styles.lineBadge}>
                                        <View style={[styles.agencyTag, { backgroundColor: getStopColor(route.agency) }]}>
                                            <Text style={styles.agencyTagText}>{getAgencyLabel(route.agency)}</Text>
                                        </View>
                                        <Text style={[styles.lineName, { color: theme.colors.text }]}>
                                            {route.lines.join(' + ')}
                                        </Text>
                                    </View>
                                    <View style={styles.timeInfo}>
                                        <View style={{ alignItems: 'flex-end', marginRight: 6 }}>
                                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Clock size={14} color={theme.colors.textSecondary} />
                                                <Text style={[styles.duration, { color: theme.colors.text }]}>
                                                    {route.duration} min
                                                </Text>
                                            </TouchableOpacity>
                                            {route.segments?.[0]?.time && (
                                                <View style={[styles.countdownBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                                                    <Text style={[styles.countdownText, { color: theme.colors.primary }]}>
                                                        {calculateCountdown(route.segments[0].time) !== null
                                                            ? `ZA ${calculateCountdown(route.segments[0].time)} MIN`
                                                            : route.segments[0].time}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.routePreview}>
                                    <Text style={[styles.cityText, { color: theme.colors.text }]} numberOfLines={1}>
                                        {route.from.name}
                                    </Text>
                                    <ArrowRight size={14} color={theme.colors.textSecondary} style={{ marginHorizontal: 8 }} />
                                    <Text style={[styles.cityText, { color: theme.colors.text }]} numberOfLines={1}>
                                        {route.to.name}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {isExpanded && (
                                <View style={styles.details}>
                                    {route.steps.map((step, sIdx) => (
                                        <View key={sIdx} style={styles.stepRow}>
                                            <View style={styles.stepIconColumn}>
                                                {getModeIcon(step.mode)}
                                                {sIdx < route.steps.length - 1 && <View style={[styles.stepLine, { backgroundColor: theme.colors.border }]} />}
                                            </View>
                                            <View style={styles.stepContent}>
                                                <Text style={[styles.stepText, { color: theme.colors.text }]}>
                                                    {step.instruction} {step.line && <Text style={{ fontWeight: 'bold' }}>({step.line})</Text>}
                                                </Text>
                                                <Text style={[styles.stepDuration, { color: theme.colors.textSecondary }]}>
                                                    ok. {step.duration} min
                                                </Text>
                                            </View>
                                        </View>
                                    ))}

                                    <View style={styles.actionButtons}>
                                        <TouchableOpacity
                                            style={[styles.showOnMapBtn, { backgroundColor: '#10B981' }]}
                                            onPress={() => {
                                                const firstStop = route.segments?.[0]?.from || route.from;
                                                const latLng = `${firstStop.lat},${firstStop.lon}`;
                                                const label = encodeURIComponent(firstStop.name);
                                                const scheme = Platform.OS === 'ios' ? 'maps:0,0?q=' : 'geo:0,0?q=';
                                                const url = Platform.OS === 'ios'
                                                    ? `${scheme}${label}@${latLng}`
                                                    : `${scheme}${latLng}(${label})`;

                                                Linking.openURL(url);
                                            }}
                                        >
                                            <Navigation size={18} color="#fff" />
                                            <Text style={styles.actionBtnText}>Prowadź</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.showOnMapBtn, { backgroundColor: theme.colors.primary }]}
                                            onPress={() => onSelect && onSelect(route)}
                                        >
                                            <MapIcon size={20} color="#fff" />
                                            <Text style={styles.actionBtnText}>POKAŻ TRASĘ NA MAPIE</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}

                <TouchableOpacity
                    style={[styles.moreBtn, { borderColor: theme.colors.primary }]}
                    onPress={() => onShowMore && onShowMore()}
                    disabled={isLoadingMore}
                >
                    {isLoadingMore ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <>
                            <Clock size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.moreText, { color: theme.colors.primary }]}>Pokaż późniejsze połączenia</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const frontWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
    dismissArea: { flex: 1 },
    card: { borderTopLeftRadius: 36, borderTopRightRadius: 36, maxHeight: '95%', paddingBottom: 20 },
    dragIndicator: { width: 40, height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 15 },
    header: { paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: {
        fontSize: tfs(22),
        fontWeight: '900',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    closeButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    list: { paddingHorizontal: 16 },
    listContent: { gap: 12, paddingBottom: 140 },
    itemContainer: { borderRadius: 20, borderWidth: 1.5, overflow: 'hidden', marginBottom: 4 },
    itemHeader: { padding: 16 },
    itemHeaderMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    lineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    lineName: {
        fontSize: tfs(16),
        fontWeight: '800',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    timeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    duration: {
        fontSize: tfs(18),
        fontWeight: '900',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    routePreview: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    cityText: {
        fontSize: tfs(14),
        fontWeight: '600',
        flexShrink: 1,
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    },
    expandIcon: { position: 'absolute', right: 16, bottom: 12 },
    details: { padding: 15, borderTopWidth: 1, borderTopColor: '#eee' },
    stepRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
    stepIconColumn: { alignItems: 'center', width: 24 },
    stepDot: { width: 8, height: 8, borderRadius: 4 },
    stepLine: { width: 2, flex: 1, marginVertical: 4 },
    stepContent: { flex: 1 },
    stepText: {
        fontSize: tfs(13),
        fontWeight: '600',
        marginBottom: 2,
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    },
    stepDuration: { fontSize: tfs(11) },
    actionButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
    showOnMapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 16, elevation: 2 },
    actionBtnText: {
        color: '#fff',
        fontSize: tfs(12),
        fontWeight: '900',
        letterSpacing: 0.5,
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16, borderWidth: 1.5, marginTop: 15, borderStyle: 'dashed' },
    moreText: {
        fontSize: tfs(16),
        fontWeight: '800',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    agencyTag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginRight: 6 },
    agencyTagText: {
        color: '#fff',
        fontSize: tfs(11),
        fontWeight: '900',
        textTransform: 'uppercase',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    countdownBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
    countdownText: {
        fontSize: tfs(11),
        fontWeight: '900',
        letterSpacing: 0.5,
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    skeletonItem: { height: 100, borderRadius: 20, marginBottom: 12 },
    emptyState: { flex: 1, padding: 40, justifyContent: 'center', alignItems: 'center' },
    emptyTitle: {
        fontSize: frontWidth > 500 ? 20 : 18,
        fontWeight: '800',
        marginBottom: 10,
        textAlign: 'center',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    emptySub: { fontSize: tfs(14), textAlign: 'center', opacity: 0.7 }
});
