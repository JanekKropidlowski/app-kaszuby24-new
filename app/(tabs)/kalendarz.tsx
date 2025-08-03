import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Platform, 
  Dimensions, 
  Share, 
  Linking, 
  TextInput, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  Share2, 
  Search, 
  Filter, 
  ChevronRight,
  Plus,
  Minus,
  Home,
  Settings,
  Bookmark,
  X,
  Tag,
  Heart,
  Star,
  TrendingUp
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as he from 'he';

import { useThemeStore } from '@/store/themeStore';
import { useEventsStore, SavedEvent } from '@/store/eventsStore';
import LoadingIndicator from '@/components/LoadingIndicator';
import SkeletonLoader from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import InlineCalendar from '@/components/InlineCalendar';
import ModernEventList from '@/components/ModernEventList';
import { formatDateTime, formatDate, formatTime } from '@/utils/dateFormatter';
import * as Haptics from 'expo-haptics';

// Event type definition
interface Event extends SavedEvent {
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
    }>;
    'wp:term'?: Array<Array<{
      id: number;
      name: string;
      taxonomy: string;
    }>>;
  };
  'kategoria-wydarzenia'?: number[];
}

// EventCategory type definition
interface EventCategory {
  id: number;
  name: string;
  slug: string;
}

const BASE_URL = 'https://kaszuby24.pl/wp-json/kaszuby24/v1/events';

