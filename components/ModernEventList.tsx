import React, { memo, useCallback, useMemo, useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  Platform,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Share
} from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Clock, MapPin, Share2, Heart, Eye, TrendingUp, CalendarDays, Filter, X } from 'lucide-react-native';
import { Event } from '@/types/article';
import { useThemeStore } from '@/store/themeStore';
import { formatDateTime, safeDateParse, safeFormatDate, safeFormatTime } from '@/utils/dateFormatter';
import { cleanArticleTitle } from '@/utils/htmlEntityCleaner';
import WeekendEventsSlider from './WeekendEventsSlider';
import * as he from 'he';

const { width: screenWidth } = Dimensions.get('window');

// LZS Pomorski branding — ten sam zielony i logotyp co web (EventLandingCard:24).
const LZS_GREEN = '#1e9346';
const LZS_LOGO = 'https://lzs-pomorski.pl/wp-content/uploads/2025/03/Logo_LZS_RGB.png';



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
  hideSlider?: boolean;
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
  hideSlider = false,
}) => {
  const { theme } = useThemeStore();



  // Funkcja pomocnicza do bezpiecznego pobierania tytułu
  const getEventTitle = (event: Event): string => {
    if (typeof event.title === 'string') {
      return event.title;
    } else if (event.title?.rendered) {
      return event.title.rendered;
    }
    return 'Brak tytułu';
  };

  const renderEventItem = ({ item: event, index }: { item: Event; index: number }) => {
    const eventTitle = getEventTitle(event);
    const eventDate = safeDateParse(event.date);
    const formattedDate = safeFormatDate(event.date);
    const formattedTime = safeFormatTime(event.date);
    
    // Sprawdź czy to dzisiaj lub jutro
    const isToday = eventDate ? new Date().toDateString() === eventDate.toDateString() : false;
    const isTomorrow = eventDate ? new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString() === eventDate.toDateString() : false;
    
    const hasImage =
      event._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
      (event as any).image ||
      (event as any).featured_media_url;

    const isLzs = event.source === 'lzs';

    return (
      <TouchableOpacity
        style={[
          styles.eventItem,
          { backgroundColor: theme.colors.card },
          { marginTop: index === 0 ? 0 : 8 }, // Zmniejszony margines
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
            <View
              style={[
                styles.noImageContainer,
                { backgroundColor: isLzs ? LZS_GREEN : theme.colors.primary },
              ]}
            >
              <Calendar size={20} color="#fff" />
            </View>
          )}
          {isLzs && (
            <View style={styles.lzsLogoBubble}>
              <Image source={{ uri: LZS_LOGO }} style={styles.lzsLogoImg} />
            </View>
          )}
        </View>

        {/* Event Content - po prawej stronie */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {cleanArticleTitle(eventTitle)}
            </Text>
            {isLzs ? (
              <View style={[styles.dateBadge, { backgroundColor: LZS_GREEN }]}>
                <Text style={[styles.dateBadgeText, { color: '#fff' }]}>LZS</Text>
              </View>
            ) : (isToday || isTomorrow) && (
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
    try {
      if (hideSlider || !weekendEvents || weekendEvents.length === 0) return null;
      
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
    } catch (error) {
      console.error('❌ Error in renderHeader:', error);
      return null;
    }
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
    paddingHorizontal: Platform.OS === 'android' ? 20 : 16, // Większy padding na Androidzie
    paddingTop: Platform.OS === 'android' ? 12 : 8, // Większy padding na Androidzie
    paddingBottom: Platform.OS === 'android' ? 24 : 20, // Większy padding na Androidzie
  },
  weekendSection: {
    marginBottom: 16, // Dodany margines pod sliderem weekendowym
    paddingHorizontal: 0, // Usunięcie paddingu aby slider miał pełną szerokość
    marginHorizontal: -16, // Negatywny margines aby wyjść poza padding kontenera
  },
  eventItem: {
    borderRadius: Platform.OS === 'android' ? 14 : 12, // Większy radius na Androidzie
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: Platform.OS === 'android' ? 0.08 : 0.05, // Większy shadow na Androidzie
    shadowRadius: Platform.OS === 'android' ? 6 : 4, // Większy radius na Androidzie
    elevation: Platform.OS === 'android' ? 4 : 2, // Większy elevation na Androidzie
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 20 : 16, // Większy padding na Androidzie
    paddingVertical: Platform.OS === 'android' ? 16 : 12, // Większy padding na Androidzie
    marginBottom: Platform.OS === 'android' ? 10 : 8, // Większy margines na Androidzie
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  imageContainer: {
    width: Platform.OS === 'android' ? 88 : 80, // Większy obrazek na Androidzie jak w ArticleCard
    height: Platform.OS === 'android' ? 88 : 80, // Większy obrazek na Androidzie jak w ArticleCard
    borderRadius: Platform.OS === 'android' ? 14 : 12, // Większy radius na Androidzie jak w ArticleCard
    overflow: 'hidden',
    marginRight: Platform.OS === 'android' ? 18 : 16, // Większy margines na Androidzie jak w ArticleCard
    position: 'relative',
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
  lzsLogoBubble: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  lzsLogoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  contentContainer: {
    flex: 1, // Dodany flex: 1
    justifyContent: 'space-between', // Dodane justifyContent
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Platform.OS === 'android' ? 10 : 8, // Większy margines na Androidzie
  },
  eventTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 16, // Jeszcze większy font size na Androidzie
    fontWeight: '600',
    lineHeight: Platform.OS === 'android' ? 26 : 22, // Większy line height na Androidzie
    flex: 1,
    marginRight: Platform.OS === 'android' ? 10 : 8, // Większy margines na Androidzie
    letterSpacing: Platform.OS === 'android' ? -0.05 : -0.2, // Lepszy letter spacing na Androidzie
  },
  dateBadge: {
    paddingHorizontal: Platform.OS === 'android' ? 8 : 6, // Większy padding na Androidzie
    paddingVertical: Platform.OS === 'android' ? 4 : 3, // Większy padding na Androidzie
    borderRadius: Platform.OS === 'android' ? 8 : 6, // Większy radius na Androidzie
  },
  dateBadgeText: {
    fontSize: Platform.OS === 'android' ? 11 : 10, // Większy font na Androidzie
    fontWeight: '600',
  },
  metaContainer: {
    gap: Platform.OS === 'android' ? 6 : 4, // Większy gap na Androidzie
    marginBottom: Platform.OS === 'android' ? 10 : 8, // Większy margines na Androidzie
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 6 : 4, // Większy gap na Androidzie
  },
  metaText: {
    fontSize: Platform.OS === 'android' ? 14 : 12, // Większy font na Androidzie jak w ArticleCard
    fontWeight: '500',
    marginLeft: Platform.OS === 'android' ? 8 : 6, // Większy margines na Androidzie jak w ArticleCard
    opacity: 0.7,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'android' ? 10 : 8, // Większy margines na Androidzie
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 6 : 4, // Większy gap na Androidzie
    paddingHorizontal: Platform.OS === 'android' ? 12 : 8, // Większy padding na Androidzie
    paddingVertical: Platform.OS === 'android' ? 8 : 6, // Większy padding na Androidzie
    borderRadius: Platform.OS === 'android' ? 10 : 8, // Większy radius na Androidzie
    minHeight: Platform.OS === 'android' ? 44 : 36, // Minimum touch target na Androidzie
    minWidth: Platform.OS === 'android' ? 80 : 60, // Minimum width na Androidzie
  },
  quickActionText: {
    fontSize: Platform.OS === 'android' ? 12 : 11, // Większy font na Androidzie
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