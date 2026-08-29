import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Platform, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { MevoBike, MevoStation } from '@/hooks/useEssentials';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

// Simple, fast MEVO map - Android optimized
const MEVO_MAX_BIKES = Platform.OS === 'android' ? 100 : 200;
const MEVO_MAX_STATIONS = Platform.OS === 'android' ? 50 : 100;

// Custom marker components - simple, no memoization for reliability
const BikeMarker = ({ coordinate, onPress }: { coordinate: { latitude: number, longitude: number }, onPress: () => void }) => {
    const markerSize = Platform.OS === 'android' ? 28 : 30;

    return (
        <Marker coordinate={coordinate} onPress={onPress} tracksViewChanges={false}>
            <View style={[styles.bikeMarker, { width: markerSize, height: markerSize }]}>
                <MaterialCommunityIcons name="bike" size={16} color="#fff" />
            </View>
        </Marker>
    );
};

const StationMarker = ({ coordinate, available, onPress }: { coordinate: { latitude: number, longitude: number }, available: number, onPress: () => void }) => {
    const markerSize = Platform.OS === 'android' ? 32 : 34;
    const color = available > 5 ? '#10B981' : available > 0 ? '#F59E0B' : '#EF4444';

    return (
        <Marker coordinate={coordinate} onPress={onPress} tracksViewChanges={false}>
            <View style={[styles.stationMarker, { width: markerSize, height: markerSize, backgroundColor: color }]}>
                <MaterialCommunityIcons name="bike-fast" size={18} color="#fff" />
                {available > 0 && (
                    <View style={styles.availableBadge}>
                        <Text style={styles.availableText}>{available}</Text>
                    </View>
                )}
            </View>
        </Marker>
    );
};

interface MevoMapProps {
    bikes: MevoBike[];
    stations: MevoStation[];
    loading?: boolean;
}

export const MevoMap: React.FC<MevoMapProps> = ({ bikes, stations, loading }) => {
    const mapRef = useRef<MapView>(null);
    const router = useRouter();
    const [selectedItem, setSelectedItem] = useState<{ type: 'bike' | 'station'; data: any } | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [region, setRegion] = useState<Region>({
        latitude: 54.3520,
        longitude: 18.6466,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1
    });

    usePerformanceMonitor('MevoMap');

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const userLoc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                setUserLocation(userLoc);
                setRegion({ ...userLoc, latitudeDelta: 0.05, longitudeDelta: 0.05 });
                mapRef.current?.animateToRegion({ ...userLoc, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 500);
            }
        })();
    }, []);

    const handleRegionChangeComplete = (newRegion: Region) => {
        const threshold = Platform.OS === 'android' ? 0.005 : 0.002;
        const diff = Math.abs(newRegion.latitude - region.latitude) + Math.abs(newRegion.longitude - region.longitude);

        if (diff > threshold) {
            setRegion(newRegion);
        }
    };

    // Simple viewport filtering - no complex logic
    const visibleItems = React.useMemo(() => {
        const R_LAT = region.latitude;
        const R_LON = region.longitude;
        const R_DLAT = region.latitudeDelta * 1.1;
        const R_DLON = region.longitudeDelta * 1.1;

        const visibleStations = stations
            .filter(s => Math.abs(s.lat - R_LAT) <= R_DLAT && Math.abs(s.lon - R_LON) <= R_DLON)
            .slice(0, MEVO_MAX_STATIONS);

        const visibleBikes = bikes
            .filter(b => b.lat && b.lon && Math.abs(b.lat - R_LAT) <= R_DLAT && Math.abs(b.lon - R_LON) <= R_DLON)
            .slice(0, MEVO_MAX_BIKES);

        console.log(`[MevoMap] Rendering ${visibleStations.length} stations, ${visibleBikes.length} bikes`);

        return { stations: visibleStations, bikes: visibleBikes };
    }, [bikes, stations, region.latitude, region.longitude, region.latitudeDelta]);

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={region}
                onRegionChangeComplete={handleRegionChangeComplete}
                showsUserLocation
                showsPointsOfInterest={false}
                moveOnMarkerPress={false}
            >
                {/* Render stations */}
                {visibleItems.stations.map((s, idx) => {
                    console.log(`[MevoMap] Rendering station ${idx}: ${s.name} at ${s.lat}, ${s.lon}`);
                    return (
                        <StationMarker
                            key={`station-${s.station_id}`}
                            coordinate={{ latitude: s.lat, longitude: s.lon }}
                            available={s.num_bikes_available}
                            onPress={() => setSelectedItem({ type: 'station', data: s })}
                        />
                    );
                })}

                {/* Render bikes */}
                {visibleItems.bikes.map((b, idx) => {
                    console.log(`[MevoMap] Rendering bike ${idx} at ${b.lat}, ${b.lon}`);
                    return (
                        <BikeMarker
                            key={`bike-${b.bike_id}`}
                            coordinate={{ latitude: b.lat, longitude: b.lon }}
                            onPress={() => setSelectedItem({ type: 'bike', data: b })}
                        />
                    );
                })}
            </MapView>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Rowery Mevo</Text>
                    <Text style={styles.headerSub}>Stacje i dostępne rowery</Text>
                </View>
            </View>

            {/* Stats Card */}
            <View style={styles.statsCard}>
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="bike-fast" size={20} color="#10B981" />
                    <Text style={styles.statLabel}>Stacje</Text>
                    <Text style={styles.statValue}>{visibleItems.stations.length}</Text>
                </View>
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="bike" size={20} color="#dc2626" />
                    <Text style={styles.statLabel}>Rowery</Text>
                    <Text style={styles.statValue}>{visibleItems.bikes.length}</Text>
                </View>
            </View>

            {loading && (
                <View style={styles.loadingToast}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.loadingText}>Ładowanie danych...</Text>
                </View>
            )}

            {/* Simple detail modal */}
            {selectedItem && (
                <View style={styles.detailCard}>
                    <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.closeBtn}>
                        <Ionicons name="close-circle" size={28} color="#94A3B8" />
                    </TouchableOpacity>

                    <Text style={styles.detailTitle}>
                        {selectedItem.type === 'station' ? selectedItem.data.name : 'Rower Mevo'}
                    </Text>

                    {selectedItem.type === 'station' ? (
                        <>
                            <Text style={styles.detailText}>Dostępne rowery: {selectedItem.data.num_bikes_available}</Text>
                            <Text style={styles.detailText}>Wolne miejsca: {selectedItem.data.num_docks_available}</Text>
                            {selectedItem.data.address && <Text style={styles.detailSubtext}>{selectedItem.data.address}</Text>}
                        </>
                    ) : (
                        <>
                            <Text style={styles.detailText}>
                                {selectedItem.data.vehicle_type_id === 'bike_electric' ? 'Rower elektryczny' : 'Rower miejski'}
                            </Text>
                            {selectedItem.data.battery_level && (
                                <Text style={styles.detailText}>Bateria: {selectedItem.data.battery_level}%</Text>
                            )}
                        </>
                    )}
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
    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    headerSub: {
        fontSize: 12,
        color: '#64748B',
    },
    statsCard: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 90,
        left: 20,
        right: 20,
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 2,
    },
    bikeMarker: {
        backgroundColor: '#dc2626',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    stationMarker: {
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    availableBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#1E293B',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff',
    },
    availableText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    loadingToast: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 200 : 170,
        alignSelf: 'center',
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginLeft: 8,
        fontSize: 14,
    },
    detailCard: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    closeBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    detailTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
        paddingRight: 32,
    },
    detailText: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 4,
    },
    detailSubtext: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 4,
    },
});
