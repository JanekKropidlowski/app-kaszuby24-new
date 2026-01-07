import React, { useState, useRef, useMemo, useEffect } from 'react';
import { StyleSheet, View, Modal, Text, TouchableOpacity, ActivityIndicator, ScrollView, Linking, Platform, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import MapViewClustering from 'react-native-map-clustering';
import { SorHospital, SorService, SorDataResponse } from '@/services/sor';
import { AEDPoint } from '@/services/aed';
import { GeneralHospital } from '@/services/hospitals';
import { PharmacyPoint } from '@/services/pharmacy';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { FilterType } from '@/hooks/useEssentials';

const { width } = Dimensions.get('window');
const PHARM_ZOOM = 0.35; // Relaxed from 0.2
const AED_ZOOM = 0.45;   // Relaxed from 0.25
const CAP_PHARM = 300;   // Increased slightly
const CAP_AED = 450;     // Increased to show more points
const VIEWPORT_BUFFER = 1.2;
// Defines color based on access type
const getColorBadge = (access?: string, indoor?: string) => {
    const acc = access?.toLowerCase() || '';
    if (acc === 'yes' || acc === 'permissive' || acc === 'public') return '#10B981'; // Green (Public)
    if (acc === 'customers') return '#3B82F6'; // Blue (Customers)
    if (acc === 'private' || acc === 'no') return '#EF4444'; // Red (Private)
    if (indoor === 'yes') return '#F59E0B'; // Orange (Indoor/Warning)
    return '#10B981'; // Default Green
};

const getAccessLabel = (access?: string) => {
    const acc = access?.toLowerCase() || '';
    if (acc === 'yes' || acc === 'public') return 'Publiczny';
    if (acc === 'permissive') return 'Dozwolony';
    if (acc === 'customers') return 'Klienci';
    if (acc === 'private') return 'Prywatny';
    if (acc === 'no') return 'Brak dostępu';
    return acc || 'Publiczny';
};

const getIndoorLabel = (indoor?: string) => {
    return indoor === 'yes' ? 'TAK (wewnątrz)' : 'NIE (na zewnątrz)';
};

const getWheelchairLabel = (wheelchair?: string) => {
    const w = wheelchair?.toLowerCase();
    if (w === 'yes') return 'TAK';
    if (w === 'no') return 'NIE';
    if (w === 'limited') return 'OGRANICZONY';
    return 'Brak danych';
};

// Memoized Marker Components to prevent re-rendering thrashing
const AedMarker = React.memo(({ item, coordinate, onPress }: { item: AEDPoint, coordinate: { latitude: number, longitude: number }, onPress: () => void }) => {
    const color = getColorBadge(item.access, item.indoor);
    const icon = "heart-flash"; // Unified as per user request

    return (
        <Marker
            coordinate={coordinate}
            onPress={onPress}
            tracksViewChanges={false} // Static content, render once
        >
            <View style={[
                styles.markerContainer,
                { backgroundColor: color, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 }
            ]}>
                <MaterialCommunityIcons
                    name={icon}
                    size={16}
                    color="#fff"
                />
            </View>
        </Marker>
    );
});

const PharmacyMarker = React.memo(({ item, coordinate, onPress }: { item: PharmacyPoint, coordinate: { latitude: number, longitude: number }, onPress: () => void }) => (
    <Marker
        coordinate={coordinate}
        onPress={onPress}
        tracksViewChanges={false}
    >
        <View style={[styles.markerContainer, { backgroundColor: item.is24h ? '#1E293B' : '#8B5CF6' }]}>
            {item.is24h ? (
                <MaterialCommunityIcons name="weather-night" size={16} color="#FACC15" />
            ) : (
                <Ionicons name="medical" size={14} color="#fff" />
            )}
            {item.is24h && (
                <View style={[styles.badge24h, { backgroundColor: '#FACC15' }]}>
                    <Text style={[styles.badge24hText, { color: '#1E293B' }]}>24h</Text>
                </View>
            )}
        </View>
    </Marker>
));

const SorMarker = React.memo(({ item, coordinate, onPress }: { item: SorHospital, coordinate: { latitude: number, longitude: number }, onPress: () => void }) => (
    <Marker
        coordinate={coordinate}
        onPress={onPress}
        tracksViewChanges={false}
    >
        <View style={[styles.markerContainer, { backgroundColor: item.type === 'NiSOZ' || !item.numer_ksiegi ? '#3B82F6' : '#EF4444' }]}>
            <MaterialCommunityIcons name={item.type === 'NiSOZ' || !item.numer_ksiegi ? "hospital-building" : "hospital-box"} size={16} color="#fff" />
        </View>
    </Marker>
));

const GeneralHospitalMarker = React.memo(({ item, coordinate, onPress }: { item: GeneralHospital, coordinate: { latitude: number, longitude: number }, onPress: () => void }) => (
    <Marker
        coordinate={coordinate}
        onPress={onPress}
        tracksViewChanges={false}
    >
        <View style={[styles.markerContainer, { backgroundColor: '#3B82F6' }]}>
            <MaterialCommunityIcons name="hospital-building" size={16} color="#fff" />
        </View>
    </Marker>
));

interface EssentialsMapProps {
    hospitals: SorHospital[];
    aedPoints: AEDPoint[];
    generalHospitals: GeneralHospital[];
    pharmacies: PharmacyPoint[];
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType, lat?: number, lon?: number) => void;
    fetchByViewport?: (type: FilterType, minLat: number, minLon: number, maxLat: number, maxLon: number) => void;
    areEssentialsLoading?: boolean;
}

