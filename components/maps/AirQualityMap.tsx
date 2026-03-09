import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { ClusterMarker } from './ClusterMarker';
import MapViewClustering from 'react-native-map-clustering';
import { aqCategoryToColor, AqStationResult } from '@/services/airQualityService';

interface AirQualityMapProps {
    center: { lat: number; lon: number };
    stations: AqStationResult[];
    theme: any;
    onStationPress: (station: AqStationResult) => void;
}

const DEFAULT_REGION: Region = {
    latitude: 54.352,
    longitude: 18.6466,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
};

// Pobieranie ikony PNG dla Androida na podstawie kategorii AQI
const getAqiIcon = (cat: string) => {
    if (cat.includes('BARDZO DOBR') || cat.includes('VERY_LOW') || cat.includes('GREAT') || cat.includes('WELL')) return require('../../assets/images/markers/marker_aqi_1.png');
    if (cat.includes('DOBR') || cat.includes('LOW')) return require('../../assets/images/markers/marker_aqi_2.png');
    if (cat.includes('UMIARKOW') || cat.includes('MEDIUM') || cat.includes('MODERATE')) return require('../../assets/images/markers/marker_aqi_3.png');
    if (cat.includes('DOSTATECZ') || cat.includes('HIGH')) return require('../../assets/images/markers/marker_aqi_4.png');
    if (cat.includes('BARDZO ZŁ') || cat.includes('VERY_HIGH')) return require('../../assets/images/markers/marker_aqi_5.png');
    if (cat.includes('SKRAJN') || cat.includes('EXTREME') || cat.includes('ZŁ')) return require('../../assets/images/markers/marker_aqi_6.png');
    return require('../../assets/images/markers/marker_aqi_1.png');
};

const markerStyles = StyleSheet.create({
    pillContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 25,
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.1)',
        // maxWidth zapobiega wychodzeniu markera poza ekran przy krawędzi mapy
        // (przy anchor 0.5,0.5 marker musi mieścić się w połowie szerokości ekranu)
        maxWidth: 250,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
            },
            android: {
                // elevation zastąpiony borderem — elevation w markerach na Androidzie
                // może powodować clipping cienia poza granicami wrappera
                borderWidth: 1.5,
                borderColor: 'rgba(0,0,0,0.15)',
            },
        }),
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: '#fff',
        marginRight: 6,
        flexShrink: 0, // dot nigdy się nie skurczy
    },
    pillText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1E3A5F',
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_Bold' }),
        flexShrink: 1, // tekst skraca się gdy pill osiąga maxWidth
    },
});

// --- Main Component ---
export const AirQualityMap: React.FC<AirQualityMapProps> = ({
    center,
    stations,
    theme,
    onStationPress,
}) => {
    const mapViewRef = React.useRef<any>(null);
    const [tracksViewChanges, setTracksViewChanges] = React.useState(true);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setTracksViewChanges(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // Pre-filter valid coordinate points to prevent library crashes
    const validStations = React.useMemo(() => {
        const filtered = stations.filter(s => s.lat != null && s.lon != null && !isNaN(s.lat) && !isNaN(s.lon));
        return filtered;
    }, [stations]);

    // Gdy stacje się załadują, odśwież tracksViewChanges na chwilę
    // (iOS nie odświeża markerów gdy tracksViewChanges=false, a stacje mogą przyjść po 2s)
    React.useEffect(() => {
        if (validStations.length === 0) return;
        setTracksViewChanges(true);
        const timer = setTimeout(() => setTracksViewChanges(false), 800);
        return () => clearTimeout(timer);
    }, [validStations.length]);

    if (Platform.OS === 'android') {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }]}>
                <Text style={{ fontSize: 40 }}>🗺️</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginTop: 12 }}>Mapa niedostępna</Text>
                <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>Mapa na Androidzie wymaga aktualizacji aplikacji ze sklepu Play.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapViewClustering
                ref={mapViewRef}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={{
                    ...DEFAULT_REGION,
                    latitude: center.lat,
                    longitude: center.lon,
                }}
                clusterColor="#1E3A5F"
                radius={50}
                extent={512}
                nodeSize={Platform.OS === 'android' ? 128 : 64}
                animationEnabled={Platform.OS !== 'android'}
                clusterTextColor="#fff"
                renderCluster={(cluster: any) => {
                    const { id, geometry, properties } = cluster;
                    const points = properties.point_count;
                    return (
                        <ClusterMarker
                            key={`cluster-${id}`}
                            latitude={geometry.coordinates[1]}
                            longitude={geometry.coordinates[0]}
                            pointCount={points}
                            onPress={() => {
                                const expansionRegion = mapViewRef.current?.getClusterExpansionRegion
                                    ? mapViewRef.current.getClusterExpansionRegion(id)
                                    : null;
                                mapViewRef.current?.animateToRegion({
                                    latitude: geometry.coordinates[1],
                                    longitude: geometry.coordinates[0],
                                    latitudeDelta: expansionRegion ? expansionRegion.latitudeDelta : 0.05,
                                    longitudeDelta: expansionRegion ? expansionRegion.longitudeDelta : 0.05,
                                }, 350);
                            }}
                            color="#3B82F6"
                            tracksViewChanges={tracksViewChanges}
                        />
                    );
                }}
            >
                {validStations.map((station) => {
                    const color = aqCategoryToColor(station.index?.indexCategory || null);
                    const cityName = station.city || station.name || '';
                    const category = (station.index?.indexCategory || '').toUpperCase();

                    if (Platform.OS === 'android') {
                        return (
                            <Marker
                                key={`aq-${station.id}`}
                                coordinate={{ latitude: station.lat, longitude: station.lon }}
                                onPress={() => onStationPress(station)}
                                tracksViewChanges={tracksViewChanges}
                                anchor={{ x: 0.5, y: 0.5 }}
                                icon={getAqiIcon(category)}
                            />
                        );
                    }

                    return (
                        <Marker
                            key={`aq-${station.id}`}
                            coordinate={{ latitude: station.lat, longitude: station.lon }}
                            onPress={() => onStationPress(station)}
                            tracksViewChanges={tracksViewChanges}
                            anchor={{ x: 0.5, y: 1 }}
                        >
                            <View collapsable={false} style={markerStyles.pillContainer}>
                                <View style={[markerStyles.dot, { backgroundColor: color }]} />
                                {cityName ? (
                                    <Text numberOfLines={1} style={markerStyles.pillText}>{cityName}</Text>
                                ) : null}
                            </View>
                        </Marker>
                    );
                })}
            </MapViewClustering>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
});
