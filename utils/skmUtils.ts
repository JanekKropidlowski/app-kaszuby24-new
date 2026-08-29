// SKM Station order from Wejherowo/Lębork towards Gdańsk Śródmieście
// Used to determine direction of travel
export const SKM_STATIONS_ORDER = [
    'Lębork',
    'Godętowo',
    'Bożepole Wielkie',
    'Strzebielino Morskie',
    'Luzino',
    'Gościcino Wejherowskie',
    'Wejherowo',
    'Wejherowo Nanice',
    'Wejherowo Śmiechowo',
    'Reda Pieleszewo',
    'Reda',
    'Rumia Janowo',
    'Rumia',
    'Gdynia Cisowa',
    'Gdynia Chylonia',
    'Gdynia Leszczynki',
    'Gdynia Grabówek',
    'Gdynia Stocznia',
    'Gdynia Główna',
    'Gdynia Wzgórze św. Maksymiliana',
    'Gdynia Redłowo',
    'Gdynia Orłowo',
    'Sopot Kamienny Potok',
    'Sopot',
    'Sopot Wyścigi',
    'Gdańsk Żabianka - AWFiS', // Often just Gdańsk Żabianka
    'Gdańsk Oliwa',
    'Gdańsk Przymorze - Uniwersytet', // Often just Gdańsk Przymorze
    'Gdańsk Zaspa',
    'Gdańsk Wrzeszcz',
    'Gdańsk Politechnika',
    'Gdańsk Stocznia',
    'Gdańsk Główny',
    'Gdańsk Śródmieście'
];

export const normalizeStationName = (name: string): string => {
    return name
        .replace(' - AWFiS', '')
        .replace(' - Uniwersytet', '')
        .trim();
};

export const getStationIndex = (name: string): number => {
    const normalized = normalizeStationName(name);
    return SKM_STATIONS_ORDER.findIndex(s => normalizeStationName(s) === normalized);
};

export const isStopOnRoute = (fromName: string, toName: string, destinationName: string): boolean => {
    const fromIdx = getStationIndex(fromName);
    const toIdx = getStationIndex(toName);
    const destIdx = getStationIndex(destinationName);

    // If any station is not known SKM station, fallback to permissive true or name matching
    if (fromIdx === -1 || toIdx === -1 || destIdx === -1) {
        // Fallback checks
        const destLower = destinationName.toLowerCase();
        const toLower = toName.toLowerCase();
        return destLower.includes(toLower) || toLower.includes(destLower);
    }

    // Direction: Increasing index (Towards Gdańsk)
    if (toIdx > fromIdx) {
        // Train must settle at or after target
        return destIdx >= toIdx;
    }

    // Direction: Decreasing index (Towards Wejherowo/Lębork)
    if (toIdx < fromIdx) {
        // Train must settle at or before target (which means smaller index in our array)
        return destIdx <= toIdx;
    }

    return false; // Same station
};
