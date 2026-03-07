/**
 * TransferValidator - Walidator przesiadek
 * 
 * Obsługuje:
 * - Sprawdzanie czy przesiadka jest możliwa
 * - Obliczanie czasu buforu
 * - Walidację przesiadek między operatorami
 * - Ostrzeżenia dla ciasnych przesiadek
 */

import { DepartureInfo } from './departuresService';
import { MergedStop } from './stopMerger';

// ============================================================================
// TYPES
// ============================================================================

export interface TransferValidation {
    isPossible: boolean;           // Czy możliwa
    arrivalTime: string;           // Przyjazd do przystanku
    departureTime: string;         // Odjazd z przystanku
    bufferTime: number;            // Czas buforu (min)
    walkingTime: number;           // Czas chodzenia (min)
    totalTime: number;             // Całkowity czas (min)
    isComfortable: boolean;        // Czy wygodna (>10 min)
    isCrossAgency: boolean;        // Czy między operatorami
    warning?: string;              // Ostrzeżenie
}

export interface Connection {
    from: DepartureInfo;
    to: DepartureInfo;
    validation: TransferValidation;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_TRANSFER_TIME = 3;           // Minimum 3 minuty
const COMFORTABLE_TRANSFER_TIME = 10;  // Wygodna przesiadka: 10+ minut
const CROSS_AGENCY_BUFFER = 2;         // Dodatkowy bufor dla zmiany operatora
const WALKING_SPEED = 80;              // metry/minutę (4.8 km/h)

// ============================================================================
// TRANSFER VALIDATOR
// ============================================================================

export class TransferValidator {
    /**
     * Waliduje przesiadkę między dwoma odjazdami
     */
    validateTransfer(
        arrival: DepartureInfo,
        departure: DepartureInfo,
        walkingDistance: number = 0
    ): TransferValidation {
        const arrivalMinutes = this.timeToMinutes(arrival.time);
        const departureMinutes = this.timeToMinutes(departure.time);

        // Oblicz czas chodzenia
        const walkingTime = Math.ceil(walkingDistance / WALKING_SPEED);

        // Sprawdź czy to przesiadka między operatorami
        const isCrossAgency = arrival.agency !== departure.agency;

        // Dodatkowy bufor dla przesiadek między operatorami
        const additionalBuffer = isCrossAgency ? CROSS_AGENCY_BUFFER : 0;

        // Oblicz czas buforu
        let bufferTime = departureMinutes - arrivalMinutes - walkingTime;

        // Obsługa przejścia przez północ
        if (bufferTime < -60) {
            bufferTime += 24 * 60;
        }

        const totalTime = walkingTime + bufferTime;
        const minRequired = MIN_TRANSFER_TIME + additionalBuffer;

        // Sprawdź czy możliwa
        const isPossible = bufferTime >= minRequired;
        const isComfortable = bufferTime >= COMFORTABLE_TRANSFER_TIME;

        // Generuj ostrzeżenie
        let warning: string | undefined;
        if (!isPossible) {
            warning = `Za mało czasu na przesiadkę (potrzeba min. ${minRequired} min)`;
        } else if (!isComfortable) {
            warning = `Ciasna przesiadka - tylko ${bufferTime} min`;
        } else if (isCrossAgency) {
            warning = `Zmiana operatora: ${arrival.agency.toUpperCase()} → ${departure.agency.toUpperCase()}`;
        }

        return {
            isPossible,
            arrivalTime: arrival.time,
            departureTime: departure.time,
            bufferTime,
            walkingTime,
            totalTime,
            isComfortable,
            isCrossAgency,
            warning
        };
    }

    /**
     * Specjalna walidacja dla przesiadek między operatorami na tej samej stacji
     */
    validateCrossAgencyTransfer(
        arrival: DepartureInfo,
        departure: DepartureInfo,
        mergedStop: MergedStop
    ): TransferValidation {
        // Szacujemy odległość chodzenia między peronami (~100m)
        const estimatedWalkingDistance = 100;

        const validation = this.validateTransfer(
            arrival,
            departure,
            estimatedWalkingDistance
        );

        // Dodaj informację o stacji
        if (validation.warning) {
            validation.warning += ` na ${mergedStop.name}`;
        }

        return validation;
    }

