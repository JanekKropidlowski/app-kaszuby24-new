export interface TransportLine {
    id: string;
    operator: 'PKS Gdynia' | 'MZK Wejherowo' | 'ZKM Gdynia' | 'ZTM Gdańsk' | 'Polregio' | 'PKP' | 'Intercity';
    line: string;
    direction: string;
    nextDepartures: string[]; // Mock times like "12:05", "12:30"
    delay?: number; // minutes
}

export const TransportService = {
    async getDepartures(stationId: string): Promise<TransportLine[]> {
        // Mock data logic based on user request names
        // Ideally this would connect to specific APIs per operator

        return [
            {
                id: '1',
                operator: 'PKS Gdynia',
                line: '650',
                direction: 'Władysławowo',
                nextDepartures: ['14:15', '14:45', '15:30'],
            },
            {
                id: '2',
                operator: 'mzK Wejherowo',
                line: 'J',
                direction: 'Rumia Dworzec PKP',
                nextDepartures: ['14:10', '14:30', '14:50'],
                delay: 2
            },
            {
                id: '3',
                operator: 'Polregio',
                line: 'REG',
                direction: 'Gdynia Główna',
                nextDepartures: ['14:22', '15:15'],
            },
            {
                id: '4',
                operator: 'ZTM Gdańsk',
                line: '199',
                direction: 'Oliwa PKP',
                nextDepartures: ['14:05', '14:25'],
            }
        ];
    }
};
