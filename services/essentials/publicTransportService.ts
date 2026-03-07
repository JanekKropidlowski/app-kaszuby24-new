import axios from 'axios';

export interface PublicTransportStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  operator: 'pks_gdynia' | 'mzk_wejherowo' | 'ztk_gdynia' | 'ztm_gdansk' | 'polregio' | 'pkp' | 'intercity';
  lines?: string[];
  distance?: number;
}

const TRANSPORT_APIS = {
  pks_gdynia: 'https://pksgdynia.kiedyprzyjedzie.pl',
  mzk_wejherowo: 'https://mzkwejherowo.kiedyprzyjedzie.pl',
  ztk_gdynia: 'https://ztkgdynia.kiedyprzyjedzie.pl',
  ztm_gdansk: 'https://ztmgdansk.kiedyprzyjedzie.pl',
  polregio: 'https://kaszuby24.pl/wp-json/kaszuby24/v1/transport',
  pkp: 'https://kaszuby24.pl/wp-json/kaszuby24/v1/transport',
  intercity: 'https://kaszuby24.pl/wp-json/kaszuby24/v1/transport'
};

/**
 * Fetch public transport stops for Pomerania region
 * Using mock data since real APIs may have different structures
 */
export const fetchPublicTransportStops = async (): Promise<PublicTransportStop[]> => {
  // Mock data for demonstration - in production would connect to real APIs
  const mockStops: PublicTransportStop[] = [
    // PKS Gdynia
    {
      id: 'pks-gdynia-1',
      name: 'Dworzec Główny PKS Gdynia',
      lat: 54.5189,
      lng: 18.5305,
      operator: 'pks_gdynia',
      lines: ['101', '102', '150', '200']
    },
    {
      id: 'pks-gdynia-2',
      name: 'Gdynia Redłowo',
      lat: 54.5258,
      lng: 18.4742,
      operator: 'pks_gdynia',
      lines: ['101', '110', '120']
    },
    {
      id: 'pks-gdynia-3',
      name: 'Gdynia Chylonia',
      lat: 54.5069,
      lng: 18.5147,
      operator: 'pks_gdynia',
      lines: ['102', '130', '140']
    },

    // MZK Wejherowo
    {
      id: 'mzk-wejherowo-1',
      name: 'Wejherowo Dworzec',
      lat: 54.6053,
      lng: 18.2464,
      operator: 'mzk_wejherowo',
      lines: ['1', '2', '5', '10']
    },
    {
      id: 'mzk-wejherowo-2',
      name: 'Wejherowo Śmiechowo',
      lat: 54.5914,
      lng: 18.2319,
      operator: 'mzk_wejherowo',
      lines: ['2', '3', '7']
    },

    // ZTK Gdynia
    {
      id: 'ztk-gdynia-1',
      name: 'Gdynia Grabówek',
      lat: 54.5019,
      lng: 18.4642,
      operator: 'ztk_gdynia',
      lines: ['T1', 'T2', '20', '30']
    },
    {
      id: 'ztk-gdynia-2',
      name: 'Gdynia Wzgórze Św. Maksymiliana',
      lat: 54.4831,
      lng: 18.4744,
      operator: 'ztk_gdynia',
      lines: ['T1', '15', '25']
    },

    // ZTM Gdańsk
    {
      id: 'ztm-gdansk-1',
      name: 'Gdańsk Główny',
      lat: 54.3566,
      lng: 18.6444,
      operator: 'ztm_gdansk',
      lines: ['2', '3', '6', '8', '12']
    },
    {
      id: 'ztm-gdansk-2',
      name: 'Gdańsk Wrzeszcz',
      lat: 54.3814,
      lng: 18.6100,
      operator: 'ztm_gdansk',
      lines: ['3', '5', '8', '15']
    },
    {
      id: 'ztm-gdansk-3',
      name: 'Gdańsk Oliwa',
      lat: 54.4122,
      lng: 18.5694,
      operator: 'ztm_gdansk',
      lines: ['6', '12', '22']
    },

    // Polregio
    {
      id: 'polregio-1',
      name: 'Gdańsk Wrzeszcz (Polregio)',
      lat: 54.3814,
      lng: 18.6100,
      operator: 'polregio',
      lines: ['REG', 'R', 'IR']
    },
    {
      id: 'polregio-2',
      name: 'Gdynia Główna (Polregio)',
      lat: 54.5189,
      lng: 18.5305,
      operator: 'polregio',
      lines: ['REG', 'R']
    },

    // PKP
    {
      id: 'pkp-1',
      name: 'Gdańsk Główny PKP',
      lat: 54.3566,
      lng: 18.6444,
      operator: 'pkp',
      lines: ['TLK', 'IC', 'EIC']
    },
    {
      id: 'pkp-2',
      name: 'Gdynia Główna PKP',
      lat: 54.5189,
      lng: 18.5305,
      operator: 'pkp',
      lines: ['TLK', 'IC']
    },

    // Intercity
    {
      id: 'intercity-1',
      name: 'Gdańsk Główny (Intercity)',
      lat: 54.3566,
      lng: 18.6444,
      operator: 'intercity',
      lines: ['IC', 'EIC', 'EIP']
    },
    {
      id: 'intercity-2',
      name: 'Gdynia Główna (Intercity)',
      lat: 54.5189,
      lng: 18.5305,
      operator: 'intercity',
      lines: ['IC', 'EIP']
    }
  ];

  console.log(`Loaded ${mockStops.length} public transport stops`);
  return mockStops;

  // Uncomment below for real API integration
  /*
  try {
    const allStops: PublicTransportStop[] = [];

    // Try to fetch from various APIs
    for (const [operator, baseUrl] of Object.entries(TRANSPORT_APIS)) {
      try {
        const response = await axios.get(`${baseUrl}/stops`, { timeout: 5000 });
        if (response.data && Array.isArray(response.data)) {
          const stops = response.data.map((stop: any) => ({
            id: `${operator}-${stop.id}`,
            name: stop.name,
            lat: parseFloat(stop.lat),
            lng: parseFloat(stop.lon),
            operator: operator as any,
            lines: stop.lines || []
          }));
          allStops.push(...stops);
        }
      } catch (error) {
        console.warn(`Failed to load ${operator} stops:`, error.message);
      }
    }

    return allStops.length > 0 ? allStops : mockStops;
  } catch (error) {
    console.warn('Error fetching public transport stops:', error);
    return mockStops;
  }
  */
};

/**
 * Get real-time departures for a stop
 */
export const fetchStopDepartures = async (operator: string, stopId: string) => {
  try {
    const baseUrl = TRANSPORT_APIS[operator as keyof typeof TRANSPORT_APIS];
    const response = await axios.get(`${baseUrl}/departures/${stopId}`, { timeout: 5000 });
    return response.data || [];
  } catch (error) {
    console.warn(`Failed to load departures for ${operator}/${stopId}:`, error);
    return [];
  }
};
