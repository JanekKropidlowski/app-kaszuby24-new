import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MapPin, Thermometer, Droplets, Wind, ChevronRight } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface WeatherStation {
  id: string;
  name: string;
  distance: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  lastUpdate: string;
}

interface NearestStationsProps {
  stations: WeatherStation[];
  onStationPress: (stationId: string) => void;
}

export const NearestStations: React.FC<NearestStationsProps> = ({
  stations,
  onStationPress,
}) => {
  const { theme } = useThemeStore();

  if (!stations || stations.length === 0) {
    return null;
  }

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Teraz';
    if (diffMins < 60) return `${diffMins}min temu`;
    if (diffMins < 1440) return `${Math.round(diffMins / 60)}h temu`;
    return `${Math.round(diffMins / 1440)}d temu`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Najbliższe stacje</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stations.map((station) => (
          <TouchableOpacity
            key={station.id}
            style={styles.stationCard}
            onPress={() => onStationPress(station.id)}
          >
            <View style={styles.stationHeader}>
              <View style={styles.locationContainer}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.stationName}>{station.name}</Text>
              </View>
              <Text style={styles.distance}>
                {formatDistance(station.distance)}
              </Text>
            </View>
            
            <View style={styles.stationData}>
              <View style={styles.dataRow}>
                <Thermometer size={16} color="#EF4444" />
                <Text style={styles.dataValue}>
                  {Math.round(station.temperature)}°C
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Droplets size={16} color="#3B82F6" />
                <Text style={styles.dataValue}>
                  {station.humidity}%
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Wind size={16} color="#8B5CF6" />
                <Text style={styles.dataValue}>
                  {Math.round(station.windSpeed)} km/h
                </Text>
              </View>
            </View>
            
            <View style={styles.stationFooter}>
              <Text style={styles.lastUpdate}>
                {formatTime(station.lastUpdate)}
              </Text>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    marginHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  stationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  stationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  distance: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  stationData: {
    gap: 8,
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  stationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#64748B',
  },
});
