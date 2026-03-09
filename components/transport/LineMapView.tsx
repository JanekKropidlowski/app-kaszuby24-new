import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Stop {
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
}

interface LineMapViewProps {
    stops: Stop[];
    lineNumber: string;
    agency: 'mzk' | 'skm';
}

export const LineMapView: React.FC<LineMapViewProps> = ({ stops, lineNumber, agency }) => {
    const mapRef = useRef<MapView>(null);

    const lineColor = useMemo(() => {
        if (agency === 'skm') return '#FFD54F';
        return '#1A237E'; // MZK navy
    }, [agency]);

    // Generuj coordinates z stops
    const coordinates = useMemo(() => {
        return stops.map(s => ({
            latitude: s.stop_lat,
            longitude: s.stop_lon
        }));
    }, [stops]);

    // Auto-zoom do pokazania całej trasy
    useEffect(() => {
        if (coordinates.length > 0 && mapRef.current) {
            setTimeout(() => {
                mapRef.current?.fitToCoordinates(coordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true
                });
            }, 500);
        }
    }, [coordinates]);

    if (stops.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="map-marker-off" size={48} color="#CBD5E0" />
                <Text style={styles.emptyText}>Brak danych do wyświetlenia trasy</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={{
                    latitude: stops[0].stop_lat,
                    longitude: stops[0].stop_lon,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1
                }}
                showsUserLocation
                showsMyLocationButton
            >
                {/* Linia trasy */}
                <Polyline
                    coordinates={coordinates}
                    strokeColor={lineColor}
                    strokeWidth={4}
                />

                {/* Markery przystanków */}
                {stops.map((stop, index) => {
                    const isFirst = index === 0;
                    const isLast = index === stops.length - 1;
                    
                    return (
                        <Marker
                            key={index}
                            coordinate={{
                                latitude: stop.stop_lat,
                                longitude: stop.stop_lon
                            }}
                            anchor={{ x: 0.5, y: 0.5 }}
                            tracksViewChanges={false}
                        >
                            {isFirst ? (
                                <View style={styles.startMarker}>
                                    <MaterialCommunityIcons name="flag" size={20} color="#10B981" />
                                </View>
                            ) : isLast ? (
                                <View style={styles.endMarker}>
                                    <MaterialCommunityIcons name="flag-checkered" size={20} color="#EF4444" />
                                </View>
                            ) : (
                                <View style={[styles.stopMarker, { borderColor: lineColor }]} />
                            )}
                        </Marker>
                    );
                })}
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 300,
        borderRadius: 12,
        overflow: 'hidden',
        marginVertical: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    map: {
        flex: 1
    },
    emptyContainer: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7FAFC',
        borderRadius: 12,
        marginVertical: 12
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'Poppins-Medium',
        color: '#A0AEC0'
    },
    startMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#10B981',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 }
    },
    endMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#EF4444',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 }
    },
    stopMarker: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'white',
        borderWidth: 2,
        elevation: 2
    }
});
