import React, { useRef, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Stop {
    stop_id: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
}

interface PolregioRouteMapProps {
    stops: Stop[];
    color: string;
    lineNumber: string;
    onMarkerPress?: (stopId: string) => void;
    selectedStopId?: string | null;
}

export const PolregioRouteMap: React.FC<PolregioRouteMapProps> = ({
    stops,
    color,
    onMarkerPress,
    selectedStopId
}) => {
    const mapRef = useRef<MapView>(null);

    // Proste współrzędne - bez filtrowania
    const polylineCoordinates = useMemo(() => {
        if (!stops || stops.length === 0) return [];
        return stops.map(stop => ({
            latitude: stop.stop_lat,
            longitude: stop.stop_lon
        }));
    }, [stops]);

    // Zoom do wybranej stacji
    useEffect(() => {
        if (selectedStopId && mapRef.current) {
            const selectedStop = stops.find(s => s.stop_id === selectedStopId);
            if (selectedStop) {
                mapRef.current.animateToRegion({
                    latitude: selectedStop.stop_lat,
                    longitude: selectedStop.stop_lon,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }, 500);
            }
        }
    }, [selectedStopId, stops]);

    // Region mapy
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
            latitudeDelta: Math.max(maxLat - minLat, 0.01) * 1.5,
            longitudeDelta: Math.max(maxLng - minLng, 0.01) * 1.5,
        };
    };

    const region = getMapRegion();

    if (!region) {
        return (
            <View style={styles.container}>
                <Text style={styles.emptyText}>Brak stacji</Text>
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
            >
                {/* Linia między stacjami */}
                {polylineCoordinates.length > 1 && (
                    <Polyline
                        coordinates={polylineCoordinates}
                        strokeWidth={3}
                        strokeColor={color}
                        lineJoin="round"
                        lineCap="round"
                    />
                )}

                {/* Markery stacji */}
                {stops.map((stop, index) => (
                    <Marker
                        key={stop.stop_id}
                        coordinate={{
                            latitude: stop.stop_lat,
                            longitude: stop.stop_lon,
                        }}
                        onPress={() => onMarkerPress?.(stop.stop_id)}
                    >
                        <View style={[
                            styles.marker,
                            {
                                backgroundColor: selectedStopId === stop.stop_id ? color : '#FFFFFF',
                                borderColor: color,
                            }
                        ]}>
                            <MaterialCommunityIcons
                                name="train"
                                size={12}
                                color={selectedStopId === stop.stop_id ? '#FFFFFF' : color}
                            />
                        </View>
                    </Marker>
                ))}
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7FAFC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    map: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    marker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    emptyText: {
        fontSize: 14,
        color: '#A0AEC0',
        fontFamily: 'Poppins-Medium',
    },
});