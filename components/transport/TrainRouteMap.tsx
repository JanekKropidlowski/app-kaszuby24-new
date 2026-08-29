import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Stop {
    stop_id: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
    platform?: string;
}

interface ShapePoint {
    lat: number;
    lon: number;
    sequence: number;
}

interface TrainRouteMapProps {
    stops: Stop[];
    shape: ShapePoint[];  // Railway tracks from GTFS shapes.txt
    color: string;
    lineNumber?: string;
    onMarkerPress?: (stopId: string) => void;
    selectedStopId?: string | null;
}

/**
 * Component displaying train route on a map using real railway tracks from GTFS shapes.txt
 * Used for SKM and other rail services that provide shape data
 */
export const TrainRouteMap: React.FC<TrainRouteMapProps> = ({ 
    stops, 
    shape,
    color, 
    lineNumber, 
    onMarkerPress, 
    selectedStopId
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const mapRef = useRef<MapView>(null);

    // Convert shape points to map coordinates
    const trackCoordinates = shape.map(point => ({
        latitude: point.lat,
        longitude: point.lon
    }));

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
                    <Text style={styles.loadingText}>Ładowanie trasy...</Text>
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
                {/* Railway track line from shapes.txt */}
                {trackCoordinates.length > 0 && (
                    <Polyline
                        coordinates={trackCoordinates}
                        strokeColor={color}
                        strokeWidth={6}
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
