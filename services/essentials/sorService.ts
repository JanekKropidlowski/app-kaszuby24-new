
import axios from 'axios';

// Interfejsy danych SOR
export interface SorUnit {
    id_gsl_miej: string;
    nazwa_swd: string;
    adr_lok_miejsc: string;
    adr_lok_ulica: string;
    adr_lok_nr_domu: string;
    adr_lok_kod_poczt: string;
    telefon_rej: string;
    lat: number;
    lng: number;
    Wojewodztwo: string;
    numer_ksiegi: string; // Klucz do API kolejek
    distance?: number; // Opcjonalnie: dystans od użytkownika
}

export interface SorQueueData {
  host: string;
  t: number;
  data: Array<SorQueueItem>;
  resstatus: number;
  lastUpdated?: Date;
}

export interface SorQueueItem {
  name: string; // np. "Priorytet najwyższy", "Rejestracja", "Triaż"
  count: number; // liczba osób w kolejce
  wait: string; // czas oczekiwania np. "powyżej 2 godzin", "43 min", "-"
  priority?: SorPriority; // kolor priorytetu
}

// Rozszerzone informacje o SOR
export interface SorDepartment {
  nazwa: string;
  specjalizacja: string;
  liczba_lozek: number;
  wyposazenie: string[];
  personel: {
    lekarze: number;
    pielegniarki: number;
    ratownicy: number;
  };
}

export interface OperatingHours {
  poniedzialek: TimeRange;
  wtorek: TimeRange;
  sroda: TimeRange;
  czwartek: TimeRange;
  piatek: TimeRange;
  sobota: TimeRange;
  niedziela: TimeRange;
  swieta: TimeRange;
}

export interface TimeRange {
  otwarte: string; // "08:00"
  zamkniete: string; // "18:00"
  czy_czynne: boolean;
}

export interface ContactInfo {
  centrala: string;
  rejestracja: string;
  izba_przyjec: string;
  dyzur_lekarski: string;
  email?: string;
  website?: string;
}

// Rozszerzenie interfejsu SorUnit
declare module './sorService' {
  interface SorUnit {
    // Rozszerzone dane z API kolejek
    queueData?: SorQueueData;
    lastQueueUpdate?: Date;
    isQueueLoading?: boolean;
    totalWaiting?: number;
    estimatedWaitTime?: number;

    // Dodatkowe informacje z dokumentacji SOR
    dyrektor?: string;
    specjalnosci?: string[];
    liczba_lozek?: number;
    oddzialy_ratunkowe?: SorDepartment[];
    wyposazenie_medyczne?: string[];
    certyfikaty?: string[];
    godziny_przyjec?: OperatingHours;
    kontakt_dodatkowy?: ContactInfo;
    status_aktualny?: 'aktywny' | 'ograniczony' | 'zamknięty';
  }
}

export enum SorPriority {
  NAJWYŻSZY = 'red',     // Czerwony - natychmiast
  WYSOKI = 'orange',     // Pomarańczowy - do 10 min
  ŚREDNI = 'yellow',     // Żółty - do 60 min
  NISKI = 'green',       // Zielony - do 120 min
  NAJNIŻSZY = 'blue',    // Niebieski - do 240 min
  TRIAŻ = 'gray',        // Triaż wstępny
  REJESTRACJA = 'purple' // Rejestracja
}

export interface SorSummary {
  sorUnit: SorUnit;
  totalWaiting: number;
  estimatedWaitTime: number; // w minutach
  criticalCases: number; // przypadki krytyczne (priorytet najwyższy + wysoki)
  queueBreakdown: {
    rejestracja: SorQueueItem | null;
    triaż: SorQueueItem | null;
    priorytetNajwyższy: SorQueueItem | null;
    priorytetWysoki: SorQueueItem | null;
    priorytetŚredni: SorQueueItem | null;
    priorytetNiski: SorQueueItem | null;
    priorytetNajniższy: SorQueueItem | null;
  };
}

// Rozszerzone właściwości dla SorUnit
declare module './sorService' {
  interface SorUnit {
    queueData?: SorQueueData;
    lastQueueUpdate?: Date;
    isQueueLoading?: boolean;
    totalWaiting?: number;
    estimatedWaitTime?: number;
  }
}

