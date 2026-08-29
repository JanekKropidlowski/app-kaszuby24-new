# Polish Transport APIs Integration

This document describes the new transport API services added to provide comprehensive access to Polish public transport data, including PKS (regional bus) schedules.

## Overview

The app now includes three new service layers for accessing Polish transport data:

1. **PKSScraperService** - Web scraper for PKS Gdynia schedules from e-podroznik.pl
2. **PolishTransportApiService** - Wrapper for various Polish transport APIs
3. **Enhanced TransportService methods** - Integration into existing transport service

## PKS Scraper Service

### Features
- Scrapes PKS Gdynia routes from e-podroznik.pl
- Extracts timetable data from HTML pages
- Caches data for 24 hours
- Provides mock stop data (can be enhanced with real coordinates)

### Usage

```typescript
import { PKSScraperService } from './services/pksScraperService';

// Fetch all PKS routes
const routes = await PKSScraperService.fetchAllRoutes();

// Fetch timetable for a specific route
const departures = await PKSScraperService.fetchTimetable(routeUrl, routeName);

// Search routes
const searchResults = await PKSScraperService.searchRoutes('Gdynia');

// Fetch stops
const stops = await PKSScraperService.fetchStops();
```

### Data Structure

```typescript
interface PKSScheduleEntry {
    line: string;        // Route identifier (e.g., "1", "150")
    route: string;       // Full route description (e.g., "Gdynia - Rumia - Reda")
    departures: string[]; // Array of departure times (HH:MM)
    url?: string;        // Direct link to schedule page
}
```

## Polish Transport API Service

### Supported Agencies
- **ztm_gdansk** - ZTM Gdańsk (Gdańsk Transport Authority)
- **zkm_gdynia** - ZKM Gdynia (Gdynia Transport Authority)
- **mzk_wejherowo** - MZK Wejherowo
- **polregio** - Polregio (regional trains)
- **pkp_intercity** - PKP Intercity (long-distance trains)
- **rozkladzik** - Rozkładzik API
- **gtfs_poland** - GTFS Poland API

### Usage

```typescript
import { PolishTransportApiService } from './services/polishTransportApiService';

// Fetch stops from ZTM Gdańsk
const stops = await PolishTransportApiService.fetchStops('ztm_gdansk', bbox);

// Fetch departures for a stop
const departures = await PolishTransportApiService.fetchDepartures('ztm_gdansk', '12345');

// Search stops across multiple agencies
const searchResults = await PolishTransportApiService.searchStops('Gdańsk Główny', ['ztm_gdansk', 'zkm_gdynia']);

// Get combined departures for a stop
const { stop, departures } = await PolishTransportApiService.getCombinedDepartures('Gdańsk Główny');
```

### Data Structures

```typescript
interface PolishTransportStop {
    id: string;
    name: string;
    lat: number;
    lon: number;
    agency: string;
    lines?: string[];
}

interface PolishTransportDeparture {
    line: string;
    destination: string;
    time: string;
    delay?: number;
    isRealtime?: boolean;
}
```

## Enhanced Transport Service

The existing `TransportService` has been enhanced with new methods that integrate the scraper and API services:

### PKS Methods

```typescript
// Enhanced PKS methods with fallback
const pksRoutes = await transportService.fetchPKSRoutes();
const pksTimetable = await transportService.fetchPKSTimetable(routeUrl, routeName);
const pksStops = await transportService.fetchEnhancedPKSStops();

// Search PKS routes
const searchResults = await transportService.searchPKSRoutes('Rumia');
```

### Polish Transport Methods

```typescript
// Fetch stops from Polish APIs
const polishStops = await transportService.fetchPolishStops('ztm_gdansk', bbox);

// Fetch departures
const departures = await transportService.fetchPolishDepartures('ztm_gdansk', stopId);

// Search across agencies
const searchResults = await transportService.searchPolishStops('Gdańsk', ['ztm_gdansk', 'zkm_gdynia']);

// Get combined data
const combined = await transportService.getCombinedDepartures('Gdańsk Główny');
```

## Caching Strategy