export const SorMap: React.FC<EssentialsMapProps> = ({
    hospitals, aedPoints, generalHospitals, pharmacies, activeFilter, onFilterChange, fetchByViewport, areEssentialsLoading
}) => {
    const mapRef = useRef<MapView>(null);
    const router = useRouter();
    const [selectedItem, setSelectedItem] = useState<{ type: FilterType; data: any } | null>(null);
    const [queueData, setQueueData] = useState<SorDataResponse | null>(null);
    const [loadingQueue, setLoadingQueue] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);

    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [showOnly24h, setShowOnly24h] = useState(false);
    const [searchingNearest, setSearchingNearest] = useState(false);
    const [showHint, setShowHint] = useState(true);

    // Auto-hide hint after 5 seconds
    useEffect(() => {
        if (showHint) {
            const timer = setTimeout(() => {
                setShowHint(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showHint]);

    const [region, setRegion] = useState<Region>({
        latitude: 54.3520, longitude: 18.6466, latitudeDelta: 0.1, longitudeDelta: 0.1
    });

    const searchTimer = useRef<NodeJS.Timeout | null>(null);
    const lastFetchRegion = useRef<Region | null>(null);
    const lastAutoZoom = useRef<FilterType | null>(null); // To prevent auto-zoom loops

    useEffect(() => {
        const timer = setTimeout(() => setShowHint(false), 10000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const userLoc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                setUserLocation(userLoc);
                const initial = { ...userLoc, latitudeDelta: 0.05, longitudeDelta: 0.05 };
                setRegion(initial);
                mapRef.current?.animateToRegion(initial, 500);
            }
        })();
    }, []);

    const handleHospitalPress = async (hospital: SorHospital) => {
        setSelectedItem({ type: 'SOR', data: hospital });
        setQueueData(null);
        setLoadingQueue(true);
        try {
            const data = await SorService.fetchQueueTimes(hospital.numer_ksiegi);
            setQueueData(data);
        } catch (e) {
            console.error("Queue fetch error:", e);
        } finally {
            setLoadingQueue(false);
        }
    };

    const handleRegionChangeComplete = (newRegion: Region) => {
        setRegion(newRegion);
        if (activeFilter === 'PHARMACY' || activeFilter === 'AED' || activeFilter === 'ALL') {
            if (searchTimer.current) clearTimeout(searchTimer.current);
            searchTimer.current = setTimeout(() => {
                const latDiff = lastFetchRegion.current ? Math.abs(newRegion.latitude - lastFetchRegion.current.latitude) : 1;
                const lonDiff = lastFetchRegion.current ? Math.abs(newRegion.longitude - lastFetchRegion.current.longitude) : 1;
                const zoomDiff = lastFetchRegion.current ? Math.abs(newRegion.latitudeDelta - lastFetchRegion.current.latitudeDelta) : 1;

                // Stricter threshold and 1.5s delay to avoid 429
                if (latDiff > 0.02 || lonDiff > 0.02 || zoomDiff > 0.02) {
                    lastFetchRegion.current = newRegion;

                    if (fetchByViewport) {
                        const minLat = newRegion.latitude - newRegion.latitudeDelta / 2;
                        const maxLat = newRegion.latitude + newRegion.latitudeDelta / 2;
                        const minLon = newRegion.longitude - newRegion.longitudeDelta / 2;
                        const maxLon = newRegion.longitude + newRegion.longitudeDelta / 2;
                        fetchByViewport(activeFilter, minLat, minLon, maxLat, maxLon);
                    } else {
                        onFilterChange(activeFilter, newRegion.latitude, newRegion.longitude);
                    }
                }
            }, 1500);
        }
    };

    const handleNavigate = (lat: number, lon: number) => {
        const url = Platform.select({
            ios: `maps:0,0?q=${lat},${lon}`,
            android: `geo:0,0?q=${lat},${lon}`
        });
        if (url) Linking.openURL(url);
    };

    // Auto-zoom to nearest point on filter change
    useEffect(() => {
        if (!userLocation) return;
        if (activeFilter === 'ALL') return;
        if (lastAutoZoom.current === activeFilter) return;

        lastAutoZoom.current = activeFilter;

        let points: { lat: number, lon: number }[] = [];
        if (activeFilter === 'MEDICAL' || activeFilter === 'SOR' || activeFilter === 'HOSPITAL') {
            const hPoints = hospitals
                .filter(h => h.lat !== null && h.lng !== null)
                .map(h => ({ lat: h.lat as number, lon: h.lng as number }));

            const ghPoints = generalHospitals
                .filter(h => h.lat !== null && h.lon !== null)
                .map(h => ({ lat: h.lat as number, lon: h.lon as number }));

            points = [...hPoints, ...ghPoints];
        } else if (activeFilter === 'PHARMACY') {
            points = pharmacies.map(p => ({ lat: p.lat, lon: p.lon }));
        } else if (activeFilter === 'AED') {
            points = aedPoints.map(a => ({ lat: a.lat, lon: a.lon }));
        }

        if (points.length === 0) return;

        // Find nearest
        let nearest = points[0];
        let minDesc = Infinity;

        const getDist = (p1: { lat: number, lon: number }, p2: { latitude: number, longitude: number }) => {
            return Math.sqrt(Math.pow(p1.lat - p2.latitude, 2) + Math.pow(p1.lon - p2.longitude, 2));
        };

        points.forEach(p => {
            const d = getDist(p, userLocation);
            if (d < minDesc) {
                minDesc = d;
                nearest = p;
            }
        });

        if (nearest && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: nearest.lat,
                longitude: nearest.lon,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02
            }, 800);
        }

    }, [activeFilter, userLocation]); // Only re-run if filter or user location changes explicitly

    const findNearestPoint = () => {
        if (!userLocation) {
            alert("Nie można określić Twojej lokalizacji.");
            return;
        }

        let targetPoints: { lat: number, lon: number, data: any }[] = [];
        let type: FilterType = activeFilter;

        if (activeFilter === 'PHARMACY' || activeFilter === 'ALL') {
            // For pharmacy, we stick to 24h logic as per original design/request
            const pharmacies24h = pharmacies.filter(p => p.is24h);
            if (pharmacies24h.length === 0) {
                alert("Nie znaleziono aptek całodobowych w bazie.");
                return;
            }
            targetPoints = pharmacies24h.map(p => ({ lat: p.lat, lon: p.lon, data: p }));
            type = 'PHARMACY';
        } else if (activeFilter === 'AED') {
            if (aedPoints.length === 0) return;
            targetPoints = aedPoints.map(a => ({ lat: a.lat, lon: a.lon, data: a }));
        } else if (activeFilter === 'MEDICAL' || activeFilter === 'SOR' || activeFilter === 'HOSPITAL') {
            // Combine hospitals
            const hPoints = hospitals.filter(h => h.lat && h.lng).map(h => ({ lat: h.lat!, lon: h.lng!, data: h, subType: 'SOR' }));
            const ghPoints = generalHospitals.filter(h => h.lat && h.lon).map(h => ({ lat: h.lat!, lon: h.lon!, data: h, subType: 'HOSPITAL' }));
            targetPoints = [...hPoints, ...ghPoints];
            type = 'HOSPITAL'; // General type for selection
        }

        if (targetPoints.length === 0) return;

        setSearchingNearest(true);
        setShowHint(false);

        let nearest = targetPoints[0];
        let minDist = Infinity;

        targetPoints.forEach(p => {
            const dist = Math.pow(p.lat - userLocation.latitude, 2) + Math.pow(p.lon - userLocation.longitude, 2);
            if (dist < minDist) {
                minDist = dist;
                nearest = p;
            }
        });

        mapRef.current?.animateToRegion({
            latitude: nearest.lat,
            longitude: nearest.lon,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
        }, 1000);

        setTimeout(() => {
            setSelectedItem({ type: (nearest as any).subType === 'SOR' ? 'SOR' : type, data: nearest.data });
            setSearchingNearest(false);
        }, 1100);
    };

    // Calculate counts for viewport stats - MUST ALIGN WITH RENDER LOGIC
    const viewportStats = useMemo(() => {
        const R_LAT = region.latitude;
        const R_LON = region.longitude;
        const R_DLAT = region.latitudeDelta * VIEWPORT_BUFFER;
        const R_DLON = region.longitudeDelta * VIEWPORT_BUFFER;

        // Check zoom visibility
        const showPharm = region.latitudeDelta <= PHARM_ZOOM;
        const showAed = region.latitudeDelta <= AED_ZOOM;

        const aedInView = aedPoints.filter(a => Math.abs(a.lat - R_LAT) <= R_DLAT && Math.abs(a.lon - R_LON) <= R_DLON);
        const pharmInView = pharmacies.filter(p => Math.abs(p.lat - R_LAT) <= R_DLAT && Math.abs(p.lon - R_LON) <= R_DLON);

        return {
            pharmacies: {
                inView: showPharm ? Math.min(pharmInView.length, CAP_PHARM) : pharmInView.filter(p => p.is24h).length,
                total: pharmacies.length
            },
            aed: {
                inView: showAed ? Math.min(aedInView.length, CAP_AED) : 0,
                total: aedPoints.length
            },
            isAedHiddenByZoom: !showAed && aedInView.length > 0,
            isPharmHiddenByZoom: !showPharm && pharmInView.length > 0
        };
    }, [pharmacies, aedPoints, region.latitude, region.longitude, region.latitudeDelta]);

    const renderedMarkers = useMemo(() => {
        const markers: React.ReactNode[] = [];
        let isCapped = false;
        let hCount = 0;
        let pCount = 0;
        let aCount = 0;

        const R_LAT = region.latitude;
        const R_LON = region.longitude;
        const R_DLAT = region.latitudeDelta * VIEWPORT_BUFFER;
        const R_DLON = region.longitudeDelta * VIEWPORT_BUFFER;

        if (activeFilter === 'MEDICAL' || activeFilter === 'SOR' || activeFilter === 'ALL') {
            // Hospitals are few (tens), no need to strict filter
            hospitals.filter(h => h.lat !== null && h.lng !== null).forEach(h => {
                markers.push(
                    <SorMarker
                        key={`sor-${h.id_gsl_miej || h.numer_ksiegi || h.nazwa_swd}`}
                        item={h}
                        coordinate={{ latitude: h.lat as number, longitude: h.lng as number }}
                        onPress={() => {
                            setQueueData(null);
                            h.numer_ksiegi && h.type !== 'NiSOZ' ? handleHospitalPress(h) : setSelectedItem({ type: 'SOR', data: h });
                        }}
                    />
                );
                hCount++;
            });
            generalHospitals.filter(h => h.lat !== null && h.lon !== null).forEach((h, idx) => {
                markers.push(
                    <GeneralHospitalMarker
                        key={`gh-${h["L.P."] || idx}`}
                        item={h}
                        coordinate={{ latitude: h.lat as number, longitude: h.lon as number }}
                        onPress={() => setSelectedItem({ type: 'HOSPITAL', data: h })}
                    />
                );
                hCount++;
            });
        }

        if (activeFilter === 'PHARMACY' || activeFilter === 'ALL') {
            const pharmacieList = pharmacies;

            let shown = 0;
            for (const p of pharmacieList) {
                if (shown >= CAP_PHARM && !p.is24h) { // Don't cap 24h pharmacies if they are few
                    continue;
                }

                // 24h pharmacies now ALWAYS bypass zoom as per user request
                const isVisibleByZoom = p.is24h || region.latitudeDelta <= PHARM_ZOOM;

                if (!isVisibleByZoom) continue;
                if (Math.abs(p.lat - R_LAT) > R_DLAT || Math.abs(p.lon - R_LON) > R_DLON) continue;

                markers.push(
                    <PharmacyMarker
                        key={`ph-${p.id}`}
                        item={p}
                        coordinate={{ latitude: p.lat, longitude: p.lon }}
                        onPress={() => setSelectedItem({ type: 'PHARMACY', data: p })}
                    />
                );
                shown++;
                pCount++;
            }
        }

        if (activeFilter === 'AED' || activeFilter === 'ALL') {
            if (region.latitudeDelta <= AED_ZOOM) {
                let shown = 0;
                for (const a of aedPoints) {
                    if (shown >= CAP_AED) {
                        isCapped = true;
                        break;
                    }
                    if (Math.abs(a.lat - R_LAT) > R_DLAT || Math.abs(a.lon - R_LON) > R_DLON) continue;

                    markers.push(
                        <AedMarker
                            key={`aed-${a.id}`}
                            item={a}
                            coordinate={{ latitude: a.lat, longitude: a.lon }}
                            onPress={() => setSelectedItem({ type: 'AED', data: a })}
                        />
                    );
                    shown++;
                    aCount++;
                }
            }
        }

        return { markers, counts: { h: hCount, p: pCount, a: aCount }, isCapped };
    }, [activeFilter, hospitals, generalHospitals, pharmacies, aedPoints, region.latitudeDelta, region.latitude, region.longitude, showOnly24h]);

    const getModalInfo = () => {
        if (!selectedItem) return null;
        const d = selectedItem.data;
        const type = selectedItem.type;

        let title = "Szczegóły";
        let address = "Brak adresu";
        let city = "";
        let phone = "";
        let category = "Pomoc Medyczna";

        if (type === 'SOR') {
            title = d.nazwa_swd || "SOR";
            address = `${d.adr_lok_ulica || ''} ${d.adr_lok_nr_domu || ''}`.trim();
            city = `${d.adr_lok_miejsc || ''}`.trim();
            phone = d.telefon_rej;
            category = d.type === 'NiSOZ' ? "Nocna i Świąteczna Opieka" : "Szpitalny Oddział Ratunkowy";
        } else if (type === 'HOSPITAL') {
            title = d.organizacja;
            address = `${d.adres || ''} ${d.adres_numer || ''}`.trim();
            city = `${d.miasto || ''}`.trim();
            category = "Szpital Ogólny";
        } else if (type === 'PHARMACY') {
            title = d.name || "Apteka";
            address = d.address;
            category = "Apteka";
            phone = d.phone;
        } else if (type === 'AED') {
            title = "Defibrylator AED";
            address = d.location || "Lokalizacja nieznana";
            category = "AED - Pierwsza Pomoc";
            phone = d.phone; // New field
        }
        return { title, address, city, phone, category, data: d }; // Return full data for access to extras
    };

    // Helper to translate access
    const getAccessLabel = (access?: string) => {
        const acc = access?.toLowerCase() || '';
        if (acc === 'yes' || acc === 'public') return 'Publiczny / Otwarty';
        if (acc === 'permissive') return 'Ogólnodostępny (możliwe ograniczenia)';
        if (acc === 'customers') return 'Tylko dla klientów';
        if (acc === 'private') return 'Prywatny / Ograniczony';
        if (acc === 'no') return 'Brak dostępu publicznego';
        if (acc === 'unknown') return 'Status nieznany';
        return access || 'Brak danych o dostępie';
    };

    // Helper to translate indoor/outdoor
    const getIndoorLabel = (indoor?: string) => {
        const ind = indoor?.toLowerCase() || '';
        if (ind === 'yes') return 'TAK (Wewnątrz budynku)';
        if (ind === 'no') return 'NIE (Na zewnątrz)';
        if (ind === 'level') return 'Wewnątrz (na piętrze)';
        return ind ? `Wewnątrz: ${ind}` : 'Brak danych';
    };

    // Helper to translate wheelchair
    const getWheelchairLabel = (wheel?: string) => {
        const w = wheel?.toLowerCase() || '';
        if (w === 'yes') return 'Pełna dostępność';
        if (w === 'no') return 'Brak dostępności';
        if (w === 'limited' || w === 'partial') return 'Ograniczona dostępność';
        if (w === 'designated') return 'Specjalnie wyznaczone';
        return w || 'Brak danych';
    };

    const modalInfo = getModalInfo();

    const MedicalLegend = () => (
        <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Legenda - Szpitale</Text>
            <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>SOR (Kolejki NFZ)</Text>
            </View>
            <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendText}>NiSOZ (Nocna pomoc)</Text>
            </View>
        </View>
    );

    const AedLegend = () => (
        <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Legenda - AED</Text>
            <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Publiczny / Otwarty</Text>
            </View>
            <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendText}>Dla klientów</Text>
            </View>
            <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Prywatny / Ograniczony</Text>
            </View>
            <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.legendText}>Wewnątrz / Inne</Text>
            </View>
        </View>
    );

    const PharmacyLegend = () => (
        <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Legenda - Apteki</Text>
            <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#1E293B' }]} />
                <Text style={styles.legendText}>Apteka 24h</Text>
            </View>
            <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                <Text style={styles.legendText}>Apteka</Text>
            </View>
        </View>
    );

    const renderLegend = () => {
        if (activeFilter === 'MEDICAL' || activeFilter === 'SOR' || activeFilter === 'HOSPITAL') return <MedicalLegend />;
        if (activeFilter === 'AED') return <AedLegend />;
        if (activeFilter === 'PHARMACY') return <PharmacyLegend />;
        return null;
    };

    return (
        <View style={styles.container}>
            <MapViewClustering
                ref={mapRef as any}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                region={region}
                onRegionChangeComplete={handleRegionChangeComplete}
                showsUserLocation
                showsPointsOfInterest={false}
                clusteringEnabled={false}
            >
                {renderedMarkers.markers}
            </MapViewClustering>

            {/* Header Overlay */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Niezbędnik</Text>
                    <Text style={styles.headerSub}>Pomoc medyczna i ratownictwo</Text>
                </View>
                <TouchableOpacity onPress={() => setShowEmergencyModal(true)} style={[styles.headerBtn, { backgroundColor: '#EF4444' }]}>
                    <Ionicons name="call" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Premium Viewport Stats Card */}
            {(activeFilter === 'ALL' || activeFilter === 'PHARMACY' || activeFilter === 'AED') && (
                <View style={styles.statsFloatingCard}>
                    {(activeFilter === 'ALL' || activeFilter === 'PHARMACY') && (
                        <View style={styles.cardStatItem}>
                            <View style={[styles.cardIconCircle, { backgroundColor: '#3B82F6' }]}>
                                <MaterialCommunityIcons name="pill" size={14} color="#fff" />
                            </View>
                            <View>
                                <Text style={styles.cardStatLabel}>Apteki</Text>
                                <Text style={styles.cardStatValue}>
                                    {viewportStats.pharmacies.inView}
                                    <Text style={{ color: '#94A3B8', fontWeight: '400', fontSize: 10 }}> / {pharmacies.length}</Text>
                                    {viewportStats.isPharmHiddenByZoom && <Text style={styles.cardStatAction}> (Przybliż!)</Text>}
                                </Text>
                            </View>
                        </View>
                    )}

                    {(activeFilter === 'ALL' || activeFilter === 'AED') && (
                        <View style={styles.cardStatItem}>
                            <View style={[styles.cardIconCircle, { backgroundColor: '#10B981' }]}>
                                <MaterialCommunityIcons name="heart-flash" size={14} color="#fff" />
                            </View>
                            <View>
                                <Text style={styles.cardStatLabel}>AED</Text>
                                <Text style={styles.cardStatValue}>
                                    {viewportStats.aed.inView}
                                    <Text style={{ color: '#94A3B8', fontWeight: '400', fontSize: 10 }}> / {aedPoints.length}</Text>
                                    {viewportStats.isAedHiddenByZoom && <Text style={styles.cardStatAction}> (Przybliż!)</Text>}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* Legend Overlay */}
            {renderLegend()}

            {areEssentialsLoading && (
                <View style={styles.loadingToast}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.loadingToastText}>Aktualizacja danych...</Text>
                </View>
            )}

            {/* Unified Bottom Toast for Zoom/Filters */}
            {(
                (activeFilter === 'PHARMACY' && region.latitudeDelta > PHARM_ZOOM) ||
                (activeFilter === 'AED' && region.latitudeDelta > AED_ZOOM) ||
                (activeFilter === 'ALL' && region.latitudeDelta > PHARM_ZOOM)
            ) && (
                    <View style={styles.bottomToast}>
                        <Ionicons name="scan-outline" size={20} color="#fff" />
                        <Text style={styles.bottomToastText}>
                            {activeFilter === 'PHARMACY' && viewportStats.pharmacies.inView > 0
                                ? `Przybliż, aby zobaczyć ${viewportStats.pharmacies.inView} aptek w okolicy`
                                : activeFilter === 'AED' && viewportStats.aed.inView > 0
                                    ? `Przybliż, aby zobaczyć ${viewportStats.aed.inView} AED w okolicy`
                                    : activeFilter === 'ALL'
                                        ? `Przybliż, aby zobaczyć ${viewportStats.pharmacies.inView + viewportStats.aed.inView} punktów`
                                        :
                                        "Przybliż mapę, aby zobaczyć punkty"}
                        </Text>
                    </View>
                )}

            {/* Filters */}
            <View style={styles.filterWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {[
                        { id: 'MEDICAL', label: 'Pomoc Medyczna', icon: 'medical' },
                        { id: 'PHARMACY', label: 'Apteki', icon: 'flask' }, // Changed icon to distinguish
                        { id: 'AED', label: 'AED', icon: 'flash' }
                    ].map(f => (
                        <TouchableOpacity
                            key={f.id}
                            onPress={() => onFilterChange(f.id as FilterType, region.latitude, region.longitude)}
                            style={[
                                styles.filterChip,
                                activeFilter === f.id && {
                                    backgroundColor: f.id === 'AED' ? '#10B981' :
                                        f.id === 'PHARMACY' ? '#3B82F6' :
                                            '#EF4444',
                                    borderColor: 'transparent',
                                    elevation: 6
                                }
                            ]}
                        >
                            <Ionicons name={f.icon as any} size={16} color={activeFilter === f.id ? '#fff' : '#4B5563'} />
                            <Text style={[styles.filterText, activeFilter === f.id && { color: '#fff' }]}>{f.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Dynamic FAB for Nearest Action */}
            {(activeFilter !== 'ALL' || showHint) && (
                <View style={styles.fabWrapper}>
                    {showHint && (
                        <View style={styles.hintBubble}>
                            <Text style={styles.hintText}>
                                {activeFilter === 'PHARMACY' ? 'Najbliższa całodobowa' :
                                    activeFilter === 'AED' ? 'Najbliższy defibrylator' :
                                        'Najbliższy SOR'}
                            </Text>
                            <View style={styles.hintArrow} />
                        </View>
                    )}
                    <TouchableOpacity
                        style={[
                            styles.fab24h,
                            {
                                backgroundColor: activeFilter === 'AED' ? '#10B981' :
                                    activeFilter === 'PHARMACY' || activeFilter === 'ALL' ? '#000000' :
                                        '#EF4444' // Med/SOR
                            }
                        ]}
                        onPress={findNearestPoint}
                        disabled={searchingNearest}
                    >
                        {searchingNearest ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                {activeFilter === 'PHARMACY' || activeFilter === 'ALL' ? (
                                    <>
                                        <MaterialCommunityIcons name="weather-night" size={24} color="#FACC15" />
                                        <Text style={[styles.fabText, { color: '#FACC15' }]}>24h</Text>
                                    </>
                                ) : activeFilter === 'AED' ? (
                                    <>
                                        <MaterialCommunityIcons name="heart-flash" size={24} color="#FFFFFF" />
                                        <Text style={[styles.fabText, { color: '#FFFFFF' }]}>AED</Text>
                                    </>
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="hospital-building" size={24} color="#FFFFFF" />
                                        <Text style={[styles.fabText, { color: '#FFFFFF' }]}>SOR</Text>
                                    </>
                                )}
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Detail Modal */}
            <Modal visible={!!selectedItem} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedItem(null)} />
                    <View style={styles.modalContent}>
                        <View style={styles.dragIndicator} />
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalLabel}>{modalInfo?.category}</Text>
                                <Text style={styles.modalTitle}>{modalInfo?.title}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.closeBtn}>
                                <Ionicons name="close-circle" size={32} color="#D1D5DB" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalScroll}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {selectedItem?.type !== 'AED' && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="location" size={24} color="#3B82F6" style={{ marginRight: 15 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.infoTextPrimary}>{modalInfo?.address}</Text>
                                        {modalInfo?.city ? <Text style={styles.infoTextSecondary}>{modalInfo?.city}</Text> : null}
                                    </View>
                                </View>
                            )}

                            <View style={styles.actionRow}>
                                <TouchableOpacity onPress={() => handleNavigate(selectedItem?.data?.lat, selectedItem?.data?.lng || selectedItem?.data?.lon)} style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}>
                                    <Ionicons name="map" size={18} color="#fff" />
                                    <Text style={styles.actionBtnText}>PROWADŹ</Text>
                                </TouchableOpacity>
                                {modalInfo?.phone ? (
                                    <TouchableOpacity onPress={() => {
                                        const cleanPhone = modalInfo.phone.split(',')[0].replace(/[^0-9]/g, '');
                                        Linking.openURL(`tel:${cleanPhone}`);
                                    }} style={[styles.actionBtn, { backgroundColor: '#10B981' }]}>
                                        <Ionicons name="call" size={18} color="#fff" />
                                        <Text style={styles.actionBtnText}>ZADZWOŃ</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>

                            {/* SOR Specific Info - Only show if data is available */}
                            {selectedItem?.type === 'SOR' && (loadingQueue || (queueData?.data && queueData.data.length > 0)) && (
                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>Status Oddziału i Kolejki</Text>
                                    {loadingQueue ? (
                                        <View style={styles.loaderBox}>
                                            <ActivityIndicator size="small" color="#EF4444" />
                                            <Text style={styles.loaderText}>Pobieranie aktualnych danych...</Text>
                                        </View>
                                    ) : (
                                        queueData?.data?.map((q, i) => (
                                            <View key={i} style={styles.queueCard}>
                                                <View style={styles.queueTop}>
                                                    <Text style={styles.queueName}>{q.name}</Text>
                                                    <View style={[styles.queueBadge, { backgroundColor: parseInt(q.wait) > 180 ? '#EF4444' : '#10B981' }]}>
                                                        <Text style={styles.queueValue}>{q.wait} min</Text>
                                                    </View>
                                                </View>
                                                {q.triage && (
                                                    <View style={styles.triageBox}>
                                                        <Ionicons name="information-circle" size={16} color="#6B7280" />
                                                        <Text style={styles.triageText}>{q.triage}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        ))
                                    )}
                                </View>
                            )}

                            {/* Hospital Info */}
                            {selectedItem?.type === 'HOSPITAL' && (
                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>Informacje o placówce</Text>
                                    {selectedItem.data.ocena && (
                                        <View style={styles.qualityCard}>
                                            <Text style={styles.qualityScore}>{selectedItem.data.ocena}%</Text>
                                            <View>
                                                <Text style={styles.qualityLabel}>Akredytacja Jakości CMJ</Text>
                                                <Text style={styles.qualityDate}>Ważna do: {selectedItem.data.termin_waznosci}</Text>
                                            </View>
                                        </View>
                                    )}
                                    <View style={styles.descBox}>
                                        <Text style={styles.descText}>Szpital ogólny świadczący usługi medyczne w regionie pomorskim.</Text>
                                    </View>
                                </View>
                            )}

                            {/* AED Specific Info - Premium Redesign */}
                            {selectedItem?.type === 'AED' && (
                                <View style={styles.premiumSection}>
                                    <View style={styles.luxuryHeader}>
                                        <View style={[styles.statusIndicator, { backgroundColor: getColorBadge(selectedItem.data.access) }]} />
                                        <Text style={styles.luxuryTitle}>Szczegóły punktu AED</Text>
                                    </View>

                                    <View style={styles.luxuryContent}>
                                        {/* Status & Access Header */}
                                        <View style={styles.luxuryBadgeRow}>
                                            <View style={[styles.accessBadge, { backgroundColor: getColorBadge(selectedItem.data.access) + '20' }]}>
                                                <Text style={[styles.accessBadgeText, { color: getColorBadge(selectedItem.data.access) }]}>
                                                    {getAccessLabel(selectedItem.data.access).toUpperCase()}
                                                </Text>
                                            </View>
                                            {selectedItem.data.indoor === 'yes' && (
                                                <View style={styles.indoorBadge}>
                                                    <Ionicons name="home" size={12} color="#F59E0B" />
                                                    <Text style={styles.indoorBadgeText}>WEWNĄTRZ</Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Main Description */}
                                        <View style={styles.luxuryMainCard}>
                                            <Ionicons name="information-circle" size={24} color="#3B82F6" style={{ marginBottom: 8 }} />
                                            <Text style={styles.luxuryMainText}>
                                                {selectedItem.data['defibrillator:location:pl'] || selectedItem.data['defibrillator:location'] || selectedItem.data.location || selectedItem.data.description || "Brak szczegółowego opisu lokalizacji."}
                                            </Text>
                                            {selectedItem.data.note && <Text style={styles.luxuryNoteText}>UWAGA: {selectedItem.data.note}</Text>}
                                        </View>

                                        {/* Info Grid */}
                                        <View style={styles.luxuryGrid}>
                                            {/* Placement Info */}
                                            {(selectedItem.data.level || selectedItem.data.floor || selectedItem.data.room) && (
                                                <View style={styles.luxuryGridItem}>
                                                    <Ionicons name="layers-outline" size={18} color="#4B5563" />
                                                    <View>
                                                        <Text style={styles.luxuryGridLabel}>Lokalizacja</Text>
                                                        <Text style={styles.luxuryGridValue}>
                                                            {selectedItem.data.level || selectedItem.data.floor ? `Piętro: ${selectedItem.data.level || selectedItem.data.floor}` : ''}
                                                            {selectedItem.data.room ? ` | Pokój: ${selectedItem.data.room}` : ''}
                                                        </Text>
                                                    </View>
                                                </View>
                                            )}

                                            {/* Operator */}
                                            {selectedItem.data.operator && (
                                                <View style={[styles.luxuryGridItem, { width: '100%' }]}>
                                                    <Ionicons name="business-outline" size={18} color="#4B5563" />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.luxuryGridLabel}>Operator</Text>
                                                        <Text style={styles.luxuryGridValue}>{selectedItem.data.operator}</Text>
                                                    </View>
                                                </View>
                                            )}

                                            {/* Opening Hours */}
                                            {selectedItem.data.opening_hours && (
                                                <View style={styles.luxuryGridItem}>
                                                    <Ionicons name="time-outline" size={18} color="#4B5563" />
                                                    <View>
                                                        <Text style={styles.luxuryGridLabel}>Dostępność</Text>
                                                        <Text style={styles.luxuryGridValue}>{selectedItem.data.opening_hours}</Text>
                                                    </View>
                                                </View>
                                            )}

                                            {/* Device Info */}
                                            {(selectedItem.data['defibrillator:brand'] || selectedItem.data.model) && (
                                                <View style={styles.luxuryGridItem}>
                                                    <MaterialCommunityIcons name="heart-flash" size={18} color="#EF4444" />
                                                    <View>
                                                        <Text style={styles.luxuryGridLabel}>Urządzenie</Text>
                                                        <Text style={styles.luxuryGridValue}>{selectedItem.data['defibrillator:brand'] || ''} {selectedItem.data.model || ''}</Text>
                                                    </View>
                                                </View>
                                            )}
                                        </View>

                                        {/* Contact & Links */}
                                        <View style={styles.luxuryActionList}>
                                            {selectedItem.data.phone && (
                                                <TouchableOpacity style={styles.luxuryActionRow} onPress={() => Linking.openURL(`tel:${selectedItem.data.phone}`)}>
                                                    <View style={[styles.luxuryActionIcon, { backgroundColor: '#ECFDF5' }]}>
                                                        <Ionicons name="call" size={18} color="#10B981" />
                                                    </View>
                                                    <Text style={styles.luxuryActionText}>{selectedItem.data.phone}</Text>
                                                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                                                </TouchableOpacity>
                                            )}

                                            {selectedItem.data.email && (
                                                <TouchableOpacity style={styles.luxuryActionRow} onPress={() => Linking.openURL(`mailto:${selectedItem.data.email}`)}>
                                                    <View style={[styles.luxuryActionIcon, { backgroundColor: '#EFF6FF' }]}>
                                                        <Ionicons name="mail" size={18} color="#3B82F6" />
                                                    </View>
                                                    <Text style={styles.luxuryActionText}>{selectedItem.data.email}</Text>
                                                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                                                </TouchableOpacity>
                                            )}

                                            {selectedItem.data.website && (
                                                <TouchableOpacity style={styles.luxuryActionRow} onPress={() => Linking.openURL(selectedItem.data.website)}>
                                                    <View style={[styles.luxuryActionIcon, { backgroundColor: '#F5F3FF' }]}>
                                                        <Ionicons name="globe" size={18} color="#8B5CF6" />
                                                    </View>
                                                    <Text style={styles.luxuryActionText}>Strona internetowa</Text>
                                                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* Footer Info (Coordinates) */}
                                        <View style={styles.luxuryFooter}>
                                            <Ionicons name="location" size={12} color="#9CA3AF" />
                                            <Text style={styles.luxuryFooterText}>
                                                Współrzędne: {selectedItem.data.lat.toFixed(6)}, {selectedItem.data.lon.toFixed(6)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Pharmacy Info */}
                            {selectedItem?.type === 'PHARMACY' && (selectedItem.data.description || selectedItem.data.opening_hours) && (
                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>Dodatkowe informacje</Text>
                                    <View style={styles.descBox}>
                                        <Text style={styles.descText}>
                                            {selectedItem.data.description || selectedItem.data.opening_hours}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            <View style={{ height: 50 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Emergency Numbers Modal */}
            <Modal visible={showEmergencyModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowEmergencyModal(false)} />
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Numery Alarmowe</Text>
                        <View style={styles.emergencyGrid}>
                            {[
                                { n: '112', l: 'Alarmowy', c: '#EF4444' },
                                { n: '999', l: 'Pogotowie', c: '#EF4444' },
                                { n: '998', l: 'Straż Poż.', c: '#F97316' },
                                { n: '997', l: 'Policja', c: '#3B82F6' },
                            ].map((item, i) => (
                                <TouchableOpacity key={i} onPress={() => Linking.openURL(`tel:${item.n}`)} style={[styles.emergencyBtn, { borderColor: item.c }]}>
                                    <Text style={[styles.emergencyNum, { color: item.c }]}>{item.n}</Text>
                                    <Text style={styles.emergencyLabel}>{item.l}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity onPress={() => setShowEmergencyModal(false)} style={styles.closeModalBtn}>
                            <Text style={styles.closeModalText}>ZAMKNIJ</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    header: { position: 'absolute', top: 50, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 24, padding: 12, flexDirection: 'row', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { flex: 1, marginLeft: 16 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
    headerSub: { fontSize: 11, color: '#6B7280', fontWeight: 'bold' },
    filterWrapper: { position: 'absolute', bottom: 130, left: 0, right: 0, zIndex: 10 },
    filterScroll: { paddingHorizontal: 16 },
    filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, marginRight: 12, elevation: 5 },
    filterChipActive: { backgroundColor: '#111827' },
    filterText: { marginLeft: 8, fontSize: 14, fontWeight: '800', color: '#4B5563' },
    markerContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    dotMarker: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, maxHeight: '85%' },
    dragIndicator: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalLabel: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase' },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
    closeBtn: { padding: 4 },
    modalScroll: { flexGrow: 1 },
    modalScrollContent: { paddingBottom: 20 },
    infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 20, marginBottom: 20 },
    infoTextPrimary: { fontSize: 16, fontWeight: '800', color: '#111827' },
    infoTextSecondary: { fontSize: 14, color: '#6B7280' },
    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
    actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
    sectionContainer: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 12 },
    queueCard: { backgroundColor: '#FFF5F5', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#FEE2E2' },
    queueTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    queueName: { fontSize: 15, fontWeight: '800', color: '#111827' },
    queueBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    queueValue: { color: '#fff', fontWeight: '900', fontSize: 14 },
    triageBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', padding: 8, borderRadius: 8 },
    triageText: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
    qualityCard: { flexDirection: 'row', alignItems: 'center', gap: 20, backgroundColor: '#F0F9FF', padding: 20, borderRadius: 24, marginBottom: 12 },
    qualityScore: { fontSize: 32, fontWeight: '900', color: '#0369A1' },
    qualityLabel: { fontSize: 14, fontWeight: '800', color: '#0C4A6E' },
    qualityDate: { fontSize: 12, color: '#0EA5E9' },
    descBox: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 16 },
    descText: { fontSize: 14, color: '#4B5563', fontWeight: '600', flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    loaderBox: { alignItems: 'center', padding: 20 },
    loaderText: { fontSize: 13, color: '#6B7280', marginTop: 10, fontWeight: '600' },
    emptyBox: { padding: 20, backgroundColor: '#F9FAFB', borderRadius: 16, alignItems: 'center' },
    emergencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
    emergencyBtn: { width: '48%', padding: 16, borderRadius: 20, borderWidth: 2, alignItems: 'center' },
    emergencyNum: { fontSize: 24, fontWeight: '900' },
    emergencyLabel: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
    closeModalBtn: { marginTop: 20, backgroundColor: '#F3F4F6', padding: 16, borderRadius: 16, alignItems: 'center' },
    closeModalText: { fontWeight: '900', color: '#374151' },
    loadingToast: { position: 'absolute', top: 110, alignSelf: 'center', backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 10 },
    bottomToast: { position: 'absolute', bottom: 200, alignSelf: 'center', backgroundColor: '#1F2937', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
    bottomToastText: { color: '#BFDBFE', fontSize: 13, fontWeight: '800' },
    loadingToastText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', color: '#9CA3AF', padding: 20 },
    badge24h: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#10B981',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#fff'
    },
    badge24hText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '900'
    },
    legendContainer: {
        position: 'absolute',
        top: 140, // Increased gap from header
        right: 16,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 8,
        borderRadius: 12,
        gap: 6,
        elevation: 3
    },
    legendTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 4
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5
    },
    legendText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#374151'
    },
    statsContainer: {
        position: 'absolute',
        top: 140, // Consistent gap with legend
        left: 16,
        flexDirection: 'column',
        gap: 8,
        backgroundColor: 'transparent'
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4
    },
    statText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '900'
    },
    aedNameBox: {
        backgroundColor: '#DBEAFE',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#3B82F6'
    },
    aedNameText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E3A8A'
    },
    fabWrapper: {
        position: 'absolute',
        bottom: 220, // Lowered slightly
        right: 20,
        alignItems: 'center',
        zIndex: 20
    },
    fab24h: {
        backgroundColor: '#fff',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        borderWidth: 2,
        borderColor: '#1E293B'
    },
    hintBubble: {
        position: 'absolute',
        right: 75, // Adjusted right
        top: 15,   // Adjusted top
        backgroundColor: '#1E293B',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 6,
        minWidth: 120,
        alignItems: 'center',
    },
    hintText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    hintArrow: {
        position: 'absolute',
        right: -6,
        top: 12,
        width: 0,
        height: 0,
        borderTopWidth: 6,
        borderBottomWidth: 6,
        borderLeftWidth: 6,
        borderStyle: 'solid',
        backgroundColor: 'transparent',
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: '#1E293B',
    },
    fabText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#1E293B',
        marginTop: -2
    },
    quickActionsContainer: {
        position: 'absolute',
        top: 110,
        right: 16,
        gap: 12
    },
    // Floating Counter Card Styles
    statsFloatingCard: {
        position: 'absolute',
        top: 140,
        left: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 16,
        padding: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        gap: 12,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    cardStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 1,
    },
    cardStatLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    cardStatValue: {
        fontSize: 12,
        fontWeight: '900',
        color: '#111827',
        marginTop: -2,
    },
    cardStatAction: {
        fontSize: 10,
        color: '#F59E0B',
        fontWeight: '900',
    },
    // Premium AED Modal Styles
    premiumSection: {
        marginTop: 10,
    },
    luxuryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    luxuryTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    luxuryContent: {
        gap: 16,
    },
    luxuryBadgeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    accessBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    accessBadgeText: {
        fontSize: 10,
        fontWeight: '900',
    },
    indoorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    indoorBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#92400E',
    },
    luxuryMainCard: {
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    luxuryMainText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
        lineHeight: 24,
    },
    luxuryNoteText: {
        fontSize: 12,
        color: '#EF4444',
        fontWeight: '700',
        marginTop: 10,
        backgroundColor: '#FEF2F2',
        padding: 8,
        borderRadius: 8,
    },
    luxuryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    luxuryGridItem: {
        backgroundColor: '#fff',
        width: '48%',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    luxuryGridLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    luxuryGridValue: {
        fontSize: 12,
        fontWeight: '800',
        color: '#334155',
    },
    luxuryActionList: {
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    luxuryActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    luxuryActionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    luxuryActionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    luxuryFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
        paddingBottom: 20,
    },
    luxuryFooterText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
    }
});
