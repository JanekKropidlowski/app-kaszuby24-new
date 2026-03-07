export interface EVStation {
    id: number;
    code: string;
    latitude: number;
    longitude: number;
    name: string;
    street: string;
    city: string;
    operating_hours: any[];
    status?: 'Available' | 'Occupied' | 'Unknown';
}

// Mocked service until valid credentials provided
export const EVService = {
    async fetchPools(): Promise<EVStation[]> {
        // Return mostly empty or mock data for visualization as we lack real auth tokens
        return [
            {
                id: 1,
                code: "PL-MOCK-001",
                latitude: 54.5189,
                longitude: 18.5305,
                name: "Stacja Ładowania Gdynia Centrum",
                street: "Świętojańska 1",
                city: "Gdynia",
                operating_hours: [],
                status: 'Available'
            },
            {
                id: 2,
                code: "PL-MOCK-002",
                latitude: 54.3520,
                longitude: 18.6466,
                name: "Energa Gdańsk Forum",
                street: "Targ Sienny 7",
                city: "Gdańsk",
                operating_hours: [],
                status: 'Occupied'
            }
        ];
    }
};
