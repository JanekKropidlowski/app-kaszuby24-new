import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import polyline from '@mapbox/polyline';

interface Stop {
    stop_id: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
}

interface BusRouteMapProps {
    stops: Stop[];
    color: string;
    lineNumber?: string;
    onMarkerPress?: (stopId: string) => void;
    selectedStopId?: string | null;
}

const { width } = Dimensions.get('window');

/**
 * Component displaying bus route on a map with street-level routing between stops
 * Uses OSRM for routing since GTFS data doesn't include shapes
 */
export const BusRouteMap: React.FC<BusRouteMapProps> = ({ 
    stops, 
    color, 
    lineNumber, 
    onMarkerPress, 
    selectedStopId
}) => {
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        if (stops.length < 2) {
            setIsLoading(false);
            return;
        }

        console.log('[BusRouteMap] Fetching route for stops:', stops.length);
        fetchRoute();
    }, [stops]);

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

    const fetchRoute = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Build OSRM coordinates string
            const coordinates = stops
                .map(stop => `${stop.stop_lon},${stop.stop_lat}`)
                .join(';');

            console.log('[BusRouteMap] Fetching OSRM route:', coordinates);

            // Use public OSRM instance
            const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=polyline`;

            const response = await fetch(url);
            const data = await response.json();

            console.log('[BusRouteMap] OSRM response code:', data.code);

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                throw new Error('Nie udało się pobrać trasy');
            }

            // Decode polyline
            const encodedPolyline = data.routes[0].geometry;
            const decodedCoordinates = polyline.decode(encodedPolyline).map(([lat, lng]) => ({
                latitude: lat,
                longitude: lng,
            }));

            console.log('[BusRouteMap] Decoded coordinates:', decodedCoordinates.length);
            setRouteCoordinates(decodedCoordinates);

            // Fit map to show all stops only on initial load
            if (mapRef.current && stops.length > 0 && !selectedStopId) {
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
                }, 100);
            }
        } catch (err) {
            console.error('[BusRouteMap] Error fetching route:', err);
            setError('Nie udało się załadować mapy trasy');
        } finally {
            setIsLoading(false);
        }
    };

    if (stops.length < 2) {
        return null;
    }

    return (
        <View style={styles.container}>
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={color} />
                    <Text style={styles.loadingText}>Ładowanie trasy...</Text>
                </View>
            )}

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={{
                    latitude: stops[0].stop_lat,
                    longitude: stops[0].stop_lon,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={false}
                toolbarEnabled={false}
            >
                {/* Route line */}
                {routeCoordinates.length > 0 && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={color}
                        strokeWidth={8}
                        lineCap="round"
                        lineJoin="round"
                        zIndex={1}
                        onLayout={() => console.log('[BusRouteMap] Polyline rendered with', routeCoordinates.length, 'points, color:', color)}
                    />
                )}

                {/* Stop markers */}
                {stops.map((stop, index) => {
                    const isSelected = selectedStopId === stop.stop_id;
                    const isFirst = index === 0;
                    const isLast = index === stops.length - 1;
                    
                    return (
                        <Marker
                            key={stop.stop_id}
                            coordinate={{
                                latitude: stop.stop_lat,
                                longitude: stop.stop_lon,
                            }}
                            anchor={{ x: 0.5, y: 0.5 }}
                            onPress={() => onMarkerPress?.(stop.stop_id)}
                        >
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
                                    <MaterialCommunityIcons name="bus" size={14} color="#FFFFFF" />
                                ) : isLast ? (
                                    <MaterialCommunityIcons name="flag-checkered" size={14} color="#FFFFFF" />
                                ) : isSelected ? (
                                    <MaterialCommunityIcons name="circle" size={10} color="#FFFFFF" />
                                ) : (
                                    <View style={[styles.dotMarker, { backgroundColor: color }]} />
                                )}
                            </View>
                        </Marker>
                    );
                })}
            </MapView>

            {lineNumber && (
                <View style={[styles.lineNumberBadge, { backgroundColor: color }]}>
                    <Text style={styles.lineNumberText}>{lineNumber}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7FAFC',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    loadingText: {
        marginTop: 8,
        fontSize: 12,
        color: '#718096',
        fontFamily: 'Poppins-Regular',
    },
    errorContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        zIndex: 10,
    },
    errorText: {
        fontSize: 13,
        color: '#EF4444',
        textAlign: 'center',
        fontFamily: 'Poppins-Regular',
    },
    markerContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    dotMarker: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    lineNumberBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    lineNumberText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Poppins-Bold',
    },
});
