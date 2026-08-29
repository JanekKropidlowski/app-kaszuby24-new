import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Linking, Dimensions } from 'react-native';
import { X, Navigation, Clock, Train, ChevronRight, Bus, MapPin, Calendar, Bike, Wind, Wifi, Accessibility } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Interfaces
interface TransportStop {
    id: string;
    agency: string;
    agencyIds?: Record<string, string>;
    name: string;
    lat: number;
    lon: number;
    distance?: number;
    platform?: string;
    desc?: string;
    wheelchair?: string;
    attributes?: any;
}

interface TimetableItem {
    line: string;
    direction: string;
    time: string;
    destination: string;
    date?: string;
    day_label?: string;
    trip_id?: string;
    attributes?: any;
    isRealtime?: boolean;
    route_type?: string;
}

interface StopDetailsModalProps {
    visible: boolean;
    stop: TransportStop | null;
    timetable: TimetableItem[];
    isLoading: boolean;
    onClose: () => void;
    theme: any;
    getStopColor: (agency: string | undefined) => string;
    getStopIcon: (agency: string | undefined, size?: number) => React.ReactNode;
    onRefresh?: (allDay: boolean) => void;
    isAllDay?: boolean;
}

const tfs = (size: number) => (Platform.OS === 'android' ? Math.max(9, size - 3) : size);

