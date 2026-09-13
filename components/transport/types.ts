export interface GeoJSONFeature {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
    properties: {
        uid: string;
        id: string;
        name: string;
        agency: string;
        kind: 'stop' | 'station';
        platform?: string;
        cluster?: boolean;
        point_count?: number;
        cluster_id?: number;
        // Pola dokladane przy laczeniu przystankow kilku przewoznikow (utils/stopMerger)
        lat?: number;
        lon?: number;
        agencies?: string[];
        agencyStops?: unknown[];
        isMerged?: boolean;
        is_station?: boolean;
    };
}

export interface Departure {
    time: string;
    line: string;
    dest: string;
    platform?: string; // Peron
    track?: string;    // Tor (if available)
    service_id?: string;
    agency?: string;    // SKM or PolRegio
}

export interface Shape {
    id: string;
    points: { lat: number; lon: number }[];
}

export interface MergedStation extends GeoJSONFeature {
    properties: GeoJSONFeature['properties'] & {
        agencies: string[];
        childStops: GeoJSONFeature[];
        isMerged?: boolean;
    };
}
