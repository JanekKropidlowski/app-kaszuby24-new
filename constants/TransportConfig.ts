/**
 * Central configuration for Transport & Routing
 */

export const TRANSPORT_CONFIG = {
    // Feature Flag: Enable OpenTripPlanner (OTP) Routing
    // Set to false to fallback to legacy TransportRoutingEngine client-side logic
    USE_OTP: true,

    // OTP Server Configuration — przez HTTPS proxy na WordPress (http blokowane przez iOS/Android)
    OTP_API_BASE: 'https://kaszuby24.pl/wp-json/kaszuby24/v1/otp',
    OTP_GRAPHQL: 'https://kaszuby24.pl/wp-json/kaszuby24/v1/otp',

    // Default OTP Parameters
    OTP_DEFAULTS: {
        walkReluctance: 2.0, // Indication of how undesirable walking is (1.0 to 10.0+)
        minTransferTime: 60, // SECONDS (1 minute)
        maxWalkDistance: 2500, // METERS (Increase slightly)
        walkSpeed: 1.3, // m/s
        numItineraries: 8,    // Pierwsze 8 szybko ~1s, reszta ładowana na scroll
        searchWindow: 7200,  // 2 godziny - wystarczy na początek, loadMoreDays dobiera kolejne
    },

    // WordPress Data Hub (Latest feeds manifest)
    WP_GTFS_MANIFEST: 'https://kaszuby24.pl/wp-json/kaszuby24/otp/feeds-manifest.json',
};
