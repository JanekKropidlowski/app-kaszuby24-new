import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Dimensions } from 'react-native';
import { MapPin, Navigation, ExternalLink } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import MapView, { Marker } from 'react-native-maps';

const { width } = Dimensions.get('window');

interface VenueMapProps {
  coordinates?: string;
  address?: string;
  postalCode?: string;
}

export const VenueMap: React.FC<VenueMapProps> = ({ coordinates, address, postalCode }) => {
  const { theme } = useThemeStore();

  if (!coordinates) {
    return null;
  }

  // Parse coordinates (assuming format like "54.123456,18.123456")
  const parseCoordinates = (coordString: string) => {
    const parts = coordString.split(',').map(coord => parseFloat(coord.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { latitude: parts[0], longitude: parts[1] };
    }
    return null;
  };

  const coords = parseCoordinates(coordinates);
  if (!coords) {
    return null;
  }

  const openInMaps = () => {
    const url = `https://www.openstreetmap.org/?mlat=${coords.latitude}&mlon=${coords.longitude}&zoom=15`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Błąd', 'Nie można otworzyć mapy');
    });
  };

  const openInNavigation = () => {
    const url = `https://www.openstreetmap.org/directions?from=&to=${coords.latitude},${coords.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Błąd', 'Nie można otworzyć nawigacji');
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      {/* Real Map with location marker */}
      <View style={styles.mapImageContainer}>
        <View style={styles.mapWrapper}>
          <View style={styles.mapMask}>
            <MapView
              style={styles.mapImage}
              initialRegion={{
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
              rotateEnabled={false}
              pitchEnabled={false}
              showsUserLocation={false}
              showsMyLocationButton={false}
              mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <Marker
                coordinate={{
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                }}
                pinColor={theme.colors.primary}
              />
            </MapView>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          onPress={openInMaps}
        >
          <ExternalLink size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Mapa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}
          onPress={openInNavigation}
        >
          <Navigation size={16} color={theme.colors.primary} />
          <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Nawigacja</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  mapImageContainer: {
    height: 300,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  mapMask: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 0,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_Medium',
    color: '#FFFFFF',
  },
});
