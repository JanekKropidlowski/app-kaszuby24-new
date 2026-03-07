import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Stop {
    stop_id: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
}

interface SKMRouteMapProps {
    stops: Stop[];
    color: string;
    lineNumber: string;
    onMarkerPress?: (stopId: string) => void;
    selectedStopId?: string | null;
    tripIds?: string[]; // For better shape matching
}

interface ShapeData {
    id: string;
    points: Array<{
        lat: number;
        lon: number;
    }>;
}

export const SKMRouteMap: React.FC<SKMRouteMapProps> = ({
    stops,
    color,
    lineNumber,
    onMarkerPress,
    selectedStopId,
    tripIds
}) => {
    const [polylineCoordinates, setPolylineCoordinates] = useState<Array<{latitude: number, longitude: number}>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        if (stops.length >= 2) {
            fetchSKMShapes();
        }
    }, [stops]);

    useEffect(() => {
        if (selectedStopId && mapRef.current) {
            const selectedStop = stops.find(s => s.stop_id === selectedStopId);
            if (selectedStop) {
                mapRef.current.animateToRegion({
                    latitude: selectedStop.stop_lat,
                    longitude: selectedStop.stop_lon,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 500);
            }
        }
    }, [selectedStopId]);

    const fetchSKMShapes = async () => {
        try {
            setIsLoading(true);
            setError(null);

            console.log('[SKMRouteMap] Fetching shapes for SKM');

            // Fetch shapes from API
            const response = await fetch('https://kaszuby24.pl/wp-json/kaszuby24/v2/shapes?agency=skm');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const text = await response.text();
            let cleanText = text.trim();
            if (cleanText.startsWith('<')) {
                const jsonStart = Math.min(
                    cleanText.indexOf('{') !== -1 ? cleanText.indexOf('{') : Infinity,
                    cleanText.indexOf('[') !== -1 ? cleanText.indexOf('[') : Infinity
                );
                if (jsonStart !== Infinity) {
                    cleanText = cleanText.substring(jsonStart);
                    console.log('[SKMRouteMap] Stripped HTML warnings from shapes response');
                }
            }
            const shapesData: ShapeData[] = JSON.parse(cleanText);
            console.log('[SKMRouteMap] Received shapes:', shapesData.length);

            if (shapesData.length === 0) {
                console.log('[SKMRouteMap] No shapes available, using direct lines');
                // Fallback: create direct lines between stops
                setPolylineCoordinates(stops.map(stop => ({
                    latitude: stop.stop_lat,
                    longitude: stop.stop_lon
                })));
                setIsLoading(false);
                return;
            }

            // Find best matching shape or use first one
            let selectedShape = shapesData[0];
            
            // If we have multiple shapes, try to find one with points near our route
            if (shapesData.length > 1 && stops.length > 0) {
                const firstStop = stops[0];
                const lastStop = stops[stops.length - 1];
                
                for (const shape of shapesData) {
                    if (shape.points.length > 10) {
                        const shapeStart = shape.points[0];
                        const shapeEnd = shape.points[shape.points.length - 1];
                        
                        // Calculate distance to see if shape matches our route better
                        const startDist = Math.abs(firstStop.stop_lat - shapeStart.lat) + Math.abs(firstStop.stop_lon - shapeStart.lon);
                        const endDist = Math.abs(lastStop.stop_lat - shapeEnd.lat) + Math.abs(lastStop.stop_lon - shapeEnd.lon);
                        
                        if (startDist < 0.01 && endDist < 0.01) {
                            selectedShape = shape;
                            console.log('[SKMRouteMap] Found better matching shape:', shape.id);
                            break;
                        }
                    }
                }
            }
            
            const coordinates = selectedShape.points.map(point => ({
                latitude: point.lat,
                longitude: point.lon
            }));

            console.log('[SKMRouteMap] Using shape', selectedShape.id, 'with', coordinates.length, 'points');
            console.log('[SKMRouteMap] First point:', coordinates[0]);
            console.log('[SKMRouteMap] Last point:', coordinates[coordinates.length - 1]);
            
            // Validate coordinates are within reasonable bounds for Poland
            const validCoordinates = coordinates.filter(coord => 
                coord.latitude >= 49 && coord.latitude <= 55 &&
                coord.longitude >= 14 && coord.longitude <= 25
            );
            
            if (validCoordinates.length < coordinates.length) {
                console.log('[SKMRouteMap] Filtered', coordinates.length - validCoordinates.length, 'invalid coordinates');
            }
            
            setPolylineCoordinates(validCoordinates.length > 0 ? validCoordinates : coordinates);
            
        } catch (error) {
            console.error('[SKMRouteMap] Error fetching shapes:', error);
            
            // Fallback to direct lines between stops
            console.log('[SKMRouteMap] Using fallback direct lines');
            setPolylineCoordinates(stops.map(stop => ({
                latitude: stop.stop_lat,
                longitude: stop.stop_lon
            })));
        } finally {
            setIsLoading(false);
        }
    };

    const getMapRegion = () => {
        if (stops.length === 0) return null;

        const lats = stops.map(s => s.stop_lat);
        const lngs = stops.map(s => s.stop_lon);
        
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        return {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max(maxLat - minLat, 0.01) * 1.4,
            longitudeDelta: Math.max(maxLng - minLng, 0.01) * 1.4,
        };
    };

    const region = getMapRegion();

    if (!region) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Brak przystanków do wyświetlenia</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={region}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={false}
                toolbarEnabled={false}
                moveOnMarkerPress={false}
                showsScale={false}
                showsBuildings={false}
                showsIndoors={false}
                showsTraffic={false}
            >
                {/* SKM railway track polyline */}
                {polylineCoordinates.length > 0 && (
                    <Polyline
                        coordinates={polylineCoordinates}
                        strokeWidth={4}
                        strokeColor={color}
                        lineJoin="round"
                        lineCap="round"
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
                            onPress={() => onMarkerPress?.(stop.stop_id)}
                            zIndex={isSelected ? 1000 : (isFirst || isLast ? 100 : 50)}
                        >
                            <View style={[
                                styles.marker,
                                {
                                    backgroundColor: isSelected ? color : '#FFFFFF',
                                    borderColor: color,
                                    borderWidth: isSelected ? 3 : 2,
                                    transform: [{ scale: isSelected ? 1.3 : 1.0 }]
                                }
                            ]}>
                                <MaterialCommunityIcons
                                    name="train"
                                    size={isSelected ? 16 : 14}
                                    color={isSelected ? '#FFFFFF' : color}
                                />
                            </View>
                        </Marker>
                    );
                })}
            </MapView>

            {/* Loading overlay */}
            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={color} />
                    <Text style={styles.loadingText}>Ładowanie tras SKM...</Text>
                </View>
            )}

            {/* Error display */}
            {error && !isLoading && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    marker: {
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
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#4A5568',
        fontFamily: 'Poppins-Medium',
    },
    errorContainer: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        padding: 12,
        borderRadius: 8,
    },
    errorText: {
        color: '#FFFFFF',
        fontSize: 14,
        textAlign: 'center',
        fontFamily: 'Poppins-Medium',
    },
});