export interface SorQueueSummary {
  totalPeople: number;
  estimatedWaitTime: number; // in minutes
  priorityBreakdown: {
    highest: { count: number; wait: string };
    high: { count: number; wait: string };
    medium: { count: number; wait: string };
    low: { count: number; wait: string };
    lowest: { count: number; wait: string };
    registration: { count: number; wait: string };
    triage: { count: number; wait: string };
  };
  status: 'operational' | 'busy' | 'overloaded' | 'unknown';
}

const TOPSOR_LIST_URL = 'https://pacjent.gov.pl/sites/default/files/dane/mapa%20topsor%2026%2008%202025.json';
const TOPSOR_API_BASE = 'https://pacjent.gov.pl/api/v1/datatopsor/';

/**
 * Pobiera listę wszystkich SORów z pliku JSON
 */
export const fetchSorList = async (): Promise<SorUnit[]> => {
    try {
        const response = await axios.get(TOPSOR_LIST_URL);
        // Dane mogą być w dziwnym formacie, w zależności od struktury JSONa na gov.pl
        // Zakładam, że to tablica obiektów, ale warto dodać logowanie w razie problemów
        const data = response.data;

        // Prosta walidacja czy to tablica
        if (Array.isArray(data)) {
            const filtered = data
                .filter((item: any) => {
                    // Sprawdzamy oba warianty klucza (z ogonkiem i bez)
                    const woj = (item.Województwo || item.Wojewodztwo || item.wojewodztwo || '').toUpperCase();
                    return woj === 'POMORSKIE' || woj === 'POMORSKI';
                })
                .map((item: any) => ({
                    ...item,
                    lat: typeof item.lat === 'string' ? parseFloat(item.lat) : item.lat,
                    lng: typeof item.lng === 'string' ? parseFloat(item.lng) : item.lng,
                }));

            console.log(`Pobrano ${data.length} SORów, po filtracji Pomorskie: ${filtered.length}`);
            return filtered;
        }
        console.warn('Data from TOPSOR is not an array:', typeof data);
        return [];
    } catch (error) {
        console.error('Błąd pobierania listy SOR:', error);
        return [];
    }
};

/**
 * Pobiera dane o kolejkach dla konkretnego SOR (po numerze księgi)
 */
export const fetchSorWaitingTimes = async (numerKsiegi: string): Promise<SorQueueData | null> => {
    try {
        const response = await axios.get(`${TOPSOR_API_BASE}${numerKsiegi}?_format=json`);
        return response.data;
    } catch (error) {
        console.warn(`Błąd pobierania kolejek dla SOR ${numerKsiegi}:`, error);
        return null;
    }
};

/**
 * Helper: Parsuje czas oczekiwania ze stringa na minuty
 * np. "43 min" -> 43
 * "powyżej 2 godzin" -> 120
 * "-" -> 0
 */
export const parseWaitTime = (waitString: string): number => {
    if (!waitString || waitString === '-') return 0;

    if (waitString.includes('min')) {
        return parseInt(waitString.replace(' min', ''), 10) || 0;
    }

    if (waitString.includes('godzin')) {
        const hours = parseInt(waitString.replace(/\D/g, ''), 10) || 0;
        return hours * 60;
    }

    return 0;
};

/**
 * Określa priorytet na podstawie nazwy kolejki
 */
export const getQueuePriority = (queueName: string): SorPriority => {
    const name = queueName.toLowerCase();

    if (name.includes('najwyższy')) return SorPriority.NAJWYŻSZY;
    if (name.includes('wysoki')) return SorPriority.WYSOKI;
    if (name.includes('średni')) return SorPriority.ŚREDNI;
    if (name.includes('niski')) return SorPriority.NISKI;
    if (name.includes('najniższy')) return SorPriority.NAJNIŻSZY;
    if (name.includes('triaż')) return SorPriority.TRIAŻ;
    if (name.includes('rejestrac')) return SorPriority.REJESTRACJA;

    return SorPriority.TRIAŻ; // domyślny
};

/**
 * Oblicza całkowity czas oczekiwania zgodnie z metodologią pacjent.gov.pl
 * Rejestracja + Triaż + Priorytet
 */
