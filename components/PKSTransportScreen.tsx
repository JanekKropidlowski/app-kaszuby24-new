/**
 * PRZYKŁAD KOMPONENTU REACT NATIVE - PKS Transport Screen
 * Pokazuje jak używać wyciągniętych danych rozkładów w aplikacji mobilnej
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { usePKSTransport } from './PKSTransportService';
import type { PKSLine, PKSConnection } from './PKSTransportService';

export const PKSTransportScreen: React.FC = () => {
  const {
    loadData,
    getLines,
    getLineDetails,
    searchLines,
    getNextConnection,
    getStats
  } = usePKSTransport();

  const [lines, setLines] = useState<PKSLine[]>([]);
  const [filteredLines, setFilteredLines] = useState<PKSLine[]>([]);
  const [selectedLine, setSelectedLine] = useState<PKSLine | null>(null);
  const [lineConnections, setLineConnections] = useState<PKSConnection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [nextConnection, setNextConnection] = useState<PKSConnection | null>(null);

  // Ładowanie danych przy montowaniu komponentu
  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);

      // Załaduj dane PKS
      await loadData();

      // Pobierz wszystkie linie
      const allLines = await getLines();
      setLines(allLines);
      setFilteredLines(allLines);

      // Pobierz statystyki
      const stats = await getStats();
      if (stats) {
        console.log(`PKS Stats: ${stats.total_lines} lines, ${stats.total_connections} connections`);
      }

    } catch (error) {
      console.error('Error initializing PKS data:', error);
      Alert.alert('Błąd', 'Nie udało się załadować danych rozkładów PKS');
    } finally {
      setLoading(false);
    }
  };

  // Wyszukiwanie linii
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim() === '') {
      setFilteredLines(lines);
    } else {
      const results = await searchLines(query);
      setFilteredLines(results);
    }
  };

  // Wybór linii
  const handleLineSelect = async (line: PKSLine) => {
    try {
      setSelectedLine(line);
      setLoading(true);

      // Pobierz szczegóły linii z połączeniami
      const lineDetails = await getLineDetails(line.id);
      if (lineDetails) {
        setLineConnections(lineDetails.connections);

        // Znajdź najbliższe połączenie
        const nextConn = await getNextConnection(line.id);
        setNextConnection(nextConn);
      }

    } catch (error) {
      console.error('Error loading line details:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać rozkładu linii');
    } finally {
      setLoading(false);
    }
  };

  // Powrót do listy linii
  const handleBackToLines = () => {
    setSelectedLine(null);
    setLineConnections([]);
    setNextConnection(null);
  };

  // Renderowanie pojedynczej linii
  const renderLineItem = ({ item }: { item: PKSLine }) => (
    <TouchableOpacity
      style={styles.lineItem}
      onPress={() => handleLineSelect(item)}
    >
      <View style={styles.lineHeader}>
        <Text style={styles.lineNumber}>Linia {item.number}</Text>
        <Text style={[styles.lineType, { color: getTypeColor(item.type) }]}>
          {item.type}
        </Text>
      </View>
      <Text style={styles.lineName}>{item.name}</Text>
      <Text style={styles.lineRoute}>{item.route}</Text>
    </TouchableOpacity>
  );

  // Renderowanie połączenia
  const renderConnection = ({ item }: { item: PKSConnection }) => (
    <View style={styles.connectionItem}>
      <View style={styles.timeContainer}>
        <Text style={styles.departureTime}>{item.departure}</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.arrivalTime}>{item.arrival || '??:??'}</Text>
      </View>
      {item.duration && (
        <Text style={styles.duration}>Czas: {item.duration}</Text>
      )}
      {item.days && item.days.length > 0 && (
        <Text style={styles.days}>
          Dni: {item.days.slice(0, 3).join(', ')}{item.days.length > 3 ? '...' : ''}
        </Text>
      )}
    </View>
  );

  // Kolor dla typu linii
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'miejska': return '#4CAF50';
      case 'regionalna': return '#2196F3';
      case 'szkolna': return '#FF9800';
      default: return '#9C27B0';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Ładowanie rozkładów PKS...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!selectedLine ? (
        // Lista linii
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Rozkłady jazdy PKS</Text>
            <Text style={styles.subtitle}>
              {lines.length} linii autobusowych
            </Text>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Szukaj linii..."
            value={searchQuery}
            onChangeText={handleSearch}
          />

          <FlatList
            data={filteredLines}
            renderItem={renderLineItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        </>
      ) : (
        // Szczegóły linii
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackToLines} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Wstecz</Text>
            </TouchableOpacity>
            <View style={styles.lineHeader}>
              <Text style={styles.title}>Linia {selectedLine.number}</Text>
              <Text style={[styles.lineType, { color: getTypeColor(selectedLine.type) }]}>
                {selectedLine.type}
              </Text>
            </View>
          </View>

          {nextConnection && (
            <View style={styles.nextConnection}>
              <Text style={styles.nextConnectionTitle}>Najbliższe połączenie:</Text>
              <Text style={styles.nextConnectionTime}>
                {nextConnection.departure} → {nextConnection.arrival || '??:??'}
                {nextConnection.duration && ` (${nextConnection.duration})`}
              </Text>
            </View>
          )}

          <Text style={styles.connectionsTitle}>
            Rozkład jazdy ({lineConnections.length} połączeń)
          </Text>

          <FlatList
            data={lineConnections}
            renderItem={renderConnection}
            keyExtractor={(item, index) => `${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchInput: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  lineItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lineNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  lineType: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  lineName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  lineRoute: {
    fontSize: 14,
    color: '#999',
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  nextConnection: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
  },
  nextConnectionTitle: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 4,
  },
  nextConnectionTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  connectionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
  },
  connectionItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  departureTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  arrow: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 12,
  },
  arrivalTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
  days: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});



