import React, { useMemo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { RouteOption, RouteLeg } from '../../services/TransportRoutingEngine';
import { decodePolyline } from '../../utils/polylineDecoder';
import PolregioShapes from '../../constants/PolregioShapesData.json';

// Extend RouteLeg to include 'from' and 'to' properties for better type safety
interface ExtendedRouteLeg extends RouteLeg {
    from?: { lat: number; lon: number };
    to?: { lat: number; lon: number };
}

interface DecodedRouteLeg extends ExtendedRouteLeg {
    coordinates: { latitude: number; longitude: number }[];
}

// Helper to calculate distance between two points
const getDist = (pt1: { latitude: number, longitude: number }, pt2: { latitude: number, longitude: number }) => {
    return Math.sqrt(Math.pow(pt1.latitude - pt2.latitude, 2) + Math.pow(pt1.longitude - pt2.longitude, 2));
};

const SHAPE_MAPPING: Record<string, string[]> = {
    'shape_0891': ['hel', 'jurata', 'jastarnia', 'kuźnica', 'chałupy', 'władysławowo', 'puck', 'reda', 'rumia', 'gdynia', 'sopot', 'gdańsk'], // Hel Line
    'shape_0124': ['hel', 'jurata', 'jastarnia', 'kuźnica', 'chałupy', 'władysławowo', 'puck', 'reda', 'rumia', 'gdynia', 'sopot', 'gdańsk'], // Hel 2
    'shape_1129': ['kartuzy', 'dzierżążno', 'babi dół', 'kiełpino', 'somonino', 'sławki', 'wieżyca', 'krzeszna', 'gołubie', 'skorzewo', 'koscierzyna', 'kamienny potok', 'sopot', 'oliwa', 'wrzeszcz', 'gdańsk', 'gdynia'], // Kartuzy/Kościerzyna Line
    'shape_0160': ['kościerzyna', 'skorzewo', 'gołubie', 'krzeszna', 'wieżyca', 'sławki', 'somonino', 'kiełpino', 'babi dół', 'żukowo', 'rëbanô', 'pępowo', 'rębiechowo', 'gdańsk', 'gdynia'], // Kościerzyna
};

interface RouteMapViewProps {
    journey: RouteOption;
    showIntermediateStops?: boolean;
    onLegPress?: (legIndex: number) => void;
}

export const RouteMapView = ({ journey, showIntermediateStops = false, onLegPress }: RouteMapViewProps) => {
    const mapRef = useRef<MapView>(null);
    const [visibleIntermediateStops, setVisibleIntermediateStops] = useState<Set<number>>(new Set());
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [selectedStop, setSelectedStop] = useState<string | null>(null); // Track which stop marker is selected

    // User Location tracking
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const sub = await Location.watchPositionAsync({
                accuracy: Location.Accuracy.High,
                distanceInterval: 20
            }, (loc) => setUserLocation(loc));

            return () => sub.remove();
        })();
    }, []);

    // 1. Decode legs with memoization
    const decodedLegs = useMemo(() => {
        return journey.legs.map(leg => {
            const coordinates: { latitude: number; longitude: number }[] = (leg.legGeometry?.points as any)
                ? decodePolyline(
                    leg.legGeometry.points,
                    { lat: leg.from?.lat || 0, lon: leg.from?.lon || 0 },
                    { lat: leg.to?.lat || 0, lon: leg.to?.lon || 0 }
                )
                : [
                    { latitude: leg.from?.lat || 0, longitude: leg.from?.lon || 0 },
                    { latitude: leg.to?.lat || 0, longitude: leg.to?.lon || 0 }
                ];

            // Geometry Override for Transit & Fallbacks
            let finalCoords = coordinates;

            const brand = (leg.brand || '').toUpperCase();
            const isTransit = brand !== 'WALK' && brand !== '';

            // If it's a transit operator and the polyline is minimal, 
            // OR if it's Polregio and we want to ensure station-to-station paths (unless handled by shape mapping later):
            if (isTransit && leg.intermediateStops && leg.intermediateStops.length > 0) {
                // Determine if we should force station connection fallback
                // For MZK/Wejherowo: User confirmed GTFS has shapes, so only fallback if geometry is missing/tiny.
                // For POLREGIO: Currently falling back to ensure connectivity unless shape mapping kicks in? 
                // Let's rely on coordinates.length primarily.

                const isBadGeometry = coordinates.length <= 5;
                const isPolregio = brand === 'POLREGIO'; // Keep Polregio fallback strict for now if desired, or loosen it too.

                if (isBadGeometry || (isPolregio && coordinates.length < 20)) {
                    // Use stops if geometry is really poor, or for Polregio if it seems simple
                    finalCoords = [
                        { latitude: leg.from!.lat, longitude: leg.from!.lon },
                        ...leg.intermediateStops.map(s => ({ latitude: s.lat, longitude: s.lon })),
                        { latitude: leg.to!.lat, longitude: leg.to!.lon }
                    ];
                }
            }

            // Polregio Specific Shape Matching (Advanced)
            if (brand === 'POLREGIO' || brand === 'PKP' || brand === 'PR' || brand === 'REGIO' || brand === 'IC') {
                const fromN = leg.fromName.toLowerCase();
                const toN = leg.toName.toLowerCase();

                let bestShapeId = null;
                for (const [sId, keywords] of Object.entries(SHAPE_MAPPING)) {
                    const matchesFrom = keywords.some(k => fromN.includes(k.toLowerCase()));
                    const matchesTo = keywords.some(k => toN.includes(k.toLowerCase()));
                    if (matchesFrom && matchesTo) {
                        bestShapeId = sId;
                        break;
                    }
                }

                if (bestShapeId && (PolregioShapes as any)[bestShapeId]) {
                    const fullShape = (PolregioShapes as any)[bestShapeId];
                    // Find start and end index in shape
                    const startCoords = { latitude: leg.from!.lat, longitude: leg.from!.lon };
                    const endCoords = { latitude: leg.to!.lat, longitude: leg.to!.lon };

                    let minStartIndex = -1, minStartDist = Infinity;
                    let minEndIndex = -1, minEndDist = Infinity;

                    fullShape.forEach((pt: any, idx: number) => {
                        const dS = getDist(pt, startCoords);
                        const dE = getDist(pt, endCoords);
                        if (dS < minStartDist) { minStartDist = dS; minStartIndex = idx; }
                        if (dE < minEndDist) { minEndDist = dE; minEndIndex = idx; }
                    });

                    if (minStartIndex !== -1 && minEndIndex !== -1) {
                        const startI = Math.min(minStartIndex, minEndIndex);
                        const endI = Math.max(minStartIndex, minEndIndex);
                        const segment = fullShape.slice(startI, endI + 1);

                        // Determine direction based on original start/end matching
                        const dNormal = getDist(segment[0], startCoords);
                        const dReverse = getDist(segment[segment.length - 1], startCoords);

                        finalCoords = dNormal < dReverse ? segment : segment.reverse();
                    }
                }
            }

            return { ...leg, coordinates: finalCoords };
        });
    }, [journey.legs]);

    // 2. Sort legs for rendering: TRANSIT first, then WALK
    const sortedRenderLegs = useMemo(() => {
        return decodedLegs.map((leg, index) => ({ leg, index })).sort((a, b) => {
            if (a.leg.mode === 'WALK' && b.leg.mode !== 'WALK') return 1;
            if (a.leg.mode !== 'WALK' && b.leg.mode === 'WALK') return -1;
            return 0;
        });
    }, [decodedLegs]);

    // 3. Auto-fit map to coordinates
    useEffect(() => {
        const allCoords = decodedLegs.flatMap(leg => leg.coordinates);
        if (mapRef.current && allCoords.length > 0) {
            // Wait a bit for map to layout
            setTimeout(() => {
                mapRef.current?.fitToCoordinates(allCoords, {
                    edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
                    animated: true,
                });
            }, 500);
        }
    }, [decodedLegs]);

    const getLegColor = (leg: RouteLeg): string => {
        const brand = (leg.brand || '').toUpperCase();

        // 1. Brand specific (Priority) - Precise colors matching badges
        if (brand === 'SKM') return '#FFD54F';
        if (brand === 'POLREGIO' || brand === 'REGIO' || brand === 'PR') return '#1A6ADD';
        if (brand.includes('MZK') || brand.includes('WEJHEROWO')) return '#1A237E';
        if (brand === 'PKP' || brand === 'IC' || brand === 'TLK') return '#D32F2F';
        if (brand === 'PKS') return '#2D3748';
        if (brand === 'ZKM') return '#00A651';
        if (brand === 'ZTM') return '#0066CC';

        // 2. Route color from OTP
        if (leg.routeColor) return `#${leg.routeColor}`;

        // 3. Mode specific
        if (leg.mode === 'WALK') return '#718096';
        if (leg.mode === 'RIDE') return '#FFA500'; // Generic RIDE/RAIL

        // 4. Fallback
        return '#999999';
    };

    // Render decorative shapes (arrows/dots) along the line to make it more "premium"
    const renderLegShapes = (leg: RouteLeg, index: number) => {
        const brand = (leg.brand || '').toUpperCase();
        if (brand !== 'SKM' && !brand.includes('MZK')) return null;

        const coords = leg.coordinates;
        if (coords.length < 2) return null;

        // Place markers at intervals
        const interval = Math.max(5, Math.floor(coords.length / 4));
        const shapes = [];

        for (let i = interval; i < coords.length - interval; i += interval) {
            const current = coords[i];
            const next = coords[i + 1];

            // Calculate rotation for the arrow if possible, or just use a dot/badge
            shapes.push(
                <Marker
                    key={`shape-${index}-${i}`}
                    coordinate={current}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={false}
                    pointerEvents="none"
                >
                    <View style={{
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: getLegColor(leg),
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.3,
                        shadowRadius: 2,
                        elevation: 3
                    }}>
                        <MaterialCommunityIcons
                            name={brand === 'SKM' ? "train" : "bus"}
                            size={8}
                            color="#FFFFFF"
                        />
                    </View>
                </Marker>
            );
        }
        return shapes;
    };

    const toggleIntermediateStops = (index: number) => {
        if (onLegPress) {
            onLegPress(index);
        }
        setVisibleIntermediateStops(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    return (
        <MapView
            ref={mapRef}
            style={styles.map}
            // provider={PROVIDER_GOOGLE} // User requested native map (Apple Maps)
            showsUserLocation={false} // Focusing on route
            toolbarEnabled={false}
            onPress={() => setSelectedStop(null)} // Close callout when clicking on map
        >
            {/* POLYLINES */}
            {sortedRenderLegs.map(({ leg, index }) => (
                <Polyline
                    key={`poly-${index}`}
                    coordinates={(leg as DecodedRouteLeg).coordinates}
                    strokeColor={getLegColor(leg)}
                    strokeWidth={leg.mode === 'WALK' ? 4 : 5}
                    lineDashPattern={leg.mode === 'WALK' ? [5, 5] : undefined}
                    tappable={leg.mode !== 'WALK'}
                    onPress={() => leg.mode !== 'WALK' && toggleIntermediateStops(index)}
                    zIndex={leg.mode === 'WALK' ? 10 : 5} // Walk on top if needed
                />
            ))}

            {/* DECORATIVE SHAPES (SKM/MZK ONLY) */}
            {sortedRenderLegs.map(({ leg, index }) => (
                <React.Fragment key={`shapes-frag-${index}`}>
                    {renderLegShapes(leg as DecodedRouteLeg, index)}
                </React.Fragment>
            ))}

            {/* INTERMEDIATE STOPS (On Demand) */}
            {decodedLegs.map((leg, index) => {
                if ((!showIntermediateStops && !visibleIntermediateStops.has(index)) || !leg.intermediateStops) return null;

                // Safety limiter for overly dense stops
                const stops = leg.intermediateStops.length > 30
                    ? leg.intermediateStops.filter((_, i) => i === 0 || i % 2 === 0)
                    : leg.intermediateStops;

                return stops.map((stop, sIdx) => {
                    const stopKey = `stop-${index}-${sIdx}`;
                    const isSelected = selectedStop === stopKey;
                    return (
                        <Marker
                            key={stopKey}
                            coordinate={{ latitude: stop.lat, longitude: stop.lon }}
                            anchor={{ x: 0.5, y: 0.5 }}
                            tracksViewChanges={false}
                            onPress={() => setSelectedStop(stopKey)}
                        >
                            <View style={{
                                width: isSelected ? 22 : 16,
                                height: isSelected ? 22 : 16,
                                borderRadius: isSelected ? 11 : 8,
                                backgroundColor: 'white',
                                borderWidth: isSelected ? 3 : 2,
                                borderColor: getLegColor(leg),
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.25,
                                shadowRadius: 2,
                                elevation: 3
                            }} />
                            {isSelected && (
                                <Callout>
                                    <View style={styles.calloutContainer}>
                                        <Text style={styles.calloutTitle}>{stop.name}</Text>
                                        {stop.arrivalTime && (
                                            <Text style={styles.calloutSubtitle}>Przyjazd: {stop.arrivalTime}</Text>
                                        )}
                                    </View>
                                </Callout>
                            )}
                        </Marker>
                    );
                });
            })}

            {/* MAJOR MARKERS (Start, End, Transfers) */}
            {/* Start */}
            {decodedLegs[0]?.coordinates[0] && (
                <Marker
                    coordinate={decodedLegs[0].coordinates[0]}
                    onPress={() => setSelectedStop('start')}
                >
                    <View style={styles.markerStart}>
                        <Ionicons name="location" size={32} color="#48BB78" />
                    </View>
                    {selectedStop === 'start' && (
                        <Callout>
                            <View style={styles.calloutContainer}>
                                <Text style={styles.calloutTitle}>Początek trasy</Text>
                                <Text style={styles.calloutSubtitle}>{decodedLegs[0].fromName}</Text>
                            </View>
                        </Callout>
                    )}
                </Marker>
            )}

            {/* End */}
            {decodedLegs[decodedLegs.length - 1]?.coordinates.length > 0 && (
                <Marker
                    coordinate={decodedLegs[decodedLegs.length - 1].coordinates[
                        decodedLegs[decodedLegs.length - 1].coordinates.length - 1
                    ]}
                    onPress={() => setSelectedStop('end')}
                >
                    <View style={styles.markerEnd}>
                        <Ionicons name="location" size={32} color="#F56565" />
                    </View>
                    {selectedStop === 'end' && (
                        <Callout>
                            <View style={styles.calloutContainer}>
                                <Text style={styles.calloutTitle}>Koniec podróży</Text>
                                <Text style={styles.calloutSubtitle}>{decodedLegs[decodedLegs.length - 1].toName}</Text>
                            </View>
                        </Callout>
                    )}
                </Marker>
            )}

            {/* Transfers */}
            {decodedLegs.slice(0, -1).map((leg, idx) => {
                const nextLeg = decodedLegs[idx + 1];
                // Show transfer marker if changing vehicles (RIDE -> RIDE or RIDE -> WALK -> RIDE)
                if (leg.mode !== 'WALK' && nextLeg.mode !== 'WALK') {
                    const coord = leg.coordinates[leg.coordinates.length - 1];
                    if (!coord) return null;
                    const transferKey = `transfer-${idx}`;
                    return (
                        <Marker
                            key={transferKey}
                            coordinate={coord}
                            zIndex={100}
                            onPress={() => setSelectedStop(transferKey)}
                        >
                            <View style={styles.markerTransfer}>
                                <Ionicons name="swap-horizontal" size={20} color="#1A202C" />
                            </View>
                            {selectedStop === transferKey && (
                                <Callout>
                                    <View style={styles.calloutContainer}>
                                        <Text style={styles.calloutTitle}>{leg.toName}</Text>
                                        <Text style={styles.calloutSubtitle}>Przesiadka</Text>
                                    </View>
                                </Callout>
                            )}
                        </Marker>
                    );
                }
                return null;
            })}
        </MapView>
    );
};

const styles = StyleSheet.create({
    map: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'white',
    },
    markerStart: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#48BB78',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    markerEnd: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#F56565',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    markerTransfer: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFD54F',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    calloutContainer: {
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 8,
        minWidth: 120,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
        marginBottom: 5,
    },
    calloutTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 12,
        color: '#1A202C',
        marginBottom: 2,
    },
    calloutSubtitle: {
        fontFamily: 'Poppins-Medium',
        fontSize: 11,
        color: '#718096',
        textAlign: 'center',
    },
    userLocationContainer: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userLocationDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4299E1',
        borderWidth: 2,
        borderColor: 'white',
        zIndex: 2,
    },
    userLocationRing: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(66, 153, 225, 0.3)',
        zIndex: 1,
    }
});
