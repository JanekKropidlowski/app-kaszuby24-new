/**
 * PKS TRANSPORT SERVICE - Integracja z danymi rozkładów jazdy dla aplikacji Kaszuby24
 * Używa wyciągniętych danych JSON zamiast PDF
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PKSLine {
  id: string;
  number: string;
  name: string;
  type: 'regularna' | 'miejska' | 'regionalna' | 'szkolna';
  route: string;
}

export interface PKSConnection {
  departure: string; // HH:MM
  arrival: string | null; // HH:MM or null
  duration: string | null; // HH:MM or null
  days?: string[]; // dni tygodnia
  type: 'regular' | 'range' | 'single_time';
}

export interface PKSStation {
  id: string;
  name: string;
  type: 'bus_stop';
}

export interface PKSMobileData {
  version: string;
  last_updated: string;
  lines: PKSLine[];
  stations: PKSStation[];
  connections: { [lineId: string]: PKSConnection[] };
  stats: {
    total_lines: number;
    total_connections: number;
    total_stations: number;
  };
}

export class PKSTransportService {
  private static instance: PKSTransportService;
  private data: PKSMobileData | null = null;
  private readonly STORAGE_KEY = '@PKS_DATA';
  private readonly DATA_URL = 'pks-mobile-api.json'; // W aplikacji mobilnej będzie to asset lub URL

  private constructor() {}

  static getInstance(): PKSTransportService {
    if (!PKSTransportService.instance) {
      PKSTransportService.instance = new PKSTransportService();
    }
    return PKSTransportService.instance;
  }

  /**
   * Ładuje dane rozkładów z pamięci/cache lub assets
   */
  async loadData(): Promise<PKSMobileData | null> {
    try {
      // Najpierw sprawdź cache
      const cached = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        this.data = JSON.parse(cached);
        console.log('✅ PKS data loaded from cache');
        return this.data;
      }

      // Jeśli nie ma cache, załaduj z assets (w aplikacji mobilnej)
      // W development środowisku można załadować z pliku
      if (__DEV__) {
        try {
          // W React Native to będzie require() lub fetch z assets
          const response = await fetch(this.DATA_URL);
          if (response.ok) {
            this.data = await response.json();
            await this.saveToCache();
            console.log('✅ PKS data loaded from file');
            return this.data;
          }
        } catch (error) {
          console.log('⚠️ Could not load from file, using mock data');
        }
      }

      // Fallback - mock data dla developmentu
      this.data = this.getMockData();
      await this.saveToCache();
      return this.data;

    } catch (error) {
      console.error('❌ Error loading PKS data:', error);
      return null;
    }
  }

  /**
   * Zapisuje dane do cache
   */
  private async saveToCache(): Promise<void> {
    if (this.data) {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    }
  }

  /**
   * Pobiera wszystkie dostępne linie
   */
  async getLines(): Promise<PKSLine[]> {
    const data = await this.loadData();
    return data ? data.lines : [];
  }

  /**
   * Pobiera szczegóły linii z połączeniami
   */
  async getLineDetails(lineId: string): Promise<PKSLine & { connections: PKSConnection[] } | null> {
    const data = await this.loadData();
    if (!data) return null;

    const line = data.lines.find(l => l.id === lineId);
    const connections = data.connections[lineId] || [];

    if (line) {
      return {
        ...line,
        connections
      };
    }
    return null;
  }

  /**
   * Znajduje najbliższe połączenie dla linii
   */
  async getNextConnection(lineId: string, currentTime: Date = new Date()): Promise<PKSConnection | null> {
    const lineDetails = await this.getLineDetails(lineId);
    if (!lineDetails) return null;

    const currentTimeString = currentTime.toTimeString().substring(0, 5); // HH:MM
    const currentDay = this.getPolishDayName(currentTime.getDay());

    // Filtruj połączenia po czasie i dniu tygodnia
    const availableConnections = lineDetails.connections
      .filter(conn => {
        // Sprawdź czy czas odjazdu jest późniejszy niż aktualny
        if (conn.departure >= currentTimeString) {
          // Sprawdź dzień tygodnia jeśli jest określony
          if (conn.days && conn.days.length > 0) {
            return conn.days.some(day => day.toLowerCase() === currentDay.toLowerCase());
          }
          return true; // Jeśli nie ma dni tygodnia, zakładamy że kursuje codziennie
        }
        return false;
      })
      .sort((a, b) => a.departure.localeCompare(b.departure));

    return availableConnections.length > 0 ? availableConnections[0] : null;
  }

  /**
   * Znajduje wszystkie połączenia dla linii w danym dniu
   */
  async getConnectionsForDay(lineId: string, dayOfWeek?: number): Promise<PKSConnection[]> {
    const lineDetails = await this.getLineDetails(lineId);
    if (!lineDetails) return [];

    const targetDay = dayOfWeek !== undefined ? this.getPolishDayName(dayOfWeek) : null;

    return lineDetails.connections.filter(conn => {
      if (!targetDay || !conn.days || conn.days.length === 0) {
        return true; // Brak filtrów - wszystkie połączenia
      }
      return conn.days.some(day => day.toLowerCase() === targetDay.toLowerCase());
    }).sort((a, b) => a.departure.localeCompare(b.departure));
  }

  /**
   * Wyszukuje linie po nazwie lub numerze
   */
  async searchLines(query: string): Promise<PKSLine[]> {
    const lines = await this.getLines();
    const lowerQuery = query.toLowerCase();

    return lines.filter(line =>
      line.number.toLowerCase().includes(lowerQuery) ||
      line.name.toLowerCase().includes(lowerQuery) ||
      line.route.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Pobiera statystyki danych
   */
  async getStats(): Promise<PKSMobileData['stats'] | null> {
    const data = await this.loadData();
    return data ? data.stats : null;
  }

  /**
   * Konwertuje dzień tygodnia na polską nazwę
   */
  private getPolishDayName(dayIndex: number): string {
    const days = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
    return days[dayIndex] || 'poniedziałek';
  }

  /**
   * Mock data dla developmentu (gdy nie ma prawdziwych danych)
   */
  private getMockData(): PKSMobileData {
    return {
      version: '1.0',
      last_updated: new Date().toISOString(),
      lines: [
        {
          id: '1',
          number: '1',
          name: 'Linia 1',
          type: 'regularna',
          route: 'Gdynia - Puck'
        },
        {
          id: '11',
          number: '11',
          name: 'Linia 11',
          type: 'miejska',
          route: 'Władysławowo miejska'
        }
      ],
      stations: [
        { id: 'gdynia', name: 'Gdynia Dworzec', type: 'bus_stop' },
        { id: 'puck', name: 'Puck', type: 'bus_stop' }
      ],
      connections: {
        '1': [
          { departure: '06:15', arrival: '07:00', duration: '00:45', type: 'regular' },
          { departure: '08:30', arrival: '09:15', duration: '00:45', type: 'regular' },
          { departure: '14:20', arrival: '15:05', duration: '00:45', type: 'regular' }
        ],
        '11': [
          { departure: '07:00', arrival: '07:30', duration: '00:30', type: 'regular' },
          { departure: '12:00', arrival: '12:30', duration: '00:30', type: 'regular' }
        ]
      },
      stats: {
        total_lines: 2,
        total_connections: 5,
        total_stations: 2
      }
    };
  }
}

// Hook React do używania PKS Transport Service
export const usePKSTransport = () => {
  const service = PKSTransportService.getInstance();

  return {
    // Ładowanie danych
    loadData: () => service.loadData(),

    // Pobieranie linii
    getLines: () => service.getLines(),
    getLineDetails: (lineId: string) => service.getLineDetails(lineId),
    searchLines: (query: string) => service.searchLines(query),

    // Pobieranie połączeń
    getNextConnection: (lineId: string, time?: Date) => service.getNextConnection(lineId, time),
    getConnectionsForDay: (lineId: string, dayOfWeek?: number) => service.getConnectionsForDay(lineId, dayOfWeek),

    // Statystyki
    getStats: () => service.getStats()
  };
};



