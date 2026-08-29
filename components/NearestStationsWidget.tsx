import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  MapPin,
  Waves,
  Activity,
  BarChart3,
  Navigation,
  Clock,
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { SynopData, HydroData, MeteoData } from '@/types/weather';

interface NearestStationsWidgetProps {
  synopData?: SynopData;
  hydroData?: HydroData[];
  meteoData?: MeteoData[];
  userLocation?: { latitude: number; longitude: number };
  onStationPress?: (type: 'synop' | 'hydro' | 'meteo', data: any) => void;
}

export const NearestStationsWidget: React.FC<NearestStationsWidgetProps> = ({
  synopData,
  hydroData = [],
  meteoData = [],
  userLocation,
  onStationPress,
}) => {
  const { theme } = useThemeStore();

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      return 999999; // Return large distance for invalid coordinates
    }
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get nearest hydro stations (top 3)
  const getNearestHydroStations = () => {
    if (!userLocation || !Array.isArray(hydroData) || hydroData.length === 0) return [];
    
    return hydroData
      .filter(station => station.lat && station.lon)
      .map(station => {
        const lat = parseFloat(station.lat || '0');
        const lon = parseFloat(station.lon || '0');
        return {
          ...station,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            lat,
            lon
          )
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  };

  // Get nearest meteo stations (top 3)
  const getNearestMeteoStations = () => {
    if (!userLocation || !Array.isArray(meteoData) || meteoData.length === 0) return [];
    
    return meteoData
      .filter(station => station.lat && station.lon)
      .map(station => {
        const lat = parseFloat(station.lat || '0');
        const lon = parseFloat(station.lon || '0');
        return {
          ...station,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            lat,
            lon
          )
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  };

  const nearestHydroStations = getNearestHydroStations();
  const nearestMeteoStations = getNearestMeteoStations();

  const formatDistance = (distance: number) => {
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Teraz';
    if (diffHours < 24) return `${diffHours}h temu`;
    return `${Math.floor(diffHours / 24)}d temu`;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Najbliższe stacje pomiarowe
      </Text>

      {/* Main Synoptic Station */}
      {synopData && (
        <TouchableOpacity
          style={[styles.mainStationCard, { backgroundColor: theme.colors.card }]}
          onPress={() => onStationPress?.('synop', synopData)}
        >
          <View style={styles.stationHeader}>
            <View style={styles.stationIcon}>
              <BarChart3 size={20} color="#4ECDC4" fill="#4ECDC4" />
            </View>
            <View style={styles.stationInfo}>
              <Text style={[styles.stationName, { color: theme.colors.text }]}>
                {synopData.stacja}
              </Text>
              <Text style={styles.stationType}>Stacja synoptyczna IMGW</Text>
            </View>
            <View style={styles.stationData}>
              <Text style={[styles.temperature, { color: theme.colors.text }]}>
                {parseFloat(synopData.temperatura).toFixed(1)}°C
              </Text>
              <Text style={styles.timeAgo}>
                {getTimeAgo(`${synopData.data_pomiaru} ${synopData.godzina_pomiaru}:00`)}
              </Text>
            </View>
          </View>
          
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>Wilgotność</Text>
              <Text style={styles.quickStatValue}>
                {parseFloat(synopData.wilgotnosc_wzgledna).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>Wiatr</Text>
              <Text style={styles.quickStatValue}>
                {parseFloat(synopData.predkosc_wiatru).toFixed(1)} km/h
              </Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>Ciśnienie</Text>
              <Text style={styles.quickStatValue}>
                {parseFloat(synopData.cisnienie).toFixed(0)} hPa
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Nearest Hydro Stations */}
      {nearestHydroStations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Waves size={18} color="#45B7D1" fill="#45B7D1" />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Najbliższe stacje hydrologiczne
            </Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {nearestHydroStations.map((station) => (
              <TouchableOpacity
                key={station.id_stacji}
                style={[styles.smallStationCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}
                onPress={() => onStationPress?.('hydro', station)}
              >
                <View style={styles.smallStationHeader}>
                  <MapPin size={12} color="#45B7D1" />
                  <Text style={styles.distance}>
                    {formatDistance(station.distance)}
                  </Text>
                </View>
                
                <Text style={[styles.smallStationName, { color: theme.colors.text }]} numberOfLines={2}>
                  {station.stacja}
                </Text>
                
                <Text style={styles.riverName}>r. {station.rzeka}</Text>
                
                <View style={styles.smallStationData}>
                  <Text style={styles.dataLabel}>Stan wody</Text>
                  <Text style={[styles.dataValue, { color: theme.colors.text }]}>
                    {station.stan_wody ? `${parseFloat(station.stan_wody).toFixed(0)} cm` : '--'}
                  </Text>
                </View>
                
                {station.temperatura_wody && (
                  <View style={styles.smallStationData}>
                    <Text style={styles.dataLabel}>Temp. wody</Text>
                    <Text style={[styles.dataValue, { color: theme.colors.text }]}>
                      {parseFloat(station.temperatura_wody).toFixed(1)}°C
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Nearest Meteo Stations */}
      {nearestMeteoStations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity size={18} color="#96CEB4" fill="#96CEB4" />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Najbliższe stacje automatyczne
            </Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {nearestMeteoStations.map((station) => (
              <TouchableOpacity
                key={station.kod_stacji}
                style={[styles.smallStationCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}
                onPress={() => onStationPress?.('meteo', station)}
              >
                <View style={styles.smallStationHeader}>
                  <MapPin size={12} color="#96CEB4" />
                  <Text style={styles.distance}>
                    {formatDistance(station.distance)}
                  </Text>
                </View>
                
                <Text style={[styles.smallStationName, { color: theme.colors.text }]} numberOfLines={2}>
                  {station.nazwa_stacji}
                </Text>
                
                {station.temperatura_powietrza && (
                  <View style={styles.smallStationData}>
                    <Text style={styles.dataLabel}>Temperatura</Text>
                    <Text style={[styles.dataValue, { color: theme.colors.text }]}>
                      {parseFloat(station.temperatura_powietrza).toFixed(1)}°C
                    </Text>
                  </View>
                )}
                
                {station.wilgotnosc_wzgledna && (
                  <View style={styles.smallStationData}>
                    <Text style={styles.dataLabel}>Wilgotność</Text>
                    <Text style={[styles.dataValue, { color: theme.colors.text }]}>
                      {parseFloat(station.wilgotnosc_wzgledna).toFixed(0)}%
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    marginHorizontal: 20,
  },
  mainStationCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4ECDC4' + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  stationType: {
    fontSize: 12,
    color: '#666',
  },
  stationData: {
    alignItems: 'flex-end',
  },
  temperature: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  timeAgo: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  quickStat: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  quickStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  smallStationCard: {
    width: 160,
    borderRadius: 14,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  smallStationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  distance: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  smallStationName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    minHeight: 32,
  },
  riverName: {
    fontSize: 10,
    color: '#45B7D1',
    fontWeight: '500',
    marginBottom: 8,
  },
  smallStationData: {
    marginBottom: 6,
  },
  dataLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  dataValue: {
    fontSize: 11,
    fontWeight: '600',
  },
});