export const calculateTotalWaitTime = (queueData: SorQueueData): number => {
    const breakdown = getQueueBreakdown(queueData);

    // Suma: rejestracja + triaż + najwyższy priorytet wśród aktywnych kolejek
    let totalTime = 0;

    if (breakdown.rejestracja) {
        totalTime += parseWaitTime(breakdown.rejestracja.wait);
    }

    if (breakdown.triaż) {
        totalTime += parseWaitTime(breakdown.triaż.wait);
    }

    // Dodaj czas najwyższego aktywnego priorytetu
    const activePriorities = [
        breakdown.priorytetNajwyższy,
        breakdown.priorytetWysoki,
        breakdown.priorytetŚredni,
        breakdown.priorytetNiski,
        breakdown.priorytetNajniższy
    ].filter(item => item && item.count > 0);

    if (activePriorities.length > 0) {
        const highestPriority = activePriorities[0]; // już posortowane
        if (highestPriority) {
            totalTime += parseWaitTime(highestPriority.wait);
        }
    }

    return totalTime;
};

/**
 * Dzieli kolejki SOR na poszczególne kategorie
 */
export const getQueueBreakdown = (queueData: SorQueueData) => {
    const breakdown = {
        rejestracja: null as SorQueueItem | null,
        triaż: null as SorQueueItem | null,
        priorytetNajwyższy: null as SorQueueItem | null,
        priorytetWysoki: null as SorQueueItem | null,
        priorytetŚredni: null as SorQueueItem | null,
        priorytetNiski: null as SorQueueItem | null,
        priorytetNajniższy: null as SorQueueItem | null,
    };

    queueData.data.forEach(item => {
        const priority = getQueuePriority(item.name);
        (item as SorQueueItem).priority = priority;

        const name = item.name.toLowerCase();
        if (name.includes('rejestrac')) {
            breakdown.rejestracja = item;
        } else if (name.includes('triaż')) {
            breakdown.triaż = item;
        } else if (name.includes('najwyższy')) {
            breakdown.priorytetNajwyższy = item;
        } else if (name.includes('wysoki')) {
            breakdown.priorytetWysoki = item;
        } else if (name.includes('średni')) {
            breakdown.priorytetŚredni = item;
        } else if (name.includes('niski')) {
            breakdown.priorytetNiski = item;
        } else if (name.includes('najniższy')) {
            breakdown.priorytetNajniższy = item;
        }
    });

    return breakdown;
};

/**
 * Tworzy podsumowanie SOR z pełną analizą kolejek
 */
export const createSorSummary = (sorUnit: SorUnit, queueData?: SorQueueData): SorSummary => {
    const summary: SorSummary = {
        sorUnit,
        totalWaiting: 0,
        estimatedWaitTime: 0,
        criticalCases: 0,
        queueBreakdown: {
            rejestracja: null,
            triaż: null,
            priorytetNajwyższy: null,
            priorytetWysoki: null,
            priorytetŚredni: null,
            priorytetNiski: null,
            priorytetNajniższy: null,
        }
    };

    if (queueData) {
        summary.queueBreakdown = getQueueBreakdown(queueData);

        // Oblicz całkowitą liczbę oczekujących
        summary.totalWaiting = queueData.data.reduce((sum, item) => sum + item.count, 0);

        // Oblicz przypadki krytyczne (priorytet najwyższy + wysoki)
        summary.criticalCases = (summary.queueBreakdown.priorytetNajwyższy?.count || 0) +
                               (summary.queueBreakdown.priorytetWysoki?.count || 0);

        // Oblicz szacowany czas oczekiwania
        summary.estimatedWaitTime = calculateTotalWaitTime(queueData);
    }

    return summary;
};

/**
 * Pobiera pełne dane SOR wraz z kolejkami
 */
