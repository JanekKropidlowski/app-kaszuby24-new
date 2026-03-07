import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { performAdvancedSearch, addToHistory, addToFavorites, SearchFilters } from '@/utils/searchEngine';
import { planRoute, Journey } from '@/utils/routePlanner';
import { GeoJSONFeature } from './types';

// ============================================================================
// TYPES
// ============================================================================

interface Stop {
    id: string;
    uid: string;
    name: string;
    lat: number;
    lon: number;
    agency: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdvancedTransportSearch = () => {
    // State
    const [mode, setMode] = useState<'search' | 'route'>('search');
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // Route planning
    const [fromStop, setFromStop] = useState<Stop | null>(null);
    const [toStop, setToStop] = useState<Stop | null>(null);
    const [journeys, setJourneys] = useState<Journey[]>([]);
    const [routeLoading, setRouteLoading] = useState(false);

    // Filters
    const [filters, setFilters] = useState<SearchFilters>({
        sortBy: 'relevance'
    });

    // Mock data - w rzeczywistości pobierane z API
    const [allStops, setAllStops] = useState<GeoJSONFeature[]>([]);
    const [userLocation, setUserLocation] = useState({ lat: 54.352, lon: 18.646 });

    // ========================================
    // SEARCH LOGIC
    // ========================================

    useEffect(() => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }

        const performSearch = async () => {
            setLoading(true);

            try {
                const generator = performAdvancedSearch(
                    query,
                    allStops,
                    {
                        userLocation,
                        currentTime: new Date().toTimeString().slice(0, 5)
                    },
                    filters
                );

                for await (const results of generator) {
                    setSearchResults(results.slice(0, 20));
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(performSearch, 300);
        return () => clearTimeout(debounce);
    }, [query, filters]);

    // ========================================
    // ROUTE PLANNING LOGIC
    // ========================================

    const handlePlanRoute = async () => {
        if (!fromStop || !toStop) return;

        setRouteLoading(true);

        try {
            const getDepartures = async (stopId: string, agency: string, date: string) => {
                const response = await fetch(
                    `https://kaszuby24.pl/wp-json/kaszuby24/v2/timetable?` +
                    `agency=${agency}&stop_id=${stopId}&day=today`
                );
                
                // Handle potential HTML warnings from Redis
                let responseText = await response.text();
                
                if (responseText.startsWith('<')) {
                    console.log(`[AdvancedTransportSearch] Stripped HTML warnings from departures response`);
                    // Find the start of JSON
                    const jsonStart = responseText.indexOf('[');
                    if (jsonStart !== -1) {
                        responseText = responseText.substring(jsonStart);
                    }
                }
                
                return JSON.parse(responseText);
            };

            const results = await planRoute(
                {
                    from: fromStop,
                    to: toStop,
                    departureTime: new Date().toTimeString().slice(0, 5),
                    maxTransfers: 2,
                    maxWalkingDistance: 500
                },
                allStops.map(s => ({
                    id: s.properties.id,
                    uid: s.properties.uid,
                    name: s.properties.name,
                    lat: s.geometry.coordinates[1],
                    lon: s.geometry.coordinates[0],
                    agency: s.properties.agency
                })),
                getDepartures
            );

            setJourneys(results);
        } catch (error) {
            console.error('Route planning error:', error);
        } finally {
            setRouteLoading(false);
        }
    };

    const handleSelectStop = async (stop: any) => {
        await addToHistory(stop);

        if (mode === 'route') {
            if (!fromStop) {
                setFromStop({
                    id: stop.id,
                    uid: stop.id,
                    name: stop.name,
                    lat: stop.lat,
                    lon: stop.lon,
                    agency: stop.agency
                });
            } else if (!toStop) {
                setToStop({
                    id: stop.id,
                    uid: stop.id,
                    name: stop.name,
                    lat: stop.lat,
                    lon: stop.lon,
                    agency: stop.agency
                });
            }
        }

        setQuery('');
        setSearchResults([]);
    };

    // ========================================
    // RENDER
    // ========================================

    return (
        <View style={styles.container}>
            {/* Mode Switcher */}
            <View style={styles.modeSwitcher}>
                <TouchableOpacity
                    style={[styles.modeButton, mode === 'search' && styles.modeButtonActive]}
                    onPress={() => setMode('search')}
                >
                    <Ionicons name="search" size={20} color={mode === 'search' ? '#fff' : '#666'} />
                    <Text style={[styles.modeText, mode === 'search' && styles.modeTextActive]}>
                        Szukaj
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.modeButton, mode === 'route' && styles.modeButtonActive]}
                    onPress={() => setMode('route')}
                >
                    <Ionicons name="navigate" size={20} color={mode === 'route' ? '#fff' : '#666'} />
                    <Text style={[styles.modeText, mode === 'route' && styles.modeTextActive]}>
                        Trasa
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={
                        mode === 'search'
                            ? 'Szukaj przystanku...'
                            : fromStop
                                ? 'Dokąd?'
                                : 'Skąd?'
                    }
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {loading && <ActivityIndicator size="small" color="#007AFF" />}
            </View>

            {/* Filters (Search Mode) */}
            {mode === 'search' && (
                <ScrollView horizontal style={styles.filtersContainer} showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                        style={[styles.filterChip, filters.sortBy === 'relevance' && styles.filterChipActive]}
                        onPress={() => setFilters({ ...filters, sortBy: 'relevance' })}
                    >
                        <Text style={styles.filterText}>Trafność</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, filters.sortBy === 'distance' && styles.filterChipActive]}
                        onPress={() => setFilters({ ...filters, sortBy: 'distance' })}
                    >
                        <Text style={styles.filterText}>Odległość</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, filters.sortBy === 'popularity' && styles.filterChipActive]}
                        onPress={() => setFilters({ ...filters, sortBy: 'popularity' })}
                    >
                        <Text style={styles.filterText}>Popularne</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, filters.agencies?.includes('skm') && styles.filterChipActive]}
                        onPress={() => {
                            const agencies = filters.agencies?.includes('skm')
                                ? filters.agencies.filter(a => a !== 'skm')
                                : [...(filters.agencies || []), 'skm'];
                            setFilters({ ...filters, agencies });
                        }}
                    >
                        <Text style={styles.filterText}>SKM</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, filters.agencies?.includes('polregio') && styles.filterChipActive]}
                        onPress={() => {
                            const agencies = filters.agencies?.includes('polregio')
                                ? filters.agencies.filter(a => a !== 'polregio')
                                : [...(filters.agencies || []), 'polregio'];
                            setFilters({ ...filters, agencies });
                        }}
                    >
                        <Text style={styles.filterText}>PolRegio</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* Route Selection (Route Mode) */}
            {mode === 'route' && (
                <View style={styles.routeSelection}>
                    <View style={styles.routeStop}>
                        <Ionicons name="radio-button-on" size={20} color="#4CAF50" />
                        <Text style={styles.routeStopText}>
                            {fromStop ? fromStop.name : 'Wybierz przystanek początkowy'}
                        </Text>
                        {fromStop && (
                            <TouchableOpacity onPress={() => setFromStop(null)}>
                                <Ionicons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.routeStop}>
                        <Ionicons name="location" size={20} color="#F44336" />
                        <Text style={styles.routeStopText}>
                            {toStop ? toStop.name : 'Wybierz przystanek końcowy'}
                        </Text>
                        {toStop && (
                            <TouchableOpacity onPress={() => setToStop(null)}>
                                <Ionicons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {fromStop && toStop && (
                        <TouchableOpacity
                            style={styles.planButton}
                            onPress={handlePlanRoute}
                            disabled={routeLoading}
                        >
                            {routeLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="navigate" size={20} color="#fff" />
                                    <Text style={styles.planButtonText}>Zaplanuj trasę</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
                <FlatList
                    data={searchResults}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.resultItem}
                            onPress={() => handleSelectStop(item)}
                        >
                            <View style={styles.resultIcon}>
                                <Ionicons name="location" size={24} color="#007AFF" />
                            </View>
                            <View style={styles.resultContent}>
                                <Text style={styles.resultName}>{item.name}</Text>
                                <View style={styles.resultMeta}>
                                    <Text style={styles.resultAgency}>
                                        {item.agency?.toUpperCase()}
                                    </Text>
                                    {item.distance && (
                                        <Text style={styles.resultDistance}>
                                            {(item.distance / 1000).toFixed(1)} km
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => addToFavorites(item)}
                                style={styles.favoriteButton}
                            >
                                <Ionicons name="star-outline" size={20} color="#FFD700" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Journey Results */}
            {journeys.length > 0 && (
                <ScrollView style={styles.journeysContainer}>
                    {journeys.map((journey, index) => (
                        <View key={index} style={styles.journeyCard}>
                            <View style={styles.journeyHeader}>
                                <Text style={styles.journeyTime}>
                                    {journey.departureTime} → {journey.arrivalTime}
                                </Text>
                                <Text style={styles.journeyDuration}>
                                    {journey.totalDuration} min
                                </Text>
                            </View>

                            <View style={styles.journeyInfo}>
                                <View style={styles.journeyBadge}>
                                    <Ionicons name="swap-horizontal" size={16} color="#666" />
                                    <Text style={styles.journeyBadgeText}>
                                        {journey.numberOfTransfers} przesiadki
                                    </Text>
                                </View>
                                {journey.totalWalkingTime > 0 && (
                                    <View style={styles.journeyBadge}>
                                        <Ionicons name="walk" size={16} color="#666" />
                                        <Text style={styles.journeyBadgeText}>
                                            {journey.totalWalkingTime} min
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {journey.connections.map((conn, i) => (
                                <View key={i} style={styles.connection}>
                                    <View style={styles.connectionLine}>
                                        <View style={styles.connectionDot} />
                                        {i < journey.connections.length - 1 && (
                                            <View style={styles.connectionPath} />
                                        )}
                                    </View>
                                    <View style={styles.connectionContent}>
                                        <Text style={styles.connectionStop}>{conn.from.name}</Text>
                                        <Text style={styles.connectionTime}>{conn.departure}</Text>
                                        <View style={styles.connectionLine}>
                                            <Text style={styles.connectionLineText}>
                                                {conn.line} → {conn.dest}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}

                            <View style={styles.connection}>
                                <View style={styles.connectionDot} />
                                <View style={styles.connectionContent}>
                                    <Text style={styles.connectionStop}>
                                        {journey.connections[journey.connections.length - 1].to.name}
                                    </Text>
                                    <Text style={styles.connectionTime}>{journey.arrivalTime}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    modeSwitcher: {
        flexDirection: 'row',
        padding: 16,
        gap: 12
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#fff',
        gap: 8
    },
    modeButtonActive: {
        backgroundColor: '#007AFF'
    },
    modeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666'
    },
    modeTextActive: {
        color: '#fff'
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    searchIcon: {
        marginRight: 12
    },
    searchInput: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16
    },
    filtersContainer: {
        paddingHorizontal: 16,
        marginBottom: 12
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    filterChipActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF'
    },
    filterText: {
        fontSize: 14,
        color: '#666'
    },
    routeSelection: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        elevation: 2
    },
    routeStop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12
    },
    routeStopText: {
        flex: 1,
        fontSize: 16
    },
    planButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
        gap: 8
    },
    planButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 16,
        borderRadius: 12,
        elevation: 1
    },
    resultIcon: {
        marginRight: 12
    },
    resultContent: {
        flex: 1
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4
    },
    resultMeta: {
        flexDirection: 'row',
        gap: 12
    },
    resultAgency: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '600'
    },
    resultDistance: {
        fontSize: 12,
        color: '#999'
    },
    favoriteButton: {
        padding: 8
    },
    journeysContainer: {
        flex: 1,
        padding: 16
    },
    journeyCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2
    },
    journeyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    journeyTime: {
        fontSize: 18,
        fontWeight: '700'
    },
    journeyDuration: {
        fontSize: 16,
        color: '#666'
    },
    journeyInfo: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16
    },
    journeyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f5f5f5',
        borderRadius: 16
    },
    journeyBadgeText: {
        fontSize: 12,
        color: '#666'
    },
    connection: {
        flexDirection: 'row',
        marginBottom: 12
    },
    connectionLine: {
        alignItems: 'center',
        marginRight: 12
    },
    connectionDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#007AFF',
        borderWidth: 2,
        borderColor: '#fff'
    },
    connectionPath: {
        width: 2,
        flex: 1,
        backgroundColor: '#ddd',
        marginVertical: 4
    },
    connectionContent: {
        flex: 1
    },
    connectionStop: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4
    },
    connectionTime: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8
    },
    connectionLineText: {
        fontSize: 14,
        color: '#007AFF'
    }
});

export default AdvancedTransportSearch;
