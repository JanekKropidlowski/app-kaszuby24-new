import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BusRouteMap } from './BusRouteMap';
import { SKMRouteMap } from '../transport/SKMRouteMap';
import { PolregioRouteMap } from '../transport/PolregioRouteMap';
import { OTPService } from '../../services/otpService';

interface Stop {
    stop_id: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
    departures: Array<{
        time: string;
        direction: string;
        trip_id?: string;
        sequence?: number;
    }>;
}

interface RouteMapModalProps {
    visible: boolean;
    onClose: () => void;
    stops?: Stop[]; // Legacy - for backward compatibility
    stopsByDirection?: { [direction: string]: Stop[] }; // New - separate stops per direction
    availableDirections?: string[]; // New - list of available directions
    directionTrips?: { [direction: string]: string[] }; // ALL trip_ids per direction
    agency?: string; // For lazy loading
    timetableData?: any[]; // Full timetable for merging departures
    lineNumber: string;
    color: string;
    lineName?: string;
}

const { width, height } = Dimensions.get('window');

export const RouteMapModal: React.FC<RouteMapModalProps> = ({
    visible,
    onClose,
    stops,
    stopsByDirection,
    availableDirections,
    directionTrips,
    agency,
    timetableData,
    lineNumber,
    color,
    lineName
}) => {
    const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
    const [loadedStops, setLoadedStops] = useState<{ [direction: string]: Stop[] }>(stopsByDirection || {});
    const [loadingDirection, setLoadingDirection] = useState<string | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const stopRefs = useRef<Map<string, View>>(new Map());

    // Update loadedStops when stopsByDirection prop changes (e.g. MZK data loaded)
    useEffect(() => {
        if (stopsByDirection && Object.keys(stopsByDirection).length > 0) {
            console.log('[RouteMapModal] Received stopsByDirection with directions:', Object.keys(stopsByDirection));
            setLoadedStops(stopsByDirection);
        }
    }, [stopsByDirection]);

    // Determine unique directions
    const uniqueDirections = availableDirections ||
        (stops ? Array.from(
            new Set(stops.flatMap(stop => (stop.departures || []).map((dep: any) => dep.direction)).filter(Boolean))
        ) : []);

    const [selectedDirection, setSelectedDirection] = useState<string | null>(null);

    // Auto-select first direction when modal opens
    useEffect(() => {
        if (visible && uniqueDirections.length > 0 && !selectedDirection) {
            console.log('[RouteMapModal] Auto-selecting first direction:', uniqueDirections[0]);
            setSelectedDirection(uniqueDirections[0]);
        }
    }, [visible, uniqueDirections]);

    // Lazy load route when direction is selected
    const loadRouteForDirection = async (direction: string) => {
        // Already loaded?
        if (loadedStops[direction]) return;

        // No trip_id for this direction?
        if (!directionTrips || !directionTrips[direction] || !directionTrips[direction].length || !agency) return;

        setLoadingDirection(direction);
        try {
            // Use OTP API instead of WordPress trip-stops API
            const allTripIds = directionTrips[direction];

            // Limit concurrency to avoid overloading device/network  
            const concurrency = 6;
            const validRoutes: any[] = [];

            for (let i = 0; i < allTripIds.length; i += concurrency) {
                const batch = allTripIds.slice(i, i + concurrency);
                const batchPromises = batch.map(tripId => OTPService.getTripStops(tripId));
                
                const batchResults = await Promise.all(batchPromises);
                batchResults.forEach(r => { if (r && r.stops) validRoutes.push(r); });
            }

            if (validRoutes.length > 0) {
                // Use first route for stop sequence
                const baseRoute = validRoutes[0];
                
                // Merge departures from ALL routes by stop_id
                const stopDepartures: { [stop_id: string]: any[] } = {};
                
                validRoutes.forEach(route => {
                    route.stops.forEach((stop: any) => {
                        if (!stopDepartures[stop.stop_id]) {
                            stopDepartures[stop.stop_id] = [];
                        }
                        if (stop.departures && stop.departures.length > 0) {
                            stopDepartures[stop.stop_id].push(...stop.departures);
                        }
                    });
                });

                // Enrich base route stops with all departures
                const enrichedStops = baseRoute.stops
                    .map((stop: any, index: number) => {
                        const allDepartures = stopDepartures[stop.stop_id] || [];

                        // Sort departures by time
                        const sortedDepartures = allDepartures.sort((a: any, b: any) => {
                            const timeA = a.time || '00:00';
                            const timeB = b.time || '00:00';
                            return timeA.localeCompare(timeB);
                        });

                        return {
                            ...stop,
                            stop_sequence: stop.stop_sequence ?? index,
                            departures: sortedDepartures
                        };
                    })
                    // Sort by stop_sequence to ensure correct order on route
                    .sort((a: any, b: any) => (a.stop_sequence ?? 0) - (b.stop_sequence ?? 0));

                console.log(`[RouteMapModal] Loaded ${enrichedStops.length} stops with departures for direction: ${direction}`);
                console.log(`[RouteMapModal] Sample stop departures count: ${enrichedStops[0]?.departures?.length || 0}`);

                setLoadedStops(prev => ({ ...prev, [direction]: enrichedStops }));
            }
        } catch (e) {
            console.error('[RouteMapModal] Error loading route:', e);
        } finally {
            setLoadingDirection(null);
        }
    };

    // When direction changes, load its route if needed
    useEffect(() => {
        setExpandedStopId(null);
        if (selectedDirection) {
            loadRouteForDirection(selectedDirection);
        }
    }, [selectedDirection]);

    // Get stops for selected direction
    // IMPORTANT: Return empty array when no direction selected AND multiple directions available
    // This prevents rendering all routes at once which causes crashes
    const filteredStops = selectedDirection && loadedStops[selectedDirection]
        ? loadedStops[selectedDirection]
        : selectedDirection && stops
        ? stops
            .map(stop => ({
                ...stop,
                departures: (stop.departures || []).filter((dep: any) => dep.direction === selectedDirection)
            }))
            .filter(stop => (stop.departures || []).length > 0)
        : uniqueDirections.length > 1 
        ? [] // Empty when multiple directions but none selected
        : stops || []; // All stops only when single direction

    const handleMarkerPress = (stopId: string) => {
        setExpandedStopId(stopId);
        // Scroll to the stop in timeline
        setTimeout(() => {
            const stopIndex = filteredStops.findIndex(s => s.stop_id === stopId);
            if (stopIndex !== -1 && scrollViewRef.current) {
                scrollViewRef.current.scrollTo({ x: stopIndex * 156, animated: true });
            }
        }, 100);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    onPress={onClose}
                    activeOpacity={1}
                />
                <View style={styles.bottomSheet}>
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.lineBadge, { backgroundColor: color }]}>
                                <Text style={styles.lineBadgeText}>{lineNumber}</Text>
                            </View>
                            <View>
                                <Text style={styles.headerTitle}>Mapa trasy</Text>
                                {lineName && <Text style={styles.headerSubtitle}>{lineName}</Text>}
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color="#4A5568" />
                        </TouchableOpacity>
                    </View>

                    {/* Mapa - górna część */}
                    <View style={styles.mapContainer}>
                        {loadingDirection ? (
                            <View style={styles.placeholderContainer}>
                                <ActivityIndicator size="large" color={color} />
                                <Text style={styles.placeholderText}>Ładowanie trasy...</Text>
                            </View>
                        ) : filteredStops.length === 0 ? (
                            <View style={styles.placeholderContainer}>
                                <MaterialCommunityIcons name="train" size={48} color="#CBD5E0" />
                                <Text style={styles.placeholderText}>
                                    {uniqueDirections.length > 1 
                                        ? 'Wybierz kierunek, aby zobaczyć trasę'
                                        : 'Ładowanie trasy...'}
                                </Text>
                            </View>
                        ) : lineNumber === 'SKM' ? (
                            <SKMRouteMap
                                stops={filteredStops.map(s => ({
                                    stop_id: s.stop_id,
                                    stop_name: s.stop_name,
                                    stop_lat: s.stop_lat,
                                    stop_lon: s.stop_lon,
                                }))}
                                color={color}
                                lineNumber={lineNumber}
                                onMarkerPress={handleMarkerPress}
                                selectedStopId={expandedStopId}
                                tripIds={filteredStops.flatMap(s => s.departures.map(d => d.trip_id).filter(Boolean) as string[])}
                            />
                        ) : lineNumber === 'POLREGIO' ? (
                            <PolregioRouteMap
                                stops={filteredStops.map(s => ({
                                    stop_id: s.stop_id,
                                    stop_name: s.stop_name,
                                    stop_lat: s.stop_lat,
                                    stop_lon: s.stop_lon,
                                }))}
                                color={color}
                                lineNumber={lineNumber}
                                onMarkerPress={handleMarkerPress}
                                selectedStopId={expandedStopId}
                            />
                        ) : (
                            <BusRouteMap
                                stops={filteredStops.map(s => ({
                                    stop_id: s.stop_id,
                                    stop_name: s.stop_name,
                                    stop_lat: s.stop_lat,
                                    stop_lon: s.stop_lon,
                                }))}
                                color={color}
                                lineNumber={lineNumber}
                                onMarkerPress={handleMarkerPress}
                                selectedStopId={expandedStopId}
                            />
                        )}
                    </View>

                    {/* Direction selector - nad timeline */}
                    {uniqueDirections.length > 0 && (
                        <View style={styles.directionSelectorBar}>
                            <MaterialCommunityIcons name="arrow-right-bold" size={16} color="#4A5568" />
                            <Text style={styles.directionLabel}>Kierunek:</Text>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingRight: 16 }}
                                style={{ flex: 1 }}
                            >
                                {uniqueDirections.map(dir => (
                                    <TouchableOpacity
                                        key={dir}
                                        style={[
                                            styles.directionChip,
                                            selectedDirection === dir && { 
                                                backgroundColor: color,
                                                borderColor: color 
                                            }
                                        ]}
                                        onPress={() => setSelectedDirection(dir)}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            style={[
                                                styles.directionChipText,
                                                selectedDirection === dir && { color: '#FFFFFF' }
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {dir}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Timeline - dolna część (bottom sheet) */}
                    <View style={styles.timelineContainer}>
                        <View style={styles.timelineHeaderBar}>
                            <MaterialCommunityIcons name="bus-stop" size={18} color="#4A5568" />
                            <Text style={styles.timelineHeaderText}>Przystanki na trasie</Text>
                            <View style={styles.timelineHeaderBadge}>
                                <Text style={styles.timelineHeaderBadgeText}>{filteredStops.length}</Text>
                            </View>
                        </View>
                        <ScrollView
                            ref={scrollViewRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.timelineScroll}
                        >
                            {filteredStops.map((stop, index) => {
                                const isExpanded = expandedStopId === stop.stop_id;
                                const isFirst = index === 0;
                                const isLast = index === filteredStops.length - 1;

                                return (
                                    <View
                                        key={stop.stop_id}
                                        style={styles.timelineItem}
                                    >
                                        <TouchableOpacity
                                            style={[
                                                styles.stopCard,
                                                isExpanded && styles.stopCardExpanded,
                                                isExpanded && { borderColor: color, backgroundColor: color + '10' }
                                            ]}
                                            onPress={() => setExpandedStopId(isExpanded ? null : stop.stop_id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.stopCardTop}>
                                                <View style={[
                                                    styles.timelineDot,
                                                    {
                                                        backgroundColor: (isFirst || isLast || isExpanded) ? color : '#FFFFFF',
                                                        borderColor: color,
                                                    }
                                                ]}>
                                                    {isFirst && (
                                                        <MaterialCommunityIcons name="bus" size={12} color="#FFFFFF" />
                                                    )}
                                                    {isLast && (
                                                        <MaterialCommunityIcons name="flag-checkered" size={12} color="#FFFFFF" />
                                                    )}
                                                    {!isFirst && !isLast && isExpanded && (
                                                        <MaterialCommunityIcons name="circle" size={8} color="#FFFFFF" />
                                                    )}
                                                </View>
                                                <Text style={styles.stopName} numberOfLines={isExpanded ? 3 : 2}>
                                                    {stop.stop_name}
                                                </Text>
                                                <Ionicons
                                                    name={isExpanded ? "chevron-up" : "chevron-down"}
                                                    size={14}
                                                    color="#A0AEC0"
                                                    style={{ marginTop: 4 }}
                                                />
                                            </View>

                                            {isExpanded && stop.departures.length > 0 && (
                                                <View style={styles.departuresContainer} pointerEvents="none">
                                                    <View style={styles.departuresGrid}>
                                                        {(() => {
                                                            const now = new Date();
                                                            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                                            // Show only future departures (all of them, no limit)
                                                            const futureDepartures = stop.departures
                                                                .filter(dep => dep.time.substring(0, 5) >= currentTime);
                                                            
                                                            if (futureDepartures.length === 0) {
                                                                return (
                                                                    <Text style={styles.noDeparturesText}>
                                                                        Brak kolejnych odjazdów
                                                                    </Text>
                                                                );
                                                            }
                                                            
                                                            return futureDepartures.map((dep, depIdx) => {
                                                                const timeWithoutSeconds = dep.time.substring(0, 5);
                                                                return (
                                                                    <View
                                                                        key={depIdx}
                                                                        style={[styles.timeChip, { borderColor: color }]}
                                                                    >
                                                                        <Text style={[styles.timeChipText, { color: color }]}>
                                                                            {timeWithoutSeconds}
                                                                        </Text>
                                                                    </View>
                                                                );
                                                            });
                                                        })()}
                                                    </View>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                        {!isLast && <View style={[styles.horizontalConnector, { backgroundColor: color }]} />}
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    bottomSheet: {
        height: height * 0.85,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#CBD5E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    lineBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    lineBadgeText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Poppins-Bold',
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        color: '#2D3748',
    },
    headerSubtitle: {
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
        color: '#718096',
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    mapContainer: {
        flex: 1,
    },
    directionSelectorBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        gap: 8,
    },
    directionLabel: {
        fontSize: 12,
        fontFamily: 'Poppins-Bold',
        color: '#4A5568',
    },
    directionChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F7FAFC',
        marginRight: 8,
        borderWidth: 2,
        borderColor: '#E2E8F0',
    },
    directionChipText: {
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
        color: '#4A5568',
    },
    timelineContainer: {
        height: 260,
        backgroundColor: '#F7FAFC',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    timelineHeaderBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#EDF2F7',
        gap: 8,
    },
    timelineHeaderText: {
        fontSize: 12,
        fontFamily: 'Poppins-Bold',
        color: '#4A5568',
        flex: 1,
    },
    timelineHeaderBadge: {
        backgroundColor: '#4A5568',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    timelineHeaderBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontFamily: 'Poppins-Bold',
    },
    timelineScroll: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'flex-start',
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stopCard: {
        width: 140,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        minHeight: 120,
        justifyContent: 'flex-start',
    },
    stopCardExpanded: {
        width: 220,
        minHeight: 200,
        borderWidth: 3,
    },
    stopCardTop: {
        alignItems: 'center',
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    stopName: {
        fontSize: 11,
        fontFamily: 'Poppins-Medium',
        color: '#2D3748',
        textAlign: 'center',
        marginBottom: 4,
    },
    horizontalConnector: {
        width: 16,
        height: 2,
        marginHorizontal: 0,
    },
    departuresContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    departuresTitle: {
        fontSize: 9,
        fontFamily: 'Poppins-Bold',
        color: '#718096',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    departuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    timeChip: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        backgroundColor: '#FFFFFF',
    },
    timeChipText: {
        fontSize: 12,
        fontFamily: 'Poppins-Bold',
    },
    noDeparturesText: {
        fontSize: 10,
        fontFamily: 'Poppins-Medium',
        color: '#A0AEC0',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    moreDepartures: {
        fontSize: 9,
        fontFamily: 'Poppins-Medium',
        color: '#A0AEC0',
        marginTop: 4,
        textAlign: 'center',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7FAFC',
    },
    placeholderText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'Poppins-Medium',
        color: '#A0AEC0',
        textAlign: 'center',
    },
});
