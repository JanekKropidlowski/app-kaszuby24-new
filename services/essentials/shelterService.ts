import axios from 'axios';

export interface ShelterUnit {
  id: string;
  id_publiczny: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  district: string; // powiat
  voivodeship: string; // województwo
  type: string; // typ_obiektu
  capacity: number; // pojemnosc
  area?: number; // powierzchnia w m²
  status: string; // status_dostepnosci
  operatingHours?: string; // dostepnosc_godzinowa (np. "24/7")
  distance?: number;
  walkingTime?: number; // czas_dojazdu_pieszo w minutach
  equipment?: string[]; // wyposazenie
  threatCategories?: string[]; // kategoria_zagrozenia
  owner?: string; // wlasciciel
  contact?: string; // kontakt_administracyjny
  notes?: string; // uwagi
  lastUpdated?: string;
  lastVerified?: string; // data_weryfikacji
  images?: string[]; // zdjecia
  evacuationPlans?: string[]; // plany_ewakuacyjne
}

export interface ShelterFilters {
  objectTypes?: string[]; // ['schron', 'ukrycie', 'piwnica']
  minCapacity?: number;
  onlyApproved?: boolean; // tylko aktywne
  maxDistance?: number; // w metrach
  threatCategories?: string[]; // ['wojna', 'promieniowanie']
}