export const StopDetailsModal: React.FC<StopDetailsModalProps> = ({
    visible,
    stop,
    timetable,
    isLoading,
    onClose,
    theme,
    getStopColor,
    getStopIcon,
    onRefresh,
    isAllDay
}) => {
    const insets = useSafeAreaInsets();
    const [activeDirection, setActiveDirection] = useState<string | null>(null);
    const [limit, setLimit] = useState(10);

    const startNavigation = () => {
        if (!stop) return;
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${stop.lat},${stop.lon}`;
        const label = stop.name;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        if (url) Linking.openURL(url);
    };

    const getRelativeTime = (timeStr: string, isNextDay?: boolean) => {
        if (!timeStr) return '';
        try {
            const [h, m] = timeStr.split(':').map(Number);
            const now = new Date();
            const dep = new Date();
            dep.setHours(h, m, 0, 0);

            if (isNextDay || dep.getTime() < now.getTime() - 2 * 3600000) {
                dep.setDate(dep.getDate() + 1);
            }

            const diff = Math.floor((dep.getTime() - now.getTime()) / 60000);

            if (diff > 180) return '';
            if (diff <= 0 && !isNextDay) return 'teraz';
            if (diff < 60 && diff > 0) return `${diff} min`;
            if (diff >= 60 && diff <= 180) {
                const hours = Math.floor(diff / 60);
                const minutes = diff % 60;
                return `za ${hours}h ${minutes}m`;
            }
            return '';
        } catch (e) {
            return '';
        }
    };

    const getContrastColor = (hexColor: string) => {
        const c = (hexColor || '').replace('#', '').toLowerCase();
        // User requested white text on yellow for SKM
        if (['fff', 'ffffff'].includes(c)) return '#000000';
        return '#FFFFFF';
    };

    const normalizeStationName = (name: string) => {
        if (!name) return 'Inny kierunek';
        let n = name.replace(/\s*\(.*?\)\s*/g, '').trim();
        const isAllCaps = n.length > 3 && !/[a-z]/.test(n);
        if (isAllCaps) {
            n = n.toLowerCase().replace(/(?:^|[\s-])\S/g, (match) => match.toUpperCase());
        }
        return n;
    };

    const groupedDepartures = useMemo(() => {
        const groups: { [key: string]: TimetableItem[] } = {};
        const seenInGroup = new Set<string>();

        timetable.forEach(item => {
            let dir = normalizeStationName(item.destination || item.direction);
            // INCLUDE DATE IN KEY TO PREVENT HIDING FUTURE TRIPS WITH SAME TIME
            const datePart = item.date || '';
            const key = `${datePart}|${dir}|${item.time}|${item.line}`.toLowerCase();
            if (seenInGroup.has(key)) return;
            seenInGroup.add(key);

            if (!groups[dir]) groups[dir] = [];
            groups[dir].push(item);
        });
        return groups;
    }, [timetable]);

    const directions = useMemo(() => {
        return Object.keys(groupedDepartures).sort((a, b) =>
            groupedDepartures[b].length - groupedDepartures[a].length
        );
    }, [groupedDepartures]);

    React.useEffect(() => {
        if (directions.length > 0 && !activeDirection) {
            setActiveDirection(directions[0]);
        } else if (directions.length === 0) {
            setActiveDirection(null);
        }
    }, [directions]);

    const allDepartures = useMemo(() => {
        if (directions.length === 1) return groupedDepartures[directions[0]] || [];
        return activeDirection ? (groupedDepartures[activeDirection] || []) : [];
    }, [activeDirection, groupedDepartures, directions]);

    if (!visible || !stop) return null;

    const stopColor = getStopColor(stop.agency);
    const badgeTextColor = getContrastColor(stopColor);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[styles.container, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.dragHandleContainer}><View style={styles.dragHandle} /></View>
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: stopColor }]}>
                            {getStopIcon(stop.agency, 20)}
                        </View>
                        <View style={styles.titleContainer}>
                            <Text style={[styles.stopName, { color: theme.colors.text }]} numberOfLines={1}>{stop.name}</Text>
                            <View style={styles.agencyRow}>
                                <Text style={[styles.agencyName, { color: theme.colors.textSecondary }]}>{stop.agency === 'mevo_free' ? 'ROWER MEVO' : stop.agency?.toUpperCase()}</Text>
                                <Text style={[styles.coordText, { color: theme.colors.textSecondary }]}>{stop.distance ? ` • ${Math.round(stop.distance)}m` : ''}</Text>
                            </View>
                            {stop.desc ? <Text style={[styles.descText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{stop.desc}</Text> : null}
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={[styles.squareBtn, { backgroundColor: theme.colors.primary }]} onPress={startNavigation}>
                                <Navigation size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.squareBtn, { backgroundColor: theme.dark ? '#334155' : '#F1F5F9' }]} onPress={onClose}>
                                <X size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.timetableHeader}>
                        <View style={styles.row}>
                            {stop.agency?.includes('mevo') && !stop.agency?.toLowerCase().includes('skm') && !stop.agency?.toLowerCase().includes('pkp') && !stop.agency?.toLowerCase().includes('ztm') ? (
                                <Bike size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
                            ) : (
                                <Clock size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
                            )}
                            <Text style={[styles.timetableTitle, { color: theme.colors.text }]}>
                                {stop.agency === 'mevo_free' ? 'Status roweru' : (stop.agency?.includes('mevo') && !stop.agency?.toLowerCase().includes('skm') && !stop.agency?.toLowerCase().includes('ztm') ? 'Status stacji MEVO' : (isAllDay ? 'Rozkład całodniowy' : 'Najbliższe odjazdy'))}
                            </Text>
                        </View>
                        {!isAllDay && onRefresh && !stop.agency?.includes('mevo') && (
                            <TouchableOpacity onPress={() => onRefresh(true)} style={[styles.allDayBtn, { backgroundColor: theme.colors.primary + '15' }]}>
                                <Text style={[styles.allDayBtnText, { color: theme.colors.primary }]}>Cały dzień</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {directions.length > 1 && !stop.agency?.includes('mevo') && (
                        <View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                                {directions.map((dir, index) => {
                                    const isActive = dir === activeDirection;
                                    return (
                                        <TouchableOpacity key={index} onPress={() => setActiveDirection(dir)} style={[styles.tab, { backgroundColor: isActive ? stopColor : (theme.dark ? '#1E293B' : '#F8FAFC'), borderColor: isActive ? stopColor : theme.colors.border }]}>
                                            <Text style={[styles.tabText, { color: isActive ? badgeTextColor : theme.colors.text, fontWeight: isActive ? '700' : '500' }]} numberOfLines={1}>{dir}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {isLoading ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Pobieranie danych...</Text>
                        </View>
                    ) : (stop.agency?.includes('mevo') && !stop.agency?.toLowerCase().includes('skm') && !stop.agency?.toLowerCase().includes('ztm')) ? (
                        <View style={styles.mevoContainer}>
                            {/* Station view - show all bike types and docks */}
                            {stop.agency !== 'mevo_free' && (
                                <>
                                    {/* Total bikes */}
                                    <View style={[styles.mevoCard, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <View style={styles.mevoIconCircle}><Bike size={24} color={theme.colors.primary} /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.mevoLabel, { color: theme.colors.textSecondary }]}>Dostępne rowery</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                                                <Text style={[styles.mevoValue, { color: theme.colors.text }]}>
                                                    {timetable.find(t => t.route_type === 'mevo_bikes')?.line || '0'}
                                                </Text>
                                                <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
                                                    {timetable.filter(t => t.route_type === 'mevo_electric' || t.route_type === 'mevo_mechanical').map((type, idx) => (
                                                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.dark ? '#334155' : '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                                            <Text style={{ fontSize: tfs(12), marginRight: 4 }}>{type.route_type === 'mevo_electric' ? '⚡' : '🚲'}</Text>
                                                            <Text style={{ fontSize: tfs(14), fontWeight: '700', color: theme.colors.text }}>{type.time}</Text>
                                                            <Text style={{ fontSize: tfs(11), marginLeft: 4, color: theme.colors.textSecondary }}>{type.line}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Free docks */}
                                    <View style={[styles.mevoCard, { backgroundColor: '#10B98110' }]}>
                                        <View style={[styles.mevoIconCircle, { backgroundColor: '#10B98115' }]}><MapPin size={24} color="#10B981" /></View>
                                        <View>
                                            <Text style={[styles.mevoLabel, { color: theme.colors.textSecondary }]}>Wolne stojaki</Text>
                                            <Text style={[styles.mevoValue, { color: theme.colors.text }]}>{timetable.find(t => t.route_type === 'mevo_docks')?.line || '0'}</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {/* Individual bike view */}
                            {stop.agency === 'mevo_free' && (
                                <>
                                    <View style={[styles.mevoCard, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <View style={styles.mevoIconCircle}><Bike size={24} color={theme.colors.primary} /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.mevoLabel, { color: theme.colors.textSecondary }]}>Numer roweru</Text>
                                            <Text style={[styles.mevoValue, { color: theme.colors.text, fontSize: tfs(20) }]}>
                                                #{stop.id.substring(stop.id.length - 4).toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={[styles.mevoCard, { backgroundColor: stop.attributes?.is_electric ? '#F59E0B15' : '#3B82F615' }]}>
                                        <View style={[styles.mevoIconCircle, { backgroundColor: stop.attributes?.is_electric ? '#F59E0B25' : '#3B82F625' }]}>
                                            <Text style={{ fontSize: tfs(20) }}>{stop.attributes?.is_electric ? '⚡' : '🚲'}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.mevoLabel, { color: theme.colors.textSecondary }]}>Typ roweru</Text>
                                            <Text style={[styles.mevoValue, { color: theme.colors.text, fontSize: tfs(20) }]}>
                                                {stop.attributes?.is_electric ? 'Elektryczny' : 'Klasyczny'}
                                            </Text>
                                            {stop.attributes?.is_electric && stop.attributes?.range && (
                                                <Text style={{ fontSize: tfs(13), color: theme.colors.textSecondary, marginTop: 4 }}>
                                                    Zasięg: ~{Math.round(stop.attributes.range / 1000)} km
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {timetable[0]?.time && (
                                        <View style={[styles.mevoCard, { backgroundColor: '#10B98110' }]}>
                                            <View style={[styles.mevoIconCircle, { backgroundColor: '#10B98115' }]}><MapPin size={24} color="#10B981" /></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.mevoLabel, { color: theme.colors.textSecondary }]}>Lokalizacja</Text>
                                                <Text style={{ fontSize: tfs(13), color: theme.colors.text, marginTop: 2 }}>
                                                    {stop.lat.toFixed(5)}, {stop.lon.toFixed(5)}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    ) : allDepartures.length > 0 ? (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            {allDepartures.slice(0, limit).map((item, idx) => {
                                const relTime = getRelativeTime(item.time, item.attributes?.is_next_day);
                                const showDayHeader = idx === 0 || allDepartures[idx - 1].date !== item.date;

                                return (
                                    <React.Fragment key={idx}>
                                        {showDayHeader && (item.day_label || item.date) && (
                                            <View style={[styles.dayHeader, { backgroundColor: theme.dark ? '#1E293B' : '#F1F5F9' }]}>
                                                <Calendar size={14} color={theme.colors.primary} />
                                                <Text style={[styles.dayHeaderText, { color: theme.colors.text }]}>
                                                    {item.day_label || 'Termin'}
                                                    {item.date ? <Text style={styles.dayDateText}> • {item.date}</Text> : null}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={[styles.departureRow, { borderBottomColor: theme.colors.border + '40' }]}>
                                            <View style={[styles.lineBadge, { backgroundColor: stopColor }]}>
                                                <Text style={[styles.lineText, { color: badgeTextColor }]}>
                                                    {(item.line && item.line !== 'undefined') ? item.line : (stop.agency?.toLowerCase().includes('skm') ? 'SKM' :
                                                        (((stop.agency || '').toLowerCase().includes('wejherowo') || (stop.agencyIds && stop.agencyIds['wejherowo'])) ? 'MZK' : ''))}
                                                </Text>
                                            </View>
                                            <View style={styles.departureDetails}>
                                                <Text style={[styles.destText, { color: theme.colors.text }]} numberOfLines={1}>{normalizeStationName(item.destination)}</Text>
                                                <View style={styles.row}>
                                                    {item.isRealtime && <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>}
                                                    {item.attributes?.is_next_day && <Text style={styles.nextDayText}>JUTRO</Text>}
                                                    {item.attributes?.platform && (
                                                        <View style={[styles.platformBadge, { backgroundColor: theme.dark ? '#334155' : '#E2E8F0' }]}>
                                                            <Text style={[styles.platformText, { color: theme.colors.text }]}>Peron {item.attributes.platform}</Text>
                                                        </View>
                                                    )}
                                                    <View style={styles.attrIcons}>
                                                        {item.attributes?.wifi && <Wifi size={13} color={theme.colors.textSecondary} style={styles.attrIcon} />}
                                                        {item.attributes?.ac && <Wind size={13} color={theme.colors.textSecondary} style={styles.attrIcon} />}
                                                        {item.attributes?.wheelchair && <Accessibility size={13} color={theme.colors.textSecondary} style={styles.attrIcon} />}
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={styles.timeContainer}>
                                                <Text style={[styles.relTime, { color: theme.colors.text }]}>{item.time}</Text>
                                                {relTime ? <Text style={[styles.absTime, { color: theme.colors.textSecondary }]}>{relTime}</Text> : null}
                                            </View>
                                        </View>
                                    </React.Fragment>
                                );
                            })}
                            {allDepartures.length > limit && (
                                <TouchableOpacity
                                    style={[styles.seeMoreBtn, { backgroundColor: theme.colors.primary, marginVertical: 25, paddingVertical: 20 }]}
                                    onPress={() => setLimit(prev => prev + 40)}
                                >
                                    <Clock size={20} color="#fff" />
                                    <Text style={[styles.seeMoreText, { fontSize: tfs(16) }]}>POKAŻ DALSZY ROZKŁAD ({allDepartures.length - limit})</Text>
                                    <ChevronRight size={24} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <MapPin size={40} color={theme.colors.border} />
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Brak odjazdów</Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    container: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%', width: SCREEN_WIDTH },
    dragHandleContainer: { alignItems: 'center', paddingVertical: 12 },
    dragHandle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    iconContainer: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    titleContainer: { flex: 1 },
    stopName: {
        fontSize: tfs(18),
        fontWeight: '800',
        lineHeight: 22,
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    agencyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    agencyName: {
        fontSize: tfs(11),
        fontWeight: '700',
        letterSpacing: 0.5,
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    },
    coordText: { fontSize: tfs(11), marginLeft: 2 },
    descText: { fontSize: tfs(12), marginTop: 1 },
    headerActions: { flexDirection: 'row', gap: 8 },
    squareBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    timetableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center' },
    timetableTitle: {
        fontSize: tfs(12),
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    allDayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    allDayBtnText: {
        fontSize: tfs(11),
        fontWeight: '700',
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    },
    tabsContainer: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
    tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, minWidth: 80, alignItems: 'center' },
    tabText: {
        fontSize: tfs(12),
        ...Platform.select({ android: { fontFamily: 'Poppins_Medium' }, default: {} }),
    },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    departureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
    lineBadge: { minWidth: 44, paddingHorizontal: 8, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    lineText: {
        fontWeight: '900',
        fontSize: tfs(15),
        textAlign: 'center',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    departureDetails: { flex: 1 },
    destText: {
        fontSize: tfs(16),
        fontWeight: '700',
        marginBottom: 2,
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    },
    liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF444415', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 4 },
    liveText: {
        fontSize: tfs(9),
        fontWeight: '900',
        color: '#EF4444',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    nextDayText: {
        fontSize: tfs(9),
        fontWeight: '800',
        color: '#3B82F6',
        backgroundColor: '#3B82F615',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    platformBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
    platformText: {
        fontSize: tfs(10),
        fontWeight: '700',
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    },
    attrIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    attrIcon: { opacity: 0.7 },
    timeContainer: { alignItems: 'flex-end', minWidth: 60 },
    relTime: {
        fontSize: tfs(16),
        fontWeight: '800',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    absTime: { fontSize: tfs(12), marginTop: 1 },
    seeMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginTop: 20, gap: 8, elevation: 4 },
    seeMoreText: {
        color: '#fff',
        fontSize: tfs(13),
        fontWeight: '800',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    loaderContainer: { padding: 40, alignItems: 'center' },
    loadingText: {
        marginTop: 12,
        fontSize: tfs(14),
        fontWeight: '500',
        ...Platform.select({ android: { fontFamily: 'Poppins_Medium' }, default: {} }),
    },
    emptyContainer: { padding: 60, alignItems: 'center' },
    emptyText: { marginTop: 12, fontSize: tfs(14), textAlign: 'center' },
    mevoContainer: { padding: 20, gap: 12 },
    mevoCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, gap: 20 },
    mevoIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    mevoLabel: {
        fontSize: tfs(12),
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
        ...Platform.select({ android: { fontFamily: 'Poppins_SemiBold' }, default: {} }),
    },
    mevoValue: {
        fontSize: tfs(28),
        fontWeight: '900',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 15,
        marginBottom: 5,
        gap: 10,
    },
    dayHeaderText: {
        fontSize: tfs(13),
        fontWeight: '800',
        textTransform: 'uppercase',
        ...Platform.select({ android: { fontFamily: 'Poppins_Bold' }, default: {} }),
    },
    dayDateText: {
        fontSize: tfs(11),
        fontWeight: '400',
        opacity: 0.6,
        ...Platform.select({ android: { fontFamily: 'Poppins_Regular' }, default: {} }),
    },
});
