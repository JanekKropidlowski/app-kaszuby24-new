import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PKSScheduleEntry {
    line: string;
    route: string;
    departures: string[];
    url?: string;
}

export interface PKSStop {
    id: string;
    name: string;
    lat?: number;
    lon?: number;
}

const PKS_BASE_URL = 'https://www.e-podroznik.pl';
const PKS_CARRIER_ID = '1847'; // PKS Gdynia
const CACHE_PREFIX = 'pks_scraper_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * PKS Scraper Service
 * Scrapes schedule data from PKS Gdynia website and e-podroznik.pl
 */
export class PKSScraperService {

    /**
     * Fetch all available PKS routes/lines
     */
    static async fetchAllRoutes(): Promise<PKSScheduleEntry[]> {
        const cacheKey = `${CACHE_PREFIX}routes`;
        const cached = await AsyncStorage.getItem(cacheKey);

        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_EXPIRY) {
                return data;
            }
        }

        try {
            // Get routes from PKS website (currently the most reliable method)
            // Note: e-podroznik API exists but returns different format
            const routes = await this.scrapeRoutesFromWebsite();

            // Cache the results
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                data: routes,
                timestamp: Date.now()
            }));

            return routes;
        } catch (error) {
            console.warn('Error fetching PKS routes:', error);
            return [];
        }
    }

    /**
     * Scrape routes from e-podroznik.pl API (superior to website scraping)
     */
    private static async scrapeRoutesFromEpodroznik(): Promise<PKSScheduleEntry[]> {
        const timestamp = Date.now();
        const url = `${PKS_BASE_URL}/public/seoIndexCarrierMainPage.do?carrierId=${PKS_CARRIER_ID}&seoName=pks-gdynia&lang=pl&formCompositeExternalCarrier.version=2.2&ajax=true&_=${timestamp}`;

        const response = await axios.get(url, {
            timeout: 15000, // Longer timeout for comprehensive API
            headers: {
                'User-Agent': 'Kaszuby24-App/1.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        return this.parseRoutesFromEpodroznikHTML(response.data);
    }

    /**
     * Parse routes from e-podroznik.pl API HTML response (comprehensive data)
     */
    private static parseRoutesFromEpodroznikHTML(html: string): PKSScheduleEntry[] {
        const routes: PKSScheduleEntry[] = [];

        // Pattern: Extract all route links from the comprehensive table
        // Format: href="/1847,{fromId},{toId},rozklad-jazdy-pks-{routeName}.html" title="{Route Description}"
        const routePattern = /href="\/(\d+),(\d+),(\d+),rozklad-jazdy-pks-([^"]+)\.html"\s+title="([^"]+)"/gi;
        let match;

        while ((match = routePattern.exec(html)) !== null) {
            const [, carrierId, fromId, toId, routeSlug, routeTitle] = match;

            routes.push({
                line: routeSlug,
                route: routeTitle.trim(),
                departures: [], // Will be populated when fetching timetable
                url: `${PKS_BASE_URL}/${carrierId},${fromId},${toId},rozklad-jazdy-pks-${routeSlug}.html`
            });
        }

        // Remove duplicates based on route title
        const uniqueRoutes = routes.filter((route, index, self) =>
            index === self.findIndex(r => r.route === route.route)
        );

        return uniqueRoutes;
    }

    /**
     * Parse routes from PKS website HTML (fallback method)
     */
    private static parseRoutesFromWebsiteHTML(html: string): PKSScheduleEntry[] {
        const routes: PKSScheduleEntry[] = [];

        // Pattern: /rozklad_jazdy/{id}/ with line number and route name
        const routePattern = /href="https:\/\/pksgdynia\.pl\/rozklad_jazdy\/([^\/]+)\/"[^>]*>[\s\S]*?<div class="list-no">([^<]+)<\/div>[\s\S]*?<h3>([^<]+)<\/h3>/gi;
        let match;

        while ((match = routePattern.exec(html)) !== null) {
            const [, routeId, lineNumber, routeName] = match;

            routes.push({
                line: lineNumber.trim(),
                route: routeName.trim(),
                departures: [], // Will be populated when fetching timetable
                url: `https://pksgdynia.pl/rozklad_jazdy/${routeId}/`
            });
        }

        return routes;
    }

    /**
     * Parse routes from e-podroznik HTML (fallback)
     */
    private static parseRoutesFromHTML(html: string): PKSScheduleEntry[] {
        const routes: PKSScheduleEntry[] = [];

        // Pattern: /1847,{fromId},{toId},rozklad-jazdy-pks-{routeName}.html
        const routePattern = /href="\/(\d+),(\d+),(\d+),rozklad-jazdy-pks-([^"]+)\.html">([^<]+)</gi;
        let match;

        while ((match = routePattern.exec(html)) !== null) {
            const [, carrierId, fromId, toId, routeName, label] = match;

            // Parse "From - To" label
            const parts = label.split(' - ');
            if (parts.length === 2) {
                routes.push({
                    line: routeName,
                    route: `${parts[0].trim()} - ${parts[1].trim()}`,
                    departures: [], // Will be populated when fetching timetable
                    url: `${PKS_BASE_URL}/${carrierId},${fromId},${toId},rozklad-jazdy-pks-${routeName}.html`
                });
            }
        }

        return routes;
    }

    /**
     * Fetch timetable for a specific route
     */
    static async fetchTimetable(routeUrl: string, routeName: string): Promise<string[]> {
        const cacheKey = `${CACHE_PREFIX}timetable_${routeName}`;
        const cached = await AsyncStorage.getItem(cacheKey);

        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_EXPIRY) {
                return data;
            }
        }

        try {
            const response = await axios.get(routeUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Kaszuby24-App/1.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            const departures = this.parseTimetableFromHTML(response.data);

            // Cache the results
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                data: departures,
                timestamp: Date.now()
            }));

            return departures;
        } catch (error) {
            console.warn(`Error fetching timetable for ${routeName}:`, error);
            return [];
        }
    }

    /**
     * Parse timetable from HTML
     */
    private static parseTimetableFromHTML(html: string): string[] {
        const departures: string[] = [];

        // Extract time patterns (HH:MM format)
        const timePattern = /\b([0-2]?\d):([0-5]\d)\b/g;
        let match;

        while ((match = timePattern.exec(html)) !== null) {
            const time = match[0];
            // Filter out obviously invalid times
            const [hours, minutes] = time.split(':').map(Number);
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                departures.push(time);
            }
        }

        // Remove duplicates and sort
        return [...new Set(departures)].sort();
    }

    /**
     * Fetch stops from PKS Gdynia data
     */
    static async fetchStops(): Promise<PKSStop[]> {
        const cacheKey = `${CACHE_PREFIX}stops`;
        const cached = await AsyncStorage.getItem(cacheKey);

        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_EXPIRY) {
                return data;
            }
        }

        try {
            // Load stops from comprehensive PKS data
            const stops = await this.loadPKSStopsData();

            // Cache the results
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                data: stops,
                timestamp: Date.now()
            }));

            return stops;
        } catch (error) {
            console.warn('Error fetching PKS stops:', error);
            return [];
        }
    }

    /**
     * Scrape stops from PKS website
     */
    private static async scrapeStopsFromWebsite(): Promise<PKSStop[]> {
        const response = await axios.get('https://pksgdynia.pl/rozklad-jazdy/', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Kaszuby24-App/1.0'
            }
        });

        return this.parseStopsFromHTML(response.data);
    }

    /**
     * Parse stops from HTML (this would need to be customized based on actual HTML structure)
     */
    /**
     * Load PKS stops from comprehensive data file
     */
    private static async loadPKSStopsData(): Promise<PKSStop[]> {
        try {
            // In React Native, we would load from assets or bundled file
            // For now, return comprehensive PKS stops data
            const pksStopsData = require('../pks_stops_data.json');

            return pksStopsData.stops.map((stop: any) => ({
                id: stop.id,
                name: stop.name,
                lat: stop.lat,
                lon: stop.lon,
                agency: stop.agency,
                region: 'pomorskie'
            }));
        } catch (error) {
            console.warn('Error loading PKS stops data:', error);
            // Fallback to basic stops
            return this.getBasicPKSStops();
        }
    }

    /**
     * Get basic PKS stops as fallback
     */
    private static getBasicPKSStops(): PKSStop[] {
        return [
            { id: 'pks_gdynia_main', name: 'Dworzec Główny PKS Gdynia', lat: 54.5189, lon: 18.5305, agency: 'pks_gdynia' },
            { id: 'pks_wejherowo', name: 'Wejherowo Dworzec', lat: 54.6053, lon: 18.2464, agency: 'pks_gdynia' },
            { id: 'pks_rumia', name: 'Rumia', lat: 54.5623, lon: 18.3870, agency: 'pks_gdynia' },
            { id: 'pks_reda', name: 'Reda', lat: 54.6050, lon: 18.3467, agency: 'pks_gdynia' },
            { id: 'pks_puck', name: 'Puck', lat: 54.7167, lon: 18.4, agency: 'pks_gdynia' },
            { id: 'pks_kartuzy', name: 'Kartuzy', lat: 54.3333, lon: 18.2, agency: 'pks_gdynia' },
            { id: 'pks_lebork', name: 'Lębork', lat: 54.5396, lon: 17.7436, agency: 'pks_gdynia' },
            { id: 'pks_leba', name: 'Łeba', lat: 54.7609, lon: 17.5556, agency: 'pks_gdynia' },
            { id: 'pks_wladyslawowo', name: 'Władysławowo', lat: 54.7833, lon: 18.4167, agency: 'pks_gdynia' },
            { id: 'pks_hel', name: 'Hel', lat: 54.6083, lon: 18.8083, agency: 'pks_gdynia' }
        ];
    }

    /**
     * Search for routes by destination or line number
     */
    static async searchRoutes(query: string): Promise<PKSScheduleEntry[]> {
        const allRoutes = await this.fetchAllRoutes();
        const q = query.toLowerCase().trim();

        return allRoutes.filter(route =>
            route.line.toLowerCase().includes(q) ||
            route.route.toLowerCase().includes(q)
        );
    }

    /**
     * Get schedule for a specific stop (if available)
     */
    static async getStopSchedule(stopId: string): Promise<PKSScheduleEntry[]> {
        // This would require more complex scraping or API access
        // For now, return empty array as a placeholder
        console.log(`Getting schedule for stop: ${stopId}`);
        return [];
    }

    /**
     * Clear all cached data
     */
    static async clearCache(): Promise<void> {
        const keys = await AsyncStorage.getAllKeys();
        const pksKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
        await AsyncStorage.multiRemove(pksKeys);
    }
}
