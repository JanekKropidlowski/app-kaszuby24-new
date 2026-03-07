import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
  Linking,
  Pressable,
  Modal,
} from 'react-native';
import MapViewClustering from 'react-native-map-clustering';
import { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ClusterMarker } from './ClusterMarker';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MevoBike {
  bike_id: string;
  lat: number;
  lon: number;
  battery_level?: number;
  is_reserved?: boolean;
  is_disabled?: boolean;
  vehicle_type_id?: string;
}

export interface MevoStation {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  capacity: number;
  num_bikes_available: number;
  num_docks_available: number;
}

export type MevoFilterType = 'ALL' | 'BIKES' | 'STATIONS';

interface MevoMap2Props {
  bikes?: MevoBike[];
  stations?: MevoStation[];
  initialRegion?: Region;
  onBack?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_REGION: Region = {
  latitude: 54.372,
  longitude: 18.638,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

const MEVO_RED = '#DC2626';
const STATION_GREEN = '#10B981';
const CLUSTER_RADIUS = 40; // Smaller radius for more compact clustering

const getBikeAvailColor = (available: number): string => {
  if (available > 5) return '#10B981';
  if (available > 0) return '#F59E0B';
  return '#EF4444';
};


// ─── Dynamic marker sizes ────────────────────────────────────────────────────

const DYN_SIZE = Platform.OS === 'android' ? 26 : 32;
const DYN_ICON = Platform.OS === 'android' ? 12 : 16;
const ST_SIZE = Platform.OS === 'android' ? 30 : 36;
const ST_ICON = Platform.OS === 'android' ? 14 : 18;

const dynBase: import('react-native').ViewStyle = {
  justifyContent: 'center',
  alignItems: 'center',
  ...(Platform.OS === 'ios'
    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 }
    : { elevation: 3 }),
};

// Badge dla stacji (poza StyleSheet — używany wewnątrz Markera)
const BADGE_STYLE: import('react-native').ViewStyle = {
  position: 'absolute',
  top: -5,
  right: -5,
  backgroundColor: '#1F2937',
  borderRadius: 10,
  minWidth: 18,
  height: 18,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1.5,
  borderColor: '#fff',
  paddingHorizontal: 2,
};

const BADGE_TXT: import('react-native').TextStyle = {
  color: '#fff',
  fontSize: 9,
  fontFamily: 'Poppins_Bold',
};

const MA_BIKE = require('../../assets/images/markers/marker_mevo_bike.png');
const getAndroidStationIcon = (avail: number) => {
  if (avail > 30) return require('../../assets/images/markers/marker_mevo_station_30p.png');
  switch (avail) {
    case 0: return require('../../assets/images/markers/marker_mevo_station_0.png');
    case 1: return require('../../assets/images/markers/marker_mevo_station_1.png');
    case 2: return require('../../assets/images/markers/marker_mevo_station_2.png');
    case 3: return require('../../assets/images/markers/marker_mevo_station_3.png');
    case 4: return require('../../assets/images/markers/marker_mevo_station_4.png');
    case 5: return require('../../assets/images/markers/marker_mevo_station_5.png');
    case 6: return require('../../assets/images/markers/marker_mevo_station_6.png');
    case 7: return require('../../assets/images/markers/marker_mevo_station_7.png');
    case 8: return require('../../assets/images/markers/marker_mevo_station_8.png');
    case 9: return require('../../assets/images/markers/marker_mevo_station_9.png');
    case 10: return require('../../assets/images/markers/marker_mevo_station_10.png');
    case 11: return require('../../assets/images/markers/marker_mevo_station_11.png');
    case 12: return require('../../assets/images/markers/marker_mevo_station_12.png');
    case 13: return require('../../assets/images/markers/marker_mevo_station_13.png');
    case 14: return require('../../assets/images/markers/marker_mevo_station_14.png');
    case 15: return require('../../assets/images/markers/marker_mevo_station_15.png');
    case 16: return require('../../assets/images/markers/marker_mevo_station_16.png');
    case 17: return require('../../assets/images/markers/marker_mevo_station_17.png');
    case 18: return require('../../assets/images/markers/marker_mevo_station_18.png');
    case 19: return require('../../assets/images/markers/marker_mevo_station_19.png');
    case 20: return require('../../assets/images/markers/marker_mevo_station_20.png');
    case 21: return require('../../assets/images/markers/marker_mevo_station_21.png');
    case 22: return require('../../assets/images/markers/marker_mevo_station_22.png');
    case 23: return require('../../assets/images/markers/marker_mevo_station_23.png');
    case 24: return require('../../assets/images/markers/marker_mevo_station_24.png');
    case 25: return require('../../assets/images/markers/marker_mevo_station_25.png');
    case 26: return require('../../assets/images/markers/marker_mevo_station_26.png');
    case 27: return require('../../assets/images/markers/marker_mevo_station_27.png');
    case 28: return require('../../assets/images/markers/marker_mevo_station_28.png');
    case 29: return require('../../assets/images/markers/marker_mevo_station_29.png');
    case 30: return require('../../assets/images/markers/marker_mevo_station_30.png');
    default: return require('../../assets/images/markers/marker_mevo_station_0.png');
  }
};

// ─── Component ───────────────────────────────────────────────────────────────

export const MevoMap2: React.FC<MevoMap2Props> = ({
  bikes = [],
  stations = [],
  initialRegion = DEFAULT_REGION,
  onBack,
  onRefresh,
  loading = false,
}) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);

  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  // Android: true na starcie → Android poprawnie mierzy marker przed zamrożeniem bitmapy
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracksViewChanges(false), 2500);
    return () => clearTimeout(t);
  }, []);

  const headerTop = insets.top + (Platform.OS === 'android' ? 6 : 2);

  // ─── Punkty aktywnego filtra ─────────────────────────────────────────────

  const activePoints = useMemo(() => {
    const pts: any[] = [];

    bikes.forEach(bike => {
      const lat = typeof bike.lat === 'string' ? parseFloat(bike.lat as any) : bike.lat;
      const lon = typeof bike.lon === 'string' ? parseFloat(bike.lon as any) : bike.lon;
      if (!lat || !lon || isNaN(lat) || isNaN(lon) || bike.is_disabled) return;
      pts.push({
        id: bike.bike_id,
        latitude: lat,
        longitude: lon,
        type: 'BIKE',
        battery_level: bike.battery_level,
        is_reserved: bike.is_reserved,
        vehicle_type_id: bike.vehicle_type_id,
      });
    });

    stations.forEach(station => {
      const lat = typeof station.lat === 'string' ? parseFloat(station.lat as any) : station.lat;
      const lon = typeof station.lon === 'string' ? parseFloat(station.lon as any) : station.lon;
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) return;
      pts.push({
        id: station.station_id,
        latitude: lat,
        longitude: lon,
        type: 'STATION',
        name: station.name,
        address: station.address,
        capacity: station.capacity,
        num_bikes_available: station.num_bikes_available,
        num_docks_available: station.num_docks_available,
      });
    });

    return pts;
  }, [bikes, stations]);

  const activeColor = MEVO_RED;

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleMarkerPress = useCallback((point: any) => {
    setSelectedPoint(point);
    if (mapRef.current) {
      mapRef.current?.animateToRegion({
        latitude: point.latitude,
        longitude: point.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012
      }, 350);
    }
  }, []);

  const handleNavigate = useCallback((lat: number, lon: number) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}`,
    });
    if (url) Linking.openURL(url);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* MAPA */}
      <MapViewClustering
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        radius={CLUSTER_RADIUS}
        clusterColor={activeColor}
        clusterTextColor="#fff"
        extent={512}
        nodeSize={Platform.OS === 'android' ? 128 : 64}
        animationEnabled={Platform.OS !== 'android'}
        renderCluster={(cluster: any) => {
          const { id, geometry, properties } = cluster;
          const points = properties.point_count;
          const clusterId = `cluster-${id}`;
          return (
            <ClusterMarker
              key={clusterId}
              latitude={geometry.coordinates[1]}
              longitude={geometry.coordinates[0]}
              pointCount={points}
              onPress={() => {
                const expansionRegion = (mapRef.current as any)?.getClusterExpansionRegion
                  ? (mapRef.current as any).getClusterExpansionRegion(id)
                  : null;
                const lat = geometry.coordinates[1];
                const lon = geometry.coordinates[0];
                mapRef.current?.animateToRegion({
                  latitude: lat,
                  longitude: lon,
                  latitudeDelta: expansionRegion ? expansionRegion.latitudeDelta : 0.05,
                  longitudeDelta: expansionRegion ? expansionRegion.longitudeDelta : 0.05,
                }, 350);
              }}
              color={activeColor}
              tracksViewChanges={tracksViewChanges}
            />
          );
        }}
      >
        {activePoints.map((point) => {
          const isBike = point.type === 'BIKE';
          const latitude = point.latitude;
          const longitude = point.longitude;

          if (isBike) {
            if (Platform.OS === 'android') {
              return (
                <Marker
                  key={`pt-${point.id}`}
                  coordinate={{ latitude, longitude }}
                  onPress={() => handleMarkerPress(point)}
                  tracksViewChanges={tracksViewChanges}
                  anchor={{ x: 0.5, y: 0.5 }}
                  icon={MA_BIKE}
                />
              );
            }
            return (
              <Marker
                key={`pt-${point.id}`}
                coordinate={{ latitude, longitude }}
                onPress={() => handleMarkerPress(point)}
                tracksViewChanges={tracksViewChanges}
                opacity={point.is_reserved ? 0.55 : 1}
              >
                <View collapsable={false} style={{ padding: 6, backgroundColor: 'transparent' }}>
                  <View collapsable={false} style={[dynBase, { width: DYN_SIZE, height: DYN_SIZE, borderRadius: DYN_SIZE / 2, backgroundColor: MEVO_RED }]}>
                    <MaterialCommunityIcons name="bike-fast" size={DYN_ICON} color="#fff" />
                  </View>
                </View>
              </Marker>
            );
          }

          // STATION
          const avail = point.num_bikes_available || 0;
          if (Platform.OS === 'android') {
            return (
              <Marker
                key={`pt-${point.id}`}
                coordinate={{ latitude, longitude }}
                onPress={() => handleMarkerPress(point)}
                tracksViewChanges={tracksViewChanges}
                anchor={{ x: 0.5, y: 0.5 }}
                icon={getAndroidStationIcon(avail)}
              />
            );
          }

          const color = getBikeAvailColor(avail);
          return (
            <Marker
              key={`pt-${point.id}`}
              coordinate={{ latitude, longitude }}
              onPress={() => handleMarkerPress(point)}
              tracksViewChanges={tracksViewChanges}
            >
              <View collapsable={false} style={{ padding: 6, backgroundColor: 'transparent' }}>
                <View collapsable={false} style={[dynBase, { width: ST_SIZE, height: ST_SIZE, borderRadius: ST_SIZE / 2, backgroundColor: color }]}>
                  <MaterialCommunityIcons name="bike-fast" size={ST_ICON} color="#fff" />
                  {avail > 0 && (
                    <View style={BADGE_STYLE}>
                      <Text style={BADGE_TXT}>{avail}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Marker>
          );
        })}
      </MapViewClustering>

      {/* ── HEADER — stary styl ── */}
      <View style={[styles.header, { top: headerTop }]}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
        )}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Rowery Mevo</Text>
          <Text style={styles.headerSub}>System roweru metropolitalnego</Text>
        </View>
        {onRefresh ? (
          <Pressable
            style={[styles.headerBtn, { backgroundColor: MEVO_RED }, loading && { opacity: 0.6 }]}
            onPress={onRefresh}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="refresh" size={20} color="#fff" />
            }
          </Pressable>
        ) : null}
      </View>

      {/* ── LOADING TOAST ── */}
      {loading && !onRefresh && (
        <View style={[styles.loadingToast, { top: headerTop + 60 }]}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.loadingToastText}>Ładowanie…</Text>
        </View>
      )}

      {/* ── MODAL SZCZEGÓŁÓW — stary styl bottom sheet ── */}
      <Modal visible={!!selectedPoint} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelectedPoint(null)} />
          {selectedPoint && (() => {
            const categoryLabel = selectedPoint.type === 'STATION'
              ? 'STACJA ROWEROWA'
              : selectedPoint.vehicle_type_id === 'bike_electric' ? 'ROWER ELEKTRYCZNY' : 'ROWER MIEJSKI';
            const title = selectedPoint.type === 'STATION'
              ? (selectedPoint.name || 'Stacja')
              : selectedPoint.vehicle_type_id === 'bike_electric' ? 'Rower elektryczny' : 'Rower miejski';
            return (
              <View style={styles.modalContent}>
                <View style={styles.dragIndicator} />
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>{categoryLabel}</Text>
                    <Text style={styles.modalTitle} numberOfLines={2}>{title}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedPoint(null)} style={styles.closeBtn}>
                    <Ionicons name="close-circle" size={32} color="#D1D5DB" />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                  {/* Adres stacji */}
                  {selectedPoint.type === 'STATION' && selectedPoint.address ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="location" size={24} color="#3B82F6" style={{ marginRight: 15 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoTextPrimary}>{selectedPoint.address}</Text>
                      </View>
                    </View>
                  ) : null}

                  {/* PROWADŹ */}
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                      onPress={() => handleNavigate(selectedPoint.latitude, selectedPoint.longitude)}
                    >
                      <Ionicons name="map" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>PROWADŹ</Text>
                    </Pressable>
                  </View>

                  {/* Status pojazdu / stacji */}
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Status Pojazdu / Stacji</Text>
                    <View style={styles.mevoDetailCard}>
                      {selectedPoint.type === 'STATION' ? (
                        <>
                          <View style={styles.mevoDetailRow}>
                            <MaterialCommunityIcons name="bike" size={24} color={MEVO_RED} />
                            <View>
                              <Text style={styles.mevoDetailLabel}>Dostępne Rowery</Text>
                              <Text style={[styles.mevoDetailValue, { color: getBikeAvailColor(selectedPoint.num_bikes_available || 0) }]}>
                                {selectedPoint.num_bikes_available || 0}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.mevoDetailRow}>
                            <MaterialCommunityIcons name="parking" size={24} color="#3B82F6" />
                            <View>
                              <Text style={styles.mevoDetailLabel}>Wolne Miejsca</Text>
                              <Text style={styles.mevoDetailValue}>{selectedPoint.num_docks_available || 0}</Text>
                            </View>
                          </View>
                          <View style={styles.mevoDetailRow}>
                            <MaterialCommunityIcons name="office-building-marker" size={24} color="#6B7280" />
                            <View>
                              <Text style={styles.mevoDetailLabel}>Liczba Stojaków</Text>
                              <Text style={styles.mevoDetailValue}>{selectedPoint.capacity || 0}</Text>
                            </View>
                          </View>
                        </>
                      ) : selectedPoint.battery_level !== undefined && selectedPoint.battery_level > 0 ? (
                        <View style={styles.mevoDetailRow}>
                          <MaterialCommunityIcons
                            name="battery-high"
                            size={24}
                            color={selectedPoint.battery_level > 20 ? '#10B981' : '#EF4444'}
                          />
                          <View>
                            <Text style={styles.mevoDetailLabel}>Poziom Baterii</Text>
                            <Text style={styles.mevoDetailValue}>{selectedPoint.battery_level}%</Text>
                          </View>
                        </View>
                      ) : null}
                      {selectedPoint.is_reserved ? (
                        <View style={styles.mevoDetailRow}>
                          <Ionicons name="lock-closed" size={24} color="#F59E0B" />
                          <View>
                            <Text style={styles.mevoDetailLabel}>Status</Text>
                            <Text style={[styles.mevoDetailValue, { color: '#F59E0B' }]}>Zarezerwowany</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={{ height: 50 }} />
                </ScrollView>
              </View>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // ── Header — stary styl ──
  header: { position: 'absolute', left: 16, right: 16, backgroundColor: '#fff', borderRadius: 24, padding: 12, flexDirection: 'row', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  headerSub: { fontSize: 11, color: '#6B7280', fontWeight: 'bold' },

  // ── Loading toast ──
  loadingToast: { position: 'absolute', alignSelf: 'center', backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingToastText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // ── Modal — stary styl bottom sheet ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, maxHeight: '85%' },
  dragIndicator: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalLabel: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  closeBtn: { padding: 4 },
  modalScroll: { flexGrow: 1 },
  modalScrollContent: { paddingBottom: 20 },

  // ── Info row ──
  infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 20, marginBottom: 20 },
  infoTextPrimary: { fontSize: 16, fontWeight: '800', color: '#111827' },

  // ── Akcje ──
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
  actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  // ── Status Pojazdu / Stacji ──
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 12 },
  mevoDetailCard: { backgroundColor: '#F9FAFB', borderRadius: 20, padding: 16, gap: 16 },
  mevoDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  mevoDetailLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  mevoDetailValue: { fontSize: 22, fontWeight: '900', color: '#111827' },
});