export interface GeocodingResult {
  place_id: string;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
  score: number;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface RouteResult {
  distance: number; // w metrach
  duration: number; // w sekundach
  polyline: string; // zakodowana linia
  instructions: RouteInstruction[];
}

export interface RouteInstruction {
  text: string;
  distance: number; // w metrach
  time: number; // w sekundach
  type: string; // 'turn', 'straight', etc.
}

const SHELTER_API_BASE = 'https://gdziesieukryc.pl/api';

/**
 * Pobiera schrony w pobliżu danej lokalizacji
 */
export const fetchSheltersNearby = async (
  lat: number,
  lng: number,
  radius: number = 5000,
  limit: number = 50
): Promise<ShelterUnit[]> => {
  try {
    const response = await axios.get(`${SHELTER_API_BASE}/shelters/nearby`, {
      params: { lat, lng, radius, limit },
      timeout: 10000
    });

    if (response.data && response.data.data) {
      return response.data.data.map((shelter: any) => ({
        id: `shelter-${shelter.id_publiczny}`,
        id_publiczny: shelter.id_publiczny,
        name: shelter.nazwa_schronu || 'Schron',
        lat: parseFloat(shelter.lokalizacja_lat),
        lng: parseFloat(shelter.lokalizacja_lon),
        address: shelter.adres || '',
        city: shelter.gmina || '',
        district: shelter.powiat || '',
        voivodeship: shelter.wojewodztwo || '',
        type: shelter.typ_obiektu || 'schron',
        capacity: shelter.pojemnosc || 0,
        area: shelter.powierzchnia || 0,
        status: shelter.status_dostepnosci || 'aktywny',
        operatingHours: shelter.dostepnosc_godzinowa || '24/7',
        equipment: Array.isArray(shelter.wyposazenie) ? shelter.wyposazenie : [],
        threatCategories: Array.isArray(shelter.kategoria_zagrozenia) ? shelter.kategoria_zagrozenia : [],
        owner: shelter.wlasciciel || '',
        contact: shelter.kontakt_administracyjny || '',
        notes: shelter.uwagi || '',
        lastUpdated: shelter.data_aktualizacji || '',
        lastVerified: shelter.data_weryfikacji || '',
        images: Array.isArray(shelter.zdjecia) ? shelter.zdjecia : [],
        evacuationPlans: Array.isArray(shelter.plany_ewakuacyjne) ? shelter.plany_ewakuacyjne : [],
        distance: shelter.dystans_metry || 0,
        walkingTime: shelter.czas_dojazdu_pieszo || 0
      }));
    }
    return [];
  } catch (error: any) {
    console.warn('Error fetching shelters:', error.message);
    return [];
  }
};

/**
 * Pobiera schrony dla województwa pomorskiego
 * UWAGA: To jest mock data ponieważ prawdziwe API może nie działać
 */
export const fetchSheltersPomorskie = async (): Promise<ShelterUnit[]> => {
  // Mock data dla demonstracji - prawdziwe API może wymagać innych parametrów
  const mockShelters: ShelterUnit[] = [
    {
      id: 'shelter-mock-1',
      id_publiczny: 'SCH-POM-001',
      name: 'Schron Wojskowy Gdańsk',
      lat: 54.3521,
      lng: 18.6464,
      address: 'ul. Wojenna 15',
      city: 'Gdańsk',
      district: 'Gdańsk',
      voivodeship: 'pomorskie',
      type: 'schron',
      capacity: 200,
      status: 'aktywny',
      equipment: ['wentylacja', 'woda', 'toalety'],
      owner: 'MON',
      contact: 'PSP Gdańsk',
      notes: 'Dostępny 24/7',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'shelter-mock-2',
      id_publiczny: 'SCH-POM-002',
      name: 'Schron Gdynia',
      lat: 54.5189,
      lng: 18.5305,
      address: 'ul. Morska 45',
      city: 'Gdynia',
      district: 'Gdynia',
      voivodeship: 'pomorskie',
      type: 'ukrycie',
      capacity: 150,
      status: 'aktywny',
      equipment: ['wentylacja', 'woda'],
      owner: 'PSP',
      contact: 'Straż Gdynia',
      notes: 'W piwnicy budynku mieszkalnego',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'shelter-mock-3',
      id_publiczny: 'SCH-POM-003',
      name: 'Schron Słupsk',
      lat: 54.4641,
      lng: 17.0281,
      address: 'ul. Kolejowa 12',
      city: 'Słupsk',
      district: 'Słupsk',
      voivodeship: 'pomorskie',
      type: 'schron',
      capacity: 300,
      status: 'aktywny',
      equipment: ['wentylacja', 'woda', 'toalety', 'radio'],
      owner: 'MON',
      contact: 'Wojsko Polskie',
      notes: 'Duży schron wojskowy',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'shelter-mock-4',
      id_publiczny: 'SCH-POM-004',
      name: 'Schron Kołobrzeg',
      lat: 54.1716,
      lng: 15.5657,
      address: 'ul. Morska 89',
      city: 'Kołobrzeg',
      district: 'Kołobrzeg',
      voivodeship: 'pomorskie',
      type: 'piwnica',
      capacity: 80,
      status: 'aktywny',
      equipment: ['wentylacja'],
      owner: 'Samorząd',
      contact: 'Urząd Miasta',
      notes: 'Piwnica w ratuszu',
      lastUpdated: new Date().toISOString()
    }
  ];

  console.log(`Loaded ${mockShelters.length} mock shelters in Pomerania`);
  return mockShelters;

  // Jeśli chcesz użyć prawdziwego API, odkomentuj poniższy kod:
  /*
  try {
    const centers = [
      { lat: 54.3521, lng: 18.6464, name: 'Gdańsk' },
      { lat: 54.5189, lng: 18.5305, name: 'Gdynia' },
      { lat: 54.4641, lng: 17.0281, name: 'Słupsk' },
      { lat: 54.1716, lng: 15.5657, name: 'Koszalin' },
      { lat: 54.1944, lng: 16.1722, name: 'Kołobrzeg' },
    ];

    const allShelters: ShelterUnit[] = [];

    for (const center of centers) {
      const shelters = await fetchSheltersNearby(center.lat, center.lng, 25000, 20);
      const pomorskieShelters = shelters.filter(shelter =>
        shelter.voivodeship?.toLowerCase().includes('pomor') ||
        shelter.voivodeship?.toLowerCase().includes('pomorsk')
      );
      allShelters.push(...pomorskieShelters);
    }

    const uniqueShelters = allShelters.filter((shelter, index, self) =>
      index === self.findIndex(s => s.id_publiczny === shelter.id_publiczny)
    );

    console.log(`Loaded ${uniqueShelters.length} shelters in Pomerania`);
    return uniqueShelters.length > 0 ? uniqueShelters : mockShelters;
  } catch (error) {
    console.warn('Error fetching Pomeranian shelters, using mock data:', error);
    return mockShelters;
  }
  */
};

/**
 * Geokodowanie - wyszukiwanie adresów i miejscowości
 */
export const geocodeLocation = async (query: string): Promise<GeocodingResult[]> => {
  try {
    const response = await axios.get(`${SHELTER_API_BASE}/geocoding/search`, {
      params: { q: query },
      timeout: 5000
    });

    return response.data || [];
  } catch (error) {
    console.warn('Geocoding error:', error);
    return [];
  }
};

/**
 * Obliczanie trasy między dwoma punktami
 */
export const calculateRoute = async (
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult | null> => {
  try {
    const response = await axios.get(`${SHELTER_API_BASE}/route`, {
      params: {
        startLat,
        startLng,
        endLat,
        endLng
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.warn('Route calculation error:', error);
    return null;
  }
};

/**
 * Filtruje schroniska według kryteriów
 */
export const filterShelters = (shelters: ShelterUnit[], filters: ShelterFilters): ShelterUnit[] => {
  return shelters.filter(shelter => {
    // Typy obiektów
    if (filters.objectTypes && filters.objectTypes.length > 0) {
      if (!filters.objectTypes.includes(shelter.type)) return false;
    }

    // Minimalna pojemność
    if (filters.minCapacity && shelter.capacity < filters.minCapacity) return false;

    // Tylko zatwierdzone
    if (filters.onlyApproved && shelter.status !== 'aktywny') return false;

    // Maksymalna odległość
    if (filters.maxDistance && shelter.distance && shelter.distance > filters.maxDistance) return false;

    // Kategorie zagrożeń
    if (filters.threatCategories && filters.threatCategories.length > 0) {
      const shelterThreats = shelter.threatCategories || [];
      const hasMatchingThreat = filters.threatCategories.some(threat =>
        shelterThreats.includes(threat)
      );
      if (!hasMatchingThreat) return false;
    }

    return true;
  });
};

/**
 * Sortuje schroniska według różnych kryteriów
 */
export const sortShelters = (
  shelters: ShelterUnit[],
  sortBy: 'distance' | 'capacity' | 'walkingTime' = 'distance'
): ShelterUnit[] => {
  return [...shelters].sort((a, b) => {
    switch (sortBy) {
      case 'distance':
        return (a.distance || 0) - (b.distance || 0);
      case 'capacity':
        return b.capacity - a.capacity;
      case 'walkingTime':
        return (a.walkingTime || 0) - (b.walkingTime || 0);
      default:
        return 0;
    }
  });
};

/**
 * Oblicza odległość między dwoma punktami geograficznymi (w metrach)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Szacuje czas dojścia pieszo (w minutach) na podstawie odległości
 */
export const estimateWalkingTime = (distanceInMeters: number): number => {
  // Średnia prędkość chodzenia: 5 km/h = 83.33 m/min
  const walkingSpeedMPerMin = 83.33;
  return Math.round(distanceInMeters / walkingSpeedMPerMin);
};