export const fetchSorWithQueues = async (sorUnit: SorUnit): Promise<SorUnit> => {
    try {
        const queueData = await fetchSorWaitingTimes(sorUnit.numer_ksiegi);

        if (queueData) {
            return {
                ...sorUnit,
                queueData,
                lastQueueUpdate: new Date(),
                isQueueLoading: false,
                totalWaiting: queueData.data.reduce((sum, item) => sum + item.count, 0),
                estimatedWaitTime: calculateTotalWaitTime(queueData)
            };
        } else {
            return {
                ...sorUnit,
                isQueueLoading: false
            };
        }
    } catch (error) {
        console.warn(`Failed to fetch queues for SOR ${sorUnit.numer_ksiegi}:`, error);
        return {
            ...sorUnit,
            isQueueLoading: false
        };
    }
};


/**
 * Szacuje czas dojazdu (zakładamy średnią prędkość 40km/h w mieście/terenie zabudowanym dla uproszczenia)
 * Dystans w km
 */
export const estimateTravelTime = (distanceKm: number): number => {
  if (!distanceKm) return 0;
  // 40 km / 60 min => 1.5 min na 1 km
  return Math.round(distanceKm * 1.5);
};

/**
 * Analyze queue data and create summary
 */
export const analyzeSorQueues = (queueData: SorQueueData): SorQueueSummary => {
  const summary: SorQueueSummary = {
    totalPeople: 0,
    estimatedWaitTime: 0,
    priorityBreakdown: {
      highest: { count: 0, wait: '-' },
      high: { count: 0, wait: '-' },
      medium: { count: 0, wait: '-' },
      low: { count: 0, wait: '-' },
      lowest: { count: 0, wait: '-' },
      registration: { count: 0, wait: '-' },
      triage: { count: 0, wait: '-' }
    },
    status: 'unknown'
  };

  if (!queueData || !queueData.data) {
    return summary;
  }

  // Parse queue data
  queueData.data.forEach(queue => {
    summary.totalPeople += queue.count || 0;

    switch (queue.name) {
      case 'Priorytet najwyższy':
        summary.priorityBreakdown.highest = { count: queue.count, wait: queue.wait };
        break;
      case 'Priorytet wysoki':
        summary.priorityBreakdown.high = { count: queue.count, wait: queue.wait };
        break;
      case 'Priorytet średni':
        summary.priorityBreakdown.medium = { count: queue.count, wait: queue.wait };
        break;
      case 'Priorytet niski':
        summary.priorityBreakdown.low = { count: queue.count, wait: queue.wait };
        break;
      case 'Priorytet najniższy':
        summary.priorityBreakdown.lowest = { count: queue.count, wait: queue.wait };
        break;
      case 'Rejestracja':
        summary.priorityBreakdown.registration = { count: queue.count, wait: queue.wait };
        break;
      case 'Triaż':
        summary.priorityBreakdown.triage = { count: queue.count, wait: queue.wait };
        break;
    }
  });

  // Calculate estimated wait time (registration + triage + medium priority)
  const registrationTime = parseWaitTime(summary.priorityBreakdown.registration.wait);
  const triageTime = parseWaitTime(summary.priorityBreakdown.triage.wait);
  const mediumPriorityTime = parseWaitTime(summary.priorityBreakdown.medium.wait);

  summary.estimatedWaitTime = registrationTime + triageTime + mediumPriorityTime;

  // Determine status based on queue length and wait times
  if (summary.totalPeople === 0) {
    summary.status = 'operational';
  } else if (summary.totalPeople < 10 && summary.estimatedWaitTime < 60) {
    summary.status = 'operational';
  } else if (summary.totalPeople < 25 && summary.estimatedWaitTime < 120) {
    summary.status = 'busy';
  } else {
    summary.status = 'overloaded';
  }

  return summary;
};

/**
 * Get status color for SOR
 */
export const getSorStatusColor = (status: SorQueueSummary['status']): string => {
  switch (status) {
    case 'operational': return '#10b981'; // green
    case 'busy': return '#f59e0b'; // yellow
    case 'overloaded': return '#ef4444'; // red
    default: return '#6b7280'; // gray
  }
};

/**
 * Get status text for SOR
 */
export const getSorStatusText = (status: SorQueueSummary['status']): string => {
  switch (status) {
    case 'operational': return 'Dostępny';
    case 'busy': return 'Obłożony';
    case 'overloaded': return 'Przeciążony';
    default: return 'Nieznany';
  }
};