    /**
     * Znajduje najlepsze połączenie z listy odjazdów
     */
    findBestConnection(
        arrivals: DepartureInfo[],
        departures: DepartureInfo[],
        walkingDistance: number = 0
    ): Connection | null {
        let bestConnection: Connection | null = null;
        let bestScore = -Infinity;

        for (const arrival of arrivals) {
            for (const departure of departures) {
                const validation = this.validateTransfer(
                    arrival,
                    departure,
                    walkingDistance
                );

                if (!validation.isPossible) continue;

                // Scoring: preferuj wygodne przesiadki, ale nie za długie
                let score = 1000;
                score -= validation.totalTime; // Kara za długi czas
                if (validation.isComfortable) score += 200; // Bonus za wygodną
                if (!validation.isCrossAgency) score += 100; // Bonus za tego samego operatora

                if (score > bestScore) {
                    bestScore = score;
                    bestConnection = {
                        from: arrival,
                        to: departure,
                        validation
                    };
                }
            }
        }

        return bestConnection;
    }

    /**
     * Oblicza minimalny czas buforu dla danej odległości
     */
    calculateBufferTime(walkingDistance: number): number {
        const walkingTime = Math.ceil(walkingDistance / WALKING_SPEED);
        return MIN_TRANSFER_TIME + walkingTime;
    }

    // ========================================
    // PRIVATE METHODS
    // ========================================

    /**
     * Konwertuje czas HH:MM na minuty od północy
     */
    private timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        let totalMinutes = hours * 60 + minutes;

        // Obsługa godzin po północy (24:00+)
        if (hours >= 24) {
            totalMinutes = (hours - 24) * 60 + minutes;
        }

        return totalMinutes;
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sprawdza czy lista przesiadek jest wykonalna
 */
export function validateTransferChain(
    validations: TransferValidation[]
): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;

    validations.forEach((validation, index) => {
        if (!validation.isPossible) {
            isValid = false;
            warnings.push(`Przesiadka ${index + 1}: NIEMOŻLIWA`);
        } else if (validation.warning) {
            warnings.push(`Przesiadka ${index + 1}: ${validation.warning}`);
        }
    });

    return { isValid, warnings };
}

/**
 * Znajduje alternatywne połączenia jeśli główne jest niemożliwe
 */
export function findAlternativeConnections(
    arrivals: DepartureInfo[],
    departures: DepartureInfo[],
    validator: TransferValidator,
    walkingDistance: number = 0,
    limit: number = 3
): Connection[] {
    const connections: Connection[] = [];

    for (const arrival of arrivals) {
        for (const departure of departures) {
            const validation = validator.validateTransfer(
                arrival,
                departure,
                walkingDistance
            );

            if (validation.isPossible) {
                connections.push({
                    from: arrival,
                    to: departure,
                    validation
                });
            }
        }
    }

    // Sortuj według jakości (wygodne przesiadki pierwsze)
    connections.sort((a, b) => {
        // Preferuj wygodne
        if (a.validation.isComfortable && !b.validation.isComfortable) return -1;
        if (!a.validation.isComfortable && b.validation.isComfortable) return 1;

        // Preferuj tego samego operatora
        if (!a.validation.isCrossAgency && b.validation.isCrossAgency) return -1;
        if (a.validation.isCrossAgency && !b.validation.isCrossAgency) return 1;

        // Preferuj krótszy czas
        return a.validation.totalTime - b.validation.totalTime;
    });

    return connections.slice(0, limit);
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: TransferValidator | null = null;

export const getTransferValidator = (): TransferValidator => {
    if (!instance) {
        instance = new TransferValidator();
    }
    return instance;
};

// ============================================================================
// EXPORT
// ============================================================================

export default TransferValidator;
