import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Animated,
  Modal
} from 'react-native';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Star, 
  TrendingUp, 
  Heart,
  Filter,
  X,
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface FilterOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface EventFiltersProps {
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
  eventCounts?: Record<string, number>;
  cityFilter?: string | null;
  categoryFilter?: string | null;
  onCityFilterChange?: (city: string | null) => void;
  onCategoryFilterChange?: (category: string | null) => void;
  cities?: string[];
  categories?: Array<{id: string, name: string}>;
}

const EventFilters: React.FC<EventFiltersProps> = ({
  selectedFilters,
  onFilterChange,
  eventCounts = {},
  cityFilter,
  categoryFilter,
  onCityFilterChange,
  onCategoryFilterChange,
  cities = [],
  categories = []
}) => {
  const { theme } = useThemeStore();
  const animatedScale = React.useRef(new Animated.Value(1)).current;
  const [showCityModal, setShowCityModal] = React.useState(false);
  const [showCategoryModal, setShowCategoryModal] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const getFilterIcon = (filterId: string, isSelected: boolean) => {
    const iconColor = isSelected ? '#fff' : '#fff';
    switch (filterId) {
      case 'this-weekend':
        return <Calendar size={14} color={iconColor} />;
      case 'today':
        return <Clock size={14} color={iconColor} />;
      case 'this-week':
        return <Calendar size={14} color={iconColor} />;
      case 'nearby':
        return <MapPin size={14} color={iconColor} />;
      case 'saved':
        return <Heart size={14} color={iconColor} />;
      default:
        return <Calendar size={14} color={iconColor} />;
    }
  };

  const filterOptions: FilterOption[] = [
    {
      id: 'this-weekend',
      label: 'Ten weekend',
      icon: <Calendar size={14} color="#fff" />,
      count: eventCounts['this-weekend'] || 0
    },
    {
      id: 'today',
      label: 'Dzisiaj',
      icon: <Clock size={14} color="#fff" />,
      count: eventCounts['today'] || 0
    },
    {
      id: 'this-week',
      label: 'Ten tydzień',
      icon: <Calendar size={14} color="#fff" />,
      count: eventCounts['this-week'] || 0
    },
    {
      id: 'nearby',
      label: 'W pobliżu',
      icon: <MapPin size={14} color="#fff" />,
      count: eventCounts['nearby'] || 0
    },
    {
      id: 'saved',
      label: 'Zapisane',
      icon: <Heart size={14} color="#fff" />,
      count: eventCounts['saved'] || 0
    }
  ];

  const handleFilterPress = (filterId: string) => {
    Animated.sequence([
      Animated.timing(animatedScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const newFilters = selectedFilters.includes(filterId)
      ? selectedFilters.filter(id => id !== filterId)
      : [...selectedFilters, filterId];
    
    onFilterChange(newFilters);
    
    // Aktualizacja OTA po zmianie filtrów
    console.log('🔄 Aktualizacja OTA - zmiana filtrów:', newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange([]);
    if (onCityFilterChange) onCityFilterChange(null);
    if (onCategoryFilterChange) onCategoryFilterChange(null);
    
    // Aktualizacja OTA po wyczyszczeniu filtrów
    console.log('🔄 Aktualizacja OTA - wyczyszczenie filtrów');
  };

  const hasActiveFilters = selectedFilters.length > 0 || cityFilter || categoryFilter;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      {/* Compact Header - tylko tekst "Pokaż filtry" */}
      <TouchableOpacity
        style={styles.simpleHeader}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={[styles.expandText, { color: theme.colors.primary }]}>
          {isExpanded ? 'Ukryj filtry' : 'Pokaż filtry'}
        </Text>
        {hasActiveFilters && (
          <View style={[styles.selectedCount, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.selectedCountText, { color: '#fff' }]}>
              {selectedFilters.length + (cityFilter ? 1 : 0) + (categoryFilter ? 1 : 0)}
            </Text>
          </View>
        )}
        {isExpanded ? (
          <ChevronUp size={14} color={theme.colors.primary} />
        ) : (
          <ChevronDown size={14} color={theme.colors.primary} />
        )}
      </TouchableOpacity>

      {/* Expanded Filters */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Clear Button - X removed */}
          {/* {hasActiveFilters && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearAllFilters}
            >
              <X size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.clearText, { color: theme.colors.textSecondary }]}>
                Wyczyść wszystkie filtry
              </Text>
            </TouchableOpacity>
          )} */}
          
          {/* City and Category Filters */}
          <View style={styles.mainFiltersRow}>
            {/* City Filter */}
            <TouchableOpacity 
              style={[
                styles.filterButton,
                {
                  backgroundColor: cityFilter 
                    ? theme.colors.primary 
                    : theme.colors.subtle,
                  borderColor: cityFilter 
                    ? theme.colors.primary 
                    : theme.colors.border,
                }
              ]}
              onPress={() => setShowCityModal(true)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.iconContainer,
                { 
                  backgroundColor: cityFilter 
                    ? 'rgba(255,255,255,0.2)' 
                    : theme.colors.primary 
                }
              ]}>
                <MapPin size={12} color={cityFilter ? '#fff' : '#fff'} />
              </View>
              
              <View style={styles.filterContent}>
                <Text style={[
                  styles.filterLabel,
                  { 
                    color: cityFilter ? '#fff' : theme.colors.text,
                    fontWeight: cityFilter ? '600' : '500'
                  }
                ]}>
                  {cityFilter || 'Miasto'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Category Filter */}
            <TouchableOpacity 
              style={[
                styles.filterButton,
                {
                  backgroundColor: categoryFilter 
                    ? theme.colors.primary 
                    : theme.colors.subtle,
                  borderColor: categoryFilter 
                    ? theme.colors.primary 
                    : theme.colors.border,
                }
              ]}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.iconContainer,
                { 
                  backgroundColor: categoryFilter 
                    ? 'rgba(255,255,255,0.2)' 
                    : theme.colors.primary 
                }
              ]}>
                <Tag size={12} color={categoryFilter ? '#fff' : '#fff'} />
              </View>
              
              <View style={styles.filterContent}>
                <Text style={[
                  styles.filterLabel,
                  { 
                    color: categoryFilter ? '#fff' : theme.colors.text,
                    fontWeight: categoryFilter ? '600' : '500'
                  }
                ]}>
                  {(categoryFilter && categories.find(c=>c.id===categoryFilter)?.name) || 'Kategoria'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Time-based Filters */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {filterOptions.map((option) => {
              const isSelected = selectedFilters.includes(option.id);
              return (
                <Animated.View key={option.id} style={{ transform: [{ scale: animatedScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected 
                          ? theme.colors.primary 
                          : theme.colors.subtle,
                        borderColor: isSelected 
                          ? theme.colors.primary 
                          : theme.colors.border,
                      }
                    ]}
                    onPress={() => handleFilterPress(option.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.iconContainer,
                      { 
                        backgroundColor: isSelected 
                          ? 'rgba(255,255,255,0.2)' 
                          : theme.colors.primary 
                      }
                    ]}>
                      {getFilterIcon(option.id, isSelected)}
                    </View>
                    
                    <View style={styles.filterContent}>
                      <Text style={[
                        styles.filterLabel,
                        { 
                          color: isSelected ? '#fff' : theme.colors.text,
                          fontWeight: isSelected ? '600' : '500'
                        }
                      ]}>
                        {option.label}
                      </Text>
                      {option.count && option.count > 0 && (
                        <View style={[
                          styles.countBadge,
                          { 
                            backgroundColor: isSelected 
                              ? 'rgba(255,255,255,0.3)' 
                              : theme.colors.primary 
                          }
                        ]}>
                          <Text style={[
                            styles.countText,
                            { 
                              color: isSelected ? '#fff' : '#fff',
                              fontSize: 9
                            }
                          ]}>
                            {option.count}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Modal dla miast */}
      <Modal visible={showCityModal} transparent animationType="slide" onRequestClose={() => setShowCityModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Wybierz miasto</Text>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity 
                style={styles.modalItem} 
                onPress={() => {
                  if (onCityFilterChange) onCityFilterChange(null);
                  setShowCityModal(false);
                  console.log('🔄 Aktualizacja OTA - zmiana filtra miasta: null');
                }}
              >
                <Text style={[styles.modalItemText, { color: !cityFilter ? theme.colors.primary : theme.colors.text }]}>
                  Wszystkie
                </Text>
              </TouchableOpacity>
              {cities.map(city => (
                <TouchableOpacity 
                  key={city} 
                  style={styles.modalItem} 
                  onPress={() => {
                    if (onCityFilterChange) onCityFilterChange(city);
                    setShowCityModal(false);
                    console.log('🔄 Aktualizacja OTA - zmiana filtra miasta:', city);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: cityFilter === city ? theme.colors.primary : theme.colors.text }]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal dla kategorii */}
      <Modal visible={showCategoryModal} transparent animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Wybierz kategorię</Text>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity 
                style={styles.modalItem} 
                onPress={() => {
                  if (onCategoryFilterChange) onCategoryFilterChange(null);
                  setShowCategoryModal(false);
                  console.log('🔄 Aktualizacja OTA - zmiana filtra kategorii: null');
                }}
              >
                <Text style={[styles.modalItemText, { color: !categoryFilter ? theme.colors.primary : theme.colors.text }]}>
                  Wszystkie
                </Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={styles.modalItem} 
                  onPress={() => {
                    if (onCategoryFilterChange) onCategoryFilterChange(cat.id);
                    setShowCategoryModal(false);
                    console.log('🔄 Aktualizacja OTA - zmiana filtra kategorii:', cat.name);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: categoryFilter === cat.id ? theme.colors.primary : theme.colors.text }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12, // Zmniejszony border radius
    padding: 12, // Zmniejszony padding
    marginHorizontal: 16,
    marginVertical: 6, // Zmniejszony margin
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Zmniejszony shadow
    shadowOpacity: 0.08, // Zmniejszona przezroczystość
    shadowRadius: 4, // Zmniejszony radius
    elevation: 2, // Zmniejszony elevation
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCount: {
    paddingHorizontal: 4, // Zmniejszony padding
    paddingVertical: 2,
    borderRadius: 8, // Zmniejszony border radius
    minWidth: 16, // Zmniejszona minimalna szerokość
    alignItems: 'center',
  },
  selectedCountText: {
    fontSize: 10, // Zmniejszony font size
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // Zmniejszony gap
    paddingHorizontal: 8, // Zmniejszony padding
    paddingVertical: 6, // Zmniejszony padding
    marginBottom: 8, // Zmniejszony margin
    alignSelf: 'flex-start',
  },
  clearText: {
    fontSize: 11, // Zmniejszony font size
  },
  expandButton: {
    padding: 6,
    borderRadius: 6,
  },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8, // Zmniejszony padding
    paddingHorizontal: 12, // Zmniejszony padding
  },
  expandText: {
    fontSize: 14, // Zmniejszony font size
    fontWeight: '500',
  },
  expandedContent: {
    marginTop: 12, // Zmniejszony margin
  },
  mainFiltersRow: {
    flexDirection: 'row',
    gap: 8, // Zmniejszony gap
    marginBottom: 12, // Zmniejszony margin
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8, // Zmniejszony padding
    paddingVertical: 8, // Zmniejszony padding
    borderRadius: 8, // Zmniejszony border radius
    borderWidth: 1,
    gap: 6, // Zmniejszony gap
  },
  filtersContainer: {
    paddingHorizontal: 2, // Zmniejszony padding
    gap: 6, // Zmniejszony gap
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8, // Zmniejszony padding
    paddingVertical: 6, // Zmniejszony padding
    borderRadius: 16, // Zmniejszony border radius
    borderWidth: 1,
    gap: 4, // Zmniejszony gap
  },
  iconContainer: {
    width: 20, // Zmniejszony rozmiar
    height: 20, // Zmniejszony rozmiar
    borderRadius: 10, // Zmniejszony border radius
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // Zmniejszony gap
  },
  filterLabel: {
    fontSize: 12, // Zmniejszony font size
    fontWeight: '500',
  },
  countBadge: {
    paddingHorizontal: 3, // Zmniejszony padding
    paddingVertical: 1, // Zmniejszony padding
    borderRadius: 6, // Zmniejszony border radius
    minWidth: 12, // Zmniejszona minimalna szerokość
    alignItems: 'center',
  },
  countText: {
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: '80%',
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalItemText: {
    fontSize: 16,
  },
});

export default EventFilters; 