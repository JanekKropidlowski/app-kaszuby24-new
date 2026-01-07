
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SorService, SorHospital } from '@/services/sor';
import { AedService, AEDPoint } from '@/services/aed';
import { HospitalService, GeneralHospital } from '@/services/hospitals';
import { PharmacyService, PharmacyPoint } from '@/services/pharmacy';
import pharmacyData from '@/services/cachedPharmacies.json';
import hospitalData from '@/services/finalHospitals.json';
import manualData from '@/services/manualEssentials.json';
import aedData from '@/services/cachedAED.json';

export type FilterType = 'ALL' | 'SOR' | 'AED' | 'HOSPITAL' | 'PHARMACY' | 'MEDICAL';

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
            const offlinePharmacies: PharmacyPoint[] = (pharmacyData as any[]).map(p => ({
                id: p.id,
                name: p.name,
                address: p.address,
                phone: p.phone,
                lat: parseFloat(p.lat),
                lon: parseFloat(p.lon),
                is24h: false
            }));
            const mergedPharmacies = mergePharmacies(offlinePharmacies, manualPharmacies);
            setPharmacies(mergedPharmacies);

            // AEDs - This was missing from initialization before!
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
            const key = p.id || `${p.lat.toFixed(5)}_${p.lon.toFixed(5)} `;
            unique.set(key, p);
        });
        dynamic.forEach(p => {
            const key = p.id || `${p.lat.toFixed(5)}_${p.lon.toFixed(5)} `;
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
            // 1. Load Pre-Merged Hospitals (Offline First)
            // Loads ALL hospitals (Cleaned Manual + API) from finalHospitals.json
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
            AsyncStorage.setItem(CACHE_KEYS.SOR, JSON.stringify(staticHospitals));

            // 2. Load Pharmacies (Offline First)
            const manualPharmacies = getManualPharmacies();
            // Load downloaded cache
            const offlinePharmacies: PharmacyPoint[] = (pharmacyData as any[]).map(p => ({
                id: p.id,
                name: p.name,
                address: p.address,
                phone: p.phone,
                lat: parseFloat(p.lat),
                lon: parseFloat(p.lon),
                is24h: false
            }));

            // Smart Merge Pharmacies
            const mergedPharmacies = mergePharmacies(offlinePharmacies, manualPharmacies);

            setPharmacies(mergedPharmacies);
            AsyncStorage.setItem(CACHE_KEYS.PHARMACY, JSON.stringify(mergedPharmacies));

            AsyncStorage.setItem(CACHE_KEYS.PHARMACY, JSON.stringify(mergedPharmacies));

            // 3. Load AEDs (Offline First) - Map ALL available GeoJSON properties
            const aedList: AEDPoint[] = (aedData as any[])
                .map(a => {
                    const tags = a.tags || {};
                    return {
                        id: a.id.toString(),
                        lat: a.lat,
                        lon: a.lon,
                        // Location info (prioritize most detailed)
                        location: tags['defibrillator:location:pl'] || tags['defibrillator:location'] || tags['description:pl'] || tags['description'] || tags['location'] || tags['note'] || 'Punkt AED',
                        access: tags['access'],
                        operator: tags['operator:pl'] || tags['operator'],
                        phone: tags['contact:phone'] || tags['phone'] || tags['phone:mobile'] || tags['contact:mobile'],
                        opening_hours: tags['opening_hours'],
                        indoor: tags['indoor'],
                        // Additional GeoJSON fields
                        description: tags['description:pl'] || tags['description'],
                        'defibrillator:location': tags['defibrillator:location'],
                        'defibrillator:location:pl': tags['defibrillator:location:pl'],
                        'defibrillator:brand': tags['brand'] || tags['defibrillator:brand'],
                        model: tags['model'],
                        manufacturer: tags['manufacturer'],
                        addr_street: tags['addr:street'],
                        addr_housenumber: tags['addr:housenumber'],
                        addr_city: tags['addr:city'],
                        addr_postcode: tags['addr:postcode'],
                        addr_full: tags['addr:full'],
                        level: tags['level'],
                        floor: tags['addr:floor'] || tags['floor'],
                        note: tags['note:pl'] || tags['note'],
                        email: tags['contact:email'] || tags['email'],
                        website: tags['contact:website'] || tags['website'],
                        wheelchair: tags['wheelchair'],
                        name: tags['name:pl'] || tags['name'],
                        ref: tags['ref'],
                        room: tags['room'],
                        check_date: tags['check_date'],
                        installation_date: tags['installation_date']
                    };
                });
            setAedPoints(aedList);
            AsyncStorage.setItem(CACHE_KEYS.AED, JSON.stringify(aedList));

            AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
        } catch (e) {
            console.error("Refresh Error:", e);
        }
    };


    const fetchNearbyDynamic = async (type: FilterType, lat: number, lon: number) => {
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
        if (newFilter === 'PHARMACY' || newFilter === 'AED' || newFilter === 'ALL') {
            const targetLat = lat || hospitals[0]?.lat;
            const targetLon = lon || hospitals[0]?.lng;
            if (targetLat && targetLon) {
                fetchNearbyDynamic(newFilter, targetLat, targetLon);
            }
        }
    };

    return {
        loading,
        areEssentialsLoading,
        hospitals,
        aedPoints,
        generalHospitals,
        pharmacies,
        activeFilter,
        setActiveFilter: handleFilterChange,
        fetchNearbyDynamic,
        fetchByViewport,
        refresh: refreshStaticData
    };
};
