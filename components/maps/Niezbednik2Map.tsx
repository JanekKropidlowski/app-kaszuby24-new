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
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMapClustering, MapPoint } from './hooks/useMapClustering';
import { ClusterMarker } from './ClusterMarker';
import { SorService, SorQueueItem } from '@/services/sor';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Hospital {
  id_gsl_miej?: string;
  nazwa_swd?: string;
  adr_lok_ulica?: string;
  telefon_rej?: string;
  numer_ksiegi?: string;
  lat: number | null;
  lng: number | null;
  type?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  lat: number;
  lon: number;
  is24h?: boolean;
  opening_hours?: string;
}

export interface AED {
  id?: string;
  name?: string;
  address?: string;
  lat: number;
  lon: number;
  description?: string;
  location?: string;
  phone?: string;
  operator?: string;
  opening_hours?: string;
  access?: string;
  indoor?: string;
  level?: string;
  floor?: string;
  room?: string;
  model?: string;
  email?: string;
  website?: string;
  note?: string;
}

export interface NearbyMevoStation {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  num_bikes_available: number;
}

export type FilterType = 'HOSPITAL' | 'PHARMACY' | 'AED';

interface Niezbednik2MapProps {
  hospitals?: Hospital[];
  pharmacies?: Pharmacy[];
  aedPoints?: AED[];
  mevoStations?: NearbyMevoStation[];
  initialRegion?: Region;
  onBack?: () => void;
  loading?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_REGION: Region = {
  latitude: 54.372,
  longitude: 18.638,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

const TYPE_COLOR: Record<FilterType, string> = {
  HOSPITAL: '#EF4444',
  PHARMACY: '#10B981',
  AED: '#F59E0B',
};

const TYPE_BG: Record<FilterType, string> = {
  HOSPITAL: '#FEF2F2',
  PHARMACY: '#ECFDF5',
  AED: '#FFFBEB',
};

const CLUSTER_RADIUS = Platform.OS === 'android' ? 50 : 50;

// ─── AED helpers (kolor wg dostępu — jak w SorMap) ─────────────────────────────

const getAedColor = (access?: string, indoor?: string): string => {
  const acc = (access || '').toLowerCase();
  if (acc === 'yes' || acc === 'permissive' || acc === 'public') return '#10B981';
  if (acc === 'customers') return '#3B82F6';
  if (acc === 'private' || acc === 'no') return '#EF4444';
  if (indoor === 'yes') return '#F59E0B';
  return '#10B981';
};

const getAccessLabel = (access?: string): string => {
  const acc = (access || '').toLowerCase();
  if (acc === 'yes' || acc === 'public') return 'Publiczny';
  if (acc === 'permissive') return 'Dozwolony';
  if (acc === 'customers') return 'Dla klientów';
  if (acc === 'private') return 'Prywatny';
  if (acc === 'no') return 'Brak dostępu';
  return acc || 'Publiczny';
};

// ─── Dynamic marker base (shared by AED + Pharmacy) ────────────────────────────

const DYN_SIZE = Platform.OS === 'android' ? 26 : 32;
const DYN_ICON = Platform.OS === 'android' ? 12 : 16;

const DBG = {};

const dynMarkerBase: import('react-native').ViewStyle = {
  width: DYN_SIZE,
  height: DYN_SIZE,
  borderRadius: DYN_SIZE / 2,
  justifyContent: 'center',
  alignItems: 'center',
  ...(Platform.OS === 'ios'
    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 }
    : { elevation: 3 }),
};

// ─── PointMarker (szpitale) — MaterialCommunityIcons zamiast SVG ──────────────
// SVG w markerach na Android jest problematyczne (renderowanie asynchroniczne),
// collapsable={false} zapobiega usunięciu transparentnego wrappera przez Android

interface PointMarkerProps {
  point: MapPoint;
  latitude: number;
  longitude: number;
  onPress: (point: MapPoint) => void;
  tracksViewChanges: boolean;
}

const PointMarker = React.memo<PointMarkerProps>(
  ({ point, latitude, longitude, onPress, tracksViewChanges }) => (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={() => onPress(point)}
      tracksViewChanges={tracksViewChanges}
    >
      <View collapsable={false} style={[{ padding: 6, backgroundColor: 'transparent' }, DBG]}>
        <View
          collapsable={false}
          style={[dynMarkerBase, { backgroundColor: TYPE_COLOR[point.type as FilterType] ?? '#EF4444' }]}
        >
          <MaterialCommunityIcons name="hospital-building" size={DYN_ICON} color="#fff" />
        </View>
      </View>
    </Marker>
  ),
  (prev, next) =>
    prev.latitude === next.latitude &&
    prev.longitude === next.longitude &&
    prev.point.id === next.point.id &&
    prev.tracksViewChanges === next.tracksViewChanges &&
    prev.onPress === next.onPress,
);

// AED — kolorowy kółko wg access/indoor
const AedPointMarker = React.memo<PointMarkerProps>(
  ({ point, latitude, longitude, onPress, tracksViewChanges }) => (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={() => onPress(point)}
      tracksViewChanges={tracksViewChanges}
    >
      <View collapsable={false} style={[{ padding: 6, backgroundColor: 'transparent' }, DBG]}>
        <View collapsable={false} style={[dynMarkerBase, { backgroundColor: getAedColor(point.access, point.indoor) }]}>
          <MaterialCommunityIcons name="heart-flash" size={DYN_ICON} color="#fff" />
        </View>
      </View>
    </Marker>
  ),
  (prev, next) =>
    prev.latitude === next.latitude &&
    prev.longitude === next.longitude &&
    prev.point.id === next.point.id &&
    prev.point.access === next.point.access &&
    prev.tracksViewChanges === next.tracksViewChanges &&
    prev.onPress === next.onPress,
);

// Apteka — ciemna z księżycem (24h) lub fioletowa z pigułką
const PharmacyPointMarker = React.memo<PointMarkerProps>(
  ({ point, latitude, longitude, onPress, tracksViewChanges }) => (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={() => onPress(point)}
      tracksViewChanges={tracksViewChanges}
    >
      <View collapsable={false} style={[{ padding: 6, backgroundColor: 'transparent' }, DBG]}>
        <View collapsable={false} style={[dynMarkerBase, { backgroundColor: point.is24h ? '#1E293B' : '#8B5CF6' }]}>
          {point.is24h
            ? <MaterialCommunityIcons name="weather-night" size={DYN_ICON} color="#FACC15" />
            : <MaterialCommunityIcons name="pill" size={DYN_ICON - 2} color="#fff" />
          }
        </View>
      </View>
    </Marker>
  ),
  (prev, next) =>
    prev.latitude === next.latitude &&
    prev.longitude === next.longitude &&
    prev.point.id === next.point.id &&
    prev.point.is24h === next.point.is24h &&
    prev.tracksViewChanges === next.tracksViewChanges &&
    prev.onPress === next.onPress,
);

// ─── Distance helpers ──────────────────────────────────────────────────────────

// Bezpieczne otwieranie linków — normalizuje URL i łapie błędy
const safeOpenURL = (url: string) => {
  let normalized = url.trim();
  if (normalized && !/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  Linking.openURL(normalized).catch(() => {/* ignoruj błędy otwarcia URL */ });
};

const distKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDist = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
};

// ─── Component ─────────────────────────────────────────────────────────────────

export const Niezbednik2Map: React.FC<Niezbednik2MapProps> = ({
  hospitals = [],
  pharmacies = [],
  aedPoints = [],
  mevoStations = [],
  initialRegion = DEFAULT_REGION,
  onBack,
  loading = false,
}) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>(initialRegion);
  const [activeFilter, setActiveFilter] = useState<FilterType>('HOSPITAL');
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [sorQueue, setSorQueue] = useState<SorQueueItem[] | null>(null);
  const [sorQueueLoading, setSorQueueLoading] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Android: true na starcie → Android poprawnie mierzy marker przed zamrożeniem bitmapy
  // Po 2.5s przechodzi na false (zamraża bitmapę) → oszczędność CPU przy pan/zoom
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracksViewChanges(false), 2500);
    return () => clearTimeout(t);
  }, []);

  // Tab bar height to keep content above it
  const TAB_H = Platform.OS === 'ios' ? 110 + insets.bottom : 80 + insets.bottom;
  // Header top
  const headerTop = insets.top + (Platform.OS === 'android' ? 6 : 2);

  // ─── User location ────────────────────────────────────────────────────────

  const handleUserLocationChange = useCallback((e: any) => {
    const coord = e?.nativeEvent?.coordinate;
    if (coord) setUserLoc({ lat: coord.latitude, lon: coord.longitude });
  }, []);

  // ─── Region update — fires during AND after animation (fix iOS disappear) ─

  const handleRegionChange = useCallback((_r: Region) => {
    // Aktualizacja tylko na complete, aby nie wyzwalać zbyt często klastrowania
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRegionChangeComplete = useCallback((r: Region) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setRegion({ ...r }); }, 150);
  }, []);

  // ─── SOR kolejki (live) ───────────────────────────────────────────────────

  useEffect(() => {
    setSorQueue(null);
    setSorQueueLoading(false);
    if (!selectedPoint?.numer_ksiegi) return;

    let cancelled = false;
    setSorQueueLoading(true);
    SorService.fetchQueueTimes(selectedPoint.numer_ksiegi)
      .then(data => { if (!cancelled) setSorQueue(data?.data ?? null); })
      .finally(() => { if (!cancelled) setSorQueueLoading(false); });

    return () => { cancelled = true; };
  }, [selectedPoint?.id]);

  // ─── Active points ────────────────────────────────────────────────────────

  const activePoints = useMemo<MapPoint[]>(() => {
    switch (activeFilter) {
      case 'HOSPITAL':
        return hospitals.flatMap<MapPoint>((h) => {
          const lat = typeof h.lat === 'string' ? parseFloat(h.lat) : h.lat;
          const lng = typeof h.lng === 'string' ? parseFloat(h.lng) : h.lng;
          if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return [];
          return [{
            id: h.id_gsl_miej || `h-${lat}-${lng}`,
            latitude: lat, longitude: lng, type: 'HOSPITAL',
            name: h.nazwa_swd || 'Szpital',
            address: h.adr_lok_ulica, phone: h.telefon_rej,
            numer_ksiegi: h.numer_ksiegi,
          }];
        });

      case 'PHARMACY':
        return pharmacies.flatMap<MapPoint>((p) => {
          const lat = typeof p.lat === 'string' ? parseFloat(p.lat) : p.lat;
          const lon = typeof p.lon === 'string' ? parseFloat(p.lon) : p.lon;
          if (!lat || !lon || isNaN(lat) || isNaN(lon)) return [];
          return [{
            id: p.id, latitude: lat, longitude: lon, type: 'PHARMACY',
            name: p.name, address: p.address, phone: p.phone, is24h: p.is24h,
            opening_hours: p.opening_hours,
          }];
        });

      case 'AED':
        return aedPoints.flatMap<MapPoint>((a) => {
          const lat = typeof a.lat === 'string' ? parseFloat(a.lat) : a.lat;
          const lon = typeof a.lon === 'string' ? parseFloat(a.lon) : a.lon;
          if (!lat || !lon || isNaN(lat) || isNaN(lon)) return [];
          return [{
            id: a.id || `aed-${lat}-${lon}`,
            latitude: lat, longitude: lon, type: 'AED',
            name: 'AED',
            description: a.location || a.description,
            phone: a.phone,
            operator: a.operator,
            opening_hours: a.opening_hours,
            access: a.access,
            indoor: a.indoor,
            level: a.level,
            floor: a.floor,
            room: a.room,
            defibrillator_brand: (a as any)['defibrillator:brand'],
            model: a.model,
            email: a.email,
            website: a.website,
            note: a.note,
          }];
        });

      default: return [];
    }
  }, [hospitals, pharmacies, aedPoints, activeFilter]);

  // ─── Clustering ───────────────────────────────────────────────────────────

  const { clusters, getClusterExpansionRegion } = useMapClustering({
    points: activePoints,
    region,
    radius: CLUSTER_RADIUS,
    maxZoom: 18,
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleNavigate = useCallback((lat: number, lon: number) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}`,
    });
    if (url) Linking.openURL(url);
  }, []);

  const handleClusterPress = useCallback((clusterId: number) => {
    const exp = getClusterExpansionRegion(clusterId);
    if (exp && mapRef.current) mapRef.current.animateToRegion(exp, 350);
  }, [getClusterExpansionRegion]);

  const handleMarkerPress = useCallback((point: MapPoint) => {
    setSelectedPoint(point);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* MAP */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        onUserLocationChange={handleUserLocationChange}
        showsUserLocation
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        moveOnMarkerPress={false}
      >
        {clusters.map((feature) => {
          const { cluster, point_count, cluster_id } = feature.properties;
          const [longitude, latitude] = feature.geometry.coordinates;

          if (cluster) {
            return (
              <ClusterMarker
                key={`cl-${cluster_id}`}
                latitude={latitude}
                longitude={longitude}
                pointCount={point_count || 0}
                onPress={() => handleClusterPress(cluster_id!)}
                color={TYPE_COLOR[activeFilter]}
                tracksViewChanges={tracksViewChanges}
              />
            );
          }

          const point = feature.properties as any as MapPoint;
          if (point.type === 'AED') {
            return (
              <AedPointMarker
                key={`pt-${point.id}`}
                point={point}
                latitude={latitude}
                longitude={longitude}
                onPress={handleMarkerPress}
                tracksViewChanges={tracksViewChanges}
              />
            );
          }
          if (point.type === 'PHARMACY') {
            return (
              <PharmacyPointMarker
                key={`pt-${point.id}`}
                point={point}
                latitude={latitude}
                longitude={longitude}
                onPress={handleMarkerPress}
                tracksViewChanges={tracksViewChanges}
              />
            );
          }
          return (
            <PointMarker
              key={`pt-${point.id}`}
              point={point}
              latitude={latitude}
              longitude={longitude}
              onPress={handleMarkerPress}
              tracksViewChanges={tracksViewChanges}
            />
          );
        })}
      </MapView>

      {/* ── HEADER — stary styl: Niezbędnik + przycisk alarmowy ── */}
      <View style={[styles.header, { top: headerTop }]}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
        )}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Niezbędnik</Text>
          <Text style={styles.headerSub}>Szpitale i transport</Text>
        </View>
        <Pressable
          onPress={() => setShowEmergencyModal(true)}
          style={[styles.headerBtn, { backgroundColor: '#EF4444' }]}
        >
          <Ionicons name="call" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* ── LOADING TOAST ── */}
      {loading && (
        <View style={[styles.loadingToast, { top: headerTop + 60 }]}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.loadingToastText}>Ładowanie…</Text>
        </View>
      )}

      {/* ── FILTRY (dolny pasek — stary styl) ── */}
      <View style={[styles.filterWrapper, { bottom: TAB_H + 60 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {([
            { key: 'HOSPITAL' as FilterType, label: 'Szpitale', icon: 'hospital-building', ionicons: false },
            { key: 'PHARMACY' as FilterType, label: 'Apteki', icon: 'flask', ionicons: true },
            { key: 'AED' as FilterType, label: 'AED', icon: 'flash', ionicons: true },
          ] as const).map((f) => {
            const isActive = activeFilter === f.key;
            const activeColor = f.key === 'AED' ? '#10B981' : f.key === 'PHARMACY' ? '#3B82F6' : '#EF4444';
            return (
              <Pressable
                key={f.key}
                onPress={() => { setActiveFilter(f.key); setSelectedPoint(null); }}
                style={[styles.filterChip, isActive && { backgroundColor: activeColor, borderColor: 'transparent', elevation: 6 }]}
              >
                {f.ionicons
                  ? <Ionicons name={f.icon as any} size={16} color={isActive ? '#fff' : '#4B5563'} />
                  : <MaterialCommunityIcons name={f.icon as any} size={16} color={isActive ? '#fff' : '#4B5563'} />
                }
                <Text style={[styles.filterText, isActive && { color: '#fff' }]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── MODAL SZCZEGÓŁÓW — stary styl: bottom sheet ── */}
      <Modal visible={!!selectedPoint} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelectedPoint(null)} />
          {selectedPoint && (() => {
            const aedColor = selectedPoint.type === 'AED' ? getAedColor(selectedPoint.access, selectedPoint.indoor) : null;
            const categoryLabel =
              selectedPoint.type === 'HOSPITAL'
                ? (selectedPoint.numer_ksiegi ? 'SZPITALNY ODDZIAŁ RATUNKOWY' : 'SZPITAL')
                : selectedPoint.type === 'PHARMACY'
                  ? (selectedPoint.is24h ? 'APTEKA · 24H' : 'APTEKA')
                  : `AED · ${getAccessLabel(selectedPoint.access).toUpperCase()}`;
            return (
              <View style={styles.modalContent}>
                <View style={styles.dragIndicator} />
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>{categoryLabel}</Text>
                    <Text style={styles.modalTitle} numberOfLines={2}>{selectedPoint.name}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedPoint(null)} style={styles.closeBtn}>
                    <Ionicons name="close-circle" size={32} color="#D1D5DB" />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                  {/* Adres (nie dla AED) */}
                  {selectedPoint.type !== 'AED' && selectedPoint.address ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="location" size={24} color="#3B82F6" style={{ marginRight: 15 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoTextPrimary}>{selectedPoint.address}</Text>
                        {selectedPoint.type === 'PHARMACY' && selectedPoint.opening_hours
                          ? <Text style={styles.infoTextSecondary}>{selectedPoint.opening_hours}</Text>
                          : null}
                      </View>
                    </View>
                  ) : null}

                  {/* Akcje: PROWADŹ + ZADZWOŃ */}
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                      onPress={() => handleNavigate(selectedPoint.latitude, selectedPoint.longitude)}
                    >
                      <Ionicons name="map" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>PROWADŹ</Text>
                    </Pressable>
                    {selectedPoint.phone ? (
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => {
                          const cleanPhone = selectedPoint.phone!.split(',')[0].replace(/[^0-9]/g, '');
                          safeOpenURL(`tel:${cleanPhone}`);
                        }}
                      >
                        <Ionicons name="call" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>ZADZWOŃ</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {/* SOR: kolejki */}
                  {selectedPoint.type === 'HOSPITAL' && selectedPoint.numer_ksiegi ? (
                    <View style={styles.sectionContainer}>
                      <Text style={styles.sectionTitle}>Status Oddziału i Kolejki</Text>
                      {sorQueueLoading ? (
                        <View style={styles.loaderBox}>
                          <ActivityIndicator size="small" color="#EF4444" />
                          <Text style={styles.loaderText}>Pobieranie aktualnych danych...</Text>
                        </View>
                      ) : sorQueue && sorQueue.length > 0 ? (
                        sorQueue.map((q, idx) => {
                          const isLong = !isNaN(parseInt(q.wait)) && parseInt(q.wait) > 180;
                          return (
                            <View key={idx} style={styles.queueCard}>
                              <View style={styles.queueTop}>
                                <Text style={styles.queueName} numberOfLines={1}>{q.name}</Text>
                                <View style={[styles.queueBadge, { backgroundColor: isLong ? '#EF4444' : '#10B981' }]}>
                                  <Text style={styles.queueValue}>{q.wait} min</Text>
                                </View>
                              </View>
                              {q.count ? (
                                <View style={styles.triageBox}>
                                  <Ionicons name="people" size={16} color="#6B7280" />
                                  <Text style={styles.triageText}>{q.count} os. w kolejce</Text>
                                </View>
                              ) : null}
                            </View>
                          );
                        })
                      ) : sorQueue !== null ? (
                        <Text style={{ color: '#9CA3AF', fontSize: 13, padding: 8 }}>Brak danych kolejki</Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* AED: szczegóły premium */}
                  {selectedPoint.type === 'AED' ? (
                    <View style={styles.premiumSection}>
                      <View style={styles.luxuryHeader}>
                        <View style={[styles.statusIndicator, { backgroundColor: aedColor! }]} />
                        <Text style={styles.luxuryTitle}>Szczegóły punktu AED</Text>
                      </View>
                      <View style={styles.luxuryContent}>
                        <View style={styles.luxuryBadgeRow}>
                          <View style={[styles.accessBadge, { backgroundColor: aedColor! + '20' }]}>
                            <Text style={[styles.accessBadgeText, { color: aedColor! }]}>
                              {getAccessLabel(selectedPoint.access).toUpperCase()}
                            </Text>
                          </View>
                          {selectedPoint.indoor === 'yes' && (
                            <View style={styles.indoorBadge}>
                              <Ionicons name="home" size={12} color="#F59E0B" />
                              <Text style={styles.indoorBadgeText}>WEWNĄTRZ</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.luxuryMainCard}>
                          <Ionicons name="information-circle" size={24} color="#3B82F6" style={{ marginBottom: 8 }} />
                          <Text style={styles.luxuryMainText}>
                            {selectedPoint.description || 'Brak szczegółowego opisu lokalizacji.'}
                          </Text>
                          {selectedPoint.note ? <Text style={styles.luxuryNoteText}>UWAGA: {selectedPoint.note}</Text> : null}
                        </View>

                        <View style={styles.luxuryGrid}>
                          {(selectedPoint.level || selectedPoint.floor || selectedPoint.room) ? (
                            <View style={styles.luxuryGridItem}>
                              <Ionicons name="layers-outline" size={18} color="#4B5563" />
                              <View>
                                <Text style={styles.luxuryGridLabel}>Lokalizacja</Text>
                                <Text style={styles.luxuryGridValue}>
                                  {(selectedPoint.level || selectedPoint.floor) ? `Piętro: ${selectedPoint.level || selectedPoint.floor}` : ''}
                                  {selectedPoint.room ? ` | Pokój: ${selectedPoint.room}` : ''}
                                </Text>
                              </View>
                            </View>
                          ) : null}
                          {selectedPoint.operator ? (
                            <View style={[styles.luxuryGridItem, { width: '100%' }]}>
                              <Ionicons name="business-outline" size={18} color="#4B5563" />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.luxuryGridLabel}>Operator</Text>
                                <Text style={styles.luxuryGridValue}>{selectedPoint.operator}</Text>
                              </View>
                            </View>
                          ) : null}
                          {selectedPoint.opening_hours ? (
                            <View style={styles.luxuryGridItem}>
                              <Ionicons name="time-outline" size={18} color="#4B5563" />
                              <View>
                                <Text style={styles.luxuryGridLabel}>Dostępność</Text>
                                <Text style={styles.luxuryGridValue}>{selectedPoint.opening_hours}</Text>
                              </View>
                            </View>
                          ) : null}
                          {(selectedPoint.defibrillator_brand || selectedPoint.model) ? (
                            <View style={styles.luxuryGridItem}>
                              <MaterialCommunityIcons name="heart-flash" size={18} color="#EF4444" />
                              <View>
                                <Text style={styles.luxuryGridLabel}>Urządzenie</Text>
                                <Text style={styles.luxuryGridValue}>
                                  {[selectedPoint.defibrillator_brand, selectedPoint.model].filter(Boolean).join(' ')}
                                </Text>
                              </View>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.luxuryActionList}>
                          {selectedPoint.email ? (
                            <Pressable style={styles.luxuryActionRow} onPress={() => safeOpenURL(`mailto:${selectedPoint.email}`)}>
                              <View style={[styles.luxuryActionIcon, { backgroundColor: '#EFF6FF' }]}>
                                <Ionicons name="mail" size={18} color="#3B82F6" />
                              </View>
                              <Text style={styles.luxuryActionText} numberOfLines={1}>{selectedPoint.email}</Text>
                              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </Pressable>
                          ) : null}
                          {selectedPoint.website ? (
                            <Pressable style={styles.luxuryActionRow} onPress={() => safeOpenURL(selectedPoint.website!)}>
                              <View style={[styles.luxuryActionIcon, { backgroundColor: '#F5F3FF' }]}>
                                <Ionicons name="globe" size={18} color="#8B5CF6" />
                              </View>
                              <Text style={styles.luxuryActionText} numberOfLines={1}>Strona internetowa</Text>
                              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </Pressable>
                          ) : null}
                        </View>

                        <View style={styles.luxuryFooter}>
                          <Ionicons name="location" size={12} color="#9CA3AF" />
                          <Text style={styles.luxuryFooterText}>
                            Współrzędne: {selectedPoint.latitude.toFixed(6)}, {selectedPoint.longitude.toFixed(6)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  <View style={{ height: 50 }} />
                </ScrollView>
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* ── MODAL NUMERÓW ALARMOWYCH ── */}
      <Modal visible={showEmergencyModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowEmergencyModal(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Numery Alarmowe</Text>
            <View style={styles.emergencyGrid}>
              {([
                { n: '112', l: 'Alarmowy', c: '#EF4444' },
                { n: '999', l: 'Pogotowie', c: '#EF4444' },
                { n: '998', l: 'Straż Poż.', c: '#F97316' },
                { n: '997', l: 'Policja', c: '#3B82F6' },
              ] as const).map((item, i) => (
                <Pressable key={i} onPress={() => Linking.openURL(`tel:${item.n}`)} style={[styles.emergencyBtn, { borderColor: item.c }]}>
                  <Text style={[styles.emergencyNum, { color: item.c }]}>{item.n}</Text>
                  <Text style={styles.emergencyLabel}>{item.l}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowEmergencyModal(false)} style={styles.closeModalBtn}>
              <Text style={styles.closeModalText}>ZAMKNIJ</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

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

  // ── Filtry — stary styl ──
  filterWrapper: { position: 'absolute', left: 0, right: 0, zIndex: 10 },
  filterScroll: { paddingHorizontal: 16 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, marginRight: 12, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  filterText: { marginLeft: 8, fontSize: 14, fontWeight: '800', color: '#4B5563' },

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
  infoTextSecondary: { fontSize: 14, color: '#6B7280' },

  // ── Akcje ──
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
  actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  // ── Kolejki SOR ──
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 12 },
  queueCard: { backgroundColor: '#FFF5F5', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#FEE2E2' },
  queueTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  queueName: { fontSize: 15, fontWeight: '800', color: '#111827', flex: 1, marginRight: 8 },
  queueBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  queueValue: { color: '#fff', fontWeight: '900', fontSize: 14 },
  triageBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', padding: 8, borderRadius: 8 },
  triageText: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
  loaderBox: { alignItems: 'center', padding: 20 },
  loaderText: { fontSize: 13, color: '#6B7280', marginTop: 10, fontWeight: '600' },

  // ── AED premium ──
  premiumSection: { marginBottom: 24 },
  luxuryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  luxuryTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  luxuryContent: { gap: 16 },
  luxuryBadgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  accessBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  accessBadgeText: { fontSize: 12, fontWeight: '800' },
  indoorBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  indoorBadgeText: { fontSize: 12, fontWeight: '800', color: '#F59E0B' },
  luxuryMainCard: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, alignItems: 'flex-start' },
  luxuryMainText: { fontSize: 14, fontWeight: '600', color: '#1E3A8A' },
  luxuryNoteText: { fontSize: 12, fontWeight: '700', color: '#DC2626', marginTop: 8 },
  luxuryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  luxuryGridItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, width: '46%' },
  luxuryGridLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  luxuryGridValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  luxuryActionList: { gap: 8 },
  luxuryActionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12 },
  luxuryActionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  luxuryActionText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  luxuryFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  luxuryFooterText: { fontSize: 11, color: '#9CA3AF' },

  // ── Numery alarmowe ──
  emergencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  emergencyBtn: { width: '48%', padding: 16, borderRadius: 20, borderWidth: 2, alignItems: 'center' },
  emergencyNum: { fontSize: 24, fontWeight: '900' },
  emergencyLabel: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
  closeModalBtn: { marginTop: 20, backgroundColor: '#F3F4F6', padding: 16, borderRadius: 16, alignItems: 'center' },
  closeModalText: { fontWeight: '900', color: '#374151' },
});
