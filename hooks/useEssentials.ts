
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SorService, SorHospital } from '@/services/sor';
import { AedService, AEDPoint } from '@/services/aed';
import { HospitalService, GeneralHospital } from '@/services/hospitals';
import { PharmacyService, PharmacyPoint } from '@/services/pharmacy';
import pharmacyData from '@/services/cachedPharmacies.json';
import hospitalData from '@/services/finalHospitals.json';
import manualData from '@/services/manualEssentials.json';
import aedData from '@/services/cachedAED.json';

// Use same base URL as Transport Config or hardcoded
const WP_API_BASE = 'https://kaszuby24.pl/wp-json/kaszuby24/v2';

export type FilterType = 'ALL' | 'SOR' | 'AED' | 'HOSPITAL' | 'PHARMACY' | 'MEDICAL' | 'MEVO';

export interface MevoBike {
    bike_id: string;
    lat: number;
    lon: number;
    battery_level?: number;
    is_reserved?: boolean;
    is_disabled?: boolean;
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

const CACHE_KEYS = {
    SOR: 'essentials_sor_cache',
    HOSPITALS: 'essentials_hosp_cache',
    AED: 'essentials_aed_cache',
    PHARMACY: 'essentials_pharm_cache',
    LAST_UPDATE: 'essentials_last_update'
};

const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export const useEssentials = () => {
    const [loading, setLoading] = useState(false);
    const [areEssentialsLoading, setAreEssentialsLoading] = useState(false);
    const [hospitals, setHospitals] = useState<SorHospital[]>([]);
    const [aedPoints, setAedPoints] = useState<AEDPoint[]>([]);
    const [generalHospitals, setGeneralHospitals] = useState<GeneralHospital[]>([]);
    const [pharmacies, setPharmacies] = useState<PharmacyPoint[]>([]);
    const [mevoBikes, setMevoBikes] = useState<MevoBike[]>([]);
    const [mevoStations, setMevoStations] = useState<MevoStation[]>([]);
    const [activeFilter, setActiveFilter] = useState<FilterType>('MEDICAL');

    useEffect(() => {
        initData();
    }, []);

    const initData = async () => {
        setLoading(true);
        try {
            // Priority 1: Load everything from static JSONs to ensure fresh state
            // This ensures that even if cache is stale/broken, the app starts with valid data

            // Hospitals
            const staticHospitals = hospitalData.map(h => ({
                id_gsl_miej: h.id,
                nazwa_swd: h.name,
                adr_lok_ulica: h.address,
                adr_lok_miejsc: '',
                adr_lok_nr_domu: '',
                adr_lok_kod_poczt: '',
                telefon_rej: h.phone,
                lat: h.lat,
                lng: h.lon,
                type: h.type || 'NiSOZ',
                numer_ksiegi: h.api_id || '',
                Województwo: 'Pomorskie'
            }));
            setHospitals(staticHospitals);

            // Pharmacies
            const manualPharmacies = getManualPharmacies();
            const offlinePharmacies: PharmacyPoint[] = (pharmacyData as any[]).map(p => {
                const h = (p.opening_hours || '').toLowerCase();
                const is24h = h.includes('24/7') || h.includes('00:00-24:00') || h.includes('0:00-24:00');
                return {
                    id: p.id,
                    name: p.name,
                    address: p.address,
                    phone: p.phone,
                    lat: parseFloat(p.lat),
                    lon: parseFloat(p.lon),
                    opening_hours: p.opening_hours,
                    is24h,
                };
            });
            const mergedPharmacies = mergePharmacies(offlinePharmacies, manualPharmacies);
            setPharmacies(mergedPharmacies);

            // AEDs
            const aedList: AEDPoint[] = (aedData as any[]).map(a => {
                const tags = a.tags || {};
                return {
                    id: a.id.toString(),
                    lat: a.lat,
                    lon: a.lon,
                    location: tags['defibrillator:location:pl'] || tags['defibrillator:location'] || tags['description:pl'] || tags['description'] || 'Punkt AED',
                    access: tags['access'],
                    operator: tags['operator:pl'] || tags['operator'],
                    phone: tags['contact:phone'] || tags['phone'] || tags['phone:mobile'],
                    opening_hours: tags['opening_hours'],
                    indoor: tags['indoor'],
                    description: tags['description:pl'] || tags['description'],
                    'defibrillator:location': tags['defibrillator:location'],
                    'defibrillator:location:pl': tags['defibrillator:location:pl'],
                    'defibrillator:brand': tags['brand'] || tags['defibrillator:brand'],
                    model: tags['model'],
                    level: tags['level'],
                    floor: tags['floor'],
                    room: tags['room'],
                    note: tags['note:pl'] || tags['note'],
                    email: tags['contact:email'] || tags['email'],
                    website: tags['contact:website'] || tags['website'],
                };
            });
            setAedPoints(aedList);

            // Update all caches in background
            AsyncStorage.multiSet([
                [CACHE_KEYS.SOR, JSON.stringify(staticHospitals)],
                [CACHE_KEYS.PHARMACY, JSON.stringify(mergedPharmacies)],
                [CACHE_KEYS.AED, JSON.stringify(aedList)],
                [CACHE_KEYS.LAST_UPDATE, Date.now().toString()]
            ]);

            // MEVO data loaded on demand (when user opens MEVO screen) - not pre-loaded to avoid redundant fetches

        } catch (e) {
            console.warn("Init data error:", e);
        } finally {
            setLoading(false);
        }
    };

    const getManualHospitals = (): SorHospital[] => {
        return (manualData.hospitals || [])
            .filter((h: any) => h.lat !== null && h.lon !== null)
            .map((h: any) => ({
                id_gsl_miej: h.id,
                nazwa_swd: h.name,
                adr_lok_ulica: h.address,
                adr_lok_miejsc: '',
                adr_lok_nr_domu: '',
                adr_lok_kod_poczt: '',
                telefon_rej: h.phone,
                lat: h.lat,
                lng: h.lon,
                type: 'NiSOZ',
                numer_ksiegi: h.id,
                Województwo: 'Pomorskie'
            }));
    };

    const getManualPharmacies = (): PharmacyPoint[] => {
        return (manualData.pharmacies || [])
            .filter((p: any) => p.lat !== null && p.lon !== null)
            .map((p: any) => ({
                id: p.id,
                name: p.name,
                address: p.address,
                phone: p.phone,
                lat: p.lat as number,
                lon: p.lon as number,
                is24h: p.is24h
            }));
    };


    const mergePharmacies = (dynamic: PharmacyPoint[], manual: PharmacyPoint[]) => {
        const unique = new Map<string, PharmacyPoint>();
        manual.forEach(p => {
            const key = p.id || `${p.lat.toFixed(5)}_${p.lon.toFixed(5)}`;
            unique.set(key, p);
        });
        dynamic.forEach(p => {
            const key = p.id || `${p.lat.toFixed(5)}_${p.lon.toFixed(5)}`;
            // Priority to manual (usually has phone/24h info)
            const exists = Array.from(unique.values()).some(up =>
                (Math.abs(up.lat - p.lat) < 0.0005 && Math.abs(up.lon - p.lon) < 0.0005)
            );
            if (!unique.has(key) && !exists) {
                unique.set(key, p);
            }
        });
        return Array.from(unique.values());
    };

    const refreshStaticData = async () => {
        try {
            // Reuse initData logic mostly, or just re-run initData
            await initData();
        } catch (e) {
            console.error("Refresh Error:", e);
        }
    };

    const fetchMevoBikes = async () => {
        setAreEssentialsLoading(true);
        try {
            const { bikes, stations } = await import('../services/mevoService').then(m => m.fetchAllMevoData());

            setMevoBikes(bikes);
            setMevoStations(stations);
        } catch (e) {
            console.warn('[Essentials] Mevo fetch failed', e);
            setMevoBikes([]);
            setMevoStations([]);
        } finally {
            setAreEssentialsLoading(false);
        }
    }


    const fetchNearbyDynamic = async (type: FilterType, lat: number, lon: number) => {
        if (type === 'MEVO') {
            fetchMevoBikes();
            return;
        }

        setAreEssentialsLoading(true);
        try {
            if (type === 'PHARMACY' || type === 'ALL') {
                // Pharmacies are now fully offline/cached, no need to fetch dynamically
            }
            if (type === 'AED' || type === 'ALL') {
                // AEDs are now offline, no dynamic fetch needed
            }
        } catch (e) {
            console.warn("Dynamic fetch error", e);
        } finally {
            setAreEssentialsLoading(false);
        }
    };

    const fetchByViewport = async (type: FilterType, minLat: number, minLon: number, maxLat: number, maxLon: number) => {
        if (type === 'MEVO') {
            // Mevo is fetched globally or not by viewport for now? 
            // The API fetches all bikes usually or nearby? The endpoint seems generic.
            // Let's call fetchMevoBikes() if not already loaded or just specific viewport logic if supported.
            // For now, simple fetch.
            if (mevoBikes.length === 0) fetchMevoBikes();
            return;
        }

        setAreEssentialsLoading(true);
        try {
            if (type === 'PHARMACY' || type === 'ALL') {
                // Pharmacies are now fully offline/cached
            }
            if (type === 'AED' || type === 'ALL') {
                // AEDs are now offline
            }
        } catch (e) {
            console.warn("Viewport fetch error", e);
        } finally {
            setAreEssentialsLoading(false);
        }
    };

    const handleFilterChange = async (newFilter: FilterType, lat?: number, lon?: number) => {
        setActiveFilter(newFilter);
        if (newFilter === 'MEVO') {
            fetchMevoBikes();
        }
        else if (newFilter === 'PHARMACY' || newFilter === 'AED' || newFilter === 'ALL') {
            // ... existing logic ...
        }
    };

    return {
        loading,
        areEssentialsLoading,
        hospitals,
        aedPoints,
        generalHospitals,
        pharmacies,
        mevoBikes,
        mevoStations,
        activeFilter,
        setActiveFilter: handleFilterChange,
        fetchNearbyDynamic,
        fetchByViewport,
        refresh: refreshStaticData,
        fetchMevoBikes,
    };
};
