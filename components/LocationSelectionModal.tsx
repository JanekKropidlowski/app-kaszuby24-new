import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, X, Search, Star, Navigation, Thermometer, Waves, Gauge } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { useWeatherConfigStore } from '../store/weatherConfigStore';
import { SYNOP_STATIONS, findNearestSynopStation, calculateDistance } from '../services/weatherService';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

interface LocationSelectionModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LocationSelectionModal: React.FC<LocationSelectionModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useThemeStore();
  const { selectedStation, setSelectedStation, favoriteStations, toggleFavoriteStation } = useWeatherConfigStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [nearestStation, setNearestStation] = useState<any>(null);
  const [userCityName, setUserCityName] = useState<string | null>(null);
  const [citySuggestion, setCitySuggestion] = useState<{ cityName: string; station: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const nominatimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setUserCityName(null);
      setCitySuggestion(null);
      getCurrentLocation();
    }
  }, [visible]);

  // Nominatim geocoding: gdy użytkownik wpisze miasto, znajdź najbliższą stację
  useEffect(() => {
    if (nominatimTimer.current) clearTimeout(nominatimTimer.current);
    if (searchQuery.length < 3) {
      setCitySuggestion(null);
      return;
    }
    nominatimTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&countrycodes=pl`,
          { headers: { 'User-Agent': 'Kaszuby24App/1.0' } }
        );
        const data = await res.json();
        if (data.length > 0) {
          const { lat, lon, name } = data[0];
          const nearest = findNearestSynopStation({
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
          } as Location.LocationObjectCoords);
          setCitySuggestion({ cityName: name, station: nearest });
        } else {
          setCitySuggestion(null);
        }
      } catch (_) {
        setCitySuggestion(null);
      }
    }, 600);
    return () => {
      if (nominatimTimer.current) clearTimeout(nominatimTimer.current);
    };
  }, [searchQuery]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);

      // Reverse geocoding: pobierz nazwę miasta
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geocode[0]) {
          const city = geocode[0].city || geocode[0].district || geocode[0].subregion || geocode[0].region;
          setUserCityName(city || null);
        }
      } catch (_) { }

      // Znajdź najbliższą stację SYNOP
      const nearest = findNearestSynopStation(location.coords);
      setNearestStation(nearest);
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStationSelect = (station: any, cityName?: string) => {
    setSelectedStation({
      id: station.id,
      name: station.name,
      type: station.type,
      cityName: cityName || undefined,
    });
    onClose();
  };

  const filteredStations = SYNOP_STATIONS.filter(station =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    station.region?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFavorite = (stationId: string) => {
    return favoriteStations.some(s => s.id === stationId);
  };

  const getStationIcon = (type: string) => {
    switch (type) {
      case 'synop':
        return <Thermometer size={16} color="#3B82F6" />;
      case 'marine':
        return <Waves size={16} color="#0EA5E9" />;
      case 'hydro':
        return <Gauge size={16} color="#10B981" />;
      default:
        return <MapPin size={16} color="#6B7280" />;
    }
  };

  const getStationColor = (type: string) => {
    switch (type) {
      case 'synop':
        return '#3B82F6';
      case 'marine':
        return '#0EA5E9';
      case 'hydro':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getStationDistance = (station: any): number | null => {
    if (!userLocation || station.lat == null || station.lon == null) return null;
    return calculateDistance(
      userLocation.coords.latitude,
      userLocation.coords.longitude,
      station.lat,
      station.lon
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.8)" barStyle="light-content" />
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          {/* Enhanced Header with Gradient */}
          <LinearGradient
            colors={['#224A96', '#1e40af', '#1d4ed8']}
            style={styles.modalHeaderGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <MapPin size={28} color="#FFFFFF" />
                </View>
                <View style={styles.modalTitleTextContainer}>
                  <Text style={[styles.modalTitle, { color: '#FFFFFF', fontFamily: theme?.fontFamily?.bold || 'Poppins_Bold' }]}>
                    Wybierz lokalizację
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: 'rgba(255,255,255,0.9)', fontFamily: theme?.fontFamily?.regular || 'Poppins_Regular' }]}>
                    Stacja meteorologiczna lub Twoja lokalizacja
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Search size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Szukaj stacji lub miasta..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Current Location Section — ukryta gdy użytkownik wpisuje zapytanie */}
            {userLocation && nearestStation && searchQuery.length < 3 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.semibold }]}>
                  Twoja lokalizacja
                </Text>
                <TouchableOpacity
                  style={[
                    styles.locationCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: selectedStation?.id === nearestStation.id ? theme.colors.primary : theme.colors.border
                    }
                  ]}
                  onPress={() => handleStationSelect(nearestStation)}
                  activeOpacity={0.7}
                >
                  <View style={styles.locationCardHeader}>
                    <View style={[styles.locationIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Navigation size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.locationCardInfo}>
                      <Text style={[styles.locationCardTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.semibold }]}>
                        {userCityName || 'Twoja lokalizacja'}
                      </Text>
                      <Text style={[styles.locationCardSubtitle, { color: theme.colors.textSecondary, fontFamily: theme?.fontFamily?.regular }]}>
                        Stacja: {nearestStation.name} • {nearestStation.distance?.toFixed(1)} km
                      </Text>
                    </View>
                    <View style={[styles.locationCardStatus, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[styles.locationCardStatusText, { color: theme.colors.primary, fontFamily: theme?.fontFamily?.medium }]}>
                        GPS
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Sugestia stacji dla wpisanego miasta */}
            {citySuggestion && searchQuery.length >= 3 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.semibold }]}>
                  Wyniki dla: {citySuggestion.cityName}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.locationCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: selectedStation?.cityName === citySuggestion.cityName ? '#F59E0B' : theme.colors.border,
                    }
                  ]}
                  onPress={() => handleStationSelect(citySuggestion.station, citySuggestion.cityName)}
                  activeOpacity={0.7}
                >
                  <View style={styles.locationCardHeader}>
                    <View style={[styles.locationIconContainer, { backgroundColor: '#F59E0B20' }]}>
                      <MapPin size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.locationCardInfo}>
                      <Text style={[styles.locationCardTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.semibold }]}>
                        {citySuggestion.cityName}
                      </Text>
                      <Text style={[styles.locationCardSubtitle, { color: theme.colors.textSecondary, fontFamily: theme?.fontFamily?.regular }]}>
                        Najbliższa stacja: {citySuggestion.station.name}{citySuggestion.station.distance != null ? ` • ${citySuggestion.station.distance.toFixed(1)} km` : ''}
                      </Text>
                    </View>
                    <View style={[styles.locationCardStatus, { backgroundColor: '#F59E0B20' }]}>
                      <Text style={[styles.locationCardStatusText, { color: '#F59E0B', fontFamily: theme?.fontFamily?.medium }]}>
                        Najbliższa
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Favorite Stations Section */}
            {favoriteStations.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.semibold }]}>
                  Ulubione stacje
                </Text>
                {favoriteStations.map((station) => (
                  <TouchableOpacity
                    key={station.id}
                    style={[
                      styles.stationCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: selectedStation?.id === station.id ? theme.colors.primary : theme.colors.border
                      }
                    ]}
                    onPress={() => handleStationSelect(station)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stationCardHeader}>
                      <View style={[styles.stationIconContainer, { backgroundColor: getStationColor(station.type) + '20' }]}>
                        {getStationIcon(station.type)}
                      </View>
                      <View style={styles.stationCardInfo}>
                        <Text style={[styles.stationCardTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.semibold }]}>
                          {station.name}
                        </Text>
                        <Text style={[styles.stationCardSubtitle, { color: theme.colors.textSecondary, fontFamily: theme?.fontFamily?.regular }]}>
                          {station.type === 'synop' ? 'Stacja synoptyczna' :
                            station.type === 'meteo' ? 'Stacja meteorologiczna' :
                              station.type === 'hydro' ? 'Stacja hydrologiczna' : 'Stacja'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={() => toggleFavoriteStation(station)}
                        activeOpacity={0.7}
                      >
                        <Star size={20} color={theme.colors.warning} fill={theme.colors.warning} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* All Stations Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.semibold }]}>
                Wszystkie stacje ({filteredStations.length})
              </Text>
              {filteredStations.map((station) => {
                const dist = getStationDistance(station);
                const typeLabel = station.type === 'synop' ? 'Stacja synoptyczna' :
                  station.type === 'meteo' ? 'Stacja meteorologiczna' :
                    station.type === 'hydro' ? 'Stacja hydrologiczna' : 'Stacja meteorologiczna';
                return (
                  <TouchableOpacity
                    key={station.id}
                    style={[
                      styles.stationCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: selectedStation?.id === station.id ? theme.colors.primary : theme.colors.border
                      }
                    ]}
                    onPress={() => handleStationSelect(station)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stationCardHeader}>
                      <View style={[styles.stationIconContainer, { backgroundColor: getStationColor(station.type) + '20' }]}>
                        {getStationIcon(station.type)}
                      </View>
                      <View style={styles.stationCardInfo}>
                        <Text style={[styles.stationCardTitle, { color: theme.colors.text, fontFamily: theme?.fontFamily?.semibold }]}>
                          {station.name}
                        </Text>
                        <Text style={[styles.stationCardSubtitle, { color: theme.colors.textSecondary, fontFamily: theme?.fontFamily?.regular }]}>
                          {station.region} • {typeLabel}{dist != null ? ` • ${dist.toFixed(1)} km` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={() => toggleFavoriteStation(station)}
                        activeOpacity={0.7}
                      >
                        <Star
                          size={20}
                          color={theme.colors.warning}
                          fill={isFavorite(station.id) ? theme.colors.warning : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '70%',
  },
  modalHeaderGradient: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalTitleTextContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Poppins_Regular',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  locationCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  locationCardInfo: {
    flex: 1,
  },
  locationCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationCardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  locationCardStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  locationCardStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stationCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  stationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stationCardInfo: {
    flex: 1,
  },
  stationCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stationCardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
