declare module '@mapbox/polyline' {
    export function decode(encoded: string, precision?: number): Array<[number, number]>;
    export function encode(points: Array<[number, number]>, precision?: number): string;
    export function fromGeoJSON(geojson: any, precision?: number): string;
}