// Safe date conversion function - improved version
function safeDate(input: string | number): Date {
  // 1. Try parsing as ISO string first
  const maybe = new Date(input as any);
  if (!isNaN(maybe.getTime())) return maybe;

  // 2. Try as seconds timestamp
  const num = typeof input === 'string' ? parseInt(input, 10) : input;
  if (!isNaN(num)) {
    const d = new Date(num * 1000);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Fallback to current date
  return new Date();
}



export default function EventCalendarScreen() {
  const { theme } = useThemeStore();
  const { isEventSaved, saveEvent, removeEvent } = useEventsStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const [cityModal, setCityModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  
  // Nowe funkcjonalności
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{start: Date, end: Date} | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  


  // Unikalne miasta i kategorie do filtrów
  const cities = useMemo(() => {
    const all = events.map(e => e.meta?.miasto).filter(Boolean);
    return Array.from(new Set(all));
  }, [events]);
  const categories = useMemo(() => {
    const all = events.flatMap((e: any) => {
      const terms = e._embedded?.['wp:term']?.flat() || [];
      return terms
        .filter((t: any) => t.taxonomy === 'kategoria-wydarzenia')
        .map((t: any) => ({
          id: t.id.toString(),
          name: he.decode(t.name)      // Dekodujemy nazwy kategorii
        }));
    });
    const uniq: {id:string,name:string}[] = [];
    const ids = new Set<string>();
    all.forEach(c => { if (!ids.has(c.id)){ ids.add(c.id); uniq.push(c);} });
    return uniq;
  }, [events]);

  const fetchPage = useCallback(async (pageNum: number, append = false) => {
    try {
      // Build URL with filters for server-side filtering
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('per_page', '20');
      
      // Add server-side filters
      if (selectedFilters.length > 0) {
        // Use the first filter for server-side filtering
        params.append('filter', selectedFilters[0]);
      }
      
      if (cityFilter) {
        params.append('city', cityFilter);
      }
      
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }
      

      
      const url = `${BASE_URL}?${params.toString()}`;
      console.log('🔍 Debug - Fetching URL:', url);
      
      const res = await fetch(url);
      const data = await res.json();
      
      const total = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);
      setTotalPages(total);
      
      if (append) {
        setEvents(prev => [...prev, ...(Array.isArray(data) ? data : [])]);
      } else {
        setEvents(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('❌ Error fetching events:', e);
      setError('Błąd ładowania wydarzeń.');
      // Ustaw puste wydarzenia w przypadku błędu
      setEvents([]);
    }
  }, [selectedFilters, cityFilter, categoryFilter]);

  const reloadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPage(1);
    await fetchPage(1, false);
    setLoading(false);
    setRefreshing(false);
  }, [fetchPage]);

  useEffect(() => {
    reloadEvents();
  }, [reloadEvents]);

  // Stan dla liczb wydarzeń
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({
    'today': 0,
    'this-weekend': 0,
    'this-week': 0,
    'nearby': 0,
    'saved': 0
  });

  // Pobierz dokładne liczby z API
  const fetchEventCounts = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL.replace('/events', '/event-counts')}`);
      const data = await response.json();
      
      if (response.ok) {
        setEventCounts(prev => ({
          ...prev,
          ...data,
          'saved': prev.saved // Zachowaj lokalną liczbę zapisanych
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching event counts:', error);
      // Ustaw domyślne wartości w przypadku błędu
      setEventCounts(prev => ({
        ...prev,
        'today': 0,
        'this-weekend': 0,
        'this-week': 0,
        'nearby': 0
      }));
    }
  }, []);

  // Pobierz liczby przy pierwszym załadowaniu
  useEffect(() => {
    fetchEventCounts();
  }, [fetchEventCounts]);

  // Aktualizuj liczbę zapisanych wydarzeń
  useEffect(() => {
    const savedCount = events.filter(event => isEventSaved(event.id) === true).length;
    setEventCounts(prev => ({
      ...prev,
      'saved': savedCount
    }));
  }, [events, isEventSaved]);

  const filteredEvents = useMemo(() => {
    let filtered = events.filter(e => {
      // Only handle selectedDate, selectedDateRange and saved events client-side
      // Other filters are handled server-side
      
      // Check selected date or date range
      let dateOk = true;
      if (selectedDate) {
        const eventDate = safeDate(e.date); // Convert timestamp to Date
        const selectedDateStr = selectedDate.toISOString().split('T')[0];
        const eventDateStr = eventDate.toISOString().split('T')[0];
        dateOk = selectedDateStr === eventDateStr;
      } else if (selectedDateRange) {
        const eventDate = safeDate(e.date);
        dateOk = eventDate >= selectedDateRange.start && eventDate <= selectedDateRange.end;
      }
      
      // Check saved events (client-side only)
      let savedOk = true;
      if (selectedFilters.includes('saved')) {
        savedOk = isEventSaved(e.id) === true;
      }
      
      return dateOk && savedOk;
    });
    
    console.log('🔍 Debug - Filtered events:', filtered.length, 'from', events.length);
    return filtered.sort((a, b) => safeDate(a.date).getTime() - safeDate(b.date).getTime());
  }, [events, selectedDate, selectedDateRange, selectedFilters, isEventSaved]);

  // Weekend events for slider
  const weekendEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekend = new Date(today.getTime() + (6 - today.getDay()) * 24 * 60 * 60 * 1000);
    const nextWeekend = new Date(thisWeekend.getTime() + 7 * 24 * 60 * 60 * 1000);

    return events.filter(event => {
      const eventDate = safeDate(event.date);
      return eventDate >= thisWeekend && eventDate < nextWeekend;
    }).slice(0, 10); // Limit to 10 events for slider
  }, [events]);

  const loadMore = async () => {
    if (loadingMore || loading || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchPage(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    reloadEvents();
  };

  const handleFilterChange = (filters: string[]) => {
    console.log('🔍 Debug - Filter change:', filters);
    setSelectedFilters(filters);
    // Reload events when filters change since we're using server-side filtering
    reloadEvents();
  };

  const handleCityFilterChange = (city: string | null) => {
    setCityFilter(city);
    // Reload events when city filter changes
    reloadEvents();
  };

  const handleCategoryFilterChange = (category: string | null) => {
    setCategoryFilter(category);
    // Reload events when category filter changes
    reloadEvents();
  };



  const handleFilterPress = (filterId: string) => {
    const newFilters = selectedFilters.includes(filterId)
      ? selectedFilters.filter(id => id !== filterId)
      : [...selectedFilters, filterId];
    
    setSelectedFilters(newFilters);
    // Reload events when filters change
    reloadEvents();
  };

  const handleClearFilters = () => {
    setSelectedFilters([]);
    setCityFilter(null);
    setCategoryFilter(null);

    setSelectedDate(null);
    setSelectedDateRange(null);
    // Reload events when clearing filters
    reloadEvents();
  };

  const handleDateSelect = (date: Date | null) => {
    setSelectedDate(date);
    setSelectedDateRange(null); // Clear range when single date is selected
  };

  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    setSelectedDateRange({ start: startDate, end: endDate });
    setSelectedDate(null); // Clear single date when range is selected
  };

  // Przygotowanie danych dla kalendarza
  const calendarEvents = useMemo(() => {
    const eventCounts: Record<string, number> = {};
    
    events.forEach(event => {
      const eventDate = safeDate(event.date);
      const dateStr = eventDate.toISOString().split('T')[0];
      
      if (!eventCounts[dateStr]) {
        eventCounts[dateStr] = 0;
      }
      eventCounts[dateStr]++;
    });
    
    return Object.entries(eventCounts).map(([date, count]) => ({
      date,
      count
    }));
  }, [events]);

  const handleEventPress = (event: Event) => {
    router.push(`/event/${event.id}`);
  };

  const handleShare = async (event: Event) => {
    try {
      const eventDate = safeDate(event.date);
      await Share.share({
        message: `${he.decode(event.title.rendered)}\n\nData: ${formatDate(eventDate.toISOString())} ${formatTime(eventDate.toISOString())}\n${event.meta?.miasto ? `Miasto: ${event.meta.miasto}\n` : ''}${event.meta?.cena ? `Cena: ${event.meta.cena} zł\n` : ''}${event.meta?.['link-do-wydarzenia'] ? `\nSzczegóły: ${event.meta['link-do-wydarzenia']}` : ''}`,
        title: he.decode(event.title.rendered),
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleAddToCalendar = async (event: any) => {
    try {
      const eventDate = safeDate(event.date);
      const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      
      const calendarUrl = `calshow://?startDate=${eventDate.toISOString()}&endDate=${endDate.toISOString()}&title=${encodeURIComponent(he.decode(event.title.rendered))}&location=${encodeURIComponent(event.meta?.miasto || '')}&notes=${encodeURIComponent(event.meta?.['opis-wydarzenia']?.replace(/<[^>]*>/g, '').trim() || '')}`;
      
      const canOpen = await Linking.canOpenURL(calendarUrl);
      if (canOpen) {
        await Linking.openURL(calendarUrl);
      } else {
        // Fallback to web calendar
        const webUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(he.decode(event.title.rendered))}&dates=${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(event.meta?.['opis-wydarzenia']?.replace(/<[^>]*>/g, '').trim() || '')}&location=${encodeURIComponent(event.meta?.miasto || '')}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.log('Error adding to calendar:', error);
    }
  };



  // Render calendar and filters component
  const renderCalendarAndFilters = () => (
    <View style={[styles.calendarFiltersSection, { backgroundColor: theme.colors.background }]}>
      {/* Kalendarz */}
      <InlineCalendar
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onDateRangeSelect={handleDateRangeSelect}
        events={calendarEvents}
        startDate={new Date()}
        endDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)} // +90 dni
      />
      
      {/* Filtry */}
      <View style={styles.filtersInSection}>
        <Text style={[styles.filtersLabel, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.medium }]}>
          Filtry:
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContainer}
          style={styles.filtersScroll}
        >
          <TouchableOpacity
            style={[
              styles.simpleFilterButton,
              { backgroundColor: selectedFilters.includes('today') ? theme.colors.primary : theme.colors.subtle }
            ]}
            onPress={() => handleFilterPress('today')}
          >
            <Text style={[
              styles.simpleFilterText,
              { 
                color: selectedFilters.includes('today') ? '#fff' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Dzisiaj ({eventCounts['today'] || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.simpleFilterButton,
              { backgroundColor: selectedFilters.includes('this-weekend') ? theme.colors.primary : theme.colors.subtle }
            ]}
            onPress={() => handleFilterPress('this-weekend')}
          >
            <Text style={[
              styles.simpleFilterText,
              { 
                color: selectedFilters.includes('this-weekend') ? '#fff' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Weekend ({eventCounts['this-weekend'] || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.simpleFilterButton,
              { backgroundColor: selectedFilters.includes('this-week') ? theme.colors.primary : theme.colors.subtle }
            ]}
            onPress={() => handleFilterPress('this-week')}
          >
            <Text style={[
              styles.simpleFilterText,
              { 
                color: selectedFilters.includes('this-week') ? '#fff' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Tydzień ({eventCounts['this-week'] || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.simpleFilterButton,
              { backgroundColor: selectedFilters.includes('saved') ? theme.colors.primary : theme.colors.subtle }
            ]}
            onPress={() => handleFilterPress('saved')}
          >
            <Text style={[
              styles.simpleFilterText,
              { 
                color: selectedFilters.includes('saved') ? '#fff' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Zapisane ({eventCounts['saved'] || 0})
            </Text>
          </TouchableOpacity>

          {/* Wyczyść filtry */}
          {(selectedFilters.length > 0 || cityFilter || categoryFilter) && (
            <TouchableOpacity
              style={[styles.clearFiltersButton, styles.clearInScroll]}
              onPress={handleClearFilters}
            >
              <Text style={[styles.clearFiltersText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                Wyczyść
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </View>
  );



  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>  
      {/* Header with logo */}
      <View style={[styles.header, { 
        backgroundColor: theme.colors.background,
        paddingTop: insets.top // Dodany bezpieczny margines od góry
      }]}>
        <Image
          source={{ 
            uri: theme.isDarkMode 
              ? 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png'
              : 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png'
          }}
          style={styles.logo}
          contentFit="contain"
          transition={200}
        />
      </View>


      
      {/* Combined Calendar and Filters Section */}
      {renderCalendarAndFilters()}

      {/* Modern Events List - z własnym scrolling */}
      {loading ? (
        <SkeletonLoader type="home" count={5} immediate={true} />
      ) : error ? (
        <View style={styles.center}><Text style={{ color: theme.colors.error }}>{error}</Text></View>
      ) : (
        <ModernEventList
          events={filteredEvents}
          weekendEvents={weekendEvents}
          loading={loading}
          refreshing={refreshing}
          loadingMore={loadingMore}
          onEventPress={handleEventPress}
          onShare={handleShare}
          onAddToCalendar={handleAddToCalendar}
          onRefresh={handleRefresh}
          onLoadMore={loadMore}

          scrollEnabled={true}
        />
      )}
      
      {/* City Picker Modal */}
      <Modal visible={cityModal} transparent animationType="slide" onRequestClose={()=>setCityModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModal, { backgroundColor: theme.colors.card }]}> 
            <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>Wybierz miasto</Text>
            <ScrollView style={{ maxHeight: '70%' }}>
              <TouchableOpacity style={styles.pickerItem} onPress={()=>{setCityFilter(null);setCityModal(false);}}>
                <Text style={[styles.pickerText, { color: !cityFilter ? theme.colors.primary : theme.colors.text }]}>Wszystkie</Text>
              </TouchableOpacity>
              {cities.map(c => (
                <TouchableOpacity key={c} style={styles.pickerItem} onPress={()=>{setCityFilter(c);setCityModal(false);}}>
                  <Text style={[styles.pickerText, { color: cityFilter===c ? theme.colors.primary : theme.colors.text }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={catModal} transparent animationType="slide" onRequestClose={()=>setCatModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModal, { backgroundColor: theme.colors.card }]}> 
            <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>Wybierz kategorię</Text>
            <ScrollView style={{ maxHeight: '70%' }}>
              <TouchableOpacity style={styles.pickerItem} onPress={()=>{setCategoryFilter(null);setCatModal(false);}}>
                <Text style={[styles.pickerText, { color: !categoryFilter ? theme.colors.primary : theme.colors.text }]}>Wszystkie</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity key={cat.id} style={styles.pickerItem} onPress={()=>{setCategoryFilter(cat.id);setCatModal(false);}}>
                  <Text style={[styles.pickerText, { color: categoryFilter===cat.id ? theme.colors.primary : theme.colors.text }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header styles
  header: {
    paddingTop: 0, // Usunięty niepotrzebny padding dla status bara
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  logo: {
    width: Platform.OS === 'ios' ? 100 : 110, // Slightly larger on Android
    height: Platform.OS === 'ios' ? 28 : 32, // Slightly taller on Android
    alignSelf: 'center',
    marginBottom: 12,
  },
  filtersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    zIndex: 10,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    flex: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  clearText: {
    fontSize: 13,
    marginLeft: 4,
  },
  card: {
    borderRadius: 18,
    marginHorizontal: 14,
    marginVertical: 8,
    padding: 14,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#eee',
  },
  cardContent: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  meta: {
    fontSize: 13,
    marginLeft: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 18,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  desc: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  ticketBtn: {
    marginTop: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
  },
  ticketText: {
    fontSize: 15,
    fontWeight: '700',
  },

  pickerModal: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerItem: {
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  saveButton: {
    padding: 4,
    marginLeft: 8,
  },
  filtersContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    zIndex: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    flex: 1,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  clearFilterButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  clearAllText: {
    fontSize: 13,
    marginLeft: 4,
  },
  // Combined Calendar and Filters Section
  calendarFiltersSection: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },

  filtersInSection: {
    paddingVertical: 12,
  },
  filtersLabel: {
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filtersScrollContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  simpleFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  simpleFilterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearInScroll: {
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: 20,
    minWidth: 60,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '500',
  },


}); 