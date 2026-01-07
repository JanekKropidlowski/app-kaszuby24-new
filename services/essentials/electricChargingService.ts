import axios from 'axios';

export interface ElectricChargingUnit {
  id: string;
  poolId: string;
  poolCode: string;
  poolName: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  postalCode: string;
  street: string;
  houseNumber: string;
  accessibility?: string;
  operatingHours?: any[];
  closingHours?: any[];
  images?: any[];
  distance?: number;
  stations?: any[];
  elevation?: number;
}

const EIPA_API_BASE = 'https://eipa.udt.gov.pl/api';
// Note: In production, these credentials would come from secure storage
// For demo purposes, using placeholder - real implementation would require proper auth
const EIPA_CREDENTIALS = {
  username: 'demo_user', // This would be provided by EIPA
  password: 'demo_pass'  // This would be provided by EIPA
};

let eipaToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Get authentication token for EIPA API
 */
const getEipaToken = async (): Promise<string | null> => {
  // Check if we have a valid token
  if (eipaToken && tokenExpiry && Date.now() < tokenExpiry) {
    return eipaToken;
  }

  try {
    const response = await axios.post(`${EIPA_API_BASE}/token`, {
      username: EIPA_CREDENTIALS.username,
      password: EIPA_CREDENTIALS.password
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    if (response.data && response.data.token) {
      eipaToken = response.data.token;
      // Token expires in 60 minutes
      tokenExpiry = Date.now() + (60 * 60 * 1000);
      return eipaToken;
    }
  } catch (error) {
    console.warn('Failed to get EIPA token:', error);
  }

  return null;
};

/**
 * Fetch electric charging pools (bases) in Pomerania
 * UWAGA: To jest mock data ponieważ prawdziwe API wymaga specjalnych danych uwierzytelniających
 */
export const fetchElectricChargingPomorskie = async (): Promise<ElectricChargingUnit[]> => {
  // Mock data dla demonstracji - prawdziwe API wymaga specjalnych danych uwierzytelniających od EIPA
  const mockChargingStations: ElectricChargingUnit[] = [
    {
      id: 'charging-mock-1',
      poolId: '1',
      poolCode: 'PL-V0J-P001',
      poolName: 'Stacja Ładowania Gdańsk Centrum',
      lat: 54.3521,
      lng: 18.6464,
      address: 'ul. Długa 12',
      city: 'Gdańsk',
      postalCode: '80-831',
      street: 'Długa',
      houseNumber: '12',
      accessibility: 'Przy rynku głównym, łatwy dostęp',
      operatingHours: [{ from_time: '00:00', to_time: '23:59', weekday: 1 }],
      stations: [{ id: 1 }, { id: 2 }],
      elevation: 10
    },
    {
      id: 'charging-mock-2',
      poolId: '2',
      poolCode: 'PL-V0J-P002',
      poolName: 'GreenCharge Gdynia',
      lat: 54.5189,
      lng: 18.5305,
      address: 'ul. 10 Lutego 24',
      city: 'Gdynia',
      postalCode: '81-364',
      street: '10 Lutego',
      houseNumber: '24',
      accessibility: 'Parking przy dworcu PKP',
      operatingHours: [{ from_time: '06:00', to_time: '22:00', weekday: 1 }],
      stations: [{ id: 3 }, { id: 4 }, { id: 5 }],
      elevation: 25
    },
    {
      id: 'charging-mock-3',
      poolId: '3',
      poolCode: 'PL-V0J-P003',
      poolName: 'ElectroHub Słupsk',
      lat: 54.4641,
      lng: 17.0281,
      address: 'ul. Portowa 8',
      city: 'Słupsk',
      postalCode: '76-200',
      street: 'Portowa',
      houseNumber: '8',
      accessibility: 'Przy porcie miejskim',
      operatingHours: [{ from_time: '00:00', to_time: '23:59', weekday: 1 }],
      stations: [{ id: 6 }],
      elevation: 5
    },
    {
      id: 'charging-mock-4',
      poolId: '4',
      poolCode: 'PL-V0J-P004',
      poolName: 'ChargePoint Kołobrzeg',
      lat: 54.1716,
      lng: 15.5657,
      address: 'ul. Morska 156',
      city: 'Kołobrzeg',
      postalCode: '78-100',
      street: 'Morska',
      houseNumber: '156',
      accessibility: 'Plaża miejska, parking publiczny',
      operatingHours: [{ from_time: '08:00', to_time: '20:00', weekday: 1 }],
      stations: [{ id: 7 }, { id: 8 }],
      elevation: 2
    }
  ];

  console.log(`Loaded ${mockChargingStations.length} mock electric charging stations in Pomerania`);
  return mockChargingStations;

  // Jeśli chcesz użyć prawdziwego API, odkomentuj poniższy kod:
  /*
  try {
    const token = await getEipaToken();
    if (!token) {
      console.warn('No EIPA token available, using mock data');
      return mockChargingStations;
    }

    const poolsResponse = await axios.get(`${EIPA_API_BASE}/pools`, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 10000
    });

    if (!poolsResponse.data || !Array.isArray(poolsResponse.data)) {
      return mockChargingStations;
    }

    const chargingUnits: ElectricChargingUnit[] = [];

    for (const pool of poolsResponse.data.slice(0, 20)) {
      try {
        const poolDetails = await axios.get(`${EIPA_API_BASE}/pools/${pool.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 8000
        });

        const data = poolDetails.data;
        if (data && data.latitude && data.longitude) {
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);

          if (lat >= 53.5 && lat <= 55.0 && lng >= 16.0 && lng <= 20.0) {
            chargingUnits.push({
              id: `charging-${data.id}`,
              poolId: data.id.toString(),
              poolCode: data.code || pool.code,
              poolName: data.name || 'Stacja ładowania',
              lat: lat,
              lng: lng,
              address: `${data.street || ''} ${data.house_number || ''}`.trim() || 'Brak adresu',
              city: data.city || '',
              postalCode: data.postal_code || '',
              street: data.street || '',
              houseNumber: data.house_number || '',
              accessibility: data.accessibility || '',
              operatingHours: data.operating_hours || [],
              closingHours: data.closing_hours || [],
              images: data.images || [],
              stations: data.stations || [],
              elevation: data.elevation || 0
            });
          }
        }
      } catch (poolError) {
        console.warn(`Failed to get details for pool ${pool.id}:`, poolError);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Loaded ${chargingUnits.length} electric charging stations in Pomerania`);
    return chargingUnits.length > 0 ? chargingUnits : mockChargingStations;

  } catch (error: any) {
    console.warn('Error fetching electric charging stations, using mock data:', error.message);
    return mockChargingStations;
  }
  */
};

/**
 * Fetch electric charging stations near a location
 */
export const fetchElectricChargingNearby = async (
  lat: number,
  lng: number,
  radius: number = 10000
): Promise<ElectricChargingUnit[]> => {
  // For nearby search, we'll get all Pomerania stations and filter by distance
  const allStations = await fetchElectricChargingPomorskie();

  return allStations.filter(station => {
    const distance = getDistanceFromLatLonInKm(lat, lng, station.lat, station.lng);
    station.distance = distance * 1000; // Convert to meters
    return distance * 1000 <= radius;
  }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
};

/**
 * Calculate distance between two points using Haversine formula
 */
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}
