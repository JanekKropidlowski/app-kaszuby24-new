import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteLeg } from '../../services/TransportRoutingEngine';

interface LegDetailProps {
    leg: RouteLeg;
    isLast: boolean;
}

const tfs = (size: number) => (Platform.OS === 'android' ? Math.max(9, size - 3) : size);

export const LegDetail: React.FC<LegDetailProps> = ({ leg, isLast }) => {
    const [showIntermediateStops, setShowIntermediateStops] = useState(false);
    const [showWalkingSteps, setShowWalkingSteps] = useState(false);

    if (leg.mode === 'WALK') {
        return (
            <View style={styles.legDetailContainer}>
                <View style={styles.legIndicator}>
                    <View style={[styles.legDot, styles.dotWalk]} />
                    {!isLast && <View style={styles.legLine} />}
                </View>
                <View style={[styles.legContent, { justifyContent: 'center', paddingVertical: 8 }]}>
                    <Text style={{ color: '#718096', fontSize: tfs(13), fontFamily: 'Poppins-Regular' }}>
                        <Ionicons name="walk" size={14} /> Przejście {Math.round(leg.distance || 0)}m ({leg.duration} min)
                    </Text>
                    {leg.toName && (
                        <Text style={{ color: '#A0AEC0', fontSize: tfs(12), fontFamily: 'Poppins-Regular', marginTop: 2 }}>
                            Do: {leg.toName}
                        </Text>
                    )}
                </View>
            </View>
        );
    }

    //Helper: Mode icon (bus vs train)
    const getModeIcon = () => {
        const brand = (leg.brand || '').toUpperCase();
        // Bus agencies
        if (['MZK', 'ZTM', 'ZKM', 'PKS'].includes(brand)) return 'bus' as const;
        // Train agencies  
        if (['SKM', 'POLREGIO', 'PKP', 'PR', 'IC', 'REGIO'].includes(brand)) return 'train' as const;
        return 'car-sport' as const; // fallback
    };

    // RIDE leg
    const routeColorStyle = leg.routeColor ? { backgroundColor: `#${leg.routeColor}`, borderColor: `#${leg.routeColor}40` } : {};
    const routeBadgeStyle = leg.routeColor ? { backgroundColor: `#${leg.routeColor}` } : {};

    return (
        <View style={styles.legDetailContainer}>
            <View style={styles.legIndicator}>
                <View style={[styles.legDot,
                leg.brand === 'POLREGIO' ? styles.dotPol :
                    (leg.brand === 'PKP' ? styles.dotPkp :
                        (leg.brand === 'MZK' ? styles.dotMzk :
                            (leg.brand === 'ZTM' ? styles.dotZtm :
                                (leg.brand === 'ZKM' ? styles.dotZkm :
                                    (leg.brand === 'PKS' ? styles.dotPks :
                                        (leg.brand?.includes('ZKA') || leg.line?.includes('ZKA') ? styles.dotZka : styles.dotSkm)))))),
                    routeColorStyle // Override with dynamic color
                ]} />
                {!isLast && <View style={styles.legLine} />}
            </View>
            <View style={styles.legContent}>
                <Text style={styles.legStation}>{leg.fromName}</Text>
                <View style={styles.legMeta}>
                    <Text style={styles.legTime}>{leg.startTime}</Text>
                    <Ionicons name={getModeIcon()} size={16} color="#718096" style={{ marginLeft: 4, marginRight: 6 }} />
                    <View style={[styles.legLineBadge,
                    leg.brand === 'POLREGIO' ? styles.badgePol :
                        (leg.brand === 'PKP' ? styles.badgePkp :
                            (leg.brand === 'MZK' ? styles.badgeMzk :
                                (leg.brand === 'ZTM' ? styles.badgeZtm :
                                    (leg.brand === 'ZKM' ? styles.badgeZkm :
                                        (leg.brand === 'PKS' ? styles.badgePks :
                                            (leg.brand?.includes('ZKA') || leg.line?.includes('ZKA') ? styles.badgeZka : styles.badgeSkm)))))),
                        routeBadgeStyle // Override with dynamic color
                    ]}>
                        <Text style={[styles.legLineText, (leg.brand === 'POLREGIO' || leg.brand === 'PKP' || leg.brand === 'MZK' || leg.brand === 'ZTM' || leg.brand === 'ZKM' || leg.brand === 'PKS' || !!leg.routeColor) && styles.badgeTextPol]}>
                            {leg.brand?.includes('ZKA') || leg.line?.includes('ZKA') ? 'Zastępcza komunikacja autobusowa' : 
                             leg.brand === 'MZK' && leg.line ? `${leg.brand} ${leg.line}` : // Show "MZK 240" for buses
                             (leg.line || leg.brand)}
                        </Text>
                    </View>
                    {leg.direction && (
                        <Text style={styles.legDirection} numberOfLines={1}>→ {leg.direction}</Text>
                    )}
                </View>

                {leg.intermediateStops && leg.intermediateStops.length > 0 && (
                    <>
                        <TouchableOpacity onPress={() => setShowIntermediateStops(!showIntermediateStops)} style={styles.showDetailsBtn}>
                            <Text style={styles.showDetailsText}>
                                {showIntermediateStops ? 'Ukryj przystanki' : `Pokaż przystanki po drodze (${leg.intermediateStops.length})`}
                            </Text>
                            <Ionicons name={showIntermediateStops ? 'chevron-up' : 'chevron-down'} size={14} color="#3B82F6" />
                        </TouchableOpacity>
                        {showIntermediateStops && (
                            <View style={styles.stopsListContainer}>
                                {leg.intermediateStops.map((stop, idx) => (
                                    <View key={idx} style={styles.intermediateStopRow}>
                                        <View style={styles.stopDotSmall} />
                                        <Text style={styles.stopName}>{stop.name}</Text>
                                        {stop.arrivalTime && <Text style={styles.stopTime}>{stop.arrivalTime}</Text>}
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}

                <Text style={styles.legStationEnd}>{leg.toName}</Text>
                <Text style={styles.legTimeMeta}>{leg.endTime} • {leg.duration} min • {leg.stops || 0} przystanków</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    legDetailContainer: { flexDirection: 'row', marginBottom: 16 },
    legIndicator: { width: 20, alignItems: 'center', marginRight: 12 },
    legDot: { width: 10, height: 10, borderRadius: 5, zIndex: 2, marginTop: 5 },
    dotSkm: { backgroundColor: '#FFB300', borderWidth: 2, borderColor: '#FFF8E1' },
    dotPol: { backgroundColor: '#1A6ADD', borderWidth: 2, borderColor: '#E3F2FD' },
    dotPkp: { backgroundColor: '#D32F2F', borderWidth: 2, borderColor: '#FFEBEE' },
    dotMzk: { backgroundColor: '#1A237E', borderWidth: 2, borderColor: '#E8EAF6' },
    dotZtm: { backgroundColor: '#D32F2F', borderWidth: 2, borderColor: '#FFEBEE' },
    dotZkm: { backgroundColor: '#1976D2', borderWidth: 2, borderColor: '#E3F2FD' },
    dotPks: { backgroundColor: '#388E3C', borderWidth: 2, borderColor: '#E8F5E9' },
    dotWalk: { backgroundColor: '#718096', borderWidth: 2, borderColor: '#E2E8F0' },
    legLine: { width: 2, flex: 1, backgroundColor: '#EDF2F7', marginVertical: -5 },
    legContent: { flex: 1 },
    legHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    legWalkTitle: { fontSize: tfs(14), fontFamily: 'Poppins-SemiBold', color: '#718096' },
    legStation: { fontSize: tfs(15), fontFamily: 'Poppins-SemiBold', color: '#2D3748', marginBottom: 4 },
    legStationEnd: { fontSize: tfs(15), fontFamily: 'Poppins-SemiBold', color: '#2D3748', marginTop: 8, marginBottom: 2 },
    legMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    legTime: { fontSize: tfs(13), fontFamily: 'Poppins-Bold', color: '#1A1A1A' },
    legTimeMeta: { fontSize: tfs(12), fontFamily: 'Poppins-Medium', color: '#718096' },
    legLineBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
    legLineText: { fontSize: tfs(10), fontFamily: 'Poppins-Bold', color: '#1A1A1A' },
    badgeSkm: { backgroundColor: '#FFD54F' },
    badgePol: { backgroundColor: '#1A6ADD' },
    badgePkp: { backgroundColor: '#D32F2F' },
    badgeMzk: { backgroundColor: '#1A237E' },
    badgeZtm: { backgroundColor: '#D32F2F' },
    badgeZkm: { backgroundColor: '#1976D2' },
    badgePks: { backgroundColor: '#388E3C', paddingHorizontal: 4 },
    badgeTextPol: { color: '#FFFFFF' },
    legDirection: { fontSize: tfs(11), fontFamily: 'Poppins-Regular', color: '#718096', flex: 1 },

    showDetailsBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#EBF8FF', borderRadius: 8, alignSelf: 'flex-start', gap: 6 },
    showDetailsText: { fontSize: tfs(12), fontFamily: 'Poppins-SemiBold', color: '#3B82F6' },

    stepsContainer: { marginTop: 8, paddingLeft: 8, backgroundColor: '#F7FAFC', borderRadius: 8, padding: 10 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
    stepBullet: { fontSize: tfs(14), fontFamily: 'Poppins-Bold', color: '#A0AEC0', marginRight: 8 },
    stepText: { fontSize: tfs(12), fontFamily: 'Poppins-Regular', color: '#4A5568', flex: 1, lineHeight: 18 },

    stopsListContainer: { marginTop: 8, paddingLeft: 4 },
    intermediateStopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
    stopDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E0' },
    stopName: { fontSize: tfs(12), fontFamily: 'Poppins-Medium', color: '#4A5568', flex: 1 },
    stopTime: { fontSize: tfs(11), fontFamily: 'Poppins-Medium', color: '#A0AEC0' },
    dotZka: { backgroundColor: '#E53E3E' },
    badgeZka: { backgroundColor: '#E53E3E', paddingHorizontal: 8 },
});
