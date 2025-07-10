import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, Platform, Modal, Linking, TextInput, ScrollView, Share, SafeAreaView } from 'react-native';
import { Calendar, MapPin, Tag, X } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import he from 'he';

const BASE_URL = 'https://kaszuby24.pl/wp-json/wp/v2/kalendarz?_embed&per_page=20';

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export default function EventCalendarScreen() {
  const { theme } = useThemeStore();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityModal, setCityModal] = useState(false);
  const [catModal, setCatModal] = useState(false);

  // Unikalne miasta i kategorie do filtrów
  const cities = useMemo(() => {
    const all = events.map(e => e.meta?.miasto).filter(Boolean);
    return Array.from(new Set(all));
  }, [events]);
  const categories = useMemo(() => {
    const all = events.flatMap((e: any) => {
      const terms = e._embedded?.['wp:term']?.flat() || [];
      return terms.filter((t: any) => t.taxonomy === 'kategoria-wydarzenia').map((t: any) => ({ id: t.id.toString(), name: t.name }));
    });
    const uniq: {id:string,name:string}[] = [];
    const ids = new Set<string>();
    all.forEach(c => { if (!ids.has(c.id)){ ids.add(c.id); uniq.push(c);} });
    return uniq;
  }, [events]);

  const fetchPage = useCallback(async (pageNum: number, append = false) => {
    try {
      const res = await fetch(`${BASE_URL}&page=${pageNum}`);
      const data = await res.json();
      const total = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);
      setTotalPages(total);
      if (append) {
        setEvents(prev => [...prev, ...(Array.isArray(data) ? data : [])]);
      } else {
        setEvents(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setError('Błąd ładowania wydarzeń.');
    }
  }, []);

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

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const cityOk = !cityFilter || e.meta?.miasto === cityFilter;
      const catOk = !categoryFilter || (e["kategoria-wydarzenia"] || []).includes(parseInt(categoryFilter));
      const searchOk = !searchQuery || e.title?.rendered.toLowerCase().includes(searchQuery.toLowerCase());
      return cityOk && catOk && searchOk;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, cityFilter, categoryFilter, searchQuery]);

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

  const handleClearFilters = () => {
    setCityFilter(null);
    setCategoryFilter(null);
  };

  const handleEventPress = (event: any) => {
    router.push(`/event/${event.id}`);
  };

  const handleShare = async (event: any) => {
    try {
      await Share.share({
        message: `${event.title.rendered}\n\nData: ${formatDate(event.date)} ${formatTime(event.date)}\n${event.meta?.miasto ? `Miasto: ${event.meta.miasto}\n` : ''}${event.meta?.cena ? `Cena: ${event.meta.cena} zł\n` : ''}${event.meta?.['link-do-wydarzenia'] ? `\nSzczegóły: ${event.meta['link-do-wydarzenia']}` : ''}`,
        title: event.title.rendered,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleAddToCalendar = async (event: any) => {
    try {
      const eventDate = new Date(event.date);
      const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      
      const calendarUrl = `calshow://?startDate=${eventDate.toISOString()}&endDate=${endDate.toISOString()}&title=${encodeURIComponent(event.title.rendered)}&location=${encodeURIComponent(event.meta?.miasto || '')}&notes=${encodeURIComponent(event.meta?.['opis-wydarzenia']?.replace(/<[^>]*>/g, '').trim() || '')}`;
      
      const canOpen = await Linking.canOpenURL(calendarUrl);
      if (canOpen) {
        await Linking.openURL(calendarUrl);
      } else {
        // Fallback to web calendar
        const webUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title.rendered)}&dates=${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(event.meta?.['opis-wydarzenia']?.replace(/<[^>]*>/g, '').trim() || '')}&location=${encodeURIComponent(event.meta?.miasto || '')}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.log('Error adding to calendar:', error);
    }
  };

  const renderEvent = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: theme.colors.card }]} onPress={() => handleEventPress(item)} activeOpacity={0.85}>
      {item._embedded?.["wp:featuredmedia"]?.[0]?.source_url ? (
        <Image source={{ uri: item._embedded["wp:featuredmedia"][0].source_url }} style={styles.image} contentFit="cover" />
      ) : null}
      <View style={styles.cardContent}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>{he.decode(item.title.rendered)}</Text>
        <View style={styles.row}>
          <Calendar size={16} color={theme.colors.primary} />
          <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{formatDate(item.date)} {formatTime(item.date)}</Text>
        </View>
        {item.meta?.miasto && (
          <View style={styles.row}>
            <MapPin size={15} color={theme.colors.textSecondary} />
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{item.meta.miasto}</Text>
          </View>
        )}
        {item["kategoria-wydarzenia"]?.length > 0 && (
          <View style={styles.row}>
            <Tag size={15} color={theme.colors.textSecondary} />
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{item["kategoria-wydarzenia"].join(', ')}</Text>
          </View>
        )}
        {item.meta?.cena && (
          <Text style={[styles.price, { color: theme.colors.primary }]}>Cena: {item.meta.cena} zł</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>  
      {/* Search Bar */}
      <View style={[styles.searchBarWrapper, { backgroundColor: theme.colors.card }]}> 
        <TextInput
          placeholder="Szukaj wydarzenia…"
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: theme.colors.text }]}
          returnKeyType="search"
        />
      </View>
      {/* Filtry sticky na górze */}
      <View style={[styles.filtersBar, { backgroundColor: theme.colors.card }]}> 
        <TouchableOpacity style={styles.filterBtn} onPress={() => setCityModal(true)}>
          <Text style={[styles.filterText, { color: theme.colors.text }]}>{cityFilter || 'Miasto'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setCatModal(true)}>
          <Text style={[styles.filterText, { color: theme.colors.text }]}>{(categoryFilter && categories.find(c=>c.id===categoryFilter)?.name) || 'Kategoria'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearFilters}>
          <X size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.clearText, { color: theme.colors.textSecondary }]}>Wyczyść</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={{ color: theme.colors.error }}>{error}</Text></View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={item => item.id.toString()}
          renderItem={renderEvent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
          contentContainerStyle={filteredEvents.length === 0 ? styles.center : undefined}
          ListEmptyComponent={<Text style={{ color: theme.colors.textSecondary, marginTop: 32 }}>Brak wydarzeń dla wybranych filtrów.</Text>}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={theme.colors.primary} /> : null}
        />
      )}
      {/* Szczegóły wydarzenia są teraz na osobnej stronie */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginRight: 10,
  },
  filterText: {
    fontSize: 15,
    fontWeight: '600',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.01)',
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
  searchBarWrapper: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  searchInput: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    fontWeight: '500',
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
}); 