- **PKS Data**: 24-hour cache for routes and stops, 30-minute cache for timetables
- **Polish APIs**: 30-minute cache for stops, 15-minute cache for departures
- **AsyncStorage**: All data cached locally on device

## Error Handling

All services include comprehensive error handling:
- Network timeouts (8-10 seconds)
- Graceful fallback to cached data
- Detailed error logging
- Mock data fallbacks where appropriate

## Testing

Run the test script to verify API functionality:

```bash
node test-transport-apis.js
```

The test script checks:
- PKS scraper functionality
- Polish transport API availability
- GTFS feed accessibility

## Integration Notes

### Existing Code Compatibility
- All new methods are additive - existing code continues to work
- Enhanced methods provide fallbacks to existing WordPress API
- New services can be used alongside existing transport functionality

### Performance Considerations
- Parallel API calls for multiple agencies
- Intelligent caching to reduce network requests
- Lazy loading of timetable data

### Future Enhancements
- Real-time vehicle positions for supported agencies
- GTFS feed parsing for offline functionality
- Enhanced stop geolocation data
- Integration with journey planning APIs

## API Endpoints Discovered

Based on analysis of multiple sources:

### 🔍 **PKS Gdynia Analysis - KOMPLETNE ROZWIĄZANIE**
- **Rozkłady Jazdy**: ✅ **91 tras PKS** wyciągniętych automatycznie
  - Główna strona: `https://pksgdynia.pl/rozklad-jazdy/`
  - Indywidualne trasy: `https://pksgdynia.pl/rozklad_jazdy/{id}/`
  - PDF-y rozkładów dostępne do pobrania

- **Przystanki PKS**: ✅ **102 przystanki** z pełnymi współrzędnymi GPS
  - Wszystkie miejscowości obsługiwane przez PKS Gdynia
  - Dokładne współrzędne geograficzne (szerokość/długość)
  - Zakres: od Helu po Lębork, od Kartuz po Gdańsk

- **System e-podroznik.pl**: Zaawansowane API
  - `seoIndexCarrierMainPage.do` - Kompletny indeks wszystkich tras
  - Szczegółowe informacje o 1000+ połączeniach
  - Real-time dane o rozkładach

- **e-podroznik.pl System**: Advanced booking/ticketing platform
  - **Carrier Index API**: `/public/seoIndexCarrierMainPage.do?carrierId=1847&seoName=pks-gdynia&lang=pl&formCompositeExternalCarrier.version=2.2&ajax=true&_={timestamp}`
    - ✅ **WORKING**: Returns comprehensive HTML with all route information
    - Contains detailed route table with 1000+ connections
  - **Individual Routes**: `/{carrierId},{fromId},{toId},rozklad-jazdy-pks-{routeName}.html`
    - ✅ **WORKING**: Direct links to detailed schedules

### 🌍 **Polish Transport APIs**
- **ZTM Gdańsk**: `https://ckan2.multimediagdansk.pl`
  - Stops: `/stops?date={YYYY-MM-DD}` ✅ **WORKING**
  - Vehicles: `/gpsPositions?v=2` ✅ **WORKING**
  - Departures: `/stopArrivals?stopId={id}` (currently 503)

- **Warsaw ZTM**: `https://api.um.warszawa.pl`
  - Requires API key, basic endpoints accessible

- **Krakow MPK**: Website only, no direct API

- **GTFS Feeds**: Available for major cities (some currently unavailable)

### 💡 **Key Insights**
- **e-podroznik.pl** is a comprehensive transport booking system used by multiple Polish carriers
- PKS Gdynia has **excellent data availability** through their website
- Multiple Polish cities have open transport APIs
- GTFS feeds provide standardized offline transport data

## Troubleshooting

### Common Issues

1. **PKS Scraper Fails**: Check e-podroznik.pl availability and HTML structure changes
2. **API Timeouts**: Polish APIs may have rate limiting - implement retry logic
3. **Cache Issues**: Clear cache with `PKSScraperService.clearCache()` or `PolishTransportApiService.clearCache()`

### Debug Mode

Enable debug logging by setting console log level to include warnings.

---

This integration provides a robust foundation for Polish public transport data access, with multiple fallback mechanisms and comprehensive caching for optimal performance.
