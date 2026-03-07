import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchMultiStopRailwayRoute } from '../../utils/railway-routing-v2';

interface Stop {
    stop_id: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
    departures?: Array<{
        time: string;
        direction: string;
        trip_id?: string;
    }>;
}

interface TrainRouteMapWithOSMProps {
    stops: Stop[];
    color: string;
    lineNumber?: string;
    onMarkerPress?: (stopId: string) => void;
    selectedStopId?: string | null;
    useRailwayTracks?: boolean; // If true, use OSM railway data; if false, use shapes.txt
    shapes?: Array<{ lat: number; lon: number }>; // Optional GTFS shapes.txt data
}

/**
 * Component displaying train route on a map using real railway tracks from OpenStreetMap
 * For POLREGIO: Uses Overpass API to fetch railway=rail tracks
 * For SKM: Uses GTFS shapes.txt railway track data
 */
export const TrainRouteMapWithOSM: React.FC<TrainRouteMapWithOSMProps> = ({ 
    stops, 
    color, 
    lineNumber, 
    onMarkerPress, 
    selectedStopId,
    useRailwayTracks = true,
    shapes = []
}) => {
    const [trackCoordinates, setTrackCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        if (stops.length < 2) {
            setIsLoading(false);
            return;
        }

        if (useRailwayTracks) {
            // Use OSM railway tracks (POLREGIO)
            fetchRailwayTracks();
        } else if (shapes && shapes.length > 0) {
            // Use GTFS shapes.txt (SKM)
            setTrackCoordinates(shapes.map(s => ({ latitude: s.lat, longitude: s.lon })));
            setIsLoading(false);
        } else {
            // Fallback: direct lines between stops
            setTrackCoordinates(stops.map(s => ({ latitude: s.stop_lat, longitude: s.stop_lon })));
            setIsLoading(false);
        }
    }, [stops, useRailwayTracks, shapes]);

    const fetchRailwayTracks = async () => {
        try {
            setIsLoading(true);

            const stopCoordinates = stops.map(s => ({
                latitude: s.stop_lat,
                longitude: s.stop_lon
            }));

            console.log('[TrainRouteMapWithOSM] Fetching railway tracks for', stops.length, 'stops');

            const tracks = await fetchMultiStopRailwayRoute(stopCoordinates);
            
            console.log('[TrainRouteMapWithOSM] Got railway coordinates:', tracks.length);
            setTrackCoordinates(tracks);

        } catch (error) {
            console.error('[TrainRouteMapWithOSM] Error fetching railway tracks:', error);
            // Fallback to direct lines between stops
            setTrackCoordinates(stops.map(s => ({ latitude: s.stop_lat, longitude: s.stop_lon })));
        } finally {
            setIsLoading(false);
        }
    };

    // Zoom to selected stop
    useEffect(() => {
        if (selectedStopId && mapRef.current && stops.length > 0) {
            const selectedStop = stops.find(s => s.stop_id === selectedStopId);
            if (selectedStop && 
                selectedStop.stop_lat && 
                selectedStop.stop_lon &&
                !isNaN(selectedStop.stop_lat) && 
                !isNaN(selectedStop.stop_lon)) {
                mapRef.current.animateToRegion({
                    latitude: selectedStop.stop_lat,
                    longitude: selectedStop.stop_lon,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 500);
            }
        }
    }, [selectedStopId]);

    // Fit map to show all stops on mount
    useEffect(() => {
        if (mapRef.current && stops.length > 0) {
            setTimeout(() => {
                mapRef.current?.fitToCoordinates(
                    stops.map(stop => ({
                        latitude: stop.stop_lat,
                        longitude: stop.stop_lon,
                    })),
                    {
                        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                        animated: true,
                    }
                );
            }, 300);
        }
    }, [stops.length]);

    if (stops.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Brak danych o przystankach</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={color} />
                    <Text style={styles.loadingText}>Ładowanie torów kolejowych...</Text>
                </View>
            )}

            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={{
                    latitude: stops[0].stop_lat,
                    longitude: stops[0].stop_lon,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={false}
                toolbarEnabled={false}
            >
                {/* Railway tracks */}
                {trackCoordinates.length > 0 && (
                    <Polyline
                        coordinates={trackCoordinates}
                        strokeColor={color}
                        strokeWidth={5}
                        lineCap="round"
                        lineJoin="round"
                        zIndex={1}
                    />
                )}

                {/* Station markers */}
                {stops.map((stop, index) => {
                    const isSelected = selectedStopId === stop.stop_id;
                    const isFirst = index === 0;
                    const isLast = index === stops.length - 1;
                    
                    // Get departure time from first departure
                    const departureTime = stop.departures && stop.departures.length > 0 
                        ? stop.departures[0].time 
                        : null;
                    
                    return (
                        <Marker
                            key={stop.stop_id}
                            coordinate={{
                                latitude: stop.stop_lat,
                                longitude: stop.stop_lon,
                            }}
                            anchor={{ x: 0.5, y: 0.5 }}
                            onPress={() => onMarkerPress?.(stop.stop_id)}
                            zIndex={isSelected ? 10 : 2}
                        >
                            <View style={{ alignItems: 'center' }}>
                                {/* Station marker */}
                                <View style={[
                                    styles.markerContainer,
                                    { 
                                        backgroundColor: (isFirst || isSelected) ? color : (isLast ? '#EF4444' : '#FFFFFF'),
                                        borderColor: color,
                                        borderWidth: isSelected ? 3 : 2,
                                        transform: [{ scale: isSelected ? 1.3 : 1 }]
                                    }
                                ]}>
                                    {isFirst ? (
                                        <MaterialCommunityIcons name="train" size={14} color="#FFFFFF" />
                                    ) : isLast ? (
                                        <MaterialCommunityIcons name="flag-checkered" size={14} color="#FFFFFF" />
                                    ) : isSelected ? (
                                        <MaterialCommunityIcons name="circle" size={10} color="#FFFFFF" />
                                    ) : (
                                        <View style={[styles.dotMarker, { backgroundColor: color }]} />
                                    )}
                                </View>
                                
                                {/* Departure time label */}
                                {departureTime && (
                                    <View style={[styles.timeLabel, { backgroundColor: color }]}>
                                        <Text style={styles.timeLabelText}>{departureTime.substring(0, 5)}</Text>
                                    </View>
                                )}
                            </View>
                        </Marker>
                    );
                })}
            </MapView>

            {lineNumber && (
                <View style={[styles.lineNumberBadge, { backgroundColor: color }]}>
                    <MaterialCommunityIcons name="train" size={16} color="#FFFFFF" />
                    <Text style={styles.lineNumberText}>{lineNumber}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 10,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 1000,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    loadingText: {
        fontSize: 12,
        color: '#374151',
    },
    errorText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 20,
    },
    markerContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    dotMarker: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    timeLabel: {
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    timeLabelText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    lineNumberBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    lineNumberText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
