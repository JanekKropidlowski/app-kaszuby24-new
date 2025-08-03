import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Calendar, MapPin, Clock, Share2 } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { safeFormatDate, safeFormatTime, safeDateParse } from '@/utils/dateFormatter';
import WeekendEventsSlider from './WeekendEventsSlider';
import * as he from 'he';

interface Event {
  id: number;
  title: { rendered: string };
  date: string;
  meta?: {
    miasto?: string;
    'opis-wydarzenia'?: string;
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
    }>;
  };
}

interface ModernEventListProps {
  events: Event[];
  weekendEvents?: Event[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  onEventPress: (event: Event) => void;
  onShare: (event: Event) => void;
  onAddToCalendar: (event: Event) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onScroll?: (event: any) => void;
  scrollEnabled?: boolean;
}

const ModernEventList: React.FC<ModernEventListProps> = ({
  events,
  weekendEvents = [],
  loading,
  refreshing,
  loadingMore,
  onEventPress,
  onShare,
  onAddToCalendar,
  onRefresh,
  onLoadMore,
  onScroll,
  scrollEnabled = true,
}) => {
  const { theme } = useThemeStore();

  const renderEventItem = ({ item: event, index }: { item: Event; index: number }) => {
    // Bezpieczne parsowanie daty
    const eventDate = safeDateParse(event.date);
    const formattedDate = safeFormatDate(event.date);
    const formattedTime = safeFormatTime(event.date);
    
    // Sprawdź czy to dzisiaj lub jutro
    const isToday = eventDate ? new Date().toDateString() === eventDate.toDateString() : false;
    const isTomorrow = eventDate ? new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString() === eventDate.toDateString() : false;
    
    const hasImage = event._embedded?.['wp:featuredmedia']?.[0]?.source_url;

    return (
      <TouchableOpacity
        style={[
          styles.eventItem,
          { backgroundColor: theme.colors.card },
          { marginTop: index === 0 ? 0 : 8 } // Zmniejszony margines
        ]}
        onPress={() => onEventPress(event)}
        activeOpacity={0.9}
      >
        {/* Event Image - po lewej stronie */}
        <View style={styles.imageContainer}>
          {hasImage ? (
            <Image
              source={{ uri: hasImage }}
              style={styles.eventImage}
            />
          ) : (
            <View style={[styles.noImageContainer, { backgroundColor: theme.colors.primary }]}>
              <Calendar size={20} color="#fff" />
            </View>
          )}
        </View>

        {/* Event Content - po prawej stronie */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {Platform.OS === 'android' ? event.title.rendered : he.decode(event.title.rendered)}
            </Text>
            {(isToday || isTomorrow) && (
              <View style={[
                styles.dateBadge,
                { backgroundColor: isToday ? '#FF6B6B' : '#4ECDC4' }
              ]}>
                <Text style={[styles.dateBadgeText, { color: '#fff' }]}>
                  {isToday ? 'Dzisiaj' : 'Jutro'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <Clock size={12} color={theme.colors.primary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {formattedDate} • {formattedTime}
              </Text>
            </View>
            
            {event.meta?.miasto && (
              <View style={styles.metaRow}>
                <MapPin size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {event.meta.miasto}
                </Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.subtle }]}
              onPress={() => onShare(event)}
            >
              <Share2 size={14} color={theme.colors.primary} />
              <Text style={[styles.quickActionText, { color: theme.colors.primary }]}>
                Udostępnij
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.subtle }]}
              onPress={() => onAddToCalendar(event)}
            >
              <Calendar size={14} color={theme.colors.primary} />
              <Text style={[styles.quickActionText, { color: theme.colors.primary }]}>
                Kalendarz
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Calendar size={40} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        Brak wydarzeń
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Nie znaleziono wydarzeń dla wybranych filtrów
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          Ładowanie...
        </Text>
      </View>
    );
  };

  const renderHeader = () => {
    if (!weekendEvents || weekendEvents.length === 0) return null;
    
    return (
      <View style={styles.weekendSection}>
        <WeekendEventsSlider
          events={weekendEvents}
          onEventPress={onEventPress}
          onShare={onShare}
          onAddToCalendar={onAddToCalendar}
        />
      </View>
    );
  };

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderEventItem}
      contentContainerStyle={styles.container}
      refreshControl={
        scrollEnabled ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        ) : undefined
      }
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyState}
      ListFooterComponent={renderFooter}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      scrollEnabled={scrollEnabled}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8, // Dodany padding na górze aby nie była przykryta przez slider
    paddingBottom: 20,
  },
  weekendSection: {
    marginBottom: 16, // Dodany margines pod sliderem weekendowym
    paddingHorizontal: 0, // Usunięcie paddingu aby slider miał pełną szerokość
  },
  eventItem: {
    borderRadius: 12, // Zmniejszony border radius
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Zmniejszony shadow
    shadowOpacity: 0.05, // Zmniejszona przezroczystość
    shadowRadius: 4, // Zmniejszony radius
    elevation: 2, // Zmniejszony elevation
    overflow: 'hidden',
    flexDirection: 'row', // Dodany flexDirection: 'row'
    alignItems: 'center', // Dodany alignItems: 'center'
    paddingHorizontal: 16, // Dodany padding poziomy
    paddingVertical: 12, // Dodany padding pionowy
    marginBottom: 8, // Dodany margines na dole
    backgroundColor: 'transparent', // Przezroczyste tło
    borderBottomWidth: 1, // Dodana dolna linia
    borderBottomColor: 'rgba(0,0,0,0.06)', // Kolor linii
  },
  imageContainer: {
    width: 80, // Zmniejszona szerokość obrazka jak w ArticleCard
    height: 80, // Zmniejszona wysokość obrazka jak w ArticleCard
    borderRadius: 12, // Border radius jak w ArticleCard
    overflow: 'hidden',
    marginRight: 16, // Margines po prawej jak w ArticleCard
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1, // Dodany flex: 1
    justifyContent: 'space-between', // Dodane justifyContent
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8, // Zmniejszony margin
  },
  eventTitle: {
    fontSize: Platform.OS === 'android' ? 17 : 16, // Zwiększony font size jak w ArticleCard
    fontWeight: '600',
    lineHeight: Platform.OS === 'android' ? 24 : 22, // Zwiększony line height jak w ArticleCard
    flex: 1, // Dodany flex: 1
    marginRight: 8, // Zmniejszony margin
    letterSpacing: Platform.OS === 'android' ? -0.1 : -0.2, // Dodany letter spacing jak w ArticleCard
  },
  dateBadge: {
    paddingHorizontal: 6, // Zmniejszony padding
    paddingVertical: 3, // Zmniejszony padding
    borderRadius: 6, // Zmniejszony border radius
  },
  dateBadgeText: {
    fontSize: 10, // Zmniejszony font size
    fontWeight: '600',
  },
  metaContainer: {
    gap: 4, // Zmniejszony gap
    marginBottom: 8, // Dodany margines na dole
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // Zmniejszony gap
  },
  metaText: {
    fontSize: Platform.OS === 'android' ? 13 : 12, // Zmniejszony font size
    fontWeight: '500',
    marginLeft: 6, // Dodany margin jak w ArticleCard
    opacity: 0.7, // Dodana przezroczystość jak w ArticleCard
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Zmienione na space-between
    marginTop: 8, // Zmniejszony margines na górze
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // Dodany gap
    paddingHorizontal: 8, // Zmniejszony padding
    paddingVertical: 6, // Zmniejszony padding
    borderRadius: 8, // Zmniejszony border radius
  },
  quickActionText: {
    fontSize: 11, // Zmniejszony font size
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40, // Zmniejszony padding
  },
  emptyTitle: {
    fontSize: 16, // Zmniejszony font size
    fontWeight: '600',
    marginTop: 12, // Zmniejszony margin
    marginBottom: 6, // Zmniejszony margin
  },
  emptySubtitle: {
    fontSize: 13, // Zmniejszony font size
    textAlign: 'center',
    lineHeight: 18, // Zmniejszony line height
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16, // Zmniejszony padding
    gap: 6, // Zmniejszony gap
  },
  footerText: {
    fontSize: 13, // Zmniejszony font size
    fontWeight: '500',
  },
});

export default ModernEventList; 