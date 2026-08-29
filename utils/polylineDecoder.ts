import polyline from '@mapbox/polyline';

/**
 * Decodes a Google Encoded Polyline string into an array of coordinates.
 * Includes error handling and fallback mechanism.
 * 
 * @param encoded The encoded polyline string from OTP
 * @param fallbackStart Start coordinates to use if decoding fails
 * @param fallbackEnd End coordinates to use if decoding fails
 * @returns Array of {latitude, longitude} objects
 */
export function decodePolyline(
    encoded: string,
    fallbackStart: { lat: number; lon: number },
    fallbackEnd: { lat: number; lon: number }
): Array<{ latitude: number; longitude: number }> {
    try {
        if (!encoded) {
            throw new Error('Encoded string is empty');
        }

        const decoded = polyline.decode(encoded);

        if (!decoded || decoded.length === 0) {
            throw new Error('Decoded array is empty');
        }

        return decoded.map(([lat, lon]: [number, number]) => ({
            latitude: lat,
            longitude: lon
        }));
    } catch (error) {
        console.warn('[PolylineDecoder] Failed to decode, using fallback straight line:', error);

        // Fallback: straight line from start to end
        return [
            { latitude: fallbackStart.lat, longitude: fallbackStart.lon },
            { latitude: fallbackEnd.lat, longitude: fallbackEnd.lon },
        ];
    }